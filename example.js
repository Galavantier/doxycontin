/*
 * @file example.js
 * this is a test file
 * @namespace about_us_module
 */
var module = angular.module('about_us_module', ['$q'])
    .factory('teamMemberFactory', ['$http', '$q', function($http, $q) {
        return {
            someval : true,
            someFunc : function(x,y,z) {}
        };
    }])
.controller('moreInfoController', ['$scope', function($scope) {
        $scope.isBoxOpen = false;
        $scope.btnLabel = 'read more';
        $scope.btnArrow = 'icon-down-dir';

        /**
         * lkjsflkjsdf
         * @param  {[type]} a [description]
         * @param  {[type]} b [description]
         * @param  {[type]} c [description]
         * @return {[type]}   [description]
         */
        $scope.toggleBox = function(a,b,c) {
            if ($scope.isBoxOpen) {
                $scope.isBoxOpen = false;
                $scope.btnLabel = 'read more';
                $scope.btnArrow = 'icon-down-dir';
            } else {
                $scope.isBoxOpen = true;
                $scope.btnLabel = 'read less';
                $scope.btnArrow = 'icon-up-dir';
            }
        };
    }]);