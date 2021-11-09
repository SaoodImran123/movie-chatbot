<template>
  <div id="app">
    <div class="con">
      <div class="row">
        <div class="column1">
          <Catalog :data=data />
        </div>
        <div class="column2">
          <Chat v-on:send-recommendations="generateCatalog" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const API_URL = "http://localhost:3050/";
import Chat from './components/Chat.vue'
import Catalog from './components/Catalog.vue'

export default {
  components: {
    Chat,
    Catalog
  },
  data: function(){
    return{
      posterD: "",
      posterDtwo: "",
      posterDthree: "",
      data: ""
    }
  },

  methods: {
    generateCatalog(data){
      console.log(data);
      this.data = data;
   }
  },
  created: function(){
    console.log(API_URL+'movies-default')
    fetch(API_URL+'movies-default')
      .then(response => {
        return(response.json())
      })
      .then(result => {
        // result holds an array of 5 of the most popular movies
        this.generateCatalog(result);
      });
  }
}

</script>

<style>
@tailwind base;

@tailwind components;

@tailwind utilities;
html{
  font-family: Roboto, sans-serif;
  font-size: 14px;
  background: #061E3E;
}

* {
  margin: 0;
  padding: 0;
  -ms-overflow-style: none; /* for Internet Explorer, Edge */
  scrollbar-width: none; /* for Firefox */
  overflow-y: scroll;
}
*::-webkit-scrollbar {
    display: none; /* for Chrome, Safari, and Opera */
}
.row{
    display: flex;
}
.column1{
    flex: 70%;
}
.column2{
    flex: 30%;
}
</style>