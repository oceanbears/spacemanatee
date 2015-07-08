var yelp = require('./yelp');
var coord = require('./coordinateHelpers');
//key should only be loaded if not in heroku production environment
if (!process.env.KEY) {
  var key = require('../api/api_key');
}

// create yelp client using Oauth
var yelpClient = yelp.createClient({
  consumer_key: process.env.KEY || key.consumer_key,
  consumer_secret: process.env.CONSUMER_SECRET || key.consumer_secret,
  token: process.env.TOKEN || key.token,
  token_secret: process.env.TOKEN_SECRET || key.token_secret,
  ssl: process.env.SSL || key.ssl
});

// Yelp search parameter configuration defaults
var yelpProperty = {
  term: "food",             // Type of business (food, restaurants, bars, hotels, etc.)
  limit: 10,                // Number of entries returned from each call
  sort: 2,                  // Sort mode: 0=Best matched (default), 1=Distance, 2=Highest Rated
  radius_filter: 1609.34  // Search radius: 1 mile = 1609.3 meters, 5 miles is good for rural areas. Multiply by number of miles
};

function isAlreadyInArray(array, target) {
  for (var i = 0 ; i < array.length; i++) {
    if (array[i].name === target.name) {
      return true;
    }
  }
  return false;
}

// check if a place is a common place to be filtered out
var commonFilter = ["McDonald's", "Burger King", "Jack in the Box", "Carl's Junior", "StarBucks", "Subway",
"Pizza Hut", "Del Taco", "Taco Bell", "Chick-fil-A", "Farm", "Truck", "In-N-Out"];

function isCommonPlace(businessEntry, commonFilter){
  for (var i = 0; i < commonFilter.length; i++) {
    if (businessEntry.name.indexOf(commonFilter[i]) > -1)
      return true;
  }
  return false;
}

// function to use yelp API to get the top choices based on longitude and latitude
module.exports.searchYelp = function (req, res, coords, distance, callback) {
  //Counter variable which will keep track of how many Yelp calls have completed
  //A separate counter is needed due to the asynchronous nature of web requests
  // var trimmedCoords = coord.trimGoogleCoord(googleCoords, distance);
  var counter = 0;
  // Array that stores all of the Yelp results from all calls to Yelp
  var yelpResults = [];

  // yelp search parameter configuration
  yelpProperty.term = req.body.optionFilter;           // Type of business (food, restaurants, bars, hotels, etc.)

  //Set the distance of the yelp search
  var radius = yelpProperty.radius_filter * Math.min(Math.ceil(distance/20), 5);

  //Request yelp for each point along route that is returned by filterGoogle.js
  for(var i = 0; i < coords.length; i++){
    //yelpClient.search is asynchronous and so we must use a closure scope to maintain the value of i
    (function(i) {
      yelpClient.search({
        term: yelpProperty.term,
        limit: yelpProperty.limit,
        sort: yelpProperty.sort,
        radius_filter: yelpProperty.radius_filter,
        ll: coords[i]
      }, function(error, data) {
        if (error) {
          console.log('Error with yelp request:', error);
          res.status(500).send('Error with request');
          return;
        }
        //Push the data returned from Yelp into yelpResults array
        yelpResults[i] = data;
        counter++;
        //After all yelp results are received call callback with those results
        if(counter === coords.length){
          callback(yelpResults);
        }
     });
    })(i);
  }
};

