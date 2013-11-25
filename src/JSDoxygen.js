// Helpful for debug output.
var tablevel = 0;
function tabOutput(output){
    var tabs = "";
    for (var i = 0; i < tablevel; i++) {
        tabs += "  ";
    };
    console.log(tabs + output);
}

/*--------------------------------------------Main------------------------------------------*/
//More intuitive command line params
var cmd = require('commander');
//File System
var fs = require('fs');
//Esprima
var esprima = require('esprima');
// Make output pretty for debugging
var prettyjson = require('prettyjson');

//Facilitates the visitor pattern by creating wrapper objects around the Esprima ast nodes.
var vs = require('./visitorPattern.js');

cmd.version('0.0.1')
   .option('-f, --file <file>', 'specify the file to parse (Required)')
   .parse(process.argv);

// Command Line error checking.
if(typeof cmd.file == 'undefined' ) {
    cmd.help();
}

// Read the file.
var code = fs.readFileSync(cmd.file);
// Parse the file into an Abstract Syntax Tree. Include file location data and comments.
var ast = esprima.parse(code, { loc : true, comment : true } );
var astWrapper = vs.visitorNodeWrapperFactory(ast);

// Phase 1. Find all the contexts.
var globalContext = { type: "globalContext", symbolTable : {}, contexts : [] };

var attrCollector = vs.visitorFactory(
{
    attrContext : [],
    MemberExpression : function(nodeWrapper) {
        var object   = nodeWrapper.object.visit(this);
        var property = nodeWrapper.property.visit(this);
        if(object == '$attrs' || object == 'attrs') {
            var unique = true;
            this.attrContext.forEach(function(curAttr){
                if(property == curAttr) {
                    unique = false;
                }
            });
            if(unique) {
                this.attrContext.push(property);
            }
        }
    },
    Literal : function(nodeWrapper) {
        return nodeWrapper.node.value;
    },
    Identifier : function(nodeWrapper) {
        return nodeWrapper.node.name;
    }
});

