angular.module('app.service', [])

.factory('Utility', function () {
  // this function generate a view to display the restaurant image and link
  var renderView = function(i, places) {
      var description = '<div class="descriptionDiv">' +
        '<a href="'+places[i].url +'" target="_blank">' + '<h1 class="place-name">' + places[i].name + '</h1></a>' +
        '<div style="padding:5px;font-weight:bold;">' + 'Yelp Rating:&nbsp;&nbsp;' +
        '<img style="vertical-align:middle;" src="'+ places[i].rating_img_url +'"/>' + '</div>' +
        '<img src="'+ places[i].image_url +'"/>' +
        '<div class="snippet">' + places[i].snippet_text + '</div>' +
        '<a href="' + places[i].url +'" target="_blank"> Visit on Yelp</a>' +
        '</div>';
    return description;
  };

  //if the yelp marker is clicked it opens an information window for that stop
  var attachInstructionText = function(marker, text) {
    google.maps.event.addListener(marker, 'click', function() {
      // Open an info window when the marker is clicked on
      stepDisplay.setContent(text);
      stepDisplay.open(map, marker);
    });
  };

  //Place each marker on the map
  var placemarkers = function(places) {
    for (var i = 0; i < places.length; i++) {
       setDelay(i, places);
    }
    // set delay for dropping each marker
    function setDelay(i, places) {
      setTimeout(function() {
        var lat = places[i].location.coordinate.latitude;
        var lng = places[i].location.coordinate.longitude;
        var description = renderView(i, places);
        
        //images display upon selection type
        var img;
        if ($('#sel1').val() === "1") {
          img = "images/foodPin.png";
        } else if ($('#sel1').val() === "2") {
          img = "images/nightPin.png";
        } else if ($('#sel1').val() === "3") {
          img = "images/shoppingPin.png";
        } else if ($('#sel1').val() === "4") {
          img = "images/hospPin.png";
        } else if ($('#sel1').val() === "5") {
          img = "images/gasPin.png";
        } else if ($('#sel1').val() === "6") {
          img = "images/petPin.png";
        } else {
          img = "images/elsePin.png";
        }

        var marker = new google.maps.Marker({
          map: map,
          position: new google.maps.LatLng(lat,lng),
          animation: google.maps.Animation.DROP,
          icon: img
        });

        //Setup the pop-up box that opens when you click a marker
        attachInstructionText(marker, description);
        markerArray[i] = marker;
      }, i * 300);
    }
  };

  return {
    placemarkers: placemarkers
  };
})

.factory('Maps', function($http) {
  //This function sends a POST to the server at route /csearch with all waypoints along route as data
  var sendPost = function(routeObject){
    return $http.post('/search', routeObject)
      .then(function(response, error){
        //POST request successfully sent and response code was returned
        console.log('response: ', response);
        if(error){
          console.log('error: ', error);
        }
        return response;
      });
    };

  return {
    sendPost: sendPost
  };
});
