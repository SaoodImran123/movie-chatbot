

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
            var filter, must, not, should;
            should = [];
            not = [];
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
                {term: {"status": "released"}}
            ];

            
            // Perform a multi_match when a token is unclassified
            if(data.searchTokens.unclassified.length > 0){
                should.push( {
                    "multi_match": {
                        "query": data.searchTokens.unclassified.toString(),
                        "fields": [
                            "cast.character",
                            "title",
                            "overview"
                        ]
                    }
                });
            }

            // Search for genre
            if(data.searchTokens.genre.length > 0){
                var genres = data.searchTokens.genre;
                for (let i = 0; i < genres.length; i++){
                    if (i > 0){
                        should.push({"term": {"genres.name": genres[i]}});
                    }else{
                        must.push({"term": {"genres.name": genres[i]}});
                    }
                }
            }

            // Search for production company
            if(data.searchTokens.production_company.length > 0){
                var production_company = data.searchTokens.production_company;
                for (let i = 0; i < production_company.length; i++){
                    if (i > 0){
                        should.push({"term": {"production_companies.name.keyword": {"value": production_company[i], "case_insensitive": true}}});
                    }else{
                        must.push({"term": {"production_companies.name.keyword": {"value": production_company[i], "case_insensitive": true}}});
                    }
                }
            }

            // Search for cast
            if(data.searchTokens.cast.length > 0){
                var cast = data.searchTokens.cast;
                for (let i = 0; i < cast.length; i++){
                    if (i > 0){
                        should.push({"term": {"cast.name.keyword": {"value": cast[i], "case_insensitive": true}}});
                    }else{
                        must.push({"term": {"cast.name.keyword": {"value": cast[i], "case_insensitive": true}}});
                    }
                }
            }

            // Search for release date
            if(data.searchTokens.release_date.length > 0){
                var release_date = data.searchTokens.release_date;
                for (let i = 0; i < release_date.length; i++){
                    if (i > 0){
                        if(release_date[0] == "eq"){
                            // Range between the given date (current year to next year)
                            nextYr = new Date(release_date[1]).setFullYear(new Date(release_date[1]).getFullYear() + 1);
                            should.push({range: {"release_date": {"gte": release_date[1]}}});
                            should.push({range: {"release_date": {"lte": nextYr}}});
                        }else{
                            should.push({range: {"release_date": {[release_date[0]]: release_date[1]}}});
                        }
                    } else{
                        if(release_date[0] == "eq"){
                            // Range between the given date
                            nextYr = new Date(release_date[1]).setFullYear(new Date(release_date[1]).getFullYear() + 1);
                            must.push({range: {"release_date": {"gte": release_date[1]}}});
                            must.push({range: {"release_date": {"lte": nextYr}}});
                        }else{
                            must.push({range: {"release_date": {[release_date[0]]: release_date[1]}}});
                        }
                    }

                }
            }else{
                // Default release date should be newer than 1990
                filter.push({range: {"release_date": {"gte": "1990-01-01"}}});
            }

            // Search for language
            if(data.searchTokens.original_language.length > 0){
                var original_language = data.searchTokens.original_language;
                for (let i = 0; i < original_language.length; i++){
                    if (i > 0){
                        should.push({"term": {"original_language": original_language[i]}});
                    }else{
                        must.push({"term": {"original_language": original_language[i]}});
                    }
                }
            }else{
                // Default language should be english
                filter.push({term: {"original_language": "en"}});
            }

            // Search for adult
            if(data.searchTokens.adult.length > 0){
                var adult = data.searchTokens.adult;
                for (let i = 0; i < adult.length; i++){
                    if (i > 0){
                        should.push({"term": {"adult": adult[i] == "true" ? true : false}});
                    }else{
                        must.push({"term": {"adult": adult[i] == "true" ? true : false}});
                    }
                }
            }

            // Search for runtime
            if(data.searchTokens.runtime.length > 0){
                var runtime = data.searchTokens.runtime;
                for (let i = 0; i < runtime.length; i++){
                    if (i > 0){
                        if(runtime[0] == "eq"){
                            // Range between the given runtime
                            should.push({range: {"runtime": {"gte": (parseInt(runtime[1])-10).toString()}}});
                            should.push({range: {"runtime": {"lte": (parseInt(runtime[1])+10).toString()}}});
                        }else{
                            should.push({range: {"runtime": {[runtime[0]]: runtime[1]}}});
                        }
                    }else{
                        if(runtime[0] == "eq"){
                            // Range between the given runtime
                            must.push({range: {"runtime": {"gte": (parseInt(runtime[1])-10).toString()}}});
                            must.push({range: {"runtime": {"lte": (parseInt(runtime[1])+10).toString()}}});
                        }else{
                            must.push({range: {"runtime": {[runtime[0]]: runtime[1]}}});
                        }
                    }
                }
            }else{
                // Default runtime should be greater than 60 mins
                filter.push( {range: {"runtime": {"gte": "60"}}});
            }

            var query = {
                index: 'tmdb_movies',
                size: '5',
                body: {
                    query: {
                        bool: {
                            must: must,
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
                console.log("ES: ")
                console.log(resp);
                //resturns an array of movie hits
                data.response = resp.hits.hits;
                resolve(data);
            }, function(err) {
                reject(err.message);
                console.trace(err.message);
            });
        })
    }
}