var contextVisitor = vs.visitorFactory({
    curContext      : globalContext,
    curModule       : null,
    CallExpression : function(nodeWrapper) {
        //find out what is getting called.
        var context = nodeWrapper.callee.visit(this);

        if(this.curContext.type == 'functionBodyContext') {
            return context;
        }

        if(typeof context.type != 'undefined') {
            if(context.type.search('Context') != -1) {
                var myContext = this.curContext;
                this.curContext = context;
                if(context.type.search('angular') != -1) {
                    // The first argument of any angular context is the name of the context.
                    context.name = nodeWrapper.arguments.nodes[0].visit(this);
                    switch(context.type) {
                        case 'angularModuleContext' :
                            // The second argument of an angular module is it's requirements.
                            context.requirements = nodeWrapper.arguments.nodes[1].visit(this);
                            this.curModule = context;
                            break;
                        case 'angularFactoryContext' :
                            var factoryIntrfce = nodeWrapper.arguments.nodes[1].visit(this);
                            if( nodeWrapper.arguments.nodes[1].node.type == 'ArrayExpression' ) {
                                context.interfce = factoryIntrfce.pop();
                                context.requirements = factoryIntrfce;
                            } else {
                                context.interfce = factoryIntrfce;
                            }
                            break;
                        case 'angularDirectiveContext' :
                            var directiveArgs = nodeWrapper.arguments.nodes[1].visit(this);
                            if( nodeWrapper.arguments.nodes[1].node.type == 'ArrayExpression' ) {
                                context.params = directiveArgs.pop();
                                context.requirements = directiveArgs;
                            } else {
                                context.params = directiveArgs;
                            }
                            break;
                        case 'angularControllerContext' :
                            var controllerArgs = nodeWrapper.arguments.nodes[1].visit(this);
                            if( nodeWrapper.arguments.nodes[1].node.type == 'ArrayExpression' ) {
                                context.interfce = controllerArgs.pop();
                                context.requirements = controllerArgs;
                            } else {
                                context.interfce = controllerArgs;
                            }
                            break;
                        default:
                            break;
                    }
                    this.curContext = myContext;
                    return this.curModule;
                }
            }
        }
    },
    MemberExpression : function(nodeWrapper) {
        var object   = nodeWrapper.object.visit(this);
        var property = nodeWrapper.property.visit(this);

        if(object == 'angular' && property == 'module') {
            // Create a new angular module context
            var moduleContext = { type : 'angularModuleContext', location: nodeWrapper.node.loc, contexts : [] };
            this.curContext.contexts.push(moduleContext);
            return moduleContext;
        }

        //Try to find the object in the symbol table.
        if(this.curContext && typeof this.curContext.symbolTable != 'undefined' && this.curContext.symbolTable.hasOwnProperty(object)) {
            object = this.curContext.symbolTable[object];
        }
        //If this is referencing $scope, and scope has not yet been defined, magically create the $scope object.
        else if ( this.curContext && typeof this.curContext.symbolTable != 'undefined' && (object == '$scope' || object == 'scope') ) {
            this.curContext.symbolTable[object] = { type : 'jsObjectContext', name : object, members : [] };
            object = this.curContext.symbolTable[object];
        }

        if( typeof object.type != 'undefined' ) {
            if( object.type == 'angularModuleContext' ) {
                var newContext = { location : nodeWrapper.node.property.loc };
                switch(property) {
                    case 'factory' :
                        newContext.type = 'angularFactoryContext';
                        break;
                    case 'service' :
                        newContext.type = 'angularServiceContext';
                        break;
                    case 'directive' :
                        newContext.type = 'angularDirectiveContext';
                        break;
                    case 'controller' :
                        newContext.type = 'angularControllerContext';
                        break;
                    default :
                        return object + "." + property;
                        break;
                }
                object.contexts.push(newContext);
                return newContext;
            }
            else if( object.type == 'jsObjectContext' ) {
                var propertyExists = false;
                object.members.forEach(function(curMember){
                    if(typeof curMember.name != 'undefined' && curMember.name == property) {
                        propertyExists = true;
                    }
                });
                if(!propertyExists) {
                    var objContext = { name : property };
                    object.members.push(objContext);
                    return objContext;
                }
            }
        }

        return object + "." + property;
    },
    FunctionDeclaration : function(nodeWrapper) {
        var interfce = nodeWrapper.node.type;

        if(this.curContext) {
            // Change the context to a temporary context that is local to the function itself.
            var myContext = this.curContext;
            this.curContext = { type : 'functionBodyContext', symbolTable : {} };

            var body = nodeWrapper.body.visit(this);

            switch(myContext.type) {
                case 'globalContext':
                    // Find the return value of the function and use it to generate the interface of the factory.
                    var factoryIntrfce = null;
                    body.forEach(function(curStatement){
                        if(typeof curStatement.type != 'undefined' && curStatement.type == 'returnContext') {
                            factoryIntrfce = curStatement.value;
                        }
                    });

                    // Are we a factory (I.E. a constructor of a class), or are we just a regular procedural function.
                    if(factoryIntrfce && typeof factoryIntrfce.type != 'undefined' && factoryIntrfce.type == 'jsObjectContext') {
                        interfce = factoryIntrfce;
                    }
                    else {
                        //Try to find the object in the symbol table.
                        if( typeof this.curContext.symbolTable != 'undefined' && this.curContext.symbolTable.hasOwnProperty(factoryIntrfce) ) {
                            interfce = this.curContext.symbolTable[factoryIntrfce];
                        }
                        else {
                            var myParams = [];
                            var self = this;
                            nodeWrapper.params.nodes.forEach(function(curParam){
                                myParams.push(curParam.visit(self));
                            });
                            interfce = { type : 'jsFunctionContext', returnVal : factoryIntrfce, params : myParams };
                        }
                    }

                    var symbolName = nodeWrapper.id.visit(this);
                    // add the function the list of contexts
                    switch (interfce.type) {
                        case 'jsFunctionContext':
                            interfce.name     = symbolName;
                            interfce.location = nodeWrapper.node.loc;
                            myContext.contexts.push(interfce);
                            break;
                        case 'jsObjectContext':
                            var newContext = {
                                name : symbolName,
                                type : 'jsFactoryContext',
                                'interfce' : interfce,
                                location : nodeWrapper.node.loc
                            };
                            myContext.contexts.push(newContext);
                            break;
                        default:
                            break;
                    }
                    break;
                default:
                    break;
            }
            // return the current Context to the global state.
            this.curContext = myContext;
        }
    },
    FunctionExpression : function(nodeWrapper) {
        var interfce = nodeWrapper.node.type;

        if(this.curContext) {
            // Change the context to a temporary context that is local to the function itself.
            var myContext = this.curContext;
            this.curContext = { type : 'functionBodyContext', symbolTable : {} };

            switch(myContext.type) {
                case 'globalContext':
                    // Find the return value of the function and use it to generate the interface of the factory.
                    var factoryIntrfce = null;
                    var body = nodeWrapper.body.visit(this);
                    body.forEach(function(curStatement){
                        if(typeof curStatement.type != 'undefined' && curStatement.type == 'returnContext') {
                            factoryIntrfce = curStatement.value;
                        }
                    });

                    // Are we a factory (I.E. a constructor of a class), or are we just a regular procedural function.
                    if(factoryIntrfce && typeof factoryIntrfce.type != 'undefined' && factoryIntrfce.type == 'jsObjectContext') {
                        interfce = factoryIntrfce;
                    }
                    else {
                        //Try to find the object in the symbol table.
                        if( typeof this.curContext.symbolTable != 'undefined' && this.curContext.symbolTable.hasOwnProperty(factoryIntrfce) ) {
                            interfce = this.curContext.symbolTable[factoryIntrfce];
                        }
                        else {
                            var myParams = [];
                            var self = this;
                            nodeWrapper.params.nodes.forEach(function(curParam){
                                myParams.push(curParam.visit(self));
                            });
                            interfce = { type : 'jsFunctionContext', returnVal : factoryIntrfce, params : myParams };
                        }
                    }
                    break;
                case 'angularFactoryContext':
                    // If the requirements haven't been determined yet, get them from the function params.
                    if(typeof myContext.requirements == 'undefined') {
                        myContext.requirements = [];
                        var self = this;
                        nodeWrapper.params.nodes.forEach(function(curParam){
                            myContext.requirements.push(curParam.visit(self));
                        });
                    }

                    // Find the return value of the function and use it to generate the interface of the factory.
                    var factoryIntrfce = null;
                    var body = nodeWrapper.body.visit(this);
                    body.forEach(function(curStatement){
                        if(typeof curStatement.type != 'undefined' && curStatement.type == 'returnContext') {
                            factoryIntrfce = curStatement.value;
                        }
                    });

                    // Determine if we are using an externally defined interface (i.e. a promise object), or if the interface is explicitly defined (i.e. with a jsObjectContext);
                    if(typeof factoryIntrfce.type != 'undefined' && factoryIntrfce.type == 'jsObjectContext') {
                        interfce = factoryIntrfce;
                    }
                    else {
                        // Try to find the object in the symbol table.
                        if( typeof this.curContext.symbolTable != 'undefined' && this.curContext.symbolTable.hasOwnProperty(factoryIntrfce) ) {
                            interfce = this.curContext.symbolTable[factoryIntrfce];
                        }
                        else {
                            interfce = { type : 'externalIntrfce', name : factoryIntrfce };
                        }
                    }
                    break;
                case 'angularDirectiveContext':
                    // The return statement is used to determine all the params of a directive.
                    var returnVal = null;
                    var body = nodeWrapper.body.visit(this);
                    body.forEach(function(curStatement){
                        if(typeof curStatement.type != 'undefined' && curStatement.type == 'returnContext') {
                            returnVal = curStatement.value;
                        }
                    });
                    if(returnVal) {
                        // @TODO: get the scope object and parse the link function for $attrs. Combine into to the params object.
                        var link = null;
                        var scope = null;
                        returnVal.members.forEach(function(curMember){
                            if(curMember.name == 'scope') { scope = curMember.value; }
                            if(curMember.name == 'link') { link = curMember.value; }
                        });
                        var params = []
                        if(scope) {
                            scope.members.forEach(function(curMember){
                                params.push(curMember.name);
                            });
                        }
                        nodeWrapper.visitAllChildren(attrCollector);
                        link = attrCollector.attrContext;
                        if(link.length > 0) {
                            params = params.concat(link);
                        }
                        interfce = params;
                    }
                    break;
                case 'angularControllerContext':
                    var body = nodeWrapper.body.visit(this);
                    var scopeContext = {};
                    if( this.curContext.symbolTable.hasOwnProperty('$scope') ) {
                        scopeContext = this.curContext.symbolTable.$scope;
                    }
                    else if ( this.curContext.symbolTable.hasOwnProperty('scope') ) {
                        scopeContext = this.curContext.symbolTable.scope;
                    }
                    interfce = scopeContext;
                    break;
                default:
                    var params = [];
                    var self = this;
                    nodeWrapper.params.nodes.forEach(function(curParam){
                        params.push(curParam.visit(self));
                    });
                    interfce = params;
                    break;
            }
            // return the current Context to the global state.
            this.curContext = myContext;
        }
        return interfce;
    },
    ArrayExpression : function(nodeWrapper) {
        var elems = [];
        var self = this;
        nodeWrapper.elements.nodes.forEach(function(curElem){
            elems.push(curElem.visit(self));
        });
        return elems;
    },
    BlockStatement : function(nodeWrapper) {
        var statements = [];
        var self = this;
        nodeWrapper.body.nodes.forEach(function(curStatement){
            statements.push(curStatement.visit(self));
        });
        return statements;
    },
    ReturnStatement : function(nodeWrapper) {
        var returnContext = { type : 'returnContext' };
        returnContext.value = nodeWrapper.argument.visit(this);
        return returnContext;
    },
    ObjectExpression : function(nodeWrapper) {
        var objContext = { type : "jsObjectContext", members : [] };

        // Parse the properties of the object.
        var self = this;
        nodeWrapper.properties.nodes.forEach(function(curProperty){
            var propertyContext = curProperty.visit(self);
            objContext.members.push(propertyContext);
        });
        return objContext;
    },
    Property : function(nodeWrapper) {
        if(nodeWrapper.node.kind == 'init') {
            var propName = nodeWrapper.key.visit(this);
            var objContext = { name : propName, type : nodeWrapper.node.value.type, location: nodeWrapper.node.loc };
            var val = nodeWrapper.value.visit(this);
            if(objContext.type == 'FunctionExpression') {
                objContext.params = val;
            } else {
                objContext.value = val;
            }
            return objContext;
        }
    },
    VariableDeclarator : function(nodeWrapper) {
        // Everytime we declare a new variable, add it to the symbol table along with the object representing it's context or value.
        if(this.curContext && typeof this.curContext.symbolTable != 'undefined') {
            var symbolName = nodeWrapper.id.visit(this);
            this.curContext.symbolTable[symbolName] = (nodeWrapper.node.init) ? nodeWrapper.init.visit(this) : null;

            // If we are in the global context and this is a function, add it the list of contexts
            if(typeof this.curContext.type != 'undefined' && this.curContext.type == 'globalContext' && this.curContext.symbolTable[symbolName] != null && typeof this.curContext.symbolTable[symbolName].type != 'undefined') {
                switch (this.curContext.symbolTable[symbolName].type) {
                    case 'jsFunctionContext':
                        this.curContext.symbolTable[symbolName].name     = symbolName;
                        this.curContext.symbolTable[symbolName].location = nodeWrapper.node.loc;
                        this.curContext.contexts.push(this.curContext.symbolTable[symbolName]);
                        break;
                    case 'jsObjectContext':
                        var newContext = {
                            name : symbolName,
                            type : 'jsFactoryContext',
                            interfce : this.curContext.symbolTable[symbolName],
                            location : nodeWrapper.node.loc
                        };
                        this.curContext.contexts.push(newContext);
                        break;
                    default:
                        break;
                }
            }
        }
    },
    AssignmentExpression : function(nodeWrapper) {
        if(nodeWrapper.node.operator == '=') {
            var objContext      = nodeWrapper.left.visit(this);
            objContext.type     = nodeWrapper.node.right.type;
            objContext.location = nodeWrapper.node.loc;
            var val = nodeWrapper.right.visit(this);
            if(objContext.type == 'FunctionExpression') {
                objContext.params = val;
            } else {
                objContext.value = val;
            }
            return objContext;
        }
    },
    Literal : function(nodeWrapper) {
        return nodeWrapper.node.value;
    },
    Identifier : function(nodeWrapper) {
        return nodeWrapper.node.name;
    },
    default : function(nodeWrapper) {
        nodeWrapper.visitAllChildren(this);
        return nodeWrapper.node.type;
    }
});

