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
    CallExpression : function(nodeWrapper) {
        //find out what type of thing is getting called.
        var callee = nodeWrapper.callee.visit(this);
    },
    MemberExpression : function(nodeWrapper) {
        var object   = nodeWrapper.object.visit(this);
        var property = nodeWrapper.property.visit(this);
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
