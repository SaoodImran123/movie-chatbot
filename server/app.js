const express = require('express');
// const {spawn} = require('child_process');
// const path = require('path');
const app = express();
const routes = require("./api/routes")
var port = 3050;

// DATABASE
// const mongoose = require("mongoose");
// var mongoDB = 'mongodb://Node:NtiEzkYS8S@143.198.38.75/movezen'
// mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});

// var db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Elastic Search
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
   hosts: [ 'http://elastic:tSsrpzP3nj3yFS3OgD9s@[2604:a880:cad:d0::e15:a001]:9200']
});

client.ping({
  requestTimeout: 30000,
}, function(error) {
  if (error) {
      console.error('elasticsearch cluster is down!');
  } else {
      console.log('Elastic search returned ping. Everything is ok');
  }
});


// Index: same as mongodb but lower case
var elasticSearchGenre = function (genre, data){
  return new Promise(function(resolve, reject){
    client.search({
      index: 'tmdb_movies',
      size: '5',
      // sort : [
      //   { "popularity": {"order" : "desc"}}
      // ],
      body:{
        query: {
          bool: {
            must: {
              multi_match: {
                query: genre.toString(),
                fields: [
                    "genres.name"
                ]
              }
            },
            filter: {
              term: {
                  "original_language": "en"
              }
            }
          }
        }
      }
    }).then(function(resp) {
      console.log(resp);
      //resturns an array of movie hits
      data.response = resp.hits.hits;
      resolve(data);
    }, function(err) {
      reject(err.message);
      console.trace(err.message);
    });
  })
}



//elasticSearchGenre("horror");


//Define a schema
// var Schema = mongoose.Schema;

// var MovieModelSchema = new Schema({
//   genre: String,
//   popularity_date: Number
// });

// var MovieModel = mongoose.model('MovieModel', MovieModelSchema );

// MovieModel.find(
//   {
//     title: RegExp("shang.*", 'i'),
//     popularity: {$gt: 5}
//   },
//   'title',
//   function(err, MovieModel){
//     if(err) {
//       return console.log(err);
//     } else{
//       console.log(MovieModel.toString());
//     }
//   }
// )

// PYTHON SCRIPT
let {PythonShell} = require('python-shell')

function runPy(sentence){
  return new Promise(async function(resolve, reject){
    let options = {
      mode: 'text',
      pythonOptions: ['-u'],
      scriptPath: './server',//Path to your script
      args: [sentence]//Approach to send JSON as when I tried 'json' in mode I was getting error.
    };

    await PythonShell.run('sentence_parse.py', options, function (err, results) {
      //On 'results' we get list of strings of all print done in your py scripts sequentially. 
      let tokens = [];
      if (err) throw err;
      console.log('results: ');
      if(results && results.length>0){
        for(let i of results){
          tokens.push(i);
        }
      }
      resolve(tokens)
   });
  })
} 


// SERVER
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
    var requirements = {genre: [], release_date: [], occassion:[], mood: []};
    socket.on('SEND_MESSAGE', function(data) {
      var tokens;
      return new Promise(async function(resolve, reject){
        let tokens = await runPy(data.message);
        // Check tokens if fullfil a condition
        console.log(tokens);
        requirements = checkRequirements(tokens, requirements);
        if(requirements.genre.length == 0){
          data.bot_message = "What kind of genre are you feeling right now?";
          data.guided_ans = ["I want action movies", "I want comedy movies", "I want horror movies"];
          io.emit('MESSAGE', data);
        }
        // else if(requirements.release_date.length == 0){
        //   data.bot_message = "Do you have any preference on how old the movie is?";
        //   data.guided_ans = ["I want movies released in the past year", "I want movies released in the last 10 years", "I don't have a preference"];
        // }
        // else if(requirements.occassion.length == 0){
        //   data.bot_message = "Why do you want to watch a movie?";
        //   data.guided_ans = ["Movie night with family", "Date night", "I'm just bored"];
        // }
        // else if(requirements.mood.length == 0){
        //   data.bot_message = "How are you feeling today?";
        //   data.guided_ans = ["I am happy", "I am sad", "I am bored"];
        // }
        // else{
        //   data.bot_message = "Are you content with your recommendation?";
        //   data.guided_ans = ["Yes", "No"];
        // }
        else{
          // TODO: check for what type of input and search by that type
          elasticSearchGenre(tokens, data).then(
            result=>showESResult(result),
            error=>console.log(error)
          )
        }


      })
        // send nlp 
        // return back to client
    });
});

function showESResult(result){
  result.bot_message =  "I recommend " + result.response[0]._source.title + ", " + result.response[1]._source.title + ", and " + result.response[2]._source.title;
  console.log(result);
  io.emit('MESSAGE', result);
}


// Placeholder to test guided answers
// TODO: get requirements from tokens
function checkRequirements(tokens, req){
  var genres = [ "action", "adventure","animation","comedy","crime","documentary","drama","family","fantasy","history","horror","music","mystery","romance","science fiction","sci-fi","thriller","war","western"];
  for(var i = 0; i < tokens.length; i++){
    // Check if message has the genre wanted
    for(var j = 0; j < genres.length; j++){
      // Check if token has the genre
      if(tokens[i].includes(genres[j])){
        req.genre.push(genres[j]);
      }  
    }
  }
  // for(var j = 0; j < genres.length; j++){
  //   // Check if token has the genre
  //   tokens.find(v => function(){
  //     if(v.includes(genres[j])){
  //       req.genre.push(genres[j]);
  //     }
  //   });
  // }

  // for(var i = 0; i < tokens.length; i++){

  //   // Check if tokens have release date
  //   if(tokens[i].includes("released")){
  //     req.release_date.push(tokens[i]);
  //   }

  //   // Check if tokens have occassion
  //   if(tokens[i].includes("date night")){
  //     req.occassion.push(tokens[i]);
  //   }

  //   // Check if tokens have mood
  //   if(tokens[i].includes("happy")){
  //     req.mood.push(tokens[i]);
  //   }
  // }

  console.log(req);
  return req;
}


// ROUTING
app.get('/nlp', (req, res)=>{
  return new Promise(async function(resolve, reject){
    let r =  await runPy("this is a dummy sentence")
    console.log(JSON.parse(JSON.stringify(r.toString())), "Done...!@")//Approach to parse string to JSON.
    res.send(r)
  })
})
