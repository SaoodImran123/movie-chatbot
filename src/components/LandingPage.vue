<template>
  <div class="landing-container">
    <img src="https://image.tmdb.org/t/p/original//8Y43POKjjKDGI9MH89NW0NAzzp8.jpg" alt="Snow" style="width:100%;">
    <div class="title">MovieZEN</div>
    <div class="subtitle">Relaxing way to choose a movie</div>
    <div class="description">This is an AI Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer  took a galley of type and scrambled it </div>
    <button class="recommendation-btn">Get Recommendation</button>
  </div>
</template>

<script>
export default {
  name: 'LandingPage'
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.container {
  position: relative;
  text-align: center;
  overflow: hidden;
}

img{
  width: 100%;
  height: 100%;
}

.title {
  position: absolute;
  bottom: 400px;
  left: 50px;
  background-color: #651E3E;
  color: #F6CD61;
  font-size: 150px;
  font-weight: bold;
  text-align: center;
  z-index: 20;
  padding: 20px;
}

.subtitle {
  position: absolute;
  bottom: 310px;
  left: 260px;
  background-color: #851E3E;
  color: #F6CD61;
  font-size: 44px;
  font-weight: bold;
  text-align: center;
  z-index: 10;
  padding: 30px 20px 30px 20px;
  width: 700px;
}

.description {
  position: absolute;
  bottom: 10vh;
  left: 50px;
  background-color: #041224;
  color: #F6CD61;
  font-size: 22px;
  font-weight: 600;
  width: 62%;
  padding: 30px 20px 30px 20px;
}

.recommendation-btn {
  position: absolute;
  bottom: 15vh;
  right: 50px;
  background-color: #F6CD61; 
  border: none;
  color: black;
  padding: 10px 50px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 26px;
  font-weight: bold;
  border-radius: 30px;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
}


</style>
