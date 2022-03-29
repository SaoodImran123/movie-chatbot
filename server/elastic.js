const e = require("express");


module.exports = {
    pingElastic(client){
        client.ping({
            requestTimeout: 30000,
        }, function(error) {
            if (error) {
                console.error('elasticsearch cluster is down!');
            } else {
                console.log('Elastic search returned ping. Everything is ok');
            }
        });
    },

    elasticSearchPopular(client){
        return new Promise(function(resolve, reject){
            var date = new Date().toISOString().split("T")[0];
            client.search({
                index: 'tmdb_movies',
                size: '5',
                body:{
                    sort: [
                        {"popularity": {"order" : "desc"}},
                        {"release_date": {"order" : "desc", "format": "yyyy-MM-dd"}}
                    ],
                    query: {
                        bool: {
                            filter: [
                                {term: {"original_language": "en"}},
                                {term: {"status": "released"}},
                                {range: {"release_date": {"lte": date}}}
                            ]}
                    }
                }
            }).then(function(resp) {
                //resturns an array of movie hits
                let data = resp.hits.hits;
                resolve(data);
            }, function(err) {
                reject(err.message);
                console.trace(err.message);
            });
        })
    },

    // Query elasticsearch
    elasticSearchQuery(data, client){
        return new Promise(function(resolve, reject){
            var filter, must, must_not, should;
            should = [];
            must_not = [];
            must = [
                {
                    "exists": {
                        "field": "poster_path"
                    }
                },
                {
                    "exists": {
                        "field": "backdrop_path"
                    }
                }
            ];

            filter = [
                {term: {"status": "released"}},
                {range: {"release_date": {"gte": "1920-01-01"}}},
                {range: {"runtime": {"gte": "10"}}},
                {range: {"vote_count": {"gte": "100"}}},
                {range: {"vote_average": {"gte": "2"}}},
                {range: {"popularity": {"gte": "10"}}}
            ];

            genreShould = [];
            genreBoolShould =  {
                "bool": {
                    "should": genreShould,
                    "minimum_should_match" : 1
                }
             };

            prodShould = [];
            prodCompanyBoolShould =  {
                "bool": {
                    "should": prodShould,
                    "minimum_should_match" : 1
                }
             };

            castShould = [];
            castBoolShould =  {
                "bool": {
                    "should": castShould,
                    "minimum_should_match" : 1
                }
             };

            charShould = [];
            charBoolShould =  {
                "bool": {
                    "should": charShould,
                    "minimum_should_match" : 1
                }
             };

            langShould = [];
            langBoolShould =  {
                "bool": {
                    "should": langShould,
                    "minimum_should_match" : 1
                }
             };
            
            // Perform a multi_match when a token is unclassified
            if(data.searchTokens.unclassified[0].length > 0){
                if(must["multi_match"]){
                    should["multi_match"]["query"] = data.searchTokens.unclassified[0].join(" ").replace(/[\p{P}$+<=>^`|~]/gu, '')
                }else{
                    should.push( {
                        "multi_match": {
                            "query": data.searchTokens.unclassified[0].join(" ").replace(/[\p{P}$+<=>^`|~]/gu, ''),
                            "fields": [
                                "cast.character",
                                "title^2",
                                "overview^3",
                                "production_companies.name"
                            ],
                            "operator": "or"
                        }
                    });
                }
            }

            if(data.searchTokens.unclassified[1].length > 0){
                if(must["multi_match"]){
                    must["multi_match"]["query"] = data.searchTokens.unclassified[1].join(" ").replace(/[\p{P}$+<=>^`|~]/gu, '')
                }else{
                    must.push( {
                        "multi_match": {
                            "query": data.searchTokens.unclassified[1].join(" ").replace(/[\p{P}$+<=>^`|~]/gu, ''),
                            "fields": [
                                "cast.character",
                                "title",
                                "overview"
                            ]
                        }
                    });
                }
            }

            // Search for genre
            if(data.searchTokens.genre[0].length > 0){
                let animation = ["animated", "anime"]
                let romance = ["romantic", "rom com", "rom-com", "romcom"]
                let scifi = ["sci-fi", "science-fiction", "scifi"]
                var genres = data.searchTokens.genre[0];
                for (let i = 0; i < genres.length; i++){
                    if(romance.includes(genres[i])){
                        genres[i] = "Romance";
                    }else if(scifi.includes(genres[i])){
                        genres[i] = "Science Fiction";
                    }else if(animation.includes(genres[i])){
                        genres[i] = "animation";
                    }
                    genreShould.push({"term": {"genres.name.keyword": {"value": genres[i], "case_insensitive": true}}});
                    
                }

                if(genres.length>=2){
                    genreBoolShould.bool.minimum_should_match = 2
                }
                
                must.push(genreBoolShould);
            }

            // Negative Genre query
            if(data.searchTokens.genre[1].length > 0){
                let animation = ["animated", "anime"]
                let romance = ["romantic", "rom com", "rom-com", "romcom"]
                let scifi = ["sci-fi", "science-fiction", "scifi"]
                var genres = data.searchTokens.genre[1];
                for (let i = 0; i < genres.length; i++){
                    if(romance.includes(genres[i])){
                        genres[i] = "Romance";
                    }else if(scifi.includes(genres[i])){
                        genres[i] = "Science Fiction";
                    }else if(animation.includes(genres[i])){
                        genres[i] = "animation";
                    }
                    must_not.push({"term": {"genres.name.keyword": {"value": genres[i], "case_insensitive": true}}});
                }
            }

            // Search for production company
            if(data.searchTokens.production_company[0].length > 0){
                var production_company = data.searchTokens.production_company[0];
                for (let i = 0; i < production_company.length; i++){
                    prodShould.push({"term": {"production_companies.name.keyword": {"value": production_company[i], "case_insensitive": true}}});
                }

                must.push(prodCompanyBoolShould);
            }

            // Negative production company
            if(data.searchTokens.production_company[1].length > 0){
                var production_company = data.searchTokens.production_company[1];
                for (let i = 0; i < production_company.length; i++){
                    must_not.push({"term": {"production_companies.name.keyword": {"value": production_company[i], "case_insensitive": true}}});
                }
            }

            // Search for cast
            if(data.searchTokens.cast[0].length > 0){
                var cast = data.searchTokens.cast[0];
                for (let i = 0; i < cast.length; i++){
                    castShould.push({"term": {"cast.name.keyword": {"value": cast[i], "case_insensitive": true}}});
                }
                must.push(castBoolShould);
            }

            // Search for cast
            if(data.searchTokens.cast[1].length > 0){
                var cast = data.searchTokens.cast[1];
                for (let i = 0; i < cast.length; i++){
                    must_not.push({"term": {"cast.name.keyword": {"value": cast[i], "case_insensitive": true}}});
                }
            }

            // Search for character
            if(data.searchTokens.character[0].length > 0){
                var character = data.searchTokens.character[0];
                must.push( {"range": {"cast.popularity": {"gte": "20"}}});
                for (let i = 0; i < character.length; i++){
                    charShould.push({"match": {"cast.character": {"query": character[i]}}});
                }
                must.push(charBoolShould);
            }

            // Search for character
            if(data.searchTokens.character[1].length > 0){
                var character = data.searchTokens.character[1];
                for (let i = 0; i < character.length; i++){
                    must_not.push({"match": {"cast.character": {"query": character[i]}}});
                }
            }

            // Search for release date
            if(data.searchTokens.release_date[0].length > 0){
                for (var i = 0; i < data.searchTokens.release_date[0].length; i++){
                    var release_date = data.searchTokens.release_date[0];
                    for (let i = 0; i < release_date.length; i++){
                        // if (i > 0){
                        //     if(release_date[i][0] == "eq"){
                        //         // Range between the given date (current year to next year)
                        //         var nextYr = new Date(release_date[i][1]);
                        //         nextYr.setFullYear(nextYr.getFullYear() + 1);
                        //         nextYr = nextYr.toISOString().substring(0 , 10)
                        //         should.push({range: {"release_date": {"gte": release_date[i][1]}}});
                        //         should.push({range: {"release_date": {"lte": nextYr}}});
                        //     }else{
                        //         should.push({range: {"release_date": {[release_date[i][0]]: release_date[i][1]}}});
                        //     }
                        // } else{
                            if(release_date[i][0] == "eq"){
                                // Range between the given date
                                var nextYr = new Date(release_date[i][1]);
                                nextYr.setFullYear(nextYr.getFullYear() + 1);
                                nextYr = nextYr.toISOString().substring(0 , 10)
                                must.push({range: {"release_date": {"gte": release_date[i][1]}}});
                                must.push({range: {"release_date": {"lte": nextYr}}});
                            }else{
                                must.push({range: {"release_date": {[release_date[i][0]]: release_date[i][1]}}});
                            }
                        // }

                    }
                }
            }

            // Search for release date
            if(data.searchTokens.release_date[1].length > 0){
                for (var i = 0; i < data.searchTokens.release_date[1].length; i++){
                    var release_date = data.searchTokens.release_date[1];
                    for (let i = 0; i < release_date.length; i++){
                        if(release_date[i][0] == "eq"){
                            // Range between the given date
                            var nextYr = new Date(release_date[i][1]);
                            nextYr.setFullYear(nextYr.getFullYear() + 1);
                            nextYr = nextYr.toISOString().substring(0 , 10)
                            must_not.push({range: {"release_date": {"gte": release_date[i][1]}}});
                            must_not.push({range: {"release_date": {"lte": nextYr}}});
                        }else{
                            must_not.push({range: {"release_date": {[release_date[i][0]]: release_date[i][1]}}});
                        }
                    }
                }
            }
            

            // Search for language
            if(data.searchTokens.original_language[0].length > 0){
                var original_language = data.searchTokens.original_language[0];
                for (let i = 0; i < original_language.length; i++){
                    langShould.push({"term": {"original_language": original_language[i]}});
                }
                must.push(langBoolShould);
            }


            // Search for language
            if(data.searchTokens.original_language[1].length > 0){
                var original_language = data.searchTokens.original_language[1];
                for (let i = 0; i < original_language.length; i++){
                    must_not.push({"term": {"original_language": original_language[i]}});
                }
            }

            
            // Search for adult
            if(data.searchTokens.adult[0].length > 0){
                var adult = data.searchTokens.adult[0];
                for (let i = 0; i < adult.length; i++){
                    if (i > 0){
                        should.push({"term": {"adult": adult[i] == "true" ? true : false}});
                    }else{
                        must.push({"term": {"adult": adult[i] == "true" ? true : false}});
                    }
                }
            }

            // Search for adult
            if(data.searchTokens.adult[1].length > 0){
                var adult = data.searchTokens.adult[1];
                for (let i = 0; i < adult.length; i++){
                    must_not.push({"term": {"adult": adult[i] == "true" ? true : false}});
                }
            }

            // Search for runtime
            if(data.searchTokens.runtime[0].length > 0){
                for (var i = 0; i < data.searchTokens.runtime[0].length; i++){
                    var runtime = data.searchTokens.runtime[0];
                    
                    for (let i = 0; i < runtime.length; i++){
                        if(runtime[i][0] == "eq"){
                            // Range between the given runtime
                            must.push({range: {"runtime": {"gte": (parseInt(runtime[i][1])-10).toString()}}});
                            must.push({range: {"runtime": {"lte": (parseInt(runtime[i][1])+10).toString()}}});
                        }else{
                            must.push({range: {"runtime": {[runtime[i][0]]: runtime[i][1]}}});
                        }
                    }
                }
            }

            if(data.searchTokens.runtime[1].length > 0){
                for (var i = 0; i < data.searchTokens.runtime[1].length; i++){
                    var runtime = data.searchTokens.runtime[1];
                    
                    for (let i = 0; i < runtime.length; i++){
                        if(runtime[i][0] == "eq"){
                            // Range between the given runtime
                            must_not.push({range: {"runtime": {"gte": (parseInt(runtime[i][1])-10).toString()}}});
                            must_not.push({range: {"runtime": {"lte": (parseInt(runtime[i][1])+10).toString()}}});
                        }else{
                            must_not.push({range: {"runtime": {[runtime[i][0]]: runtime[i][1]}}});
                        }
                    }
                }
            }

            var query = {
                index: 'tmdb_movies',
                size: '5',
                body: {
                    query: {
                        bool: {
                            must: must,
                            must_not: must_not,
                            should: should,
                            filter: filter
                        }
                    },
                    sort: [
                        {"_score": {"order" : "desc"}},
                        {"popularity": {"order" : "desc"}}
                    ]
                }
            };
            console.log("Elastic Query");
            console.log(JSON.stringify(query));
            client.search(query).then(function(resp) {
                
                if (data.total == null || resp.hits.total.value > 0){
                    old_id = []
                    new_id = []

                    // Save old and new ids to compare
                    for (let i = 0; i < data.response.length; i++){
                        old_id.push(data.response[i]._id)
                    }
                    for (let i = 0; i < resp.hits.hits.length; i++){
                        new_id.push(resp.hits.hits[i]._id)
                    }

                    // Check if response doesn't change
                    const equals = (a, b) => JSON.stringify(a) === JSON.stringify(b);
                    console.log(data.total);
                    console.log(resp.hits.total.value);
                    if(data.response && equals(old_id,new_id) && data.total <= resp.hits.total.value){
                        data.noResult = false;
                        data.resultFiltered = true;
                    } else if(data.response && equals(old_id,new_id) && resp.hits.total.value == 0){
                        data.noResult = true;
                    }
                    console.log("equal result");
                    console.log(old_id.toString());
                    console.log(new_id.toString());
                    console.log(data.noResult);
                    if (resp.hits.total.value > 0){
                        data.total = resp.hits.total.value;
                    }
                    console.log(data.total);
                }else{
                    data.noResult = true;
                }

                // Returns an array of movie hits
                data.oldResponse = data.response;
                data.response = resp.hits.hits;
                resolve(data);
            }, function(err) {
                reject(err.message);
                console.trace(err.message);
            });
        })
    }
}


