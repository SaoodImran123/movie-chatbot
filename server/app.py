#Setting up flask
#first create a virtual environment and have it install the dependencies in there (nltk, spacy, pickle, difflib, truecase, python-dateutil)
#then, if the neural network is called "app.py", just type "flask run", otherwise you must set an environment variable for FLASK_APP via set FLASK_APP=filename.py
#but this seems to not work sometimes, but leaving it named app.py (default flask app name) seems to work
# pip install Flask
# pip install spacy
# pip install truecase
# pip install -U pip setuptools wheel
# python -m spacy download en_core_web_trf
# pip install pymongo
# pip install gibberish-detector
# gibberish-detector train .\big.txt > gibberish-detector.model (not needed if model exists)
# >run Data.py
# cd server
# python Data.py

from flask import Flask,request
import nltk
from nltk.corpus import stopwords
from nltk.corpus import words
from nltk.tokenize import word_tokenize
from rake_nltk import Rake
import spacy
import pickle
from difflib import SequenceMatcher
import truecase
import re
from datetime import datetime
from dateutil.parser import parse
from dateutil.relativedelta import relativedelta
import datetime
from gibberish_detector import detector
import sys
from spacy.tokenizer import Tokenizer
from spacy.util import compile_infix_regex
import string

# Constants
categories = ["genre", "production_company", "cast", "release_date", "language", "age_restriction", "runtime"]
language = {"af": "afrikaans", "sq": "albanian", "am": "amharic", "ar": "arabic", "hy": "armenian", "az": "azerbaijani", "eu": "basque", "be": "belarusian", "bn": "bengali", "bs": "bosnian", "bg": "bulgarian", "ca": "catalan", "ceb": "cebuano", "ny": "chichewa", "zh-cn": "chinese (simplified)", "zh-tw": "chinese (traditional)", "co": "corsican", "hr": "croatian", "cs": "czech", "da": "danish", "nl": "dutch", "en": "english", "eo": "esperanto", "et": "estonian", "tl": "filipino", "fi": "finnish", "fr": "french", "fy": "frisian", "gl": "galician", "ka": "georgian", "de": "german", "el": "greek", "gu": "gujarati", "ht": "haitian creole", "ha": "hausa", "haw": "hawaiian", "iw": "hebrew", "hi": "hindi", "hmn": "hmong", "hu": "hungarian", "is": "icelandic", "ig": "igbo", "id": "indonesian", "ga": "irish", "it": "italian", "ja": "japanese", "jw": "javanese", "kn": "kannada", "kk": "kazakh", "km": "khmer", "ko": "korean", "ku": "kurdish (kurmanji)", "ky": "kyrgyz", "lo": "lao", "la": "latin", "lv": "latvian", "lt": "lithuanian", "lb": "luxembourgish", "mk": "macedonian", "mg": "malagasy", "ms": "malay", "ml": "malayalam", "mt": "maltese", "mi": "maori", "mr": "marathi", "mn": "mongolian", "my": "myanmar (burmese)", "ne": "nepali", "no": "norwegian", "ps": "pashto", "fa": "persian", "pl": "polish", "pt": "portuguese", "pa": "punjabi", "ro": "romanian", "ru": "russian", "sm": "samoan", "gd": "scots gaelic", "sr": "serbian", "st": "sesotho", "sn": "shona", "sd": "sindhi", "si": "sinhala", "sk": "slovak", "sl": "slovenian", "so": "somali", "es": "spanish", "su": "sundanese", "sw": "swahili", "sv": "swedish", "tg": "tajik", "ta": "tamil", "te": "telugu", "th": "thai", "tr": "turkish", "uk": "ukrainian", "ur": "urdu", "uz": "uzbek", "vi": "vietnamese", "cy": "welsh", "xh": "xhosa", "yi": "yiddish", "yo": "yoruba", "zu": "zulu", "fil": "filipino", "he": "hebrew"}
languageName = list(language.values())

