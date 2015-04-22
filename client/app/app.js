angular.module('app', ['autofill-directive', 'ngRoute', 'app.service'])

.controller('mapCtrl', ['$scope', '$element', 'Maps', 'Utility', function($scope, $element, Maps, Utility) {

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

  $scope.appendWarningMsg = function(isInvalid) {
    // invalid message template
    var pInvalid = angular.element("<p id='warningMsg'/>");
    pInvalid.text("Please choose a continental location and resubmit");
    // valid message template
    var pValid = angular.element("<p id='warningMsg'/>");
    pValid.text("");
    //check to see if the location entered is invalid
    //if location is invalid, then append invalid message 
    // else, append a blank message 
    if (isInvalid) {
      $element.find("main-area").append(pInvalid);
    } else {
      $element.find("main-area").append(pValid);
    }
  };

  //button for finding location
  $scope.locationFinder = function() {
    //insert locading image
    $scope.image =  {
      size: {width: 25, height: 25},
      path:'./images/loader.gif'
    };
    //get current latitude and longitude
    var lat,lng;
    navigator.geolocation.getCurrentPosition(function(position) {
      //set current latitude and longitude
      lat = position.coords.latitude;
      lng = position.coords.longitude;
      //if lng and lat is defined then get address 
      if (lng && lat) {
        function getAddress(lat,lng) {
          var latlng = new google.maps.LatLng(lat, lng);
          var geocoder = new google.maps.Geocoder();
          geocoder.geocode({ 'latLng': latlng }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
              if (results[1]) {
                $("#image").hide() //hide loader image
                $("#start").val(results[1].formatted_address); //display address
              }
            }
          });
        }
        getAddress(lat,lng);
      }
    });
  };

  $scope.submit = function() {
    $scope.geoCodeNotSuccessful = false;  // every time when submit button is pressed, reset the geoCodeNotSuccessful to false
    $element.find("main-area").empty();   // clear out the warning messages from previous location input
    console.log("SCOPE ENTIRE: ", $scope.location);

    calcRoute();

    function calcRoute() {
      // New directionsService object to interact with google maps API
      var directionsService = new google.maps.DirectionsService();
      // clear markers whenever new search
      for (var i = 0; i < markerArray.length; i++) {
        console.log("marker array: ",markerArray)
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
            waypoints: [],
          };

          //gather all points along route returned by Google in overview_path property
          //and insert them into waypoints object to send to server
          for (var j = 0; j < response.routes[0].overview_path.length; j++) {
            sendData.waypoints.push(response.routes[0].overview_path[j].k + "," + response.routes[0].overview_path[j].D);
          }

          console.log("sendData: ", sendData);
          $scope.appendWarningMsg($scope.geoCodeNotSuccessful); // append the blank (no warning) message to main.html

          // Send all waypoints along route to server
          Maps.sendPost(sendData)
          .then(function(res){
            console.log("PROMISE OBJ: ", res.data.results);
            // get back recommendations from Yelp and display as markers
            Utility.placemarkers(res.data.results);
            $scope.distance = "You have  " + res.data.results.length + " spots to pick from in " + 
            sendData.distance + ".";
            $scope.topTen = res.data.topTen;
          });
        } else {
          //Log the status code on error
          console.log("Geocode was not successful: " + status);
          //set the geoCodeNotSuccessful to true

          $scope.geoCodeNotSuccessful = true;
          $scope.appendWarningMsg($scope.geoCodeNotSuccessful); // append the warning message to main.html
        }
      });
    }
  };
}])