//Filter results returned from Yelp into an overall top 10
module.exports.createTopResultsJSON = function(yelpResults, distance, numberStops) {
  var allBusinesses = [];
  var topResults = [];
  var minRating = 0;
  var evenSpreadResults = [];
  numberStops = numberStops || 10; //If the number of stops is specified, use it

  //set the section size based on the number of stops the user wants
  var sectionSize = distance / numberStops;
  var sectionNumber = 0;
  var coveredDist = 0;
  var placeInSection = false;

  //Check the business against the current top 10 and add it if it beats one of the
  //businesses on the list
  var checkTopResults = function(business) {
    //compare ratings
    for(var k = 0; k < 10; k++){
      // if the business is not already in the topResults;
      // if not in the topResults, then proceed with comparing, else, skip the current business entry
      if (!isAlreadyInArray(topResults, business)) {
        //Check rating
        if (topResults[k] === undefined) {
          topResults[k] = business;
        } else if (business.rating > topResults[k].rating) {
          topResults.splice(k, 0, business);
          if (topResults.length > 10) {
            topResults.pop();
          }
          //once a business is added to topResults, move on to the next business
          return true;
          //if ratings are equal, choose the business with higher number of reviews
        } else if(business.rating === topResults[k].rating && business.review_count > topResults[k].review_count){
          topResults.splice(k, 0, business);
          if (topResults.length > 10) {
            topResults.pop();
          }
          //once a business is added to topResults, move on to the next business
          return true;
        }
      }
    }
    // if not added, return false
    return false;
  }

  //Iterate over all results, looking at the top business for each location that Yelp searched.
  //Add it to the top result or the even spread results if it meets certain criteria to be matched.
  //After, if there needs to be more results to get the top10 results, iterate over looking at the
  //  next highest results of each Yelp location searched.
  for (var i = 0; i < yelpResults.length; i++) {
    //Calculating the distance from one search point to the other
    if (i > 0) {
      var loc1 = [yelpResults[i - 1].region.center.latitude, yelpResults[i - 1].region.center.longitude];
      var loc2 = [yelpResults[i].region.center.latitude, yelpResults[i].region.center.longitude];
      coveredDist += coord.calcDistance(loc1, loc2);

      //Move to the next section if the search distance is past the section size
      if (coveredDist > sectionSize && sectionNumber < numberStops) {
        coveredDist -= sectionSize;
        sectionNumber++;
        placeInSection = false;
      }
    }
    //Compare the business to the current top rated business of the section if it exists
    //Otherwise, save this business
    if (yelpResults[i].businesses[0]) {
      //yelp includes some highly rated businesses well outside of the search radius, possibly a "featured business"
      //if such a business is included, skip over it
      if (yelpResults[i].businesses[0].distance > yelpProperty.radius_filter) {
        continue;
      }
      //Check the business against the top results list, add it if it is higher
      if (!checkTopResults(yelpResults[i].businesses[0])) {
        //Otherwise, see if it should be added into the evenSpreadResults. EvenSpreadResults are populated based on
        //highest rated business in each sections of the trip, excluding top 10 results.
        if (placeInSection) {
          if (yelpResults[i].businesses[0].rating > evenSpreadResults[evenSpreadResults.length - 1].rating) {
            evenSpreadResults[evenSpreadResults.length - 1] = yelpResults[i].businesses[0];
          } else if (yelpResults[i].businesses[0].rating === evenSpreadResults[evenSpreadResults.length - 1].rating &&
                   yelpResults[i].businesses[0].review_count > evenSpreadResults[evenSpreadResults.length - 1].review_count) {
            evenSpreadResults[evenSpreadResults.length - 1] = yelpResults[i].businesses[0];
          }
        } else {
          evenSpreadResults.push(yelpResults[i].businesses[0]);
          placeInSection = true;
        }
      }
    }
  }
  //Reiterate over the Yelp Results, looking at the next highest results until there is a top 10 list
  j = 1;
  while (topResults.length < 10 && j < 5) {
    for (var i = 0; i < yelpResults.length; i++) {
      if (yelpResults[i].businesses[j]) {
        if (yelpResults[i].businesses[j].distance > yelpProperty.radius_filter) {
          continue;
        }
        checkTopResults(yelpResults[i].businesses[j]);
      }
    }
    j++;
  }

  // combine the best results along the road with the even spread results along the roads
  var finalResults = evenSpreadResults.concat(topResults);

  var result = {
    results: finalResults,
    topTen: topResults
  };
  return result;
};
