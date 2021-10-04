const express = require('express');
const {spawn} = require('child_process');
const pyshell = require('python-shell');
const path = require('path');
const app = express();
var port = 3050;

const server = app.listen(port, function() {
    console.log('server running on port ' + port);
});

const io = require('socket.io')(server, {
    cors: {
      origin: '*',
    }
  });

io.on('connection', function(socket) {
    console.log(socket.id)
    socket.on('SEND_MESSAGE', function(data) {
        io.emit('MESSAGE', data);
        // send nlp 
        // return back to client
    });
});

app.get('/nlp', (req, res)=>{
  var sendData;
  const spawn = require("child_process").spawn;
  const pythonProcess = spawn('python3',["./test.py"]);
  pythonProcess.stdout.on('data', (data) => {
    console.log(data);
    sendData = data;
  });
  res.send(pythonProcess);
})