astWrapper.visitAllChildren(contextVisitor);

// Phase 2. Match up all the contexts with the comment blocks
function matchComments(context) {
    // Match the comment to the context.
    if(typeof context.location != 'undefined') {
        ast.comments.forEach(function(curComment, index){
            if(curComment.type == "Block") {
                if( (curComment.loc.end.line + 1) == context.location.start.line ) {
                    context.docBlock = ast.comments.splice(index, 1 );
                }
            }
        });
    }

    // Recursively match comments of child contexts.
    if(typeof context.interfce != 'undefined' && typeof context.interfce.members != 'undefined') {
        context.interfce.members.forEach(function(member){
            matchComments(member);
        });
    }
    if(typeof context.contexts != 'undefined') {
        context.contexts.forEach(function(childContext){
            matchComments(childContext);
        });
    }
}
matchComments(globalContext);

// Phase 3. Output the resulting datastructure as a PHP like skeleton file that is readable by Doxygen.
function renderContext(curContext, tablevel) {
    if(typeof tablevel == 'undefined') { tablevel = 0; }

    // This is a class.
    if( typeof curContext.interfce != 'undefined' ) {
        if( curContext.interfce.type == 'externalIntrfce' ) {
            // This class inherits from some external Class.
        } else if( curContext.interfce.type == 'jsObjectContext' ) {
            // Recurse into each class member.
            curContext.interfce.members.forEach(function(curMember) {
                renderContext(curMember, tablevel++);
            });
        }
    } else if( typeof curContext.params != 'undefined' ) {
        // This is a function.
    } else if( curContext.type == 'Literal' ) {
        // We a literal value.
        // @TODO: determine the type.
    }

    if( typeof curContext.contexts != 'undefined' ) {
        // Recurse to the children contexts.
        curContext.contexts.forEach(function(childContext){
            renderContext(childContext);
        });
    }
};

console.log(prettyjson.render(globalContext));