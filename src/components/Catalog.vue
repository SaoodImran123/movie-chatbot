<template>
<div class="catalog">
    <div class="title">
        <h1>Recommendations</h1>
    </div>

    <div class="mainposter">
        <PosterMain :synopsis='"This is a movie about random dogs with costumes and superpowers. This is a movie about random dogs with costumes and superpowers. This is a movie about random dogs with costumes and superpowers. This is a movie about random dogs with costumes and superpowers. This is a movie about random dogs with costumes and superpowers. "' :imgsrc=posterDataOne.image :title=posterDataOne.title :runTime=posterDataOne.runTime :purchasable=posterDataOne.purchasable />
    </div>
    <div class="row">
        <h1 class="showing-in">Showing in Theaters</h1>
    </div>
    <div class="row">
        <div class="column">
                <Poster :imgsrc=posterDataTwo.image :title=posterDataTwo.title :runTime=posterDataTwo.runTime :purchasable=posterDataTwo.purchasable />
        </div>
        <div class="column">
                <Poster :imgsrc=posterDataTwo.image :title=posterDataTwo.title :runTime=posterDataTwo.runTime :purchasable=posterDataTwo.purchasable />
        </div>
        <div class="column"> 
                <Poster :imgsrc=posterDataThree.image :title=posterDataThree.title :runTime=posterDataThree.runTime :purchasable=posterDataThree.purchasable />
        </div>
        <div class="column"> 
                <Poster :imgsrc=posterDataThree.image :title=posterDataThree.title :runTime=posterDataThree.runTime :purchasable=posterDataThree.purchasable />
        </div>
    </div>
</div>

    
</template>
<script>
import Poster from './Poster.vue'
import PosterMain from './PosterMain.vue'
export default {
    components: {Poster, PosterMain},
    name: 'poster',
    props: {
        posterDataOne: {
            type: Object,
        },
        posterDataTwo: {
            type: Object,
        },
        posterDataThree: {
            type: Object,
        }

    }
    
}
</script>
<style scoped>
.catalog{
    box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
    background:#19365B;
    padding-left: 35px;
    padding-right: 35px;
    margin: 50px;
}
.mainposter{
    margin: 30px;
    height: 100%;
}
.row{
    display: flex;
}
.column{
    flex: 25%;
    padding-right: 40px;
    padding-bottom: 15px;
    padding-top: 15px;
}
.title{
    text-align: center;
    margin-bottom: 10px;
    font-size: 40px;
    color: #F6CD61;
}
.showing-in{
    color: #F6CD61;
    font-size: 22px;
}

</style>