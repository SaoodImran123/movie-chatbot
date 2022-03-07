import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import spacy
import pickle
from difflib import SequenceMatcher
import truecase
import re
import sys

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

def checkRuntime(user_tokens, runTimeWords, user_text):
    requestType = ["less than", "greater than", "longer", "shorter", "no more", "more", "long", "short"]
    type =""

    for z in requestType:
        if z in user_text:
            type = z
            break
    timeMention1 = re.findall("\d+:\d+|\d+hr|\d+hour|\d+\shour|\d+min|\d+\smin|\d+m",user_text)
    if timeMention1:
        # Convert Hr to mins
        # Need to check greater or less than
        # return in this format: ["lte", timeMention1[0]] or ["eq", timeMention1[0]]
        re.sub("\d+:\d+|\d+hr|\d+hour|\d+\shour|\d+min|\d+\smin|\d+m", '', timeMention1) 
        return ["Runtime request: " + type + " "+ timeMention1[0]]
    
    for x in range(0,len(user_tokens)):  
        for y in runTimeWords:
            if str(user_tokens[x]).strip().lower() == str(y).strip().lower():
                if user_tokens[x] in ["hour", "hours", "hr", "min", "mins"]:
                    return ["Runtime request: " + type + " "+user_tokens[x-1] + " " + user_tokens[x]]
                else:
                    # if words like short return ["lte", "90"]
                    # if words like long return ["gte", "90"]
                    return [type, "90"]
    return []

# if user specified a year like 2015 return [["gte", "2015-01-01"], ["lte", "2016-01-01"]]
# if user specifies a year greater than 2015 return just ["gte", "2015-01-01"]
# Maybe add dates like ex: user enter "I want movies released in july 4, 1999" return ["eq", "1999-07-04"]
# if words like old return ["lte", "2005-01-01"] by default
# if words like new return ["gte", "2015-01-01"]
def checkReleaseDate():
    return []


with open(r"server/cast.txt", "rb") as f:
    castName = pickle.load(f)
castNameSet = set(castName)

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
# print("Ppn string: " + str(ppnString))
# print("Curated sentence: " + str(user_tokens_removed_Proper_Nouns))

keywords = {
    'genre': checkList(user_tokens_filtered,genreName,"Genre"), 
    'production_company': checkProductionCompanies(productionCompaniesName, ppn), 
    'cast': checkCast(castNameSet, ppn), 
    'release_date': checkList(user_tokens_removed_Proper_Nouns,releaseDateWords,"Release date"), 
    'original_language': checkList(user_tokens_filtered,languageName,"Language"), 
    'adult': checkList(user_tokens_removed_Proper_Nouns,ageRestrictionWords,"Age restriction"), 
    'runtime': checkRuntime(user_text_tokenized, runTimeWords, user_text), 
    'unclassified': []
    }

print(keywords)



