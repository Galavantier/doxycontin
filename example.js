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

var globalFunc = function(w,t,f){};