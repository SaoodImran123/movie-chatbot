<template>
<div class="page-content page-container" id="page-content">
    <div class="padding">
        <div class="col-md-6">
            <div class="card card-bordered">
                <div class="card-header">
                    <h4 class="card-title"><strong>Chat</strong></h4>
                </div>
                <div class="container-sm" id="chat-content">
                    <div class="date-header">
                        <span class="date">{{ this.createdDate }}</span> 
                    </div>
                    <div class="media media-chat"> <img class="avatar" src="https://img.icons8.com/color/36/000000/administrator-male.png" alt="...">
                        <div class="media-body">
                            <p>Hi. What kind of movies do you like?</p>
                            <p class="meta"><time datetime="2021">{{ this.createdTime }}</time></p> 
                        </div>
                    </div>
                    <div v-for="(msg, index) in messages" :key="index">
                        <div class="media media-chat media-chat-reverse" v-if='msg.message'>
                            <div class="media-body">
                                <p>{{ msg.message }}</p>
                                <p class="meta"><time datetime="2021">{{ msg.time }}</time></p>
                            </div>
                        </div>
                        <div class="media media-chat" v-if='msg.bot_message'> 
                            <img class="avatar" src="https://img.icons8.com/color/36/000000/administrator-male.png" alt="...">
                            <div class="media-body">
                                <p>{{ msg.bot_message }}</p>
                                <div class="guided"  v-for="(question, i) in msg.guided_ans" :key="i">
                                    <button :class="['button recommendation'+ (i+1), {hide: messages.length > index + 1}]" v-on:click="sendMessage($event, question)">{{question}}</button>  
                                </div>
                                <p class="meta"><time datetime="2021">{{ msg.time }}</time></p>
                            </div>
                        </div>
                    </div>
                    <div class="media media-chat" v-if="loading">
                        <img class="avatar" src="https://img.icons8.com/color/36/000000/administrator-male.png" alt="...">
                        <pulse-loader :loading="loading" :color="color" :size="size"></pulse-loader>
                    </div>
                </div>
                <div class="publisher"> 
                    <form @submit.prevent="sendMessage">
                    <input class="publisher-input form-control" type="text" v-model="message" placeholder="Write something"> 
                    <button type="submit" class="publisher-btn text-info"><i class="fa fa-paper-plane"></i></button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import PulseLoader from 'vue-spinner/src/PulseLoader.vue'
import io from 'socket.io-client';
function getCurrentTime(){
    const today = new Date();
    var mins = today.getMinutes();
    var hours = today.getHours();
    var am = "AM";
    if (mins < 10) {
        mins = "0" + mins;
    }
    if (hours > 12){
        hours = today.getHours() - 12;
        am = "PM";
    }
    var time = hours + ":" + mins + " " + am;
    return time;
}
function getCurrentDate(){
    const monthNames = ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"];
    const today = new Date();
    var date = monthNames[today.getMonth()] + " " + today.getDay();
    return date;
}
export default {
    components:{
        PulseLoader
    },
    data() {
        return {
            message: '',
            messages: [],
            time: '',
            createdTime: '',
            socket : io('ws://'+window.location.hostname+':3050'),
            searchTokens: {genre: [], production_company: [], cast:[], release_date: [], original_language: [], adult: [], runtime:[], unclassified: []},
            response: [],
            requirements: [],
            loading:false
        }
    },
    methods: {
        sendMessage(e, msg) {
            this.time = getCurrentTime();
            e.preventDefault();
            this.socket.emit('SEND_MESSAGE', {
                message: msg || this.message,
                time: this.time,
                searchTokens: this.searchTokens,
                requirements: this.requirements,
                response: this.response
            });
            var data ={message: msg || this.message, time: this.time};
            this.messages.push(data);
            // Clears input box
            this.message = ''
            this.loading = true;
        }
    },
    created() {
        this.createdTime = getCurrentTime();
        this.createdDate = getCurrentDate();
    },
    mounted() {
        this.socket.on('MESSAGE', (data) => {
            console.log(data);
            this.messages = [...this.messages, data];
            this.searchTokens = data.searchTokens;
            this.requirements = data.requirements;
            this.response = data.response;

            // Send data to Home Page
            console.log("here")
            if(data.response.length > 0){
                this.$emit('send-recommendations', data.response);
            }
            this.loading = false;
        });
    },
    updated(){
        var textboxes = document.getElementsByClassName("media-chat");
        var obj = textboxes[textboxes.length - 1];
        obj.scrollIntoView({behavior: "smooth", block: "nearest"});
    }
}
</script>

<style scoped>
.card-bordered {
    width: 500px;
    margin-top: 50px;
}

.card {
    margin-bottom: 30px;
    -webkit-box-shadow: 0 2px 3px rgba(0, 0, 0, 0.03);
    box-shadow: 0 5px 5px rgba(0, 0, 0, .30);
    -webkit-transition: .5s;
    transition: .5s
}

body {
    background-color: #f9f9fa
}

.card-header:first-child {
    border-radius: calc(.25rem - 1px) calc(.25rem - 1px) 0 0
}

