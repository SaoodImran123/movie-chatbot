<template>
<div class="catalog">
    <div class="title">
        <h1> Main Recommendation</h1>
    </div>

    <div class="mainposter">
        <PosterMain :data=data[0]._source :purchasable=false />
    </div>
    <div class="row">
        <h1 class="showing-in" v-if='data.length > 1'>More Recommendations</h1>
    </div>
    <div class="row">
        <div class="column" v-for="(item, index) in Object.values(data).slice(1)" :key="index">
            <Poster :data=item._source :purchasable=false />
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
        data: {
            type: Array,
        }
    },
    methods: {
        getPosters(data) {
            return data.shift();
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
    margin-top: 10px;
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
div.title h1{
    text-align: center;
    font-size: 40px;
    color: #F6CD61;
    margin-top: 15px;
}
.showing-in{
    color: #F6CD61;
    font-size: 22px;
}

</style>