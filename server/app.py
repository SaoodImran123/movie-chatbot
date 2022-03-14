#Setting up flask
#first create a virtual environment and have it install the dependencies in there (nltk, spacy, pickle, difflib, truecase, python-dateutil)
#then, if the neural network is called "app.py", just type "flask run", otherwise you must set an environment variable for FLASK_APP via set FLASK_APP=filename.py
#but this seems to not work sometimes, but leaving it named app.py (default flask app name) seems to work
# pip install Flask
# pip install git+https://github.com/casics/nostril.git
from flask import Flask,request
import json
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from rake_nltk import Rake
from nostril import nonsense
import spacy
import pickle
from difflib import SequenceMatcher
import truecase
import re
import sys
from dateutil.parser import parse
import datetime

# Constants
categories = ["genre", "production_company", "cast", "release_date", "language", "age_restriction", "runtime"]

nlp = spacy.load("en_core_web_trf", exclude=["tok2vec", "ner"])

# For Cast and Production companies
def extract_proper_nouns(doc):
    pos = [tok.i for tok in doc if (tok.pos_ == "PROPN" or tok.text == "marvel")]
    consecutives = []
    current = []
    for elt in pos:
        if len(current) == 0:
            current.append(elt)
        else:
            if current[-1] == elt - 1:
                current.append(elt)
            else:
                consecutives.append(current)
                current = [elt]
    if len(current) != 0:
        consecutives.append(current)
    return [doc[consecutive[0]:consecutive[-1]+1] for consecutive in consecutives]


def checkList(user_tokens,List, type):
    arr = []
    for x in user_tokens:
        if x in List:
            arr.append(x)
    return arr

def checkProductionCompanies(productionCompaniesName, ppn):
    companies = []
    if len(ppn) > 0:
        for x in ppn:
            word = str(x.text.strip()).lower()
            for y in productionCompaniesName:
                if word in y:
                    if SequenceMatcher(None, word, y).ratio() > 0.6 and (word != "tom hanks"  and word != "tom hank"):
                        companies.append(y)
                        break
    return companies

def checkCast(castNameSet, ppn):
    cast = []
    if len(ppn) < 1: 
        return []

    for x in ppn:
        word = str(x.text.strip()).lower()
        for y in castNameSet:
            if word in y:
                if word == y and word != "disney":
                    cast.append(y)
                    break
    return cast

def checkCharacters(characterSet, ppn):
    character = []
    if len(ppn) < 1: 
        return []

    for x in ppn:
        word = str(x.text.strip()).lower()
        for y in characterSet:
            if SequenceMatcher(None,word, y).ratio() > 0.9:
                character.append(y)
                break
    return character

def checkRuntime(user_text):
    requestType = ["less than", "greater than", "longer", "shorter", "no more", "more", "long", "short", "equal"]
    type ="eq"
    finalMins = 0
    for z in requestType:
        if z in user_text:
            if z in ["greater than", "longer", "more", "long"]:
                type = "gte"
            elif z in ["less than","shorter", "no more","short"]:
                type = "lte"
            

            break
    #timeMention1 = re.findall("\d+:\d+|\d+hr|\d+hour|\d+\shour|\d+min|\d+\smin|\d+m",user_text)
    hrMinAmount = re.findall("\d+:\d+",user_text)
    hrAmount = re.findall("\d+hr|\d+hour|\d+\shour|\d+\.\d+hr|\d+\.\d+\shr|\d+\.\d+hour|\d+\.\d+\shour|\d+\shr",user_text)
    minAmount = re.findall("\d+min|\d+\smin|\d+m",user_text)
    if hrAmount:
        hrs = re.findall("[-+]?(?:\d*\.\d+|\d+)",hrAmount[0])
        finalMins += int(float(hrs[0])*60.0)
        # Convert Hr to mins
        # Need to check greater or less than
        # return in this format: ["lte", timeMention1[0]] or ["eq", timeMention1[0]]
    if minAmount:
        minsString = ''.join((ch if ch in '0123456789.-e' else ' ') for ch in minAmount[0])
        mins = [float(i) for i in minsString.split()]
        finalMins += int(mins[0])
    if hrMinAmount and not (minAmount or hrAmount):
        hrsConvert = hrMinAmount[0].split(":")[0]
        minsConvert = hrMinAmount[0].split(":")[1]
        finalhrs = int(int(hrsConvert)*60) + int(minsConvert)
        return [type, str(finalhrs)]
    if finalMins > 0:
        return [type, str(finalMins)]
    return []
    

