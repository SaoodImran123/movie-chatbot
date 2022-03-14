const express = require('express');
var cors = require('cors')
const msgProcessor = require("./msg_processor")
const elastic = require("./elastic")
const routes = require("./api/routes")
var port = 3050;
const request = require('request');

const app = express();
app.use(cors({
  origin: '*'
}))

const REQUIREMENTS = ["genre", "production_company", "cast", "release_date", "original_language", "adult", "runtime"];



// DATABASE
// const mongoose = require("mongoose");
// var mongoDB = 'mongodb://Node:NtiEzkYS8S@143.198.38.75/movezen'
// mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});

// var db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Elastic Search
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
   hosts: [ 'http://moviezen:OdIO8m8bnKknUUDu1kMT@moviezen.dafoe.me:9200']
});
//elastic.pingElastic(client)



// PYTHON SCRIPT
let {PythonShell} = require('python-shell');
const { response } = require('express');
const { data } = require('autoprefixer');

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

        //searchTokens is a json string e.g. {"genre":["action","comedy"]} //searchTokens.genre[0]
        const request = require('request');

        request.get('http://127.0.0.1:5000/result', { json: true, body: {"sentence":data.message} }, (err, res, searchTokens) => {
          if (err) { return console.log(err); }
          console.log("Search tokens: ");
          console.log(searchTokens);

          // Append searchTokens to previous searchTokens
          data = combineArray(data, searchTokens);

          // Check if requirements have been met
          data = checkRequirements(data);

          //Perform search on given user sentence
          elastic.elasticSearchQuery(data, client).then(
            result => {
              showESResult(result, socket);
            },
            error=>console.log(error)
          )
        });
       

      }).catch(()=> {console.log("FAILED")})
        // send nlp 
        // return back to client
    });
});

function showESResult(result, socket){
  try {
    // Check if Elasticsearch returns a response
    if(result.response.length >0 && result.noResult !== true){
      // Only display top 5 recommendation
      result.response = result.response.slice(0, 5);

      // Create final string when all requirements are fulfilled
      let isTrue = result.requirements.every(function (e) {
        return e == true;
      });

      if(isTrue){
        result.bot_message =  "I recommend "; 
        for(var i =0; i < result.response.length; i++){
          if(i < result.response.length -1){
            result.bot_message += result.response[i]._source.title + ", ";
          }else{
            result.bot_message += "and " + result.response[i]._source.title;
          }
        }
      }else{
        let findMissingReqIndex = (element) => element == false;
        let reqIndex = result.requirements.findIndex(findMissingReqIndex);

        // const REQUIREMENTS = ["genre", "production_company", "cast", "release_date", "original_language", "adult", "runtime"]
        if (REQUIREMENTS[reqIndex] == "genre"){
          result.bot_message = ["What genre do you usually like watching?", "What kind of genre do you prefer?", "Any preference on genre?"];
          result.guided_ans = ["I want action movies", "I want comedy movies", "I want romance movies"];
        }else if(REQUIREMENTS[reqIndex] == "cast"){
          result.bot_message = ["Any preference on any actors or actresses?", "Do you want to watch any particular actor or actress?", "Any actors or actress you like watching?"];
          result.guided_ans = ["I want a movie starring Tom Hanks", "I love Tom holland", "Any movie with Natalie Portman is good"];
        }else if(REQUIREMENTS[reqIndex] == "release_date"){
          result.bot_message = ["Do you have any preference on how old the movie is?", "Any preference on when the movie was released?", "something else"];
          result.guided_ans = ["I want movies released in the past year", "I want movies released after 2010", "I want a movie from the past year"];
        }else if(REQUIREMENTS[reqIndex] == "original_language"){
          result.bot_message = ["What would you like the language to be?", "Do you prefer a movie with a specific language?", "Any preference on the language of the movie?"];
          result.guided_ans = ["I want an english movie", "I would like a movie in japanese", "I want spanish movies"];
        }else if(REQUIREMENTS[reqIndex] == "adult"){
          result.bot_message = ["Is there an intended audience?", "What is the intended audience?"];
          result.guided_ans = ["I would like movies to watch with my family", "I want R rated movies", "I want PG rated movies"];
        }else if(REQUIREMENTS[reqIndex] == "runtime"){
          result.bot_message = ["How long do you want the movie to be?", "Any preference on the movie length?"];
          result.guided_ans = ["I would like a movie longer than 2 hours", "I want a movie shorter than 2 hours", "I want a short movie"];
        }
        else if(REQUIREMENTS[reqIndex] == "production_company"){
          result.bot_message = ["Any preference on a production company?", "Do you want to watch a movie from a particular production company?", "Any production companies you prefer?"];
          result.guided_ans = ["I want a movie produced by Marvel Studios", "I want a movie produced by Lionsgate", "I want a Pixar movie"];
        }

        // Select a random bot message
        result.bot_message = result.bot_message[Math.floor(Math.random()*result.bot_message.length)];


        // remove message from result to avoid duplicate messages
        delete result.message;
        
        console.log(result)
        // Send back to frontend
        socket.emit('MESSAGE', result);
      }
    }else{
      request.get('http://127.0.0.1:5000/result', { json: true, body: {"sentence":result.message} }, (err, res, searchTokens) => {
          if (err) { return console.log(err); }
          // Remove token from 
          result.searchTokens.genre = result.searchTokens.genre.filter(item => !searchTokens.genre.includes(item))
          result.searchTokens.production_company = result.searchTokens.production_company.filter(item => !searchTokens.production_company.includes(item))
          result.searchTokens.cast = result.searchTokens.cast.filter(item => !searchTokens.cast.includes(item))
          result.searchTokens.release_date = result.searchTokens.genre.filter(item => !searchTokens.genre.includes(item))
          result.searchTokens.original_language = result.searchTokens.original_language.filter(item => !searchTokens.original_language.includes(item))
          result.searchTokens.adult = result.searchTokens.adult.filter(item => !searchTokens.adult.includes(item))
          result.searchTokens.runtime = result.searchTokens.runtime.filter(item => !searchTokens.runtime.includes(item))
          result.searchTokens.unclassified =  result.searchTokens.unclassified == "" ?  result.searchTokens.unclassified : result.searchTokens.unclassified.replace(searchTokens.unclassified, "");
          console.log("After removal")
          console.log(result)
          result.bot_message =  ["Sorry! I can't understand you. Try one of these options", "Sorry! I don't understand. Try one of these options", "Sorry! I couldn't get a result for that. Try one of these options"]; 
          result.guided_ans = ["I want action movies", "I would like a movie longer than 2 hours", "I want a Pixar movie"];

          result.bot_message = result.bot_message[Math.floor(Math.random()*result.bot_message.length)];

          // remove message from result to avoid duplicate messages
          delete result.message;

          console.log(result)
          // Send back to frontend
          socket.emit('MESSAGE', result);
        });
    }
  } catch (error) {
    console.log(error);
  }
}

