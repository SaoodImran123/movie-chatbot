# install -U pip setuptools wheel spacy simpletransformers torch
# python -m spacy download en_core_web_trf
import sys
import spacy
from simpletransformers.classification import ClassificationModel

# Constants
categories = ["genre", "production_company", "cast", "release_date", "language", "age_restriction", "runtime"]

# Load transformer language model
nlp = spacy.load("en_core_web_trf")

# Load a ClassificationModel
model = ClassificationModel(
    "bert", "./server/bert_model"  # running with sc-serve
    # "bert", "./bert_model" # running locally
)

# input sentence
sentence = sys.argv[1]


def categoryClassifier():
    if len(sentence) > 0:
        predictions, raw_outputs = model.predict([sentence])

        returnData = {}
        for i in range(0, len(raw_outputs[0])):
            returnData[categories[i]] = raw_outputs[0][i]

        # print(returnData)
        # print(categories[predictions[0]])
        return returnData, predictions[0]


# TODO add support for negatives
def keywordExtraction(categoryNumber):
    doc = nlp(sentence)

    # For Cast and Production companies hard code marvel
    if categoryNumber == categories.index("production_company") or categoryNumber == categories.index("cast"):
        def extract_proper_nouns(doc):
            pos = [tok.i for tok in doc if tok.pos_ == "PROPN"]
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
            return [doc[consecutive[0]:consecutive[-1] + 1] for consecutive in consecutives]

        ppn = extract_proper_nouns(doc)
        # print(ppn)
        if len(ppn) > 0:
            # print("Proper noun: " + str(ppn[0]))
            return str(ppn[0])

    # For language detection
    if categoryNumber == categories.index("language") :
        languages = {"af": "afrikaans", "sq": "albanian", "am": "amharic", "ar": "arabic", "hy": "armenian",
                     "az": "azerbaijani", "eu": "basque", "be": "belarusian", "bn": "bengali", "bs": "bosnian",
                     "bg": "bulgarian", "ca": "catalan", "ceb": "cebuano", "ny": "chichewa",
                     "zh-cn": "chinese (simplified)", "zh-tw": "chinese (traditional)", "co": "corsican",
                     "hr": "croatian", "cs": "czech", "da": "danish", "nl": "dutch", "en": "english", "eo": "esperanto",
                     "et": "estonian", "tl": "filipino", "fi": "finnish", "fr": "french", "fy": "frisian",
                     "gl": "galician", "ka": "georgian", "de": "german", "el": "greek", "gu": "gujarati",
                     "ht": "haitian creole", "ha": "hausa", "haw": "hawaiian", "iw": "hebrew", "hi": "hindi",
                     "hmn": "hmong", "hu": "hungarian", "is": "icelandic", "ig": "igbo", "id": "indonesian",
                     "ga": "irish", "it": "italian", "ja": "japanese", "jw": "javanese", "kn": "kannada",
                     "kk": "kazakh", "km": "khmer", "ko": "korean", "ku": "kurdish (kurmanji)", "ky": "kyrgyz",
                     "lo": "lao", "la": "latin", "lv": "latvian", "lt": "lithuanian", "lb": "luxembourgish",
                     "mk": "macedonian", "mg": "malagasy", "ms": "malay", "ml": "malayalam", "mt": "maltese",
                     "mi": "maori", "mr": "marathi", "mn": "mongolian", "my": "myanmar (burmese)", "ne": "nepali",
                     "no": "norwegian", "ps": "pashto", "fa": "persian", "pl": "polish", "pt": "portuguese",
                     "pa": "punjabi", "ro": "romanian", "ru": "russian", "sm": "samoan", "gd": "scots gaelic",
                     "sr": "serbian", "st": "sesotho", "sn": "shona", "sd": "sindhi", "si": "sinhala", "sk": "slovak",
                     "sl": "slovenian", "so": "somali", "es": "spanish", "su": "sundanese", "sw": "swahili",
                     "sv": "swedish", "tg": "tajik", "ta": "tamil", "te": "telugu", "th": "thai", "tr": "turkish",
                     "uk": "ukrainian", "ur": "urdu", "uz": "uzbek", "vi": "vietnamese", "cy": "welsh", "xh": "xhosa",
                     "yi": "yiddish", "yo": "yoruba", "zu": "zulu", "fil": "filipino", "he": "hebrew"}
        res = dict((v, k) for k, v in languages.items())
        for token in doc:
            if token.text.lower() in languages.values():
                lang = token.text.lower()
                # print(res[lang])
                return res[lang]

    # For Genre
    if categoryNumber == categories.index("genre"):
        genres = ["action", "adventure", "animation", "comedy", "crime", "documentary", "drama", "family", "fantasy",
                  "history", "horror", "music", "mystery", "romance", "science fiction", "sci-fi", "thriller", "war",
                  "western"]

        genre = None
        for token in doc:
            if token.text.lower() in genres:
                genre = token.text.lower()

        # print(genre)
        return genre

    # For Release date
    if categoryNumber == categories.index("release_date"):
        releaseDate = None
        keywords = ["old", "modern", "classic", "new", "newer"]
        for key in keywords:
            if key in sentence.lower():
                if key == "old" or key == "classic":
                    releaseDate = ["lte", "2005-01-01"]
                elif key == "modern" or key == "new" or key == "newer":
                    releaseDate = ["gte", "2015-01-01"]
        return releaseDate

    # For Age restriction
    if categoryNumber == categories.index("age_restriction"):
        ageRestriction = "false"
        childFilter = ["child", "baby", "youngster", "adolescent", "teenager", "youth", "toddler", "G", "PG-13", "PG13",
                       "family"]
        for token in doc:
            if token.lemma_ in childFilter:
                ageRestriction = "true"

        return ageRestriction

    # For runtime
    if categoryNumber == categories.index("runtime"):
        runtime = None
        for token in doc:
            if token.lemma_ == "short":
                runtime = ["lte", "90"]
            elif token.lemma_ == "long":
                runtime = ["gte", "90"]
        return runtime


