angular.module('app', ['autofill-directive', 'ngRoute', 'app.service'])

.controller('mapCtrl', ['$scope', '$http', '$element', 'Maps', 'Utility', function($scope, $http, $element, Maps, Utility) {
  //initialize the user input option selector
  $scope.optionSelections = [
    {name: 'Everything', value:""},
    {name: 'Food', value:"food"},
    {name: 'NightLife', value:"nightlife"},
    {name: 'Shopping', value:"shopping"},
    {name: 'Medical', value:"medical"},
    {name: 'Gas', value:"gas"},
    {name: 'Pets', value:"pets"}
  ];
  //set default option filter to "food"
  $scope.optionFilter = $scope.optionSelections[1].value;
  //initialize the geoCodeNotSuccessful to be used for determining valid continental destination or not
  $scope.geoCodeNotSuccessful = false;

  //put police car on current location
  $scope.copLocation = function() {
    //current position
    var pos;

    function sendData() {
      //send position to "/police"
      $http.post('/police', pos).
      success(function(data, response) {
        console.log('response: ', response);
      }).
      error(function(data,response) {
        console.log('response: ', response);
        console.log("Failed to send data!");
      });
    }

    if (currLat && currLong) {
      pos = {
        lat: currLat,
        lng: currLong
      };
      sendData();
    }

    if(navigator.geolocation) {

      navigator.geolocation.getCurrentPosition(function(position) {
        //get current position
        pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        sendData();
      }, 
      function() {
        handleNoGeolocation(true);
      });
    }
  };

  $scope.appendWarningMsg = function() {
    //checks if inputs are valid
    //check if start input is valid
    if ($("#start").val() === "") {
      //if is not valid, change border to red
      $("#start").css({border:"3px solid red" });
      //change placeholder text
      $("#start").attr("placeholder", "Please enter your starting location");
    } else {
      $("#start").css({border:"1px solid rgb(153, 153, 153)"});
    }
    //end if start input is valid
    if ($("#end").val() === "") {
      //if is not valid, change border to red
      $("#end").css({border:"3px solid red" });
      //change placeholder text
      $("#end").attr("placeholder", "Please enter your destination location");
    } else {
      $("#end").css({border:"1px solid rgb(153, 153, 153)"});
    }
  };

  //button for getting directions
  $scope.getDirections = function() {
    //change button name and display/hide directions
    if ($("#getDir").text() === "Show Directions") {
      $("#getDir").text("Hide Directions");
      //show directions
      $("#directions-panel").show();
    } else {
      $("#getDir").text("Show Directions");
      //hide directions
      $("#directions-panel").hide();
    }
  };

  //button for finding location
  var currentLocationMarker;
  var watchId; //Watcher for current position
  var currLat;
  var currLong;
  $scope.locationFinder = function() {
    //insert locading image
    $scope.image =  {
      size: {width: 25, height: 25},
      path:'./images/loader.gif'
    };
    //get current latitude and longitude
    var lat,lng;
    var makeGooglePos = function(position) {
      return new google.maps.LatLng( position.coords.latitude,
                                     position.coords.longitude );
    };
    navigator.geolocation.getCurrentPosition(function(position) {
      //set current latitude and longitude
      lat = position.coords.latitude;
      lng = position.coords.longitude;
      //if lng and lat is defined then get address 
      if (lng && lat) {
        function getAddress(position) {
          var latlng = makeGooglePos(position);
          var geocoder = new google.maps.Geocoder();
          geocoder.geocode({ 'latLng': latlng }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
              if (results[1]) {
                $("#image").hide(); //hide loader image
                $("#start").val(results[1].formatted_address); //display address
              }
            } else {
              console.log('error with geolocater: ', status);
            }
          });
          map.setCenter(latlng);
        }
        getAddress(position);
      }
    });
    //Watch the current location and keep a marker on the map. Save the current position
    if (!watchId) {
      watchId = navigator.geolocation.watchPosition(function(position) {
        if (position.coords.latitude && position.coords.longitude) {
          //These are the saved current position as it updates
          currLat = position.coords.latitude;
          currLong = position.coords.longitude;
          var latlng = makeGooglePos(position);
          if (currentLocationMarker) {
            currentLocationMarker.setPosition(latlng);
          } else {
            currentLocationMarker = new google.maps.Marker({
              position: latlng,
              map: map,
              title: 'Current Position',
              animation: google.maps.Animation.BOUNCE,
              icon: 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png'
            });
          }
        }

        //get police locations from server
        $http.get('/police', {params: {lat: currLat,lng: currLong}}).
          success(function(data, status, headers, config) {
            console.log("status: ",status);
            //custom police pin on position
            for (var i = 0; i <data.length; i++) {
              var pos = {
                lat: data[i].lat,
                lng: data[i].lng
              };
              var infowindow = new google.maps.Marker({
                map: map,
                position: pos,
                animation: google.maps.Animation.DROP,
                optimized: false,
                title: 'Police Position',
                zIndex: 100,
                icon: "images/copPin.gif"
              });
            }
          }).
          error(function(data, status) {
            console.log("status: ",status);
          });
      });
    }

  };

  var submitReady = true;

  $scope.submit = function(city) {
    //If a route is already being calculated, do not continue until it completes
    if (!submitReady) {
      return;
    } else {
      submitReady = false;
    }

    $scope.geoCodeNotSuccessful = false;  // every time when submit button is pressed, reset the geoCodeNotSuccessful to false
   
    console.log("SCOPE ENTIRE: ", $scope.location);
    //clears any markers the user has entered by clicking
    if (clickMarkerArray.length !== '[]') {
      clickMarkerArray[0].setMap(null);
      clickMarkerArray[1].setMap(null);
      var cleared = clickMarkerArray.splice(0);
    }
    var startGeo, endGeo;

    calcRoute();

    function calcRoute() {
      // New directionsService object to interact with google maps API
      var directionsService = new google.maps.DirectionsService();
      // clear markers whenever new search
      for (var i = 0; i < markerArray.length; i++) {
        markerArray[i].setMap(null);
      }

      // create object to send to Google to generate directions
      var request = {
        origin: $scope.location.start,
        destination: $scope.location.end,
        travelMode: google.maps.TravelMode.DRIVING
      };

      //send request to Google Maps Directions API with request object as data
      directionsService.route(request, function(response, status) {

        // successfully get the direction based on locations
        if (status === google.maps.DirectionsStatus.OK) {
           
          //enable direction button if address is valid
          $("#getDir").attr("disabled",false);

          $scope.geoCodeNotSuccessful=false;  
          //Update the map on index.html
          directionsDisplay.setDirections(response);

          console.log("DIRECTIONS RESPONSE: ", response);
          console.log("LENGTH: ", response.routes[0].overview_path.length);
          console.log("OVERVIEW PATH: ", response.routes[0].overview_path);
          console.log("LEGS: ", response.routes[0].legs);

          // objects to be sent to backend
          var sendData = {
            distance: response.routes[0].legs[0].distance.text,
            optionFilter: $scope.optionFilter,
            waypoints: {}
          };

          //gather all points along route returned by Google in overview_path property
          //and insert them into waypoints object to send to server
          for (var j = 0; j < response.routes[0].overview_path.length; j++) {
            sendData.waypoints[j] = response.routes[0].overview_path[j].k + "," + response.routes[0].overview_path[j].D;
          }

          console.log("sendData: ", sendData);
          $scope.appendWarningMsg($scope.geoCodeNotSuccessful); // append the blank (no warning) message to main.html

          // Send all waypoints along route to server
          Maps.sendPost(sendData)
          .then(function(res) {
            console.log("PROMISE OBJ: ", res.data.results);
            // get back recommendations from Yelp and display as markers
            var delay = 300; //delay for placing each marker
            Utility.placemarkers(res.data.results, delay);
            setTimeout(function() {
              submitReady = true;
            }, delay);
            $scope.distance = "You have  " + res.data.results.length + " spots to pick from in " + 
            sendData.distance + ".";
            $scope.topTen = res.data.topTen;
            console.log(res.data.results);
          });
        } else {

          //disable direction button since address is invalid
          $("#getDir").attr("disabled",true);

          //Log the status code on error
          console.log("Geocode was not successful: " + status);
          //set the geoCodeNotSuccessful to true

          submitReady = true;
          $scope.geoCodeNotSuccessful = true;
          $scope.appendWarningMsg($scope.geoCodeNotSuccessful); // append the warning message to main.html
        }
      });
    }
  };
}])
.factory('Maps', ['$http', function($http) {
  //This function sends a POST to the server at route /csearch with all waypoints along route as data
  var sendPost = function(routeObject){
    return $http.post('/search', routeObject)
      .then(function(response, error){
        //POST request successfully sent and response code was returned
        console.log('response: ', response);
        console.log('error: ', error);
        return response;
      });
    };

  return {
    sendPost: sendPost
  };

}]);
