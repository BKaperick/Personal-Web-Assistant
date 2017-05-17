// Set up necessary packages and json files.
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var http = require('http');
var keys = require('./config.json');
var cityLookup = require('./city.list.json');

//Create express object
var express = require('express');
var app = express();

//Create server object 
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

// Set Up Time Requests
var date = new Date();
var currentHour = date.getHours();

// Set Up Weather Requests
var weatherKey = keys.weatherKey;
const weatherHost = 'http://api.openweathermap.org';

// Function which links a city with its id.
// IN: String of the city name being queried
// OUT: The id associated with this city in city.list.json
findCity = function(city) {
    console.log("Searching for " + city);    
    // Compile list of all cities with the inputted name
    var cities = cityLookup.filter(function(thisCity) {return thisCity.name == city});
    
    //Return first city in the US.
    var UScity = cities.find(function(city) {return city.country == 'US'});
    if (UScity != null) {
        return UScity.id;
    }

    // If no city found to match the query is in the US, just return the first one.
    if (cities.length > 0)
        return cities[0].id;
    return null;
}

// Function to apply callBackData to API-retrieved weather data.
// IN: city - name of the city of interest
//     callBackData - function to apply to weather data
// OUT: It is an asynchronous call with the API, so nothing is returned except the termination of the http request.
weatherGet = function(city, callBackData) {

  //Constructing the API call
  var path = '/data/2.5/forecast?id=';
  var cityID = findCity(city);
  console.log(cityID);
  var urlfull = weatherHost + path + cityID +  '&APPID=' + weatherKey + "&units=imperial";

  callback = function(response) {
        var str = '';
        console.log(response.statusCode);

        // This is handled in the response logic.
        if (response.statusCode != 200)
            callBackData(null);
        
        // Successful request to OpenWeatherMap.
        else { 
            //another chunk of data has been received, so append it to 'str'
            response.on('data', function (chunk) {
                str += chunk;
            });
            response.on('error',function(errrror){
                console.log("Request to '" + filename + "' failed: " + errrror)
            });
            //the whole response has been received,
            //so we apply callBackData() to the relevant portion
            response.on('end', function () {
                var strJSON = JSON.parse(str);
                callBackData(strJSON.list[0].main); 
            });
        }
    }
   
    return http.request(urlfull, callback).end();
}

//Find directory with all packages
app.use(express.static(__dirname + '/node_modules'));

//Send index.html to client
app.get('/', function(req, res, next) {
    res.sendFile(__dirname + '/index.html');
});

// Execute this branch when someone logs on
io.on('connection', function(client) {
    console.log('Client connected...');

    client.on('join', function(data) {
        console.log(data);
    });

    // When a message is sent to the server, execute this branch
    client.on('messages', function(data) {
        
        // Return the requested time.
        if (data.includes("time")) {
            function prettyTime(h) {if (h < 12) return "AM";
                return "PM";};
            var response = [date.getHours()%12] + ":" + date.getMinutes() + prettyTime(date.getHours()) + ".";
            client.emit('broad', response);
            client.broadcast.emit('broad', response); }

        // Return the requested weather info.
        else if (data.includes("weather")) {
            
            // Extract city name from their message
            var city = data.substring(data.lastIndexOf("in ")+3,data.length-1);
            // Retrieve weather information and send to user
            weatherGet(city, function(str) {
                if (str == null)
                    var response = "I'm sorry, I had trouble finding that information for you.";
                else
                    var response = city + " is at " + str.temp + " degrees Fahrenheit and " + str.humidity + "% humidity.";
                client.emit('broad', response);
                client.broadcast.emit('broad', response);
            }); }
      
        // Can't respond to anything else right now. 
        else {
           
            var response = "I'm afraid I don't know...";
            client.emit('broad', response);
            client.broadcast.emit('broad', response); }
    });
});

//Await responses on port 4200
server.listen(4200);


