import pymongo
import pickle
mdbclient = pymongo.MongoClient("mongodb://Node:NtiEzkYS8S@moviezen.dafoe.me:27017/")
moviezenDB = mdbclient["moviezen"]
collectionMovies = moviezenDB.get_collection('TMDB_Movies')
collectionPeople = moviezenDB.get_collection('TMDB_People')
collectionTMDB_Production_Companies = moviezenDB.get_collection('TMDB_Production_Companies')
collectionMovieCredits = moviezenDB.get_collection('TMDB_Movies_Credits')

peopleData = collectionPeople.find({"popularity": { "$gte": 10 } , "known_for_department": "Acting"})
castName = []
for x in peopleData:
    if x["known_for_department"] == "Acting" and x["popularity"] >= 10:
        castName.append(x["name"].lower())

print("Finished cast")

productionCompaniesData = collectionTMDB_Production_Companies.find({"id": {"$lte": 20000}, "logo_path": {"$ne": "null"}})
productionCompaniesName = []
for x in productionCompaniesData:
    if x["name"].lower() != "disneynature":
        productionCompaniesName.append(x["name"].lower())

productionCompaniesName = list(set(productionCompaniesName) - set(castName))
print("Finished production companies")

castCharacters = []
movieData = collectionMovieCredits.find({"cast.known_for_department": "Acting"})
for x in movieData:
    for y in x["cast"]:
        if y["character"]:
            if y["popularity"] >= 20 and "Self" not in y["character"] and "voice" not in y["character"] and  "Narrator" not in y["character"] and "self" not in y["character"]:
                if " / " in y["character"]:
                    char = y["character"].lower().split(" / ")
                    castCharacters.append(char[0])
                    castCharacters.append(char[1])
                else:
                    castCharacters.append(y["character"].lower())

castCharacters = list(set(castCharacters) - set(castName))
castCharacters = list(set(castCharacters) - set(productionCompaniesName))

print("Finish characters")

genreName = collectionMovies.distinct("genres.name")
genreName = [genre.lower() for genre in genreName]
statusName = collectionMovies.distinct("status")
statusName = [status.lower() for status in statusName]
runTimeWords = ["short", "long", "longer", "hour", "longest", "quick","hr","hrs", "min", "mins"]
releaseDateWords = ["classic", "modern", "recent", "old", "new", "older", "latest"]
ageRestrictionWords = ["children", "adult", "child", "kid", "R rated", "PG rated", "rated R", "rated PG", "younger audience", "appropriate", "inappropriate", "lewd", "family", "PG"]
languages = []
languageName = {"af": "afrikaans", "sq": "albanian", "am": "amharic", "ar": "arabic", "hy": "armenian", "az": "azerbaijani", "eu": "basque", "be": "belarusian", "bn": "bengali", "bs": "bosnian", "bg": "bulgarian", "ca": "catalan", "ceb": "cebuano", "ny": "chichewa", "zh-cn": "chinese (simplified)", "zh-tw": "chinese (traditional)", "co": "corsican", "hr": "croatian", "cs": "czech", "da": "danish", "nl": "dutch", "en": "english", "eo": "esperanto", "et": "estonian", "tl": "filipino", "fi": "finnish", "fr": "french", "fy": "frisian", "gl": "galician", "ka": "georgian", "de": "german", "el": "greek", "gu": "gujarati", "ht": "haitian creole", "ha": "hausa", "haw": "hawaiian", "iw": "hebrew", "hi": "hindi", "hmn": "hmong", "hu": "hungarian", "is": "icelandic", "ig": "igbo", "id": "indonesian", "ga": "irish", "it": "italian", "ja": "japanese", "jw": "javanese", "kn": "kannada", "kk": "kazakh", "km": "khmer", "ko": "korean", "ku": "kurdish (kurmanji)", "ky": "kyrgyz", "lo": "lao", "la": "latin", "lv": "latvian", "lt": "lithuanian", "lb": "luxembourgish", "mk": "macedonian", "mg": "malagasy", "ms": "malay", "ml": "malayalam", "mt": "maltese", "mi": "maori", "mr": "marathi", "mn": "mongolian", "my": "myanmar (burmese)", "ne": "nepali", "no": "norwegian", "ps": "pashto", "fa": "persian", "pl": "polish", "pt": "portuguese", "pa": "punjabi", "ro": "romanian", "ru": "russian", "sm": "samoan", "gd": "scots gaelic", "sr": "serbian", "st": "sesotho", "sn": "shona", "sd": "sindhi", "si": "sinhala", "sk": "slovak", "sl": "slovenian", "so": "somali", "es": "spanish", "su": "sundanese", "sw": "swahili", "sv": "swedish", "tg": "tajik", "ta": "tamil", "te": "telugu", "th": "thai", "tr": "turkish", "uk": "ukrainian", "ur": "urdu", "uz": "uzbek", "vi": "vietnamese", "cy": "welsh", "xh": "xhosa", "yi": "yiddish", "yo": "yoruba", "zu": "zulu", "fil": "filipino", "he": "hebrew"}
for key, value in languageName.items():
    languages.append(value)

with  open("languages.txt", "wb") as f:
    pickle.dump(languages,f)

with  open("genres.txt", "wb") as f:
    pickle.dump(genreName,f)

with  open("cast.txt", "wb") as f:
    pickle.dump(castName,f)

with  open("production_companies.txt", "wb") as f:
    pickle.dump(productionCompaniesName,f)

with  open("runTimeWords.txt", "wb") as f:
    pickle.dump(runTimeWords,f)

with  open("ageRestrictionWords.txt", "wb") as f:
    pickle.dump(ageRestrictionWords,f)

with  open("castCharacters.txt", "wb") as f:
    pickle.dump(castCharacters,f)

with  open("releaseDateWords.txt", "wb") as f:
    pickle.dump(releaseDateWords,f)

print("done")