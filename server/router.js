var requestHandler = require('./request-handler');
var filter = require('./filters/filterGoogle');
var express = require('express');
var router = express.Router();
var path = require('path');
var storage = require('./db/storage');

router.post('/search', function(req, res) {
  console.log('(POST "/search") Now searching the Yelp API...');
  //call the google filter to return only the points along the route that are n distance apart
  var googleFilterObj = filter(req.body);

  var googleCoords = googleFilterObj.filteredCoords;
  var distance = googleFilterObj.distance;

  requestHandler.performSearch(req, res, googleCoords, distance);
});

router.get('/main', function (req, res) {
  res.sendFile(path.join(__dirname,'../client', 'main.html'));
});

router.get('/police', function (req, res) {
  console.log('GET to /police: ', req.query);
  var lat = req.query.lat;
  var long = req.query.long;
  
  var data = storage.findNearest(lat, long);
  
  res.send(data);
});

router.post('/police', function (req, res) {
  console.log('POST to /police');
  if (typeof req.body.lat === 'number' && typeof req.body.long === 'number') {
    storage.add(req.body.lat, req.body.long);
    res.status(201).send('Location saved');
  } else {
    res.status(500).send('Lat and Long are not valid');
  }
});

router.post('/*', function(req, res) {
  console.log('POST to unknown page - redirecting to homepage.');
  res.redirect('/');
});

router.get('/*', function (req, res) {
  res.redirect('/');
});

module.exports = router;
