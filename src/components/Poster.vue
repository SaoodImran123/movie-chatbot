<template>
    <div class="poster">
        <img :src=getImageSrc(data.poster_path)>
        <h1 class="title">{{data.title}}</h1>
        <p class="runtime" :class="[{hide: data.runtime > 0}]">{{getRuntime(data.runtime)}}</p>
        <button  v-if="purchasable==true">Purchase Tickets</button>
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
        getRuntime(runtime){
            if(runtime && runtime > 0){
                var hr = Math.floor(runtime/60);
                if (hr == 0){
                     runtime = runtime%60+ "m";
                }else if (hr > 1){
                    runtime = hr +"hrs "+ runtime%60+ "m";
                }else{
                    runtime = hr +"hr "+ runtime%60+ "m";
                }
            }

            return runtime;
        },
        getImageSrc(path){
            return "https://image.tmdb.org/t/p/original"+ path;
        }
    }
}
</script>
<style scoped>
.poster{
    width: 100%;
    font-family: Roboto, sans-serif;
    background: transparent;

}
.runtime{
    color: #F6CD61;
    font-size: 18px;
    text-align: left;
    margin-bottom: 10px;
}
.title{
    color:#F6CD61;
    font-size:18px;
    text-align: left;
}
.poster button{
    border: none;
    outline: 0;
    padding: 12px;
    color: black;
    background-color:#061E3E;
    color: #F6CD61;
    text-align: center;
    cursor: pointer;
    width: 80%;
    font-size: 14px;
    font-weight: bold;
}
.poster button:hover{
    opacity: 0.7;
}

</style>