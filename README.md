A Web-based chat app which responds to basic informational queries.

Current dependencies include the most recent versions of:
* Node.js
* Socket.io
* jQuery

Additionally, a free account with openweathermap.org is required for full functionality.  Once you set this up, store the api key in "config.json" mapping "weatherKey" to the API key.

The queries that currently return answers are:
* Any variation of asking about what time it is
* Any variation of asking about the weather, as long as the query ends in "in CITY?"



DISCLAIMER: In its current form, the bulk of content is based on the tutorial "http://www.programwitherik.com/getting-started-with-socket-io-node-js-and-express/".  Most of the comments and all of the weather-related code is mine, so I take full responsibility for incorrect terminology and overall bad style in those sections.  Don't blame Erik for that!
