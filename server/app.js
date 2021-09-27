const express = require('express');
const path = require('path');
const app = express();
var port = 3050;

const server = app.listen(port, function() {
    console.log('server running on port ' + port);
});

const io = require('socket.io')(server);

io.on('connection', function(socket) {
    console.log(socket.id)
    socket.on('SEND_MESSAGE', function(data) {
        io.emit('MESSAGE', data);
    });
});