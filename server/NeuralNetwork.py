import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import spacy
import pickle
from difflib import SequenceMatcher
import truecase
import re
import sys
from dateutil.parser import parse

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
                    if SequenceMatcher(None, word, y).ratio() > 0.6 and word != "tom hanks":
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
    requestType = ["made in", "released in", "movie from", "from the", "created in", "older than", "from before", "made before", "created before" "newer than", "made after", "created after" "in the past year"]
    type ="eq"
    passCheck=0
    for z in requestType:
        if z in user_text:
            passCheck += 1
            if z in ["newer than", "made after","created after"]:
                type = "gte"
            elif z in ["older than", "from before", "made before","created before","in the past year"]:
                type = "lte"
    
    if passCheck > 0:      
        try:
            date = parse(user_text,fuzzy=True)
            today = date.today()
            if date.month == today.month and date.day == today.day:
                date = date.replace(month=1, day=1)
                # TODO: 01 instead of 1
            date = str(date.year) + "-" + str(date.month) + "-" + str(date.day)
            return [type, date]
        except ValueError:
            return []
    return []


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

with open(r"server/ageRestrictionWords.txt", "rb") as f:
    ageRestrictionWords = pickle.load(f)
ageRestrictionWords = set(ageRestrictionWords)

with open(r"server/languages.txt", "rb") as f:
    languageName = pickle.load(f)
languages = set(languageName)

user_text = sys.argv[1]
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
    'character': checkCharacters(castCharactersSet, ppn),
    'unclassified': []
    }

print(keywords)