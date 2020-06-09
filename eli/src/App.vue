<template>
  <div id="app" class='body-color' v-bind:style='{background: bgColor}'>
    <div class='toggle-bg'>
      <h1>Toggle</h1>
      <input type='checkbox' id='toggle' v-model='checked'/>
      <label for='toggle' class='switch'></label>
    </div>

    <div class='break'></div>

    <div class="color-bg">
      <h1>Slider</h1>
      <h3>Color:</h3>
      <input type='range' min='0' max='359' value='0' class='slider' id='hue-range' v-model='hue'>
      <div class='preview-color' v-bind:style='{background: `hsl(${this.hue}, 100%, ${this.light}%)`}'></div>
      <h3>Light:</h3>
      <input type='range' min='50' max='100' value='50' class='slider' id='light-range' v-model='light'>
      <button type='button' class='button' v-on:click="sendColorToLights()">Send</button>
    </div>

    <div class='break'></div>

    <div class='img-bg'>
      <img src='./assets/Eli.png' alt='Eli'>
      <div class='white-line-bottom'></div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'App',
  data: function () {
    return {
      checked: false,
      initialCheck: true,
      x: null,
      y: null,
      bri: null,
      red: null,
      green: null,
      blue: null,
      bgColorOff: 'rgba(0, 0, 0, 0.9)',
      bgColor: 'rgba(0, 0, 0, 0.9)',
      hue: 0,
      light: 50,
    }
  },
  watch: {
    checked: function () {
      if (this.initialCheck){
        this.initialCheck = false;
        return
      }
      axios({
        method: 'post',
        url: 'toggleLights',
        data: {'on': this.checked}
      }).then(response => {
        if (response.data)
          this.bgColor = `rgb(${this.red}, ${this.green}, ${this.blue})`;
        else
          this.bgColor = this.bgColorOff;
      }).catch(error => {
        console.log(error);
      });
    },
  },
  methods: {
    XYtoRGB: function(x,y,bri){
      // calculate XYZ values
      let z = 1.0 - x - y;
      let Y = bri;
      let X = (Y / y) * x;
      let Z = (Y / y) * z;

      // convert to RGB using Wide RGB D65 formula
      let red   = X * 1.656492  - Y * 0.354851 - Z * 0.255038;
      let green = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
      let blue  = X * 0.051713  - Y * 0.121364 + Z * 1.011530;

      if (red > blue && red > green && red > 1.0) {
        // red is too big
        green = green / red;
        blue = blue / red;
        red = 1.0;
      } else if (green > blue && green > red && green > 1.0) {
        // green is too big
        red = red / green;
        blue = blue / green;
        green = 1.0;
      } else if (blue > red && blue > green && blue > 1.0) {
        // blue is too big
        red = red / blue;
        green = green / blue;
        blue = 1.0;
      }

      // apply reverse gamma correction
      red   = red   <= 0.0031308 ? 12.92 * red  : (1.0 + 0.055) * Math.pow(red,  (1.0 / 2.4)) - 0.055;
      green = green <= 0.0031308 ? 12.92 * green: (1.0 + 0.055) * Math.pow(green,(1.0 / 2.4)) - 0.055;
      blue  = blue  <= 0.0031308 ? 12.92 * blue : (1.0 + 0.055) * Math.pow(blue, (1.0 / 2.4)) - 0.055;

      // rgb is between 0 and 1 -> convert to 0 and 255
      red *= 255;
      green *= 255;
      blue *= 255;

      this.red = Math.round(red);
      this.green = Math.round(green);
      this.blue = Math.round(blue);
    },
    sendColorToLights: function(){
      axios.post('/sendColorToLights', {
        hue: this.hue,
        light: this.light,
      }).then(response => {
        if (response.data)
          this.bgColor = `hsl(${this.hue}, 100%, ${this.light}%)`

      }).catch(error => {
        console.log(error)
      })
    }
  },
  created(){
    axios({
      method: 'get',
      url: '/getLights',
    }).then(response => {
      this.checked = response.data.on;
      this.initialCheck = this.checked;
      this.x = response.data.xy[0];
      this.y = response.data.xy[1];
      this.bri = response.data.bri;

      this.XYtoRGB(this.x, this.y, this.bri);
      this.bgColor = `rgb(${this.red}, ${this.green}, ${this.blue})`;
    }).catch(error => {
      console.log(error)
    })
  }
}
</script>

