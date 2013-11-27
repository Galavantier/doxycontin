var module = angular.module('example_module', ['$q'])
/**
 * service and stuffz
 */
.service('DOMevents', ['$rootScope', function($rootScope) {
  var service = {};

  service.initFiltersAndSortby = function(scope) {
    jQuery('html').on('click', function(e) {
      var isFirefox = typeof InstallTrigger !== 'undefined';
      var element = (isFirefox) ? jQuery(e.target) : jQuery(e.srcElement);

      // If not filters options are selected, we turn off the filters.
      var filtersSelected = (element.closest('.filters-wrapper').length > 0);
      if (filtersSelected == 0) {
        scope.$apply(function() {
          scope.filterDropdownVisible = false;
        });
      }

      // If not sortby options are selected, we turn off the sortby.
      var sortbySelected = (element.closest('.sortby-wrapper').length > 0);
      if (sortbySelected == 0) {
        scope.$apply(function() {
          scope.sortbyDropdownVisible = false;
        });
      }
    });
  }

  return service;
}]);