.card-header {
    display: -webkit-box;
    display: flex;
    -webkit-box-pack: justify;
    justify-content: space-between;
    -webkit-box-align: center;
    align-items: center;
    padding: 0 20px 5px 20px;
    background-color: #651E3E;
}

.card-header .card-title {
    padding: 0;
    border: none;
    color: #F6CD61;
}

h4.card-title {
    font-size: 17px
}

.card-header>*:last-child {
    margin-right: 0
}

.card-header>* {
    margin-left: 8px;
    margin-right: 8px
}

#chat-content{
    overflow: scroll;
    height:80vh;
    background-color: #851E3E;
}

.btn-secondary {
    color: #4d5259 !important;
    background-color: #e4e7ea;
    border-color: #e4e7ea;
    color: #fff
}

.btn-xs {
    font-size: 11px;
    padding: 2px 8px;
    line-height: 18px
}

.btn-xs:hover {
    color: #fff !important
}

.card-title {
    font-family: Roboto, sans-serif;
    font-weight: 300;
    line-height: 1.5;
    margin: 10px 0 0 10px;
    padding: 15px 20px;
    border-bottom: 1px solid rgba(77, 82, 89, 0.07);
}

.media .avatar {
    flex-shrink: 0
}

.avatar {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 36px;
    line-height: 36px;
    text-align: center;
    border-radius: 100%;
    background-color: #f5f6f7;
    color: #8b95a5;
    text-transform: uppercase
}

.media-chat .media-body {
    -webkit-box-flex: initial;
    flex: initial;
    display: table
}

.media-body {
    min-width: 0
}

.media-chat .media-body p {
    position: relative;
    padding: 6px 8px;
    margin: 4px 0;
    background-color: #e0e0e0;
    border-radius: 3px;
    font-weight: 100;
    color: black
}

.media>* {
    margin: 0 8px
}

.media-chat .media-body p.meta {
    color: #F6CD61 !important;
    background-color: transparent !important;
    padding: 0;
    opacity: 0.8;
    font-size: 14px;
}

div.date-header{
    width: 100%; 
    margin-top: 10px;
    text-align: center;
}

span.date {
    color: #F6CD61;
    background-color: transparent ;
    padding: 0 10px;
    font-size: 14px;
}

.media {
    padding: 0 12px 0 12px;
    -webkit-transition: background-color .2s linear;
    transition: background-color .2s linear
}

.media-chat.media-chat-reverse {
    -webkit-box-orient: horizontal;
    -webkit-box-direction: reverse;
    flex-direction: row-reverse
}

.media-chat {
    margin-bottom: 0
}

.media-chat.media-chat-reverse .media-body{
    width: 90%;
    float: right;
}

.media-chat.media-chat-reverse .media-body p {
    float: right;
    clear: right;
    background-color: #48b0f7;
    color: #fff
}

.button {
  background-color: white; 
  border: none;
  color: black; 
  border: 1px solid #008CBA;
  width: 100%;
  padding: 2px;
  padding-left: 10px;
  padding-right: 10px;
  text-decoration: none;
  transition-duration: 0.4s;
  cursor: pointer;
  float: left;
  clear: left;
  text-align: left;
}

.button.hide{
  display: none;
}

.button:hover {
  background-color: #008CBA;
  color: white;
}

.media-chat.media-chat-reverse .button {
    float: right;
    clear: right;
}

.button.recommendation1{
    border-radius: 5px 5px 0 0;
}

.button.recommendation2{
    border-radius: 0; 
}

.button.recommendation3{
    border-radius: 0 0 5px 5px;
}

.publisher {
    position: relative;
    display: -webkit-box;
    display: flex;
    -webkit-box-align: center;
    align-items: center;
    padding: 10px 10px;
    background-color: #651E3E
}

.publisher>*:first-child {
    margin-left: 0
}

.publisher>* {
    margin: 0 8px
}

.publisher-input {
    -webkit-box-flex: 1;
    flex-grow: 1;
    border: none;
    outline: none !important;
    background-color: transparent;
    min-width: 450px;
    color: white;
}

.publisher-input::placeholder {
    color: #c0bfbf;
}

button,
input,
optgroup,
select,
textarea {
    font-family: Roboto, sans-serif;
    font-weight: 300
}

.publisher-btn {
    background-color: transparent;
    border: none;
    color: #8b95a5;
    font-size: 16px;
    cursor: pointer;
    overflow: -moz-hidden-unscrollable;
    -webkit-transition: .2s linear;
    transition: .2s linear
}

.file-group {
    position: relative;
    overflow: hidden
}

.publisher-btn {
    background-color: transparent;
    border: none;
    color: #cac7c7;
    font-size: 16px;
    cursor: pointer;
    overflow: -moz-hidden-unscrollable;
    -webkit-transition: .2s linear;
    transition: .2s linear
}

.file-group input[type="file"] {
    position: absolute;
    opacity: 0;
    z-index: -1;
    width: 20px
}

.text-info {
    color: #48b0f7 !important
}
</style>