def createResponseJson(categoryNumber, keywords):
    jsonData = {}

    if categoryNumber == categories.index("genre") and keywords is not None:
        genres = []
        genres.append(keywords)
        jsonData["genre"] = genres
    else:
        jsonData["genre"] = []

    if categoryNumber == categories.index("production_company") and keywords is not None:
        production_companys = []
        production_companys.append(keywords)
        jsonData["production_company"] = production_companys
    else:
        jsonData["production_company"] = []

    if categoryNumber == categories.index("cast")and keywords is not None:
        cast = []
        cast.append(keywords)
        jsonData["cast"] = cast
    else:
        jsonData["cast"] = []

    if categoryNumber == categories.index("release_date") and keywords is not None:
        release_date = []
        release_date.append(keywords)
        jsonData["release_date"] = release_date
    else:
        jsonData["release_date"] = []

    if categoryNumber == categories.index("language") and keywords is not None:
        language = []
        language.append(keywords)
        jsonData["original_language"] = language
    else:
        jsonData["original_language"] = []

    if categoryNumber == categories.index("age_restriction") and keywords is not None:
        age_restriction = []
        age_restriction.append(keywords)
        jsonData["adult"] = age_restriction
    else:
        jsonData["adult"] = []

    if categoryNumber == categories.index("runtime") and keywords is not None:
        runtime = []
        runtime.append(keywords)
        jsonData["runtime"] = runtime
    else:
        jsonData["runtime"] = []

    jsonData["unclassified"] = []

    # For debugging
    jsonData["lastClassification"] = categories[categoryNumber]

    return jsonData


classificationProbabilities, mainPredictionCategoryNumber = categoryClassifier()
keywords = keywordExtraction(mainPredictionCategoryNumber)
# print(mainPredictionCategoryNumber)
print(createResponseJson(mainPredictionCategoryNumber, keywords))
