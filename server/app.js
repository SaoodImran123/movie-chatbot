const express = require('express');
const {spawn} = require('child_process');
const path = require('path');
const app = express();
var port = 3050;
let {PythonShell} = require('python-shell')

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
      var tokens;
      return new Promise(async function(resolve, reject){
        let tokens = await runPy(data.message)
        console.log("tokens: " + tokens)
        io.emit('MESSAGE', data);
        io.emit('MESSAGE', 
          {'message': tokens.toString()} 
        );
      })
        // send nlp 
        // return back to client
    });
});

app.get('/nlp', (req, res)=>{
  return new Promise(async function(resolve, reject){
    let r =  await runPy("this is a dummy sentence")
    console.log(JSON.parse(JSON.stringify(r.toString())), "Done...!@")//Approach to parse string to JSON.
    res.send(r)
  })
})

function runPy(sentence){
  return new Promise(async function(resolve, reject){
    let options = {
      mode: 'text',
      pythonOptions: ['-u'],
      scriptPath: './server',//Path to your script
      args: [JSON.stringify({"sentence": sentence})]//Approach to send JSON as when I tried 'json' in mode I was getting error.
    };

    await PythonShell.run('sentence_parse.py', options, function (err, results) {
      //On 'results' we get list of strings of all print done in your py scripts sequentially. 
      if (err) throw err;
      console.log('results: ');
      for(let i of results){
        console.log(i, "---->", typeof i)
      }
      resolve(results)//I returned only JSON(Stringified) out of all string I got from py script
   });
  })
} 