// Check if JSON meets the requirements to complete a prediction
// Requirements are in the order of ["genre", "production_company", "cast", "release_date", "original_language", "adult", "runtime"]
function checkRequirements(data){
  data.requirements[0] = data.searchTokens.genre.length > 0 ? true: false;
  data.requirements[1] = data.searchTokens.production_company.length > 0 ? true: false;
  data.requirements[2] = data.searchTokens.cast.length > 0 ? true: false;
  data.requirements[3] = data.searchTokens.release_date.length > 0 ? true: false;
  data.requirements[4] = data.searchTokens.original_language.length > 0 ? true: false;
  data.requirements[5] = data.searchTokens.adult.length > 0 ? true: false;
  data.requirements[6] = data.searchTokens.runtime.length > 0 ? true: false;

  return data;
}

// Append search tokens by getting the union of the arrays for each category
function combineArray(data, newSearchTokens){
  data.searchTokens.genre = [...new Set([...data.searchTokens.genre, ...newSearchTokens.genre])];
  data.searchTokens.production_company = [...new Set([...data.searchTokens.production_company, ...newSearchTokens.production_company])];
  data.searchTokens.cast = [...new Set([...data.searchTokens.cast, ...newSearchTokens.cast])];
  data.searchTokens.release_date = [...new Set([...data.searchTokens.release_date, ...newSearchTokens.release_date])];
  data.searchTokens.original_language = [...new Set([...data.searchTokens.original_language, ...newSearchTokens.original_language])];
  data.searchTokens.adult = [...new Set([...data.searchTokens.adult, ...newSearchTokens.adult])];
  data.searchTokens.runtime = [...new Set([...data.searchTokens.runtime, ...newSearchTokens.runtime])];
  data.searchTokens.unclassified = newSearchTokens.unclassified == "" ? data.searchTokens.unclassified : data.searchTokens.unclassified + " " + newSearchTokens.unclassified;
  return data;
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
      res.json(result)
    },
    error=>res.send(error)
  )
})