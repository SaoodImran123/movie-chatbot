<template>

    <div class="poster">
    <div>
    <div>
    <img :src=imgsrc>
    <h2 class="text-yellow-400">{{title}}</h2>
    </div>
    <h3 class="text-yellow-400">{{runTime}}</h3>
    </div>
    <button  v-if="purchasable==true" class="bg-blue-900 hover:bg-blue-700 text-yellow-400 font-bold py-2 px-4 rounded">
  Purchase Tickets
    </button>
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
            type: String,
        },
    }
    
}
</script>
<style>
.poster{
    text-align: justify;
    width: 250px;
}
img{
    display: block;
    width: 250px;
}

</style>