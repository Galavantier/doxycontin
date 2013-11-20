/*
 * @file example.js
 * this is a test file
 * @namespace about_us_module
 */
angular.module('about_us_module', ['$q'])
/*
 * @class teamMemberFactory
 */
    .factory('teamMemberFactory', ['$http', '$q',
    /*
     * the constructor for teamMemberFactory
     * @return promise
     */
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
    return {};
});