<style>
/* #app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
} */
.switch{
  position: relative;
  display: block;
  width: 6em;
  height: 3em;
  border: 7px solid rgba(146, 0, 0, 0.5);
  border-radius: 2em;
  transition: all 0.3s;
  cursor: pointer;
  margin: 0 auto;
}
.switch::after{
  content: '';
  position: absolute;
  width: 3em;
  height: 90%;
  background: rgba(146, 0, 0, 0.5);
  border-radius: 2em;
  left: 2.5px;
  top: 2.5px;
  transition: all 0.3s;
}

#toggle {
  display: none;
}
#toggle:checked + .switch::after{
  left: 45px;
  background: rgba(0, 144, 24, 0.5);
}
#toggle:checked + .switch{
  border-color: rgba(0, 144, 24, 0.5);
}

.toggle-bg{
  background: white;
  padding-left: 100px;
  padding-right: 100px;
  height: 200px;
  border-radius: 2em;
  padding-top: 10px;
  width: 25%;
  max-width: 250px;
  margin: 50px auto;
  
  -webkit-box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.5);
  -moz-box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.5);
  box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.5);
}
.color-bg{
  background: white;
  height: 850px;
  width: 90vw;
  max-width: 750px;
  border-radius: 2em;
  padding-top: 10px;
  margin: 50px auto;

  -webkit-box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.5);
  -moz-box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.5);
  box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.5);
}
.slider{
  -webkit-appearance: none;
  width: 75%;
  height: 25px;
  background: #ececec;
  outline: none;
  opacity: 0.7;
  -webkit-transition: .2s;
  transition: opacity .2s;
  display: flex;
  justify-content: center;
  margin: 0 auto;
  border-radius: 2em;
  border: black solid 1px;
}
.slider:hover{
  opacity: 1;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 25px;
  height: 25px;
  background: black;
  cursor: pointer;
  border-radius: 2em;
}
.slider::-moz-range-thumb {
  width: 25px;
  height: 25px;
  background: black;
  cursor: pointer;
  border-radius: 2em;
}
.preview-color{
  content: '';
  background: hsl(0, 100%, 50%);
  width: 50%;
  height: 50%;

  display: flex;
  justify-content: center;
  margin: 10px auto;
  margin-top: 50px;

  border: 1px solid black;
  border-radius: 2em;
  -webkit-box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.5);
  -moz-box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.5);
  box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.5);

}
button{
  display: flex;
  justify-content: center;
  margin: 50px auto;
  padding-top: 5px;

  width: 100px;
  height: 50px;

  border-radius: 2em;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.2em;

  border: 7px solid rgba(0, 98, 144, 0.5);
  transition: all .3s;
  outline: none;
}
button:hover{
  -webkit-box-shadow: 0px 0px 5px 2px rgba(0, 0, 0, 0.5);
  -moz-box-shadow: 0px 0px 5px 2px rgba(0, 0, 0, 0.5);
  box-shadow: 0px 0px 5px 2px rgba(0, 0, 0, 0.5);
  background: rgba(0, 98, 144, 0.5);
  cursor: pointer;
}


img {
  width: 100%;
  max-width: 750px;
  margin-left: -250px;
  display: flex;
  justify-content: center;
  margin: 0 auto;
}

.img-bg {
  margin-bottom: 0;
  position: relative;
}

.white-line-bottom {
  z-index: -1;
  position: absolute;
  left: -100%;
  bottom: 0;
  background: white;
  height: 200px;
  width: 200vw;
  
}


html, body{
  margin: 0;
  padding: 0;
}
body{
  display: flex;
  justify-content: center;
  flex-wrap: wrap;

  /* transition:  all 1s; */
}
.body-color{
  z-index: 0;
  width: 100%;
  height: 100%;
  transition:  all 1s;
}
h1{
  display: flex;
  justify-content: center;
}
h3{
  padding-left: 12.5%;
}

.break{
  flex-basis: 100%;
  height: 0;
}

</style>
