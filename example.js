/*
 * @file example.js
 * this is a test file
 * @namespace about_us_module
 */
var module = angular.module('about_us_module', ['$q'])
/*
 * @class teamMemberFactory
 */
    .factory('teamMemberFactory', ['$http', '$q',
    function($http, $q) {
        var teamMembers;
        var wait = $q.defer();

        $http.get('/about-us/get-team-members/')
            .success(
                function (data, status) {
                    wait.resolve(data);
                }
            );

        return wait.promise;
}])
.factory('testFactory', function($q, $rootScope){
    var a = {};
    a.testfunc = function(stuff){};
    a.testfunc();
    return a;
});

module.factory('objFactory', function($http){
    return {
        publicVar : false,
        funcA : function(stuff){

        }
    };
});