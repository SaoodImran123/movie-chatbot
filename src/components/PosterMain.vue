<template>

    <div class="poster">
    <div class="row">
        <div class="img-container">
        <img class="movieposter" :src=getImageSrc(data.backdrop_path)>
        </div>
        <div class="poster-info">
                <h1 class="title">{{data.title}}</h1>
                <p class="runtime">{{getRuntime(data.runtime)}}</p>
                <p class="synopsis-title">Synopsis</p>
                <p class="synopsis">{{data.overview}}</p>
                <p class="directors">Director: {{getDirector(data.crew)}} </p>
                <div class="btn-container">
                <button  v-if="purchasable==true">Purchase Tickets</button>
                </div>
        </div>
    </div>
    </div>

    
</template>
<script>
export default {
    name: 'poster',
    props: {
        data: {
            type: Object,
        },
        purchasable: {
            type: Boolean,
        },
    },
    methods: {
        getDirector(crew){
            if(crew){
                for(var i = 0; i < crew; i++){
                    if(crew[i].job == "Director"){
                        return crew[i].name;
                    }
                }
            }
        },
        getRuntime(runtime){
            if(runtime && runtime > 0){
                runtime = Math.floor(runtime/60) +"hr "+ runtime%60+ "m";
            }

            return runtime;
        },
        getImageSrc(path){
            return "https://image.tmdb.org/t/p/original"+ path;
        }
    },
    
}
</script>
<style scoped>
.poster{
    box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
    background: #041224;
    text-align: left;
    color: white;
}

.title{
    color:#fa3030;
    font-size:22px;
    font-weight: bold;
}
.runtime{
    color: #FB6A69;
    font-size: 18px;
}
.synopsis-title{
    height:5%;
    color: #FB6A69;
    font-size: 15px;
    margin-bottom: 5px;
}
.synopsis{
    color: #FB6A69;
    width:100%;
}
.directors{
    color: #FB6A69;
    padding-top: 10px;
}

.poster button{
    border: none;
    outline: 0;
    padding: 10px;
    color: black;
    background-color: gold;
    text-align: center;
    cursor: pointer;
    width: 90%;
    font-size: 16px;
    margin-left: 2.5%;
    margin-right: 5%;
    border-radius: 20px;
    font-weight: bold;
}
.btn-container{
    max-height: 100%;
    margin-top: 45px;
    
}
.card button:hover{
    opacity: 0.7;
}

.row{
    display: flex;
}
.img-container{
    width: 100%;
}
.movieposter{
    padding-right: 10px;
}
.poster-info{
    width: 300px;
    padding: 5px;
}

</style>