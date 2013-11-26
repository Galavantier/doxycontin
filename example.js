var module = angular.module('example_module', ['$q'])
/**
 * animations and stuffz
 */
.animation('teamBio-hide', function($http) {
    return {
      start : function(element, done, memo) {
        element.slideUp(600,function(){ done(); });
      }
    }
    });