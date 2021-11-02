<template>
  <div id="app">
    <div class="con">
      <div class="row">
        <div class="column1">
          <Catalog :posterDataOne=posterD :posterDataTwo=posterDtwo :posterDataThree=posterDthree />
        </div>
        <div class="column2">
          <Chat />
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
      posterDthree: ""
    }
  },

  methods: {
    generateCatalog: function(){
      let Posterdata = {image:"https://image.tmdb.org/t/p/original/rjkmN1dniUHVYAtwuV3Tji7FsDO.jpg", title:"Venom", runTime:"2hr 30m", purchasable:true};
      this.posterD = JSON.parse(JSON.stringify(Posterdata));
      this.posterDtwo = JSON.parse(JSON.stringify(Posterdata));
      this.posterDthree = JSON.parse(JSON.stringify(Posterdata));
      this.posterD.image = "https://image.tmdb.org/t/p/original/eENEf62tMXbhyVvdcXlnQz2wcuT.jpg";
      console.log(this.posterDtwo)


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
  font-family: Segoe UI;
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