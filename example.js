var module = angular.module('example_module', ['$q'])
    .controller('teamBioController', ['$scope', 'teamMemberFactory', '$location', function($scope, teamMemberFactory, $location) {
        $scope.teamMembers = null;

        teamMemberFactory.then(function(data){
            $scope.teamMembers = data;
            $scope.rows = [];
            var numPplRow;

            var viewPort = jQuery(window).width();

            numPplRow = 4;

            // viewport for tablet
            if ( viewPort <= 767 ) {
                numPplRow = 3;
            }

            // viewport for phone
            if ( viewPort <= 480 ) {
                numPplRow = 2;
            }

            var rowCount = 0;
            var currRow = 0;
            var currRowArray = [];
            $scope.bioBoxOpen = -1;
            for (var i = 0; i < $scope.teamMembers.length; i++) {
                currRowArray.push($scope.teamMembers[i]);

                rowCount++;
                if (rowCount == numPplRow) {
                    rowCount = 0;
                    $scope.rows.push(currRowArray);
                    currRowArray = [];
                    currRow++;
                }

            };
            if (rowCount > 0) {
                $scope.rows.push(currRowArray);
            }

            $scope.selectedMember;

            /**
             * sljfalskdfj
             * @param  object member [description]
             * @param  int rowNum [description]
             */
            $scope.clickMember = function(member,rowNum) {
                $scope.selectedMember = member;
                $scope.bioBoxOpen = rowNum;

                $location.hash(member.name.replace(' ', '-') + '-Bio');
            }
            $scope.closeMember = function() {
                $scope.bioBoxOpen = -1;

                // We have to change this after a timeout so that the close animation does not pop.
                window.setTimeout(function(){
                    $scope.$apply(function(){ $scope.selectedMember = null; });
                }, 600);
            }

            if($location.hash().search('-Bio') != -1) {
                var name = $location.hash().replace('-', ' ').replace('-Bio', '');
                for (var i = 0; i < $scope.rows.length; i++) {
                    for(var j = 0; j < $scope.rows[i].length; j++) {
                        if($scope.rows[i][j].name == name) {
                            $scope.clickMember($scope.rows[i][j], i);
                            break;
                        }
                    }
                };
            }
        });
    }]);