# if user specified a year like 2015 return [["gte", "2015-01-01"], ["lte", "2016-01-01"]]
# if user specifies a year greater than 2015 return just ["gte", "2015-01-01"]
# Maybe add dates like ex: user enter "I want movies released in july 4, 1999" return ["eq", "1999-07-04"]
# if words like old return ["lte", "2005-01-01"] by default
# if words like new return ["gte", "2015-01-01"]
def checkReleaseDate(user_text):
    requestType = ["made in", "released in", "released after", "released before" "from the", "created in", "older than", "from before", "made before", "created before" "newer than", "made after", "created after"]
    type ="eq"
    # Check if string contains  the substring from the requestType
    if not any(ele in user_text for ele in requestType):
        return []
    for z in requestType:
        if z in user_text:
            if z in ["newer than", "made after","created after"]:
                type = "gte"
            elif z in ["older than", "from before", "made before","created before"]:
                type = "lte"
    try:
        date = parse(user_text,fuzzy=True)
        today = date.today()
        if date.month == today.month and date.day == today.day:
            date = date.replace(month=1, day=1)
            date = str(date.year) + "-" + str(date.month) + "-" + str(date.day)
            date = datetime.datetime.strptime(date, "%Y-%m-%d").strftime("%Y-%m-%d")
        return [type, date]
    except ValueError:
        return []

def classify(user_text):
    user_text_tokenized = word_tokenize(user_text.lower())
    stopwords = nltk.corpus.stopwords.words('english')
    new_stopwords=('movie', 'movies')
    stopwords.extend(new_stopwords)
    true_case = truecase.get_true_case(user_text)
    user_tokens_filtered = set([word for word in user_text_tokenized if not word in stopwords])

    doc = nlp(true_case)
    ppn = extract_proper_nouns(doc)
    ppnString = [x.text.strip().lower() for x in ppn]
    
    user_tokens_removed_Proper_Nouns = [x for x in user_tokens_filtered if x not in ppnString]
    keywords = {
        'genre': checkList(user_tokens_filtered,genreName,"Genre"), 
        'production_company': checkProductionCompanies(productionCompaniesName, ppn), 
        'cast': checkCast(castNameSet, ppn), 
        'release_date': checkReleaseDate(user_text), 
        'original_language': checkList(user_tokens_filtered,languageName,"Language"), 
        'adult': checkList(user_tokens_removed_Proper_Nouns,ageRestrictionWords,"Age restriction"), 
        'runtime': checkRuntime(user_text), 
        #'character': checkCharacters(castCharactersSet, ppn),
        'unclassified': ""
        }

    # When sentence is unclassified, extract keywords from the sentence
    if len(keywords["genre"]) == 0 and len(keywords["production_company"]) == 0 and len(keywords["cast"] ) == 0 and len(keywords["release_date"]) == 0 and len(keywords["original_language"]) == 0 and len(keywords["adult"]) == 0 and len(keywords["runtime"]) == 0:
        stopwords = nltk.corpus.stopwords.words('english')
        # stopwords.remove("don")
        # stopwords.remove("don't")
        # stopwords.remove("do")
        # stopwords.remove("not")
        new_stopwords=('movie', 'movies', 'film', 'films', 'want', 'would like', 'dont')
        stopwords.extend(new_stopwords)

        r = Rake(stopwords=stopwords)

        # Extraction given the text.
        r.extract_keywords_from_text(user_text)

        # To get keyword phrases ranked highest to lowest with scores.
        result = r.get_ranked_phrases()
        filtered_result = []
        for token in result:
            # nonsense is limited to only check strings with 6 letters
            if len(token) < 6:
                filtered_result.append(token)
            elif not nonsense(token):
                filtered_result.append(token)
        
        keywords["unclassified"] = ' '.join(filtered_result)
    return(keywords)

with open(r"server/cast.txt", "rb") as f:
    castName = pickle.load(f)
castNameSet = set(castName)

with open(r"server/castCharacters.txt", "rb") as f:
    castName = pickle.load(f)
castCharactersSet = set(castName)

with open(r"server/production_companies.txt", "rb") as f:
    productionCompaniesName = pickle.load(f)
productionNameSet = set(productionCompaniesName)

with open(r"server/genres.txt", "rb") as f:
    genreName = pickle.load(f)
genreName = set(genreName)

with open(r"server/runTimeWords.txt", "rb") as f:
    runTimeWords = pickle.load(f)
runTimeWords = set(runTimeWords)

with open(r"server/ageRestrictionWords.txt", "rb") as f:
    ageRestrictionWords = pickle.load(f)
ageRestrictionWords = set(ageRestrictionWords)

with open(r"server/releaseDateWords.txt", "rb") as f:
    releaseDateWords = pickle.load(f)
releaseDateWords = set(releaseDateWords)

with open(r"server/languages.txt", "rb") as f:
    languageName = pickle.load(f)
languages = set(languageName)


app = Flask(__name__)
@app.route("/result", methods=["POST","GET"])
def result():
    output=request.get_json()
    user_text = output["sentence"]
    results = classify(user_text)

    return (results)

if __name__ == "__main__":
    app.run(debug=False)