nlp = spacy.load("en_core_web_trf", exclude=["tok2vec", "ner"])
Detector = detector.create_from_model('server/gibberish-detector.model')

def getKeyFromValue(value):
    return list(language.keys())[list(language.values()).index(value)]

def custom_tokenizer(nlp):
    inf = list(nlp.Defaults.infixes)               # Default infixes
    inf.remove(r"(?<=[0-9])[+\-\*^](?=[0-9-])")    # Remove the generic op between numbers or between a number and a -
    inf = tuple(inf)                               # Convert inf to tuple
    infixes = inf + tuple([r"(?<=[0-9])[+*^](?=[0-9-])", r"(?<=[0-9])-(?=-)"])  # Add the removed rule after subtracting (?<=[0-9])-(?=[0-9]) pattern
    infixes = [x for x in infixes if '-|–|—|--|---|——|~' not in x] # Remove - between letters rule
    infixes = [x for x in infixes if '/' not in x] # Remove / between letters rule
    infix_re = compile_infix_regex(infixes)

    return Tokenizer(nlp.vocab, prefix_search=nlp.tokenizer.prefix_search,
                                suffix_search=nlp.tokenizer.suffix_search,
                                infix_finditer=infix_re.finditer,
                                token_match=nlp.tokenizer.token_match,
                                rules=nlp.Defaults.tokenizer_exceptions)

# For Cast and Production companies
def extract_proper_nouns(doc):
    pos = [tok.i for tok in doc if (tok.pos_ == "PROPN" or tok.pos_ == "NOUN" or tok.pos_ == "NUM" or tok.pos_ == "ADJ")]
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

def checkAgeRestriction(user_tokens):
    ageRestrictionWords = ["children", "adult", "child", "kid", "r rated", "pg rated", "rated r", "rated pg", "younger audience", "appropriate", "inappropriate", "lewd", "pg", "g", "pg-13", "pg13",]
    childFilter = ["child","children", "baby", "youngster", "adolescent", "teenager", "youth", "toddler", "g", "pg-13", "pg13", "pg rated","rated pg"]
    adultFilter = ["adult", "r rated", "rated r", "inappropriate", "lewd"]
    
    for token in user_tokens:
        if token.lower() in ageRestrictionWords:
            if token.lower() in childFilter:
                return ["false"], [token]
            elif token.lower() in adultFilter:
                return ["true"], [token]

    return [], []

def checkProductionCompanies(productionCompaniesName, ppn):
    companies = []
    removed = []

    if len(ppn) > 0:
        for x in ppn:
            word = str(x.strip()).lower()
            for y in productionCompaniesName:
                if word in y:
                    if word == y:
                        companies.append(y)
                        removed.append(y)
    
    ppn = list(set(ppn) - set(removed))

    # Check for remaining ppn then do sequence matcher when there is no exact match
    if len(ppn) > 0:            
        for x in ppn:
            word = str(x.strip()).lower()
            for y in productionCompaniesName:
                if word in y:
                    if SequenceMatcher(None, word, y).quick_ratio() >= 0.45 and word in y:
                        companies.append(y)

    return companies

def checkCast(castNameSet, ppn):
    cast = []
    removed = []
    if len(ppn) < 1: 
        return []

    for x in ppn:
        word = str(x.strip()).lower()
        for y in castNameSet:
            if word == y:
                cast.append(y)
                removed.append(y)

    ppn = list(set(ppn) - set(removed))
    if len(ppn) > 0:
        for x in ppn:
            word = str(x.strip()).lower()
            for y in castNameSet:
                if SequenceMatcher(None, word, y).quick_ratio() >= 0.95 and word in y:
                    cast.append(y)

    return cast

