	.directive('stickyNav', [function(){
		return {
			transclude : true, // must have transclude so that any controllers inside the directive will work
			template : '<div data-ng-transclude=""></div>', // We must have a template for transclude to work
			scope : {
        		stickyStart	: "@", // Either an element id or a number
        		stickyEnd	: "@"  // Either an element id or a number
		    },
		    link : function($scope, $element, $attrs) {
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
	}])
	.controller('moreInfoController', ['$scope', function($scope) {
		$scope.isBoxOpen = false;
		$scope.btnLabel = 'read more';
		$scope.btnArrow = 'icon-down-dir';

		$scope.toggleBox = function() {
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
	}])
	.controller('imgGalleryController', ['$scope', function($scope) {
		$scope.imgGalleryText = [
			{title:'A brief overview of Galavantier', desc:'How Galavantier is changing the way travelers book their Las Vegas experience.'},
			{title:'Galavantier on Fox 5: Marko and Zeke Introduction', desc:'Marko Greisen and Zeke Quezada discuss Galavantier on Fox 5'},
			{title:'Memorial Day Weekend Travel with Galavantier.com on CBS Las Vegas', desc:'CEO, Marko Greisen of Galavantier Travel was featured on Las Vegas local CBS affiliate 8 News Now morning show with Chris Saldana.'},
			{title:'Marko, accepting the Key to the City of Las Vegas', desc:'Mayor Oscar Goodman and the Las Vegas City Council recognize Marko with the Key to City for playing a integral role in the development of Las Vegas nightlife.'},
			{title:'Getting ready to bring in NYE 2006 minutes before midnight on ABC live and wish hundreds of thousands of people happy new years!', desc:'Christina Brown and Ron Futrell live from the Palms in Las Vegas. New Years Eve 2006. Kelly Clarkson, Terrell Owens, George Maloof and Marko Greisen are featured on ABC Las Vegas.'},
			{title:'Marko Greisen, who celebrated his 30th birthday party at the Palms Skin Pool Lounge with more than 1,000 well-wishers.', desc:'The revelers included actor Jamie Foxx, jock Jalen Rose, rapper Too Short, UFC fighter Tito Ortiz,  Chef Kerry Simon, Robin Leach, Dennis Haskins ("Saved by the Bell"), and DJ Curious George, also known as wealthy hotel owner George Maloof.'}
		];
		$scope.active = $scope.imgGalleryText[0];
		$scope.activeIndex = 0;

		var clickedThumb = false;
		var clickedPrev  = false;
		var clickedNext  = false;

		$scope.goTo = function(index) {
			$scope.active = $scope.imgGalleryText[index];
			$scope.activeIndex = index;
		}

		$scope.clickThumb = function(index) {
			clickedThumb = true;
			$scope.activeIndex = index;
		}

		$scope.next = function() {
			$scope.activeIndex = ($scope.activeIndex+1)%6;
			clickedNext = true;
		}

		$scope.prev = function() {
			$scope.activeIndex = ($scope.activeIndex-1);
			if ($scope.activeIndex < 0) {
				$scope.activeIndex = 5;
			}
			clickedPrev = true;
		}

		// Youtube API
		$scope.youtube = [];
		window.onYouTubeIframeAPIReady = function() {
			// Make two new youtube videos
			$scope.youtube[0] = new YT.Player(jQuery('.youtube-container')[0], {
	            height: 243,
	            width: 432,
	            videoId: 'Uz8RvhI4_3c',
	            events: {
		        	'onStateChange': onPlayerStateChange
		        }
	        });
			$scope.youtube[1] = new YT.Player(jQuery('.youtube-container')[1], {
	            height: 243,
	            width: 432,
	            videoId: 'QI_tEbS4u9M',
	            events: {
		        	'onStateChange': onPlayerStateChange
		        }
	        });
	        $scope.youtube[2] = new YT.Player(jQuery('.youtube-container')[2], {
	            height: 243,
	            width: 432,
	            videoId: '4RB1JH4Yk-U',
	            events: {
		        	'onStateChange': onPlayerStateChange
		        }
	        });

	        // Pause the slideshow when a video starts playing
	        function onPlayerStateChange(event) {
		    	if (event.data == YT.PlayerState.PLAYING) {
				    jQuery('#about-us-carousel').carousel('pause');
			    }
		    }

	        // Fix to make youtube iframes respect z-index
		    jQuery('iframe').each(function(){
		          var url = jQuery(this).attr("src");
		          var char = "?";
		          if(url.indexOf("?") != -1){
		                  var char = "&";
		           }
		          jQuery(this).attr("src",url+char+"wmode=transparent");
		    });
		};
		window.setTimeout(function(){
			window.onYouTubeIframeAPIReady();
		}, 300);

		// Hook into the Twitter Bootstrap code
		jQuery('#about-us-carousel').on('slide', function() {
			$scope.$apply(function() {
				if(clickedThumb == true) {
					$scope.goTo($scope.activeIndex);
					clickedThumb = false;
				}
				else if(clickedPrev == true) {
					$scope.goTo($scope.activeIndex);
					clickedPrev = false;
				}
				else if(clickedNext == true) {
					$scope.goTo($scope.activeIndex);
					clickedNext = false;
				}
				else {
					$scope.activeIndex = ($scope.activeIndex+1)%6;
					$scope.goTo($scope.activeIndex);
				}
				// Pause the video on any slide action
				for (var i = 0; i < $scope.youtube.length; i++) {
					$scope.youtube[i].stopVideo();
				};
			});
		});
	}])
	.controller('sidebarController', ['$scope', '$location', function($scope, $location) {
			$scope.isActive;

	    jQuery('document').ready(function(){
	    	jQuery('html,body').scrollTo(0,0);
	    	if($location.hash() != '' && $location.hash().search('-Bio') == -1) {
	    		jQuery('html,body').scrollTo(jQuery('#'+$location.hash()), jQuery('#'+$location.hash()), { gap : {x:0, y:0} });
	    	}
	    });

	    $scope.scrollTo = function(id) {
	    	$scope.isActive = id;
	    	$location.hash(id);
	    	jQuery('html,body').scrollTo(jQuery('#'+id), jQuery('#'+id), { gap : {x:0, y:0} });
	    }
	}])
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
	}])
	.animation('readMore-show', function() {
	  return {
	    setup : function(element) {
	      element.hide();
	    },

	    start : function(element, done, memo) {
	      element.slideDown(600,function(){ done(); });
	    }
	  }
	})
	.animation('readMore-hide', function() {
    return {
      start : function(element, done, memo) {
        element.slideUp(600,function(){ done(); });
      }
    }
	})
	.animation('teamBio-show', function() {
	  return {
	    setup : function(element) {
	      element.hide();
	    },

	    start : function(element, done, memo) {
	      element.slideDown(600,function(){ jQuery('html,body').scrollTo(element, element, { gap : {x:0, y:-270} }); done(); });
	    }
	  }
	})
	.animation('teamBio-hide', function() {
    return {
      start : function(element, done, memo) {
        element.slideUp(600,function(){ done(); });
      }
    }
	})