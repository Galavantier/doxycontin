/**
 * @file visitorPattern.js
 * Facilitates the visitor pattern by creating wrapper objects around the Esprima ast nodes.
 * The idea behind this module is based on Drupal Entity Wrappers, and the wrapper pattern in general.
 * The visitor pattern could be implemented differently, but this way creates a nice syntax in my opinion.
 */

/**
 * Creates a visitor object that can be used to traverse an Esprima Abstract Syntax Tree using the visitor pattern.
 * If the 'default' visit function is not defined, one will be created that simply visits all the children nodes.
 * @param  {object} visitorMap An object that maps node types to functions that perform operations on the nodes.
 *                             Each function will receive a visitorNodeWrapper as it's only argument.
 *                             Example: { nodetype : function(nodeWrapper) {...}, (Optional)default : function(nodeWrapper){...} }
 * @return visitor            A visitor object that can be passed into a visitorNodeWrapper .visit() function.
 */
exports.visitorFactory = function (visitorMap) {
	if(typeof visitorMap.default == 'undefined' ) {
		visitorMap.default = function(nodeWrapper) {
			return nodeWrapper.visitAllChildren(this);
		}
	}
	return visitorMap;
};

/**
 * Creates a visitorNodeWrapper object from a raw Esprima AST node.
 * @param  {object} node a raw Esprima AST node. see: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API
 * @return visitorNodeWrapper      a wrapper object that contains the Esprima node as well as several useful methods for the visitor pattern.
 */
exports.visitorNodeWrapperFactory = function (node) {
	var wrapper = { 'type' : 'visitorNodeWrapper', 'node' : node };

	// Create an interface for each child node.
	for (var key in node) {
        if (node.hasOwnProperty(key)) {
            var child = node[key];
            if (typeof child === 'object' && child !== null) {
            	if(Array.isArray(child)) {
            		wrapper[key] = { type: "visitorNodeWrapperChildArray", nodes: [] };
            		child.forEach(function(subNode) {
            			wrapper[key].nodes.push(visitorNodeWrapperChildFactory(subNode));
            		});
            	}
            	else {
	            	wrapper[key] = visitorNodeWrapperChildFactory(node[key]);
	            }
            }
        }
    }

    wrapper.visitAllChildren = function(visitor) {
    	for (var key in wrapper) {
    		if(wrapper.hasOwnProperty(key)){
    			var child = wrapper[key];
    			if(child.type == "visitorNodeWrapperChild") {
    				child.visit(visitor);
    			}
    			else if( child.type == "visitorNodeWrapperChildArray" ) {
    				child.nodes.forEach(function(subChild){
    					subChild.visit(visitor);
    				});
    			}
    		}
    	}
    };

    return wrapper;
};

/**
 * Creates a wrapper object that provides a useful interface to the children nodes of an Esprima Node.
 * The visit method in this object is the key to making the visitor pattern work.
 * @param  {object} childNode a raw Esprima AST node.
 * @return visitorNodeWrapperChild           the interface.
 */
var visitorNodeWrapperChildFactory = function(childNode) {
    return {
        type    : 'visitorNodeWrapperChild',
        'node'  : childNode,
        wrapper : function(){ return exports.visitorNodeWrapperFactory(this.node); },
        visit   : function(visitor) {
            if(typeof visitor == 'function') {
                return visitor(this.get());
            }
            else if(typeof visitor[this.node.type] == 'function' ) {
                return visitor[this.node.type](this.wrapper());
            }
            else if(typeof visitor.default == 'function' ) {
                return visitor.default(this.wrapper());
            }
        }
    };
};