<template>
  <div id="app">
    <div class="container">
      <div class="row">
        <div class="col-md-6 offset-md-3">
          <Chat />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Chat from './components/Chat.vue'
export default {
  components: {
    Chat
  }
}
</script>

<style>
html{
  font-family: Segoe UI;
  font-size: 14px;
}
</style>