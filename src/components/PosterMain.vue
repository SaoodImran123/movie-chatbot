<template>

    <div class="poster">
    <div class="row">
        <div>
        <img class="movieposter" :src=imgsrc>
        </div>
        <div class="poster-info">
                <h1 class="title">{{title}}</h1>
                <p class="runtime">{{runTime}}</p>
                <p class="synopsis-title">Synopsis</p>
                <p class="synopsis">{{synopsis}}</p>
                <p class="directors">Director: Alexander Warden </p>
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
        synopsis:{
            type: String,
        },
        title: {
            type: String,
        },
        imgsrc: {
            type: String,
            required: true
        },
        runTime: {
            type: String,
        },
        purchasable: {
            type: Boolean,
        },
    }
    
}
</script>
<style scoped>
.poster{
    box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
    font-family: arial;
    background: #041224;
    text-align: left;
    color: white;

}

.title{
    color:#fa3030;
    font-size:22px;
    height: 8%;
    font-weight: bold;
}
.runtime{
    color: #FB6A69;
    font-size: 18px;
    height: 5%;
}
.synopsis-title{
    height:5%;
    color: #FB6A69;
    font-size: 15px;
    margin-bottom: 5px;
}
.synopsis{
    color: #FB6A69;
    width: 183.4px;
    height: 50%;
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
.movieposter{
    padding-right: 10px;
    height: 100%;

}
.poster-info{
    width: 220px;
}

</style>