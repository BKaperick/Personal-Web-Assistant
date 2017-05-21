// Set up necessary packages and json files.
//var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var http = require('http');
var https = require('https');
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

formatQuery = function(str) 
{
    str = str.replace(/ /g, "+");
    return str.replace(/\?/g, "");
} 

const searchHost = "https://www.googleapis.com";
const searchPath = "/customsearch/v1";
var searchengineID = keys.searchengineID;
var googleKey = keys.googleKey;


function infoGet(query, callBackData) {

    // Can't seem to get this request to work with an options object
    // so for now we just build the url directly.
    var options = {
        host : searchHost,
        path: searchPath,
        q : formatQuery(query),
        cx: searchengineID,
        key: googleKey,
        //num: 1,
        //imgSize: "medium",
        //searchType: "image",
    };
    url = options.host + options.path +
        "?q=" + options.q +
        "&cx=" + options.cx +
        "&key=" + options.key;

    callback = function(response) {
        var str = '';
        console.log(response.statusCode);

        // This is handled in the response logic.
        if (response.statusCode != 200)
            callBackData(null);
        
        // Successful request to Google.
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
                //console.log(str);
                callBackData(strJSON.items[0].snippet, strJSON.items[0].link); 
            });
        }
    }
    return https.get(url, callback).end();
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
            
            // Logic to ensure time is displayed correctly
            var timeSuffix = (date.getHours() < 12) ? " AM" : " PM";
            var minutes = date.getMinutes() >= 10? date.getMinutes() : "0" + date.getMinutes().toString();
            
            var response = "It is " + [date.getHours()%12] + ":" + minutes + timeSuffix + ".  (EST)";
            client.emit('broad', response);
            client.broadcast.emit('broad', response); }

        // Return the requested weather info.
        else if (data.includes("weather")) {
            
            // Extract city name from their message
            var city = data.substring(data.lastIndexOf("in ")+3,data.length-1);
            // Retrieve weather information and send to user
            weatherGet(city, function(str) {
                
                // GET request failed, or city was not found
                if (str == null)
                    var response = "I'm sorry, I had trouble finding that information for you.";

                // Send weather information formatted to be human-readable.
                else
                    var response = city + " is at " + str.temp + " degrees Fahrenheit and " + str.humidity + "% humidity.";
                client.emit('broad', response);
                client.broadcast.emit('broad', response);
            }); }
        
        // Return the first Google search result snippet and source. 
        else if (data.includes("info")) {

            // Search the last word in their message
            var lastWord = data.split(" ");
            var query = lastWord[lastWord.length - 1];

            // Query Google Custom Search Engine and return the snippet
            // from the first entry (usually wikipedia)
            infoGet(query, function(str, src) {
                
                // Truncate any partial sentence
                if (str.indexOf("...") == str.length - 3) {
                    str = str.split("...")[0];
                    str = str.substring(0, str.lastIndexOf(".")+1) + "  ";
                }

                // Response object contains the snippet, the source url
                // and the text to prompt further exploration on the 
                // hyperlink
                var response = str;
                response = {
                    info: str + "  ",
                    source: src,
                    srcFlavor: "Get more info here!"};

                // Custom emit option to include hyperlink to src 
                // after snippet
                client.emit('websearch', response);
                client.broadcast.emit('websearch', response);
            }); 
        }
            
        // Can't respond to anything else right now. 
        else {
            var response = "I'm afraid I don't have a good response...";
            client.emit('broad', response);
            client.broadcast.emit('broad', response); }
    });
});

//Await responses on port 4200
server.listen(4200);


