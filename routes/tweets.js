const express = require('express');
const logger = require('morgan');
const fs = require('fs');
const jsdom = require('jsdom');
const Twit = require('twit')
const Sentiment = require('sentiment');
const gmaps = require('googlemaps');
const sentiment = new Sentiment();
const redis = require('redis');
const AWS = require('aws-sdk');
const router = express.Router();

router.use(express.static(__dirname + "/../public"));
const redisFlush = 300; // Redis flush period (seconds)

// Redis config
var redisConf = {
  host: 'IP ADD.',
  port: 'PORT NO.',
  password: 'PASSWORD'
}

// Setup persistence storage
const bucketName = 'BUCKET NAME';
const redisClient = redis.createClient(redisConf);

redisClient.on('error', (err) => {
    console.log("Error "+ err);
})

//Twitter API credentials
var T = new Twit({
  consumer_key:         'KEY',
  consumer_secret:      'yOUR SECRETE KEY',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            true,     // optional - requires SSL certificates to be valid.
  app_only_auth:        true
})

//  Arrays to store Twitter API endpoint content
var tweets = [];
var trends = [];

// Config for geo coding locations
const gmapConfig = {
  key: "MAP KEY"
}

const gmapAPI = new gmaps(gmapConfig);

// function for getting tweets at 'lat' and 'lng' with query through callback function
function getTweets(query, lat, lng, callback) {
  let tweetsHtml = "";  // string to store html formatted tweets
  let querySentiment = [0,0,0]; // sentiment [pos,neut,neg]

  // Redis and S3 keys for tweets and sentiment analysis
  const rediskey = `tweets:${query}-${lat}-${lng}`;
  const rediskey2 = `analysis:${query}-${lat}-${lng}`;
  const s3Key = `tweets-${query}-${lat}-${lng}`;
  const s3Key2 = `analysis-${query}-${lat}-${lng}`;
  const params = { Bucket: bucketName, Key: s3Key};
  const params2 = { Bucket: bucketName, Key: s3Key2};

  // Check Redis for tweets with query, lat, lng
  redisClient.get(rediskey, (err, result)=>{
    if(result) {
        // Serving from Cache
        tweetsHtml = result.toString();

        // Get sentiment analyis for query at lat, lng
        redisClient.get(rediskey2, (err, result)=>{
          if (err) {
            return err;
          } else {
            // Store sentiment values
            let sentiments = result.split(",");
            querySentiment[0] = parseInt(sentiments[0], 10);
            querySentiment[1] = parseInt(sentiments[1], 10);
            querySentiment[2] = parseInt(sentiments[2], 10);
          }

          // return tweets and sentiment data from Cache
          console.log("TWEETS SERVED: Redis");
          callback(tweetsHtml, querySentiment);
        })
    } else {
      //  If not in Redis, check S3
      new AWS.S3({apiVersion: '2006-03-01'}).getObject(params, (err, result) => {
        if (result) {
          // Serve from S3
          tweetsHtml = result.Body.toString();
          new AWS.S3({apiVersion: '2006-03-01'}).getObject(params2, (err, result2) => {
            if(err){
              throw err;
            }else{
              // Store sentiment values
              let sentiments = result2.Body.toString().split(",");
              querySentiment[0] = parseInt(sentiments[0], 10);
              querySentiment[1] = parseInt(sentiments[1], 10);
              querySentiment[2] = parseInt(sentiments[2], 10);

              // Save tweets and analysis to Redis, flush after 5 mins
              redisClient.setex(rediskey, redisFlush, tweetsHtml);
              redisClient.setex(rediskey2, redisFlush, querySentiment.toString());

              // return tweets and sentiment from S3
              console.log("TWEETS SERVED: S3");
              callback(tweetsHtml,querySentiment);
            }
          })
        } else {
          // If not in Redis or S3, get from API
          T.get('search/tweets', {geocode: `${lat},${lng},150km`, q: query, exclude: "retweets", count: 100, lang: 'en' }, function(err, data, response) {
            if (err) {
              // if API error response
              callback('<h1 style="text-align: center;">Sorry, there was a problem with the API</h1>', querySentiment)
              return;
            }

            // analyse each tweet and stores tweet details
            for(let i = 0; i < data.statuses.length; i++){
              // sentiment analysis on tweet
              let result = sentiment.analyze(data.statuses[i].text);

              // save tweet in tweets array
              tweets[i] = [`${data.statuses[i].user.name}`,` ${data.statuses[i].user.followers_count}`, `${data.statuses[i].text}` ,
              `${data.statuses[i].retweet_count}`, `${data.statuses[i].id_str}`, `${data.statuses[i].user.screen_name}`, `${result.score}`,
              `${data.statuses[i].user.profile_image_url_https}`, `${data.statuses[i].user.screen_name}`] 

              // sentiment analysis
              if(result.score != undefined){
                if(result.score > 0){
                  querySentiment[0]++;
                }
                else if (result.score == 0){
                  querySentiment[1]++;
                }
                else if(result.score < 0){
                  querySentiment[2]++;
                }
              }
            }
            
            // Prepare tweets html block
            if (tweets != undefined){
                // printing list in format
                for(let i = 0; i < tweets.length;i++){
                  tweetsHtml += `<a href="https://twitter.com/${tweets[i][5]}/status/${tweets[i][4]}" target="_blank" class="tweet-link">`+
                  `<li class="list-group-item" id="tweet-item"><div class="media"><img src="${tweets[i][7]}" class="mr-3" alt="..."><div class="media-body">`+
                  `<div id="username"><h5 class="name">${tweets[i][0]} </h5><h5 class="twit-handle">@${tweets[i][8]}</h5></div>`+
                  `<h3 class="followers-retweets">Followers: ${tweets[i][1]} || Retweets: ${tweets[i][3]}</h3>` +
                  `${tweets[i][2]}</img></div></li></a>`  
                }

                // Store in S3
                // Storing tweets html
                const objectParams = {Bucket: bucketName, Key: s3Key, Body: tweetsHtml};
                let uploadPromise = new AWS.S3({apiVersion: '2006-03-01'}).putObject(objectParams).promise();
                uploadPromise.then(function(data) {
                  console.log("TWEETS STORED: S3 " + bucketName + "/" + s3Key);
                });

                // Storing sentiment analysis
                const objectParams2 = {Bucket: bucketName, Key: s3Key2, Body: querySentiment.toString()};
                uploadPromise = new AWS.S3({apiVersion: '2006-03-01'}).putObject(objectParams2).promise();
                uploadPromise.then(function(data) {
                  
                });

                // Save to Redis, flush every 120 secs
                redisClient.setex(rediskey, redisFlush, tweetsHtml);
                redisClient.setex(rediskey2, redisFlush, querySentiment.toString());
                console.log("TWEETS STORED: Redis");

                // return prepared tweets html block and sentiment
                console.log("TWEETS SERVED: Twitter");
                callback(tweetsHtml, querySentiment);
            }
          })
        }
      }) // end of T
    }
  })
}

