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


  var attachInstructionText = function(marker, text) {
    google.maps.event.addListener(marker, 'click', function() {
      // Open an info window when the marker is clicked on
      stepDisplay.setContent(text);
      stepDisplay.open(map, marker);
    });
  };

  var placemarkers = function(places, delay) {
    //Place each marker on the map
    for (var i = 0; i < places.length; i++) {
       setDelay(i, places);
    }
    // set delay for dropping each marker
    function setDelay(j, places) {
      setTimeout(function() {
        var lat = places[j].location.coordinate.latitude;
        var lng = places[j].location.coordinate.longitude;
        var description = renderView(j, places);
        
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
        }else {
          img = "images/elsePin.png";
        }

        var marker = new google.maps.Marker({
          map: map,
          position: new google.maps.LatLng(lat,lng),
          animation: google.maps.Animation.DROP,
          optimized: false,
          icon: img
        });

        //Setup the pop-up box that opens when you click a marker
        attachInstructionText(marker, description);
        markerArray[j] = marker;
      }, i * delay);
    }
  };




  return {
    placemarkers: placemarkers
  };
});
