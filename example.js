/*
 * @file example.js
 * this is a test file
 * @namespace about_us_module
 */
var module = angular.module('about_us_module', ['$q'])
.directive('stickyNav', [function(){
        return {
            transclude : true, // must have transclude so that any controllers inside the directive will work
            template : '<div data-ng-transclude=""></div>', // We must have a template for transclude to work
            scope : {
                stickyStart : "@", // Either an element id or a number
                stickyEnd   : "@"  // Either an element id or a number
            },
            link : function($scope, $element, $attrs) {
                var someParam = $attrs.stuffIsAttr;
                var addAffixClasses = function(scrollTop) {

                    var footerStart = jQuery(document).height() - Number($scope.stickyEnd);

                    var documentRemaining = footerStart - scrollTop;

                    if( scrollTop < (Number($scope.stickyStart)) ) {
                        $element.removeClass('affix-bottom').removeClass('affix').addClass('affix-top');
                    }
                    else if( documentRemaining > $element.height() ) {
                        $element.removeClass('affix-top').removeClass('affix-bottom').addClass('affix');
                    }
                    else {
                        $element.removeClass('affix-top').removeClass('affix').addClass('affix-bottom');
                    }
                };

                jQuery('document').ready(function(){
                    addAffixClasses(jQuery(window).scrollTop());

                    jQuery(window).scroll(function(){
                        addAffixClasses(jQuery(this).scrollTop());
                    });
                });
            }
        };
    }]);