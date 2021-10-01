<template>
  <div id="app">
    <div class="container">
      <div class="row">
        <div class="col-md-6 offset-md-3">
          <LandingPage />
          <Chat />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Chat from './components/Chat.vue'
import LandingPage from './components/LandingPage.vue'

export default {
  components: {
    Chat,
    LandingPage
  }
}
</script>

<style>
html{
  font-family: Segoe UI;
  font-size: 14px;
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