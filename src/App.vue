<template>
  <div id="app">
    <div class="container">
      <div class="row">
        <div class="col-md-6 offset-md-3">
          <LandingPage />
          <Poster imgsrc="
https://image.tmdb.org/t/p/original/rjkmN1dniUHVYAtwuV3Tji7FsDO.jpg" title="Venom" runTime="2hrs 30" :purchasable="true"></Poster>
          <Chat />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Chat from './components/Chat.vue'
import LandingPage from './components/LandingPage.vue'
import Poster from './components/Poster.vue'

export default {
  components: {
    Chat,
    LandingPage,
    Poster
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