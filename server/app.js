const express = require('express');
var cors = require('cors')
// const {spawn} = require('child_process');
// const path = require('path');
const app = express();
app.use(cors({
  origin: 'http://localhost:8080'
}))
// app.use((req, res, next)=>{
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });


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
   hosts: [ 'http://elastic:tSsrpzP3nj3yFS3OgD9s@[2a01:4ff:f0:bdb::1]:9200']
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

var elasticSearchPopular = function (genre, data){
  return new Promise(function(resolve, reject){
    var date = new Date().toISOString().split("T")[0];
    client.search({
      index: 'tmdb_movies',
      size: '5',
      body:{
        sort: [
          {"popularity": {"order" : "desc"}},
          {"release_date": {"order" : "desc", "format": "yyyy-MM-dd"}}
        ],
        query: {
          bool: {
            filter: [
                {term: {"original_language": "en"}},
                {term: {"status": "released"}},
                {range: {"release_date": {"lte": date}}}
            ]}
        }
      }
    }).then(function(resp) {
      //resturns an array of movie hits
      data = resp.hits.hits;
      resolve(data);
    }, function(err) {
      reject(err.message);
      console.trace(err.message);
    });
  })
}

// Index: same as mongodb but lower case
var elasticSearchQuery= function (tokens, data){
  return new Promise(function(resolve, reject){
    var filter, must;
    console.log("ids: " + [data.ids.toString()]);
    console.log("tokens: " + data.tokens.toString());
    if(data.ids.length > 0){
      filter = [
        {term: {"original_language": "en"}},
        {range: {"release_date": {"gte": "1990-01-01"}}},
        {range: {"runtime": {"gte": "60"}}},
        {term: {"status": "released"}}];
    }else{
      filter = [
        {term: {"original_language": "en"}},
        {range: {"release_date": {"gte": "1994-01-01"}}},
        {range: {"runtime": {"gte": "60"}}},
        {term: {"status": "released"}}];
    }

    var should = []

    var must = [
      {
        "exists":{
            "field": "poster_path"
        }
      },
      {
          "exists":{
              "field": "backdrop_path"
          }
      }           
  ]

  var not = [
    {
      "exists":{
          "field": "poster_path"
      }
    },
    {
        "exists":{
            "field": "backdrop_path"
        }
    }        
  ]

  if(data.tokens.length > 0){
    must.push( {
      "multi_match": {
        "query": data.tokens.toString(),
        "fields": [
          "cast.character",
          "cast.name",
          "title",
          "overview", 
          "production_companies.name"
        ]
      }
    });
  }

  if(data.requirements.genre.length > 0){
    var genres = data.requirements.genre;
    for (var i = 0; i < genres.length; i++){
      if (i > 0){
        should.push({"term": {"genres.name": genres[i]}});
      }else{
        must.push({"term": {"genres.name": genres[i]}});
      }
    }
  }

    client.search({
      index: 'tmdb_movies',
      size: '5',
      body:{
        query: {
          bool: {
            must: must,
            should: should,
            filter: filter
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

// PYTHON SCRIPT
let {PythonShell} = require('python-shell');

// Convert strings to tokens and get keywords
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
    socket.on('SEND_MESSAGE', function(data) {
      return new Promise(async function(resolve, reject){

        // Check if message has the genre
        data.requirements = checkGenre(data.message, data.requirements);

        // Remove the genre from the message so it doesn't clutter tokens
        for (var i = 0; i < data.requirements.genre.length; i++){
          data.message = data.message.replace(data.requirements.genre[i], "");
        }

        // Run sentence_parse.py to get keywords
        let tokens = await runPy(data.message);

        // Loop through tokens and append to previous tokens
        for (var item of tokens){
          // Remove want/wants from token
          if(item.includes("want") || item.includes("wants")){
            item.replace("want", "");
            item.replace("wants", "");
            data.positive = true;
          }else if(item.includes("don't") || item.includes("don") || item.includes("do not")){
            item.replace("don't", "");
            item.replace("don", "");
            item.replace("do not", "");
            data.positive = false;
          }
          // Remove the genre from the message so it doesn't clutter tokens
          for (var i = 0; i < data.requirements.genre.length; i++){
            item = item.replace(data.requirements.genre[i], "");
          }

          if(!data.tokens.includes(item)){
            data.tokens = data.tokens + " " + item;
          }
        }
        data.message = null;
        // Check tokens if fullfil a condition
        console.log(tokens);

        if(data.requirements.genre.length == 0){
          data.bot_message = "What kind of genre are you feeling right now?";
          data.guided_ans = ["I want action movies", "I want comedy movies", "I want horror movies"];
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
        elasticSearchQuery(tokens, data).then(
          result => {
            showESResult(result);
          },
          error=>console.log(error)
        )


      })
        // send nlp 
        // return back to client
    });
});

function showESResult(result){
  try {
    result.ids = [];
    for (var item of result.response){
      if(!result.ids.includes(item._id)){
        result.ids.push(item._id);
      }
    }
    
    // Only display top 5 recommendation
    result.response = result.response.slice(0, 5);

    // Create final string when all requirements are fulfilled
    if(result.requirements.genre.length > 0 && result.response.length > 0){
      result.bot_message =  "I recommend "; 
      console.log(result.response.length);
      for(var i =0; i < result.response.length; i++){
        if(i < result.response.length -1){
          result.bot_message += result.response[i]._source.title + ", ";
        }else{
          result.bot_message += "and " + result.response[i]._source.title;
        }
      }
    }

    console.log(result);

    // Send back to frontend
    io.emit('MESSAGE', result);
  } catch (error) {
    console.log(error);
  }
}


// Placeholder to test guided answers
function checkGenre(sentence, req){
  var genres = [ "action", "adventure","animation","comedy","crime","documentary","drama","family","fantasy","history","horror","music","mystery","romance","science fiction","sci-fi","thriller","war","western"];
  for(var j = 0; j < genres.length; j++){
    // Check if sentence has the genre
    if(sentence.includes(genres[j])){
      req.genre.push(genres[j]);
    }  
  }

  console.log(req);
  return req;
}

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

app.get('/movies-default', (req, res)=>{

  console.log("api received")
  elasticSearchPopular().then(
    result=>{
      //console.log(result)
      res.json(result)
    },
    error=>res.send(error)
  )
})