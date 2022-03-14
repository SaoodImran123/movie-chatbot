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
          console.log("done");

          // Append searchTokens to previous searchTokens
          data = combineArray(data, searchTokens);

          // Check if requirements have been met
          data = checkRequirements(data);

          //Perform search on given user sentence
          elastic.elasticSearchQuery(data, client).then(
            result => {
              showESResult(result);
            },
            error=>console.log(error)
          )
        });
       
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



      }).catch(()=> {console.log("FAILED")})
        // send nlp 
        // return back to client
    });
});

function showESResult(result){
  try {
    // Check if Elasticsearch returns a response
    if(result.response.lenght >0){
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
          result.bot_message = "What genre do you prefer?";
          result.guided_ans = ["I want action movies", "I want comedy movies", "I want romance movies"];
        }else if(REQUIREMENTS[reqIndex] == "production_company"){

        }else if(REQUIREMENTS[reqIndex] == "cast"){
          
        }else if(REQUIREMENTS[reqIndex] == "release_date"){
          result.bot_message = "Do you have any preference on how old the movie is?";
          result.guided_ans = ["I want movies released in the past year", "I want movies released in the last 10 years", "I don't have a preference"];
        }else if(REQUIREMENTS[reqIndex] == "original_language"){
          
        }else if(REQUIREMENTS[reqIndex] == "adult"){
          
        }else if(REQUIREMENTS[reqIndex] == "runtime"){
          
        }
      }
    }else{
      result.bot_message =  "I can't find a movie with that search"; 
      result.guided_ans = ["test", "test", "test"];
    }

    console.log(result);

    // remove message from result to avoid duplicate messages
    delete result.message;

    // Send back to frontend
    io.emit('MESSAGE', result);
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
  data.searchTokens.unclassified = data.searchTokens.unclassified + " " + newSearchTokens.unclassified;
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
