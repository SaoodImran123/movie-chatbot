const {PythonShell} = require("python-shell");

module.exports = {

    //Classify a sentence using the classify.py python script
    sentenceClassify(sentence){
    return new Promise( (resolve) => {
        let options = {
            mode: 'text',
            pythonOptions: ['-u'],
            scriptPath: './server',//Path to your script
            args: [sentence]//Approach to send JSON as when I tried 'json' in mode I was getting error.
        };

        PythonShell.run('classify.py', options, function (err, results) {
            //If there is an issue running the script throw an error
            if (err) throw err;

            //Return results json
            resolve(results[0].replace(/'/g, "\""));
        });
    })
    }
}




//sentenceClassify("I like action movies").then(sentenceClassification => console.log(sentenceClassification))
/*sentenceClassify("I want to watch action movies").then(r => {
    console.log(r)
})*/


