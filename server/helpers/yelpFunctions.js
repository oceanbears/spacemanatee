var yelp = require('./yelp');
var key = require('../api/api_key');
var coord = require('./coordinateHelpers');

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
  radius_filter: 5*1609.34  // Search radius: 1 mile = 1609.3 meters, 5 miles is good for rural areas
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

  //This is for changing the radius filter depending on the distance of the trip.
  // if (distance <= 20) {
  //   yelpProperty.radius_filter = 0.8 * 1609.34 ;
  // } else if (distance <= 40) {
  //   yelpProperty.radius_filter = 2.5 * 1609.34;
  // } else {
  //   yelpProperty.radius_filter = 5 * 1609.34;
  // }

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
          console.log(error);
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

  console.log('Filtering top results:');

  //Check the business against the current top 10 and add it if it beats one of the
  //businesses on the list
  var checkTopResults = function(business) {
    if (topResults.length < 10) {
      topResults.push(business);
      return true;
    } else {
      //compare ratings
      for(var k = 0; k < topResults.length; k++){
        // if the business is not already in the topResults;
        // if not in the topResults, then proceed with comparing, else, skip the current business entry
        if (!isAlreadyInArray(topResults, business)) {
          //Check rating
          if(business.rating > topResults[k].rating){
            topResults.splice(k, 0, business);
            topResults.pop();
            //once a business is added to topResults, move on to the next business
            return true;
            //if ratings are equal, choose the business with higher number of reviews
          } else if(business.rating === topResults[k].rating && business.review_count > topResults[k].review_count){
            topResults.splice(k, 0, business);
            topResults.pop();
            //once a business is added to topResults, move on to the next business
            return true;
          }
        }
      }
      // if not added, return false
      return false;
    }
  }

  //Iterate over all results
  //Create a top 10 results for the whole trip
  //Also, for each section, return the best result for that section
  for (var i = 0; i < yelpResults.length; i++) {
    //Calculating the distance from one search point to the other
    if (i > 0) {
      var loc1 = [yelpResults[i - 1].region.center.latitude, yelpResults[i - 1].region.center.longitude];
      var loc2 = [yelpResults[i].region.center.latitude, yelpResults[i].region.center.longitude];
      coveredDist += coord.calcDistance(loc1, loc2);

      //Move to the next section if the search distance is past the section size
      if (coveredDist > sectionSize) {
        coveredDist -= sectionSize;
        sectionNumber++;
      }
    }
    //Compare the business to the current top rated business of the section if it exists
    //Otherwise, save this business
    if (yelpResults[i].businesses[0]) {
      //yelp includes some highly rated businesses well outside of the search radius, possibly a "featured business"
      //if such a business is included, skip over it
      if (!checkTopResults(yelpResults[i].businesses[0])) {
        if (yelpResults[i].businesses[0].distance > yelpProperty.radius_filter) {
          continue;
        }
        if (evenSpreadResults[sectionNumber]) {
          if (yelpResults[i].businesses[0].rating > evenSpreadResults[evenSpreadResults.length - 1].rating) {
            evenSpreadResults[evenSpreadResults.length - 1] = yelpResults[i].businesses[0];
          } else if (yelpResults[i].businesses[0].rating === evenSpreadResults[evenSpreadResults.length - 1].rating && 
                   yelpResults[i].businesses[0].review_count > evenSpreadResults[evenSpreadResults.length - 1].review_count) {
            evenSpreadResults[evenSpreadResults.length - 1] = yelpResults[i].businesses[0];
          }
        } else {
          evenSpreadResults[sectionNumber] = yelpResults[i].businesses[0];
        }
      }
    }
  }
  
  j = 1;
  while (topResults.length < 10 && j < 5) {
    console.log('reiterating for more top results');
    for (var i = 0; i < yelpResults.length; i++) {
      if (yelpResults[i].businesses[j]) {
        checkTopResults(yelpResults[i].businesses[j]);
      }
    }
  }

  // combine the best results along the road with the even spread results along the roads
  var finalResults = evenSpreadResults.concat(topResults);

  var result = {
    results: finalResults,
    topTen: topResults
  };
  return result;
};
