"use strict";
//server.js
var port     = 8889;
var server_sockets = require('./server_sockets');
var http = require('http');
var server = http.createServer().listen(port);

server.setTimeout(0);
console.log('The magic happens on port ' + port);

server_sockets(server, "");
