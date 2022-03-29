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

productionCompaniesData = collectionTMDB_Production_Companies.find({"id": {"$lte": 20000}, "logo_path": {"$ne": "null"}, "homepage": {"$ne": ""}, "$or": [{"origin_country": "US"}, {"origin_country": "JP" }, {"origin_country": "CA" }]})
productionCompaniesName = []
for x in productionCompaniesData:
    if x["name"].lower() != "disneynature" and x["name"].lower() != "scarlet productions":
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
genreName += ["animated", "anime", "sci-fi", "science-fiction", "scifi", "romantic", "rom com", "rom-com", "romcom"]
statusName = collectionMovies.distinct("status")
statusName = [status.lower() for status in statusName]
runTimeWords = ["short", "long", "longer", "hour", "longest", "quick","hr","hrs", "min", "mins"]
releaseDateWords = ["classic", "modern", "recent", "old", "new", "older", "latest"]
ageRestrictionWords = ["children", "adult", "child", "kid", "R rated", "PG rated", "rated R", "rated PG", "younger audience", "appropriate", "inappropriate", "lewd", "family", "PG"]

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