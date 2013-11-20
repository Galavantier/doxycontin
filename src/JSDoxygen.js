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
var globalContext = { symbolTable : {}, contexts : [] };

var contextVisitor = vs.visitorFactory({
    curContext : globalContext,
    curModule  : null,
    CallExpression : function(nodeWrapper) {
        //find out what type of thing is getting called.
        tablevel++;
        var context = nodeWrapper.callee.visit(this);
        this.curContext = context;
        tablevel--;
        //tabOutput("call context: " + ((typeof context.type != 'undefined') ? context.type : context) );

        if(typeof context.type != 'undefined' && context.type.search('angular') != -1) {
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
                default:
                    break;
            }
        }
        return this.curModule;
    },
    MemberExpression : function(nodeWrapper) {
        var object   = nodeWrapper.object.visit(this);
        var property = nodeWrapper.property.visit(this)

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

        if( typeof object.type != 'undefined' && object.type == 'angularModuleContext' ) {
            var newContext = { location : nodeWrapper.node.loc, symbolTable : {} };
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
        return object + "." + property;
    },
    FunctionExpression : function(nodeWrapper) {
        var interfce = nodeWrapper.node.type;

        if(this.curContext) {
            // Change the context to a temporary context that is local to the function itself.
            var myContext = this.curContext;
            this.curContext = { type : 'functionBodyContext', symbolTable : {} };

            var body = nodeWrapper.body.visit(this);

            switch(myContext.type) {
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
                        //Try to find the object in the symbol table.
                        if( typeof this.curContext.symbolTable != 'undefined' && this.curContext.symbolTable.hasOwnProperty(factoryIntrfce) ) {
                            interfce = this.curContext.symbolTable[factoryIntrfce];
                        }
                        else {
                            interfce = { type : 'externalIntrfce', name : factoryIntrfce };
                        }
                    }
                    break;
                default:
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
    VariableDeclarator : function(nodeWrapper) {
        // Everytime we declare a new variable, add it to the symbol table along with the object representing it's context or value.
        if(this.curContext && typeof this.curContext.symbolTable != 'undefined') {
            this.curContext.symbolTable[nodeWrapper.id.visit(this)] = (nodeWrapper.node.init) ? nodeWrapper.init.visit(this) : null;
        }
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
        var objContext = { type : "jsObjectContext" };
        //@TODO: Parse the properties of the object.
        return objContext;
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

//console.log(globalContext);
console.log(globalContext.contexts[0].contexts);