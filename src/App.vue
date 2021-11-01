<template>
  <div id="app">
    <div class="container">
      <div class="row">
        <div class="col-md-6 offset-md-3">
          <Catalog :posterDataOne=posterD :posterDataTwo=posterDtwo :posterDataThree=posterDthree />
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
      this.posterD.image = "https://mediafiles.cineplex.com/Central/Film/Posters/32523_background_750_450.jpg";
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
</style>