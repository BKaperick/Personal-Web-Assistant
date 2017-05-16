//app.js

// Set up for API interaction
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var http = require('http');
var keys = require('./config.json');
var cityLookup = require('./city.list.json');

//Create express object
//var app = require('express')(); also works
var express = require('express');
var app = express();

//Create server object 
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
//var io = require('socket.io')(server);


// Set Up Time Requests
var date = new Date();
var current_hour = date.getHours();

// Set Up Weather Requests
var weatherKey = keys.weatherKey;
const weatherHost = 'http://api.openweathermap.org';

findCity = function(city) {
    var cities = [];
    for (var i = 0; i < cityLookup.length; i++) {
        if (cityLookup[i].name == city) {
            cities.push(cityLookup[i]);
        }
    }
    for (var i=0; i < cities.length; i++) {
        if (cities[i].country == 'US') {
            return cities[i].id;
        }
    }
    return cities[0].id;
}


weatherGet = function(city, callBackData) {
  var path = '/data/2.5/forecast?id=';
  var cityID = findCity(city);
  var urlfull = weatherHost + path + cityID +  '&APPID=' + weatherKey + "&units=imperial";
//var urlfull = 'http://api.openweathermap.org/data/2.5/weather?lat=35&lon=139&APPID=dc7eff03eb0dd9bbf37bc6def11752e1';
    callback = function(response) {
        var str = '';
        console.log(response.statusCode);

        //another chunk of data has been received, so append it to 'str'
        response.on('data', function (chunk) {
            str += chunk;
        });
        response.on('error',function(errrror){
            console.log("Request to '" + filename + "' failed: " + errrror)
        });
        //the whol response has been received, so we just print it out here
        response.on('end', function () {
            var strJSON = JSON.parse(str);
            callBackData(strJSON.list[0].main); 
        });
    }

    return http.request(urlfull, callback).end();
}

//Find directory with all packages
app.use(express.static(__dirname + '/node_modules'));

//Send index.html to client
app.get('/', function(req, res, next) {
    res.sendFile(__dirname + '/index.html');
});


io.on('connection', function(client) {
    console.log('Client connected...');

    client.on('join', function(data) {
        console.log(data);
        //client.emit('messages', 'Hello from server');
    });

    client.on('messages', function(data) {
        if (data.includes("time")) {
            var response = date.getHours() + ":" + date.getMinutes();
            client.emit('broad', response);
            client.broadcast.emit('broad', response); }
        else if (data.includes("How is the weather in")) {
            var city = data.substring(22,data.length-1);
            var response = weatherGet(city, function(str) {
                var response = city + " is at " + str.temp + " degrees Fahrenheit and " + str.humidity + "% humidity.";
                client.emit('broad', response);
                client.broadcast.emit('broad', response);
            }); }
        else {
            var response = "I'm afraid I don't know...";
            client.emit('broad', response);
            client.broadcast.emit('broad', response); }
    });
});

//Await responses on port 4200
server.listen(4200);


