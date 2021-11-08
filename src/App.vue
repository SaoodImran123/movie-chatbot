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
      if(data == null){
        // Default posters to display
        data = {0:{_source: ""}, 1:{_source: ""},2:{_source: ""}};
        data[0]._source = {backdrop_path:"/eENEf62tMXbhyVvdcXlnQz2wcuT.jpg", title:"Venom", runtime:"150", purchasable:true};
        data[1]._source = {poster_path:"/rjkmN1dniUHVYAtwuV3Tji7FsDO.jpg", title:"Venom", runtime:"150", purchasable:true};
        data[2]._source = {poster_path:"/rjkmN1dniUHVYAtwuV3Tji7FsDO.jpg", title:"Venom", runtime:"150", purchasable:true};
      }
      this.data = data;
   }
  },
  created: function(){
    this.generateCatalog()
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
.hide{
    display: none;
}
</style>