// function for getting the closest twitter api supported city near clicked location
function getClosest(lat, lng, callback) {
  T.get('trends/closest', {lat: lat,long: lng }, function(err, data, response) {
    let woeid = 0;
    let location = "";

    if (err) {
      // if rate limit reached, set location to Brisbane
      woeid = 1100661;
      location = 'Brisbane'
    } else {
      // get woeid and location name from api
      woeid = data[0].woeid;
      location = data[0].name;
    }

    // return id and location
    callback(woeid, location);
  })
}

// get trending topics of location by id
function getTrends(woeid, callback) {
  // trends html stores trending topics and the location name in array
  let trendsHtml = [""];

  // setup persistence storage keys
  const rediskey = `trends:${woeid}`;
  const s3Key = `trends-${woeid}`;
  const params = { Bucket: bucketName, Key: s3Key};

  // Check Redis for trending topics at location
  redisClient.get(rediskey, (err, result)=>{
    if(result) {
    // Serve from cache
    // Split trends html and location name
    let newresult = result.toString();
    let myarray = newresult.split("<br>");
    trendsHtml[0] = myarray[0];
    trendsHtml[1] = myarray[1];

    // return trends html array from redis
    console.log("TRENDING SERVED: Redis");
    callback(trendsHtml);
    } else {
      // If not in Redis, check S3
      new AWS.S3({apiVersion: '2006-03-01'}).getObject(params, (err, result) => {
        if (result) {
        // Serve from S3
        // Split trending topics and location name
        let newresult = result.Body.toString();
        let myarray = newresult.split("<br>");
        trendsHtml[0] = myarray[0]
        trendsHtml[1] = myarray[1]

        // format trends html to be stored in Redis
        let saveHtml = trendsHtml[0]+"<br>"+trendsHtml[1]
        redisClient.setex(rediskey, redisFlush, saveHtml);
        console.log("TRENDING STORED: Redis");

        // serve trends from S3
        console.log("TRENDING SERVED: S3");
        callback(trendsHtml);
        } else {
          // If not in Redis or S3, retrieve from Twitter API
          T.get('trends/place', {id: woeid, lang: 'en'}, function(err, data, response) {
            // if API fails, return error text
            if (err) {
              callback(["Sorry, there was a problem with the API", ""]);
              return;
            }
            
            // store trends in array
            for(let i = 0; i< data[0].trends.length; i++){
              trends[i] = data[0].trends[i].name
            }

            // Trending topics list title
            trendsHtml[1] = "<h9>Trending Topics at " + data[0].locations[0].name + "</h9>"

            // Prepare trending topics html
            if (trends != undefined){
              for(let i = 0; i < data[0].trends.length; i++){
                // get tweet volume
                let tweet_vol = data[0].trends[i].tweet_volume;
                if (tweet_vol === null) {
                  tweet_vol = "unknown"
                }

                // add trending topic list items
                trendsHtml[0] += `<li class="list-group-item d-flex justify-content-between align-items-center" id="topic">` + 
                `<h6 id="topic-index">${i + 1}</h6><h6 id="trending-topics">${trends[i]}</h6>` + 
                `<span class="badge badge-primary badge-pill"> ${tweet_vol}</span></li>` 
              }
              
              // Save to Redis
              let saveHtml = trendsHtml[0]+"<br>"+trendsHtml[1]
              redisClient.setex(rediskey, redisFlush, saveHtml);      
              console.log("TRENDING STORED: Redis");
        
              // Save to S3
              const body = saveHtml;
              const objectParams = {Bucket: bucketName, Key: s3Key, Body: body};
              const uploadPromise = new AWS.S3({apiVersion: '2006-03-01'}).putObject(objectParams).promise();
              uploadPromise.then(function(data) {
                console.log("TRENDING STORED: S3 " + bucketName + "/" + s3Key);

                // Serve trends from Twitter  
                console.log("TRENDING SERVED: Twitter");
                callback(trendsHtml);
              });
            }
          }) // end of T
        }
      }) // end of S3
    }
  })
}

