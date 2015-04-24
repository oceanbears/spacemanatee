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
  var lat = parseFloat(req.query.lat);
  var lng = parseFloat(req.query.lng);
  
  storage.findNearest(lat, lng, function(err, data) {
    if (err) {
      console.error('Error during GET: ', err);
      res.status(500).send(err);
    } else {
      console.log('Retrieved from DB');
      console.log(data.rows);
      res.status(200).send(data.rows);
    }
  });
});

router.post('/police', function (req, res) {
  console.log('POST to /police');
  var lat = req.body.lat;
  var lng = req.body.lng;
  if (typeof req.body.lat === 'number' && typeof req.body.lng === 'number') {
    storage.add(lat, lng, function(err, result) {
      if (err) {
        console.error('Error during POST: ', err);
        res.status(500).send(err);
      } else {
        console.log('Inserted into DB')
        res.status(201).send('Location saved');
      }
    });
  } else {
    res.status(500).send('Lat and Long are invalid');
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