def checkCharacters(characterSet, ppn):
    character = []
    removed = []
    if len(ppn) < 1: 
        return []

    for x in ppn:
        word = str(x.strip()).lower()
        for y in characterSet:
            filtered_y = y.replace('-', ' ', 1)
            if word == filtered_y or word == y:
                character.append(y)
                removed.append(y)

    ppn = list(set(ppn) - set(removed))
    if len(ppn) > 0:
        for x in ppn:
            word = str(x.strip()).lower()
            for y in characterSet:
                if SequenceMatcher(None, word, y).quick_ratio() >= 0.95 and word in y:
                    character.append(y)
                
    return character

def checkRuntime(user_text):
    requestType = ["less than", "greater than", "longer", "shorter", "no more", "more", "long", "short", "equal", "longer than", "shorter than"]
    type ="eq"
    finalMins = 0
    for z in requestType:
        if z in user_text:
            if z in ["greater than", "longer", "more", "long", "longer than"]:
                type = "gte"
            elif z in ["less than","shorter", "no more","short", "shorter than"]:
                type = "lte"
            break
    
    generalRegex = "\d+hrs?\s\d+mins?|\d+hrs?\s\d+\smins?|\d+\shrs?\s\d+\smins?|\d+hours?\s\d+mins?|\d+\shrs?\s\d+ms?|\d+\shrs?\s\d+\sms?|\d+\shours?\s\d+\smins?|hr\s\d+mins?|hr\s\d+\smins?|hr\s\d+\sms?|hr\s\d+ms?|hour\s\d+mins?|hour\s\d+\smins?|hour\s\d+\sms?|hour\s\d+ms?|\d+:\d+|\d+hrs?|\d+\shours?|\d+\shrs?|\d+hours?|\d+\.\d+hrs?|\d+\.\d+\shrs?|\d+\.\d+hours?|\d+\.\d+\shours?|\d+mins?|\d+\smins?|\d+m|\d+\sm"
    generalRequest = re.findall(generalRegex,user_text)
    
    #timeMention1 = re.findall("\d+:\d+|\d+hr|\d+hour|\d+\shour|\d+min|\d+\smin|\d+m",user_text)
    hrMinAmount = re.findall("\d+:\d+",user_text)
    hrAmount = re.findall("\d+hr|\d+hour|\d+\shour|\d+\.\d+hr|\d+\.\d+\shr|\d+\.\d+hour|\d+\.\d+\shour|\d+\shr|an hour|an hr",user_text)
    minAmount = re.findall("\d+min|\d+\smin|\d+m|\d+\sm",user_text)
    if hrAmount:
        if hrAmount[0] == "an hour" or hrAmount[0] == "an hr":
            hrs = ["1"]
        else:
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
        return [type, str(finalhrs)], generalRequest
    if finalMins > 0:
        return [type, str(finalMins)], generalRequest
    return [], []
    

