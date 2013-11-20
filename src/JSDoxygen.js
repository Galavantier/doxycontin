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
var contexts = [];
var symbolTable = {};

/*var myVisitor = vs.visitorFactory({
    CallExpression : function(nodeWrapper) {
        tabOutput("CallExpression: ");
        tablevel++;
        tabOutput("Args: ");
        nodeWrapper.arguments.nodes.forEach(function(subChild){
            tabOutput(subChild.node.type);
            tabOutput("  " + subChild.visit(myVisitor));
            tabOutput("------------------------------");
        });
        tablevel--;
    },
    ArrayExpression : function(nodeWrapper) {
        tabOutput("ArrayExpression: ");
        tablevel++;
        tabOutput("Elements: ");
        nodeWrapper.elements.nodes.forEach(function(curElem){
            tabOutput(curElem.node.type);
            tabOutput("  " + curElem.visit(myVisitor));
            tabOutput("------------------------------");
        });
        tablevel--;
        return "End ArrayExpression";
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
});*/
var contextVisitor = vs.visitorFactory({
    curContext : null,
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
                    var factoryDef = nodeWrapper.arguments.nodes[1].visit(this);
                    if( nodeWrapper.arguments.nodes[1].node.type == 'ArrayExpression' ) {
                        context.members = factoryDef.pop();
                        context.requirements = factoryDef;
                    } else {
                        context.members = factoryDef;
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
            var moduleContext = { type : 'angularModuleContext', location: nodeWrapper.node.loc, classes : [] };
            contexts.push(moduleContext);
            return moduleContext;
        }

        //Try to find the object in the symbol table.
        if(symbolTable.hasOwnProperty(object)) {
            object = symbolTable[object];
        }

        if( typeof object.type != 'undefined' && object.type == 'angularModuleContext' ) {
            switch(property) {
                case 'factory' :
                    // Create a new angular factory context and add it to the parent angular context.
                    var factoryContext = { type : 'angularFactoryContext', location: nodeWrapper.node.loc };
                    object.classes.push(factoryContext);
                    return factoryContext;
                    break;
                case 'service' :
                    // Create a new angular service context and add it to the parent angular context.
                    var factoryContext = { type : 'angularServiceContext', location: nodeWrapper.node.loc };
                    object.classes.push(factoryContext);
                    return factoryContext;
                    break;
                case 'directive' :
                    // Create a new angular directive context and add it to the parent angular context.
                    var factoryContext = { type : 'angularDirectiveContext', location: nodeWrapper.node.loc };
                    object.classes.push(factoryContext);
                    return factoryContext;
                    break;
                case 'controller' :
                    // Create a new angular controller context and add it to the parent angular context.
                    var factoryContext = { type : 'angularControllerContext', location: nodeWrapper.node.loc };
                    object.classes.push(factoryContext);
                    return factoryContext;
                    break;
                default :
                    break;
            }
        }
        return object + "." + property;
    },
    FunctionExpression : function(nodeWrapper) {
        if(this.curContext) {
            // Steal the current Context from the global state to prevent issues with recursion for functions that may exist inside the body.
            var myContext = this.curContext;
            this.curContext = null;

            var members = nodeWrapper.body.visit(this);

            switch(myContext.type) {
                case 'angularFactoryContext':
                    //If the requirements haven't been determined yet, get them from the function params.
                    if(typeof myContext.requirements == 'undefined') {
                        myContext.requirements = [];
                        var self = this;
                        nodeWrapper.params.nodes.forEach(function(curParam){
                            myContext.requirements.push(curParam.visit(self));
                        });
                    }
                    break;
                default:
                    break;
            }

            // return the current Context to the global state.
            this.curContext = myContext;
        }
        return nodeWrapper.node.type;
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
        symbolTable[nodeWrapper.id.visit(this)] = nodeWrapper.init.visit(this);
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

console.log(contexts);
console.log(contexts[0].classes);