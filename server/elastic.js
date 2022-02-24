

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

    // Index: same as mongodb but lower case
    elasticSearchQuery(data, client){
        return new Promise(function(resolve, reject){
            var filter, must, not;
            console.log("ids: " + [data.ids.toString()]);
            console.log("tokens: " + data.tokens.toString());
            if(data.ids.length > 0){
                filter = [
                    {term: {"original_language": "en"}},
                    {range: {"release_date": {"gte": "1990-01-01"}}},
                    {range: {"runtime": {"gte": "60"}}},
                    {term: {"adult": "false"}},
                    {term: {"status": "released"}}];
            }else{
                filter = [
                    {term: {"original_language": "en"}},
                    {range: {"release_date": {"gte": "1994-01-01"}}},
                    {range: {"runtime": {"gte": "60"}}},
                    {term: {"adult": "false"}},
                    {term: {"status": "released"}}];
            }

            var should = []

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

            not = [
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

            if(data.tokens.length > 0){
                must.push( {
                    "multi_match": {
                        "query": data.tokens.toString(),
                        "fields": [
                            "cast.character",
                            "cast.name",
                            "title",
                            "overview",
                            "production_companies.name"
                        ]
                    }
                });
            }

            if(data.requirements.genre.length > 0){
                var genres = data.requirements.genre;
                for (var i = 0; i < genres.length; i++){
                    if (i > 0){
                        should.push({"term": {"genres.name": genres[i]}});
                    }else{
                        must.push({"term": {"genres.name": genres[i]}});
                    }
                }
            }

            client.search({
                index: 'tmdb_movies',
                size: '5',
                body:{
                    query: {
                        bool: {
                            must: must,
                            should: should,
                            filter: filter
                        }
                    }
                }
            }).then(function(resp) {
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