# if user specified a year like 2015 return [["gte", "2015-01-01"], ["lte", "2016-01-01"]]
# if user specifies a year greater than 2015 return just ["gte", "2015-01-01"]
# Maybe add dates like ex: user enter "I want movies released in july 4, 1999" return ["eq", "1999-07-04"]
# if words like old return ["lte", "2005-01-01"] by default
# if words like new return ["gte", "2015-01-01"]
def checkReleaseDate(user_text):
    requestType = ["in the last", "in the year","in the past", "in this", "made in", "released in", "released later", "released after", "released before", "from the", "created in", "older than", "from before", "made before", "created before", "newer than", "made after", "created after", "from"]
    type ="eq"
    yr = 0
    mn = 0
    dy = 0
    date = ""
    # Check if string contains  the substring from the requestType
    if not any(ele in user_text for ele in requestType):
        return [], []
    
    for z in requestType:
        if z in user_text:
            if z in ["last" + "newer than", "made after","created after", "released later", "past", "released after"]:
                type = "gte"
            elif z in ["older than", "from before", "made before","created before", "released before"]:
                type = "lte"

    try:
        test_list = ["year", "past", "month", "day"]

        for request in requestType:
            generalRegex = re.escape(request) + r"\s+\d+s?"
            generalRequest = re.findall(generalRegex,user_text)
            
            if generalRequest:
                timeFrame = re.findall("[-+]?(?:\d*\.\d+|\d+)",generalRequest[0])
                date = parse(timeFrame[0])
                break

        if any(ele in user_text for ele in test_list):

            singleYear = re.findall("[pl]+ast+\syear",user_text)
            pastYear = re.findall("[pl]ast+\s+\d+\syears?|[pl]ast+\s+\d+years?",user_text)
            pastMonth = re.findall("[pl]past+\s+\d+\smonths?|[pl]ast+\s+\d+months?",user_text)
            pastDays = re.findall("[pl]ast+\s+\d+\sdays?|[pl]ast+\s+\d+days?",user_text)
            yearsAndMonths = re.findall("[pl]ast+\s+\d+years?\sand+\s+\d+month|[pl]ast+\s+\d+\syears?\sand+\s+\d+\smonths?",user_text)
            if singleYear:
                yr = 1
                generalRequest = singleYear[0]
            if pastYear:
                yearsAmount = re.findall("[-+]?(?:\d*\.\d+|\d+)",pastYear[0])
                yr = int(yearsAmount[0])
                generalRequest = pastYear[0]
            if pastMonth: 
                monthsAmount = re.findall("[-+]?(?:\d*\.\d+|\d+)",pastMonth[0])
                mn = int(monthsAmount[0])
                generalRequest = pastMonth[0]
            if pastDays:
                daysAmount = re.findall("[-+]?(?:\d*\.\d+|\d+)",pastDays[0])
                dy = int(daysAmount[0])
                generalRequest = pastDays[0]
            if yearsAndMonths:
                yearsAndMonths = re.findall("[-+]?(?:\d*\.\d+|\d+)",yearsAndMonths[0])
                yr = 0
                mn = int(yearsAndMonths[0]) * 12 + int(yearsAndMonths[1])
                generalRequest = yearsAndMonths[0]
            
        today = datetime.datetime.today()
        if yr > 0 or mn > 0 or dy > 0:
            requestedTimeFrame = today - relativedelta(years=yr)
            requestedTimeFrame = requestedTimeFrame - relativedelta(months=mn)
            requestedTimeFrame = requestedTimeFrame - relativedelta(days=dy)
            requestedTimeFrame = str(requestedTimeFrame.year) + "-" + str(requestedTimeFrame.month) + "-" + str(requestedTimeFrame.day)
            requestedTimeFrame = datetime.datetime.strptime(requestedTimeFrame, "%Y-%m-%d").strftime("%Y-%m-%d")
            return [type,requestedTimeFrame], [generalRequest]
        if date.month == today.month and date.day == today.day:
            date = date.replace(month=1, day=1)
            date = str(date.year) + "-" + str(date.month) + "-" + str(date.day)
            date = datetime.datetime.strptime(date, "%Y-%m-%d").strftime("%Y-%m-%d")

        return [type, date], generalRequest
    except ValueError:
        return [], []

# Determine if sentence with specific keyword is positive
def checkPolarityGivenKeyword(sentences, keyword):
    conj = ["but", "yet", "except"]
    negative_words = ["hate", "hated", "despise", "detest", "dont", "nor"]
    sentence = []
    prev_sentence = []
    filtered_keyword = keyword.replace('-', ' ', 1).lower()
    pos = True

    # find list with the keyword
    for substr in sentences:
        if keyword.lower() in substr.text.lower() or filtered_keyword in substr.text.lower():
            sentence = substr

    if len(sentence) > 0:
         # Check sentence if it contains a negative word
        for tok in sentence:
            if tok.dep_ == 'neg' or tok.text.lower() in negative_words or (tok.dep_ == 'aux' and tok.text.lower() == "nt"):
                return False

        # Check if sentence has a CCONj/SCONJ
        for tok in sentence:
            if (tok.pos_ == "SCONJ" or tok.pos_ == "CCONJ") and tok.text.lower() in conj:
                pos = False

                # Find index of current sentence to check previous sentence for its polarity
                index = sentences.index(sentence)
                if index > 0:
                    prev_sentence = sentences[index -1]

                # Check previous sentence if it contains a negative word, if it does then this sentence is positive
                for token in prev_sentence:
                    if token.dep_ == 'neg' or token.text.lower() in negative_words:
                        pos = True

    return pos

