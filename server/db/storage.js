
//Police locations are stored into a hashmap. Keys are in the format of 'lat,lng',
//where the lat and lng are rounded to the nearest tenth. Each key holds a bucket that contains
//the coordinates of all of the cops in that section
var db = require('./db')
var data = {};
var id = 0;

var roundCoordinates = function(lat, lng) {
  var latTenth = Math.round(lat * 10) / 10;
  var lngTenth = Math.round(lng * 10) / 10;

  return [latTenth, lngTenth];
};

module.exports.add = function(lat, lng) {
  //Save the given lat and lng into the storage
  var key = roundCoordinates(lat, lng);
  if (!data[key]) {
    data[key] = [];
  }
  var sighting = {
    lat: lat,
    lng: lng,
    time: Date.now(),
    id: id
  };
  id++;
  console.log(sighting);
  data[key].push(sighting);
};

module.exports.findNearest = function(lat, lng) {
  //Search for the four nearest lat and lng segments and return all police coordinates
  //will add the next closest tenth lat and lng
  var coords = roundCoordinates(lat, lng);

  var nextLat;
  var nextLong;
  if (Math.round(lat * 100) / 10 === coords[0]) {
    nextLat = Math.abs(coords[0] - 0.1) * (coords[0] > 0 ? 1 : -1);
  } else {
    nextLat = Math.abs(coords[0] + 0.1) * (coords[0] > 0 ? 1 : -1);
  }

  if (Math.round(lng * 100) / 10 === coords[1]) {
    nextLng = Math.abs(coords[1] - 0.1) * (coords[1] > 0 ? 1 : -1);
  } else {
    nextLng = Math.abs(coords[1] + 0.1) * (coords[1] > 0 ? 1 : -1);
  }

  //create the four nearest quadrants to lookup
  var lookup = [
    [coords[0], coords[1]].toString(),
    [nextLat, coords[1]].toString(),
    [coords[0], nextLng].toString(),
    [nextLat, nextLng].toString()
  ];

  var results = [];
  for (var i = 0; i < lookup.length; i++) {
    if (data[lookup[i]]) {
      results = results.concat(data[lookup[i]]);
    }
  }

  return results;
};