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

const REQUIREMENTS = ["genre", "production_company", "cast", "release_date", "original_language", "runtime"];



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
      //console.log('results: ');
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
    //console.log('server running on port ' + port);
});

const io = require('socket.io')(server, {
    cors: {
      origin: '*',
    }
  });

io.on('connection', function(socket) {
    //console.log(socket.id)
    socket.on('SEND_MESSAGE', function(data) {
      return new Promise(async function(resolve, reject){


        if (data.isFinal){
            data = resetQuery(data);
            if(data.message.toLowerCase() == "yes"){
              data.bot_message = "Glad you liked it!";
              data.isFinal = true;

              delete data.message;
              socket.emit('MESSAGE', data);
            }else{
              elastic.elasticSearchPopular(client).then(
                result => {
                  showDefault(result, socket, data);
                },
                error=>console.log(error)
              )
            }
        }else{
          //searchTokens is a json string e.g. {"genre":["action","comedy"]} //searchTokens.genre[0]
          request.get('http://127.0.0.1:5000/result', { json: true, body: {"sentence":data.message} }, (err, res, searchTokens) => {
          if (err) { return console.log(err); }

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
      }
       
      }).catch(()=> {console.log("FAILED")})
    });
    
});

function resetQuery(result){
  result.searchTokens = {genre: [[],[]], production_company: [[],[]], cast:[[],[]], character:[[],[]], release_date: [[],[]], original_language: [[],[]], adult: [[],[]], runtime:[[],[]], unclassified: [[],[]]};
  result.response = [];
  result.total = "";
  result.isFinal = false;
  result.requirements = [];

  return result;
}

function showDefault(resp, socket, result){

  result.response = resp;
  result.response = result.response.slice(0, 5);
  result.bot_message = "Let's start over. What kind of movies do you like?";
  result.isFinal = false;
  result.reset = true;

  // remove message from result to avoid duplicate messages
  delete result.message;
    
  // Send back to frontend
  socket.emit('MESSAGE', result);

}

function showESResult(result, socket){
  try {
    // Check if Elasticsearch returns a response
    if(result.response.length > 0 && !result.noResult && result.total > 0){
      // Only display top 5 recommendation
      result.response = result.response.slice(0, 5);

      // Create final string when all requirements are fulfilled
      let isTrue = result.requirements.every(function (e) {
        return e == true;
      });

      if(isTrue || result.response.length < 5 || result.total <= 5){
        result.bot_message =  "I recommend "; 
        if (result.response.length > 1){
          for(var i =0; i < result.response.length; i++){
            if(i < result.response.length -1){
              result.bot_message += result.response[i]._source.title + ", ";
            }else{
              result.bot_message += "and " + result.response[i]._source.title;
            }
          }
        }else{
          result.bot_message += result.response[0]._source.title;
        }
        result.bot_message += ". Are you satisfied with the recommendations?";
        result.guided_ans = ["Yes", "No"];
        result.isFinal = true;
      }else if(result.resultFiltered){
        result.bot_message = "The search didn't change the recommendations. ";
        result.bot_message += chooseResponse(result.requirements);
        result.guided_ans = chooseGuidedAns(result.requirements);
      }
      else{
        result.bot_message = chooseResponse(result.requirements);
        result.guided_ans = chooseGuidedAns(result.requirements);
      }

      result = checkRequirements(result);

      // remove message from result to avoid duplicate messages
      delete result.message;
        
      //console.log(result)
      // Send back to frontend
      socket.emit('MESSAGE', result);

    }else{
      request.get('http://127.0.0.1:5000/result', { json: true, body: {"sentence":result.message} }, (err, res, searchTokens) => {
        if (err) { return console.log(err); }

        // TODO: check search tokens if it got classified
        // result.response.length
        if (result.total == 0){
          result.bot_message =   ["Sorry! There are no movies with that search. Try one of these options", "I didn't find a movie for this search. Try one of these options", "Sorry! I couldn't find a movie for that. Try one of these options"]; 
        }else if (result.total > 0){
          // check search token entered
          result.bot_message =  ["Sorry! I didn't find a match for your search. Try one of these options", "I didn't find a match for this search. Try one of these options", "Sorry! I couldn't get a result for that. Try one of these options"]; 
        }
        // Remove token from query
        result = removeOldTokens(result, searchTokens);
        result = checkRequirements(result);

        // Choose a response
        result.guided_ans = chooseGuidedAns(result.requirements);
        
        result.bot_message = result.bot_message[Math.floor(Math.random()*result.bot_message.length)];

        // remove message from result to avoid duplicate messages
        delete result.message;

        //console.log(result)
        // Send back to frontend
        socket.emit('MESSAGE', result);
      });
    }
  } catch (error) {
    console.log(error);
  }
}

// Check if JSON meets the requirements to complete a prediction
// Requirements are in the order of ["genre", "production_company", "cast", "release_date", "original_language", "runtime"]
function checkRequirements(data){
  data.requirements[0] = data.searchTokens.genre[0].length > 0 ? true: false || data.searchTokens.genre[1].length > 0 ? true: false;
  data.requirements[1] = data.searchTokens.production_company[0].length > 0 ? true: false || data.searchTokens.production_company[1].length > 0 ? true: false;
  data.requirements[2] = data.searchTokens.cast[0].length > 0 ? true: false || data.searchTokens.cast[1].length > 0 ? true: false;
  data.requirements[3] = data.searchTokens.release_date[0].length > 0 ? true: false || data.searchTokens.release_date[1].length > 0 ? true: false;
  data.requirements[4] = data.searchTokens.original_language[0].length > 0 ? true: false || data.searchTokens.original_language[1].length > 0 ? true: false;
  data.requirements[5] = data.searchTokens.runtime[0].length > 0 ? true: false || data.searchTokens.runtime[1].length > 0 ? true: false;
  return data;
}

// Append search tokens by getting the union of the arrays for each category
function combineArray(data, newSearchTokens){
  data.searchTokens.genre[0] = [...new Set([...data.searchTokens.genre[0], ...newSearchTokens.genre[0]])];
  data.searchTokens.genre[1] = [...new Set([...data.searchTokens.genre[1], ...newSearchTokens.genre[1]])];
  data.searchTokens.production_company[0] = [...new Set([...data.searchTokens.production_company[0], ...newSearchTokens.production_company[0]])];
  data.searchTokens.production_company[1] = [...new Set([...data.searchTokens.production_company[1], ...newSearchTokens.production_company[1]])];
  data.searchTokens.cast[0] = [...new Set([...data.searchTokens.cast[0], ...newSearchTokens.cast[0]])];
  data.searchTokens.cast[1] = [...new Set([...data.searchTokens.cast[1], ...newSearchTokens.cast[1]])];
  data.searchTokens.character[0] = [...new Set([...data.searchTokens.character[0], ...newSearchTokens.character[0]])];
  data.searchTokens.character[1] = [...new Set([...data.searchTokens.character[1], ...newSearchTokens.character[1]])];
  data.searchTokens.original_language[0] = [...new Set([...data.searchTokens.original_language[0], ...newSearchTokens.original_language[0]])];
  data.searchTokens.original_language[1] = [...new Set([...data.searchTokens.original_language[1], ...newSearchTokens.original_language[1]])];
  data.searchTokens.adult[0] = [...new Set([...data.searchTokens.adult[0], ...newSearchTokens.adult[0]])];
  data.searchTokens.adult[1] = [...new Set([...data.searchTokens.adult[1], ...newSearchTokens.adult[1]])];

  if(newSearchTokens.release_date[0].length > 0){
    for (let i = 0; i < newSearchTokens.release_date[0].length; i++){
      data.searchTokens.release_date[0].push(newSearchTokens.release_date[0][i]);
    }
    // Remove duplicates
    data.searchTokens.release_date[0] = [...new Set(data.searchTokens.release_date[0])]
  }

  if(newSearchTokens.release_date[1].length > 0){
    for (let i = 0; i < newSearchTokens.release_date[1].length; i++){
      data.searchTokens.release_date[1].push(newSearchTokens.release_date[1][i]);
    }
    // Remove duplicates
    data.searchTokens.release_date[1] = [...new Set(data.searchTokens.release_date[1])]
  }

  if(newSearchTokens.runtime[0].length > 0){
    for (let i = 0; i < newSearchTokens.runtime[0].length; i++){
      data.searchTokens.runtime[0].push(newSearchTokens.runtime[0][i]);
    }
    // Remove duplicates
    data.searchTokens.runtime[0] = [...new Set(data.searchTokens.runtime[0])]
  }

  if(newSearchTokens.runtime[1].length > 0){
    for (let i = 0; i < newSearchTokens.runtime[1].length; i++){
      data.searchTokens.runtime[1].push(newSearchTokens.runtime[1][i]);
    }
    // Remove duplicates
    data.searchTokens.runtime[1] = [...new Set(data.searchTokens.runtime[1])]
  }

  data.searchTokens.unclassified[0] = [...new Set([...data.searchTokens.unclassified[0], ...newSearchTokens.unclassified[0]])];
  data.searchTokens.unclassified[1] = [...new Set([...data.searchTokens.unclassified[1], ...newSearchTokens.unclassified[1]])];

  return data;
}

// Append search tokens by getting the union of the arrays for each category
function removeOldTokens(result, searchTokens){
  result.searchTokens.genre[0] = removeTokens(result.searchTokens.genre[0], searchTokens.genre[0], false);
  result.searchTokens.genre[1] = removeTokens(result.searchTokens.genre[1], searchTokens.genre[1], false);
  result.searchTokens.production_company[0] = removeTokens(result.searchTokens.production_company[0], searchTokens.production_company[0], false);
  result.searchTokens.production_company[1] = removeTokens(result.searchTokens.production_company[1], searchTokens.production_company[1], false);
  result.searchTokens.cast[0] = removeTokens(result.searchTokens.cast[0], searchTokens.cast[0], false);
  result.searchTokens.cast[1] = removeTokens(result.searchTokens.cast[1], searchTokens.cast[1], false);
  result.searchTokens.character[0] = removeTokens(result.searchTokens.character[0], searchTokens.character[0], false);
  result.searchTokens.character[1] = removeTokens(result.searchTokens.character[1], searchTokens.character[1], false);
  result.searchTokens.adult[0] = removeTokens(result.searchTokens.adult[0], searchTokens.adult[0], false);
  result.searchTokens.adult[1] = removeTokens(result.searchTokens.adult[1], searchTokens.adult[1], false);
  result.searchTokens.original_language[0] = removeTokens(result.searchTokens.original_language[0], searchTokens.original_language[0], false);
  result.searchTokens.original_language[1] = removeTokens(result.searchTokens.original_language[1], searchTokens.original_language[1], false);
  result.searchTokens.unclassified[0] = removeTokens(result.searchTokens.unclassified[0], searchTokens.unclassified[0], false);
  result.searchTokens.unclassified[1] = removeTokens(result.searchTokens.unclassified[1], searchTokens.unclassified[1], false);
  result.searchTokens.release_date[0] = removeTokens(result.searchTokens.release_date[0], searchTokens.release_date[0], true);
  result.searchTokens.release_date[1] = removeTokens(result.searchTokens.release_date[1], searchTokens.release_date[1], true);
  result.searchTokens.runtime[0] = removeTokens(result.searchTokens.runtime[0], searchTokens.runtime[0], true);
  result.searchTokens.runtime[1] = removeTokens(result.searchTokens.runtime[1], searchTokens.runtime[1], true);
  
  return result;
}

// Append search tokens by getting the union of the arrays for each category
function removeTokens(oldSearchTokens, newSearchTokens, is2D){
  var filteredArr = [];
  if (is2D){
    for (let i = 0; i < oldSearchTokens.length; i++){
      filteredArr.push(oldSearchTokens[i])
      for (let j = 0; j < newSearchTokens.length; j++){
        if (oldSearchTokens[i].toString() === newSearchTokens[j].toString()){
          filteredArr.splice(-1);
          break;
        }
      }
    }
  }else{
    filteredArr = oldSearchTokens.filter(item => !newSearchTokens.includes(item))
  }

  return filteredArr;
}

// Choose guided answers 
function chooseResponse(requirements){
    let response = [];

    // Find index of the missing requirement
    let findMissingReqIndex = (element) => element == false;
    let reqIndex = requirements.findIndex(findMissingReqIndex);

    // const REQUIREMENTS = ["genre", "production_company", "cast", "release_date", "original_language", "adult", "runtime"]
    if (REQUIREMENTS[reqIndex] == "genre"){
      response = ["What genre do you usually like watching?", "What kind of genre do you prefer?", "Any preference on genre?"];
    }else if(REQUIREMENTS[reqIndex] == "cast"){
      response = ["Any preference on any actors or actresses?", "Do you want to watch any particular actor or actress?", "Any actors or actress you like watching?"];
    }else if(REQUIREMENTS[reqIndex] == "release_date"){
      response = ["Do you have any preference on how old the movie is?", "Any preference on when the movie was released?"];
    }else if(REQUIREMENTS[reqIndex] == "original_language"){
      response = ["What would you like the language to be?", "Do you prefer a movie with a specific language?", "Any preference on the language of the movie?"];
    }else if(REQUIREMENTS[reqIndex] == "runtime"){
      response = ["How long do you want the movie to be?", "Any preference on the movie length?"];
    }else if(REQUIREMENTS[reqIndex] == "production_company"){
      response = ["Any preference on a production company?", "Do you want to watch a movie from a particular production company?", "Any production companies you prefer?"];
    }

    response = response[Math.floor(Math.random()*response.length)];

    return response;
}

// Choose guided answers 
function chooseGuidedAns(requirements){
  let response = [];

  // Find index of the missing requirement
  let findMissingReqIndex = (element) => element == false;
  let reqIndex = requirements.findIndex(findMissingReqIndex);

  // const REQUIREMENTS = ["genre", "production_company", "cast", "release_date", "original_language", "adult", "runtime"]
  if (REQUIREMENTS[reqIndex] == "genre"){
    response = ["I want action movies", "I want comedy movies", "I want romance movies"];
  }else if(REQUIREMENTS[reqIndex] == "cast"){
    response = ["I want a movie starring Tom Hanks", "I love Tom holland", "Any movie with Natalie Portman is good"];
  }else if(REQUIREMENTS[reqIndex] == "release_date"){
    response = ["I want movies released in the past year", "I want movies released after 2010", "I want a movie in 2020"];
  }else if(REQUIREMENTS[reqIndex] == "original_language"){
    response = ["I want an english movie", "I would like a movie in japanese", "I want spanish movies"];
  }else if(REQUIREMENTS[reqIndex] == "runtime"){
    response = ["I would like a movie longer than 2 hours", "I want a movie shorter than 2 hours", "I want an 1hr 30min movie"];
  }else if(REQUIREMENTS[reqIndex] == "production_company"){
    response = ["I want a movie produced by Marvel Studios", "I want a movie produced by Lionsgate", "I want a Pixar movie"];
  }

  return response;
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

  //console.log("api received")
  elastic.elasticSearchPopular(client).then(
    result=>{
      res.json(result)
    },
    error=>res.send(error)
  )
})