// function to check log rate limit
function getRateLimit() {
  T.get('application/rate_limit_status', {resources: ["search", "trends"]}, function(err, data, response) {
    console.log("\n/trends/closest: " + data.resources.trends["/trends/closest"].remaining  + "/" + data.resources.trends["/trends/closest"].limit);
    console.log("/trends/place: " + data.resources.trends["/trends/place"].remaining + "/" + data.resources.trends["/trends/place"].limit);
    console.log("/search/tweets: " +data.resources.search["/search/tweets"].remaining + "/" + data.resources.search["/search/tweets"].limit + "\n");
  })
}


// Tweets route typically redirected from the root path (map)
router.get('/', function(req, res, next) {
  // Read tweets html file as dom
  const html = fs.readFileSync(__dirname + '/tweets.html','utf8');
  const dom  = new jsdom.JSDOM(html);

  // get queries
  const query = req.query.q;
  const lat = req.query.lat;
  const lng = req.query.lng;

  // Get data from Twitter API (Redis or S3 if queries already stored)
  getClosest(lat, lng, function(woeid, name) {
    // reduce location name to geo coordinates
    gmapAPI.geocode({address: name}, function(err, data) {
      var { lng, lat } = data.results[0].geometry.location;
      lng = lng.toFixed(6);
      lat = lat.toFixed(6);
      
      // Get tweets from API or storage using geocoordinates
      getTweets(query, lat, lng, function(tweetsHtml, sentiment) {
        // replace "tweets" div with prepared tweets html
        dom.window.document.getElementById("tweets").innerHTML = tweetsHtml;
        
        // Get trends from API or storage using woeid from getClosest
        getTrends(woeid, function(trendsHtml) {
          // replaces divs in dom with prepared trends html and pass sentiment data to html by storing in script value
          dom.window.document.getElementById("trending-at").innerHTML = trendsHtml[1];
          dom.window.document.getElementById("trending-topics").innerHTML = trendsHtml[0];
          dom.window.document.getElementById("chart-script").setAttribute("value", `${sentiment[0]}, ${sentiment[1]}, ${sentiment[2]}`)

          // return the modified version of tweets html
          res.send(dom.serialize()); 
        })
      })
    })
  })
});

module.exports = router;
