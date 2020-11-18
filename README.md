# TWEET EXPLORER 
this app reterieves the tweets posted from a selected location and run a sentiment analyses on them.
The bar graph on side shows the results of sentiment analyses of tweets.
The application also shows the current trending topics around that particular location.

USER Guide.
On the Home page user will see the map and a input space where user can type any keyword for search query and then user has to click any location on the map to see the tweets, analyses and trending topics.

this app is using the Google map API and Twitter API to represent the data. when user click on a location app finds a nearby city and shows the tweets posted from that city.
The Twitter API has specific limitation on requests per 15 min Time frame.

This app user the remote REDIS Cache server and Amazon S3 Bucket to save the data from 5 mins to 24 hours.

To install this App run the following commands:

npm install

npm start

then navigate to local host port 3000.

This API was deployed to the AWS Cloud services to perforem the Autoscailing and Load balancing as per the unit Assesment task. the autoscailing was set on the 20% of cpu utilisation and max capacity of instances 4.