# Assigns keyword to the proper polarity list and filter the total ppn
def checkPolarity(keywords, sentences, ppn, filter):
    positiveArr = []
    negativeArr = []
    temp_positiveArr = []
    temp_negativeArr = []
    filtered_keywords = []
    if len(keywords) > 0 and "encanto enterprises" not in keywords:
        # Match written keywords with proper nouns ex. Marvel -> Marvel studios
        for word in ppn:
            for token in keywords:
                if word in token:
                    filtered_keywords.append(token)

        for token in filtered_keywords:
            # Check polarity of the token
            if checkPolarityGivenKeyword(sentences, token):
                temp_positiveArr.append(token)
            else:
                temp_negativeArr.append(token)
        
        # Switch back to proper noun
        for token in temp_positiveArr:
            for word in keywords:
                if token in word:
                    positiveArr.append(word)

        for token in temp_negativeArr:
            for word in keywords:
                if token in word:
                    negativeArr.append(word)


        # Filter from keyword list
        if filter:
            combined_keywords = list(set(filtered_keywords + keywords))
            for token in combined_keywords:
                ppn = list([word for word in ppn if word not in token])
            
        return [positiveArr, negativeArr], ppn
    else:
        return [[],[]], ppn


def classify(user_text):
    nlp.tokenizer = custom_tokenizer(nlp)
    user_text_tokenized = word_tokenize(user_text.lower())
    stopwords = nltk.corpus.stopwords.words('english')
    stopwords.remove("will")
    new_stopwords=('movie', 'movies', 'film', 'films')
    stopwords.extend(new_stopwords)
    true_case = truecase.get_true_case(user_text)
    user_tokens_filtered = set([word for word in user_text_tokenized if not word.lower() in stopwords])

    doc = nlp(true_case)
    ppn = extract_proper_nouns(doc)
    print(ppn,file=sys.stderr)
    ppnString = [x.text.strip().lower() for x in ppn]

    #remove stop words for each token
    filtered_ppn =[]
    for token in ppn:
        arr = token.text.split()
        filtered_ppn.append(" ".join([word for word in arr if word.lower() not in stopwords]))

    filtered_ppn = [x.lower().strip()for x in filtered_ppn]
    filtered_ppn = [i for i in filtered_ppn if i]
    print(filtered_ppn, file=sys.stderr)
                
    
    user_tokens_removed_Proper_Nouns = [x for x in user_tokens_filtered if x.lower() not in ppnString]

    # 
    conj = ["nor", "but", "yet", "except", "that"]
    sentences = []

    # Find index of conjunctions
    conjIndex = []
    current = 0
    for tok in doc:
        # If at the end, append the rest of the string
        if tok.i == len(doc) -1:
            conjIndex.append([current, tok.i])
            break

        if (tok.pos_ == "SCONJ" or tok.pos_ == "CCONJ"  or tok.pos_ == "PRON") and tok.text.lower() in conj:
            conjIndex.append([current, tok.i -1])
            current = tok.i

    sentences = [doc[conjIndex[0]:conjIndex[-1]+1] for conjIndex in conjIndex]

    # Remove genre from the tokens and check polarity
    genre = checkList(user_text_tokenized,genreName,"Genre")
    genre, filtered_ppn = checkPolarity(genre, sentences, filtered_ppn, True)

    # Check polarity of language
    og_lang = checkList(user_text_tokenized,languageName,"Language")
    og_lang, filtered_ppn = checkPolarity(og_lang, sentences, filtered_ppn, True)
    new_og_lang = [[],[]]

    # Convert language from long from to short form
    if len(og_lang[0]) > 0 or len(og_lang[1]) > 0:
        temp_og_lang = []
        for arr in og_lang:
            temp_arr = []
            for key in arr:
                temp_arr.append(getKeyFromValue(key))
            temp_og_lang.append(temp_arr)
        new_og_lang = temp_og_lang
    
    # Check polarity of release date
    release_date, release_date_keyword = checkReleaseDate(user_text)
    release_date_keyword, filtered_ppn = checkPolarity(release_date_keyword, sentences, filtered_ppn, True)
    if len(release_date_keyword[0]) > 0:
        release_date = [[release_date],[]]
    elif len(release_date_keyword[1]) > 0:
        release_date = [[],[release_date]]
    else:
        release_date = [[],[]]
    
    # Check polarity of runtime
    runtime, runtimeKeyword = checkRuntime(user_text)
    runtimeKeyword, filtered_ppn = checkPolarity(runtimeKeyword, sentences, filtered_ppn, True)
    if len(runtimeKeyword[0]) > 0:
        runtime = [[runtime],[]]
    elif len(runtimeKeyword[1]) > 0:
        runtime = [[],[runtime]]
    else:
        runtime = [[],[]]
    
    # Remove cast keyword from the tokens and check polarity
    cast = checkCast(castNameSet, filtered_ppn)
    cast, filtered_ppn = checkPolarity(cast, sentences, filtered_ppn, True)
    
    # Remove production company keyword from the tokens and check polarity
    production_company = checkProductionCompanies(productionCompaniesName, filtered_ppn)
    production_company, filtered_ppn = checkPolarity(production_company, sentences, filtered_ppn, True)
    
    # Remove character keyword from the tokens and check polarity
    character = checkCharacters(castCharactersSet, filtered_ppn)
    character, filtered_ppn = checkPolarity(character, sentences, filtered_ppn, True)

    # Check polarity of age restriction
    adult, adultKeyword= checkAgeRestriction(user_tokens_removed_Proper_Nouns)
    adultKeyword, filtered_ppn = checkPolarity(adultKeyword, sentences, filtered_ppn, False)
    if len(adultKeyword[0]) > 0:
        adult = [adult,[]]
    elif len(adultKeyword[1]) > 0:
        adult = [[],[adult]]
    else:
        adult = [[],[]]
    
    keywords = {
        'genre': genre, 
        'production_company': production_company, 
        'cast': cast, 
        'release_date': release_date, 
        'original_language': new_og_lang, 
        'runtime': runtime, 
        'character': character,
        "adult": adult,
        'unclassified': ""
        }

    # When sentence is unclassified, extract keywords from the sentence
    result, filtered_ppn = checkPolarity(filtered_ppn, sentences, filtered_ppn, False)
    positive_result = []
    negative_result = []

    for token in result[0]:
        # check for nonsense
        if not Detector.is_gibberish(token):
            new_string = token.translate(str.maketrans('', '', string.punctuation))
            if new_string:
                positive_result.append(new_string)
    
    for token in result[1]:
        # check for nonsense
        if not Detector.is_gibberish(token):
            new_string = token.translate(str.maketrans('', '', string.punctuation))
            if new_string:
                negative_result.append(new_string)
    
    keywords["unclassified"] = [list(filter(None, [" ".join(positive_result)])), list(filter(None, [" ".join(negative_result)]))]

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



app = Flask(__name__)
@app.route("/result", methods=["POST","GET"])
def result():
    output=request.get_json()
    user_text = output["sentence"]
    results = classify(user_text)

    return (results)

if __name__ == "__main__":
    app.run(debug=False)