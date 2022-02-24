const express = require('express');
var cors = require('cors')
const msgProcessor = require("./msg_processor")
const elastic = require("./elastic")
const routes = require("./api/routes")
var port = 3050;

const app = express();
app.use(cors({
  origin: '*'
}))




// DATABASE
// const mongoose = require("mongoose");
// var mongoDB = 'mongodb://Node:NtiEzkYS8S@143.198.38.75/movezen'
// mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});

// var db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Elastic Search
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
   hosts: [ 'http://moviezen:OdIO8m8bnKknUUDu1kMT@[2a01:4ff:f0:bdb::1]:9200']
});
elastic.pingElastic(client)



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

        //searchTokens is a json string e.g. {"genre":["action","comedy"]} //searchTokens.genre[0]
        let searchTokensStr = msgProcessor.sentenceClassify(data.message);
        let searchTokens = JSON.parse(searchTokensStr);

        //Perform search on given user sentence
        elastic.elasticSearchQuery(searchTokens, client).then(
            result => {
              showESResult(result);
            },
            error=>console.log(error)
        )



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
  elastic.elasticSearchPopular(client).then(
    result=>{
      //console.log(result)
      res.json(result)
    },
    error=>res.send(error)
  )
})
