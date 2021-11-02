<template>

    <div class="poster">
    <img :src=imgsrc>
    <h1 class="title">{{title}}</h1>
    <p class="runtime">{{runTime}}</p>
    <button  v-if="purchasable==true">Purchase Tickets</button>
    </div>

    
</template>
<script>
export default {
    name: 'poster',
    props: {
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
    max-width: 200px;
    font-family: arial;
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
    font-size:22px;
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