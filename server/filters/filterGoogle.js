//Filter coordinates received from front end POST request
//into a smaller number of coordinates for Yelp requests
var coord = require('../helpers/coordinateHelpers.js');

var filter = function(requestBody){
  var distance = requestBody.distance;  //Total trip distance
  var coordArray = requestBody.waypoints; //All of the coordinate points along the route returned by Google

  //parse distance into an int
  distance = distance.replace(/\,/g,"").split(" ");
  distance = parseInt(distance[0]);

  //Make a query every 10 miles along the path;
  var distanceBetweenQueries = 10;

  //The coordArray points are not equally distant from one another so distanceBetweenPoints is an approximate value
  var distanceBetweenPoints = Math.ceil(coordArray.length / distance);
  var filteredCoords = [];

  var dist = 0;
  var temp = 0;
  //Loop through each coordinate along the route and only add the coordinates that are distanceBetweenQueries apart
  filteredCoords.push(coordArray[0]);
  for (var i = 1; i < coordArray.length - 1; i++){
    //Calculates the distance between two points based on their lat/long, select points every 10 miles
    temp = coord.calcDistance(coordArray[i - 1].split(','), coordArray[i].split(','));
    dist += temp;
    counter += temp;
    if(counter > distanceBetweenQueries){
      filteredCoords.push(coordArray[i]);
      counter = 0;
    }

  
  //Loop through each coordinate along the route and only add the coordinates that are distanceBetweenQueries apart
  for (var i = 0; i < coordArray.length; i += distanceBetweenPoints){
    filteredCoords.push(coordArray[i]);
  }
  
  return {
    distance: distance,
    filteredCoords:filteredCoords
  };
};

module.exports = filter;
