const URL = 'https://<BridgeIPAddress>/api/<APIKey>/';
const LIGHT_ID = ['1', '3', '4'] //ID of my closet lights
let hue = 0;
let light = 50;
let rgb;
let xy;

$(document).ready(function () {
  // Color Formulas
  XYtoRGB = (x, y, brightness) => {
    // calculate XYZ values
    let z = 1.0 - x - y;
    let Y = brightness;
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
    red = Math.round(red)
    green = Math.round(green)
    blue = Math.round(blue)

    return [red, green, blue];
  };
  HSLtoRGB = (hue, sat, light) => {
    // s and l must be fractions
    sat = sat / 100;
    light = light / 100;

    let chroma = (1 - Math.abs(2 * light - 1)) * sat;
    let x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
    let matchLight = light - chroma / 2;
    let red = 0;
    let green = 0;
    let blue = 0;

    if (0 <= hue && hue < 60) {
      red = chroma;
      green = x;
      blue = 0;
    } else if (60 <= hue && hue < 120) {
      red = x;
      green = chroma;
      blue = 0;
    } else if (120 <= hue && hue < 180) {
      red = 0;
      green = chroma;
      blue = x;
    } else if (180 <= hue && hue < 240) {
      red = 0;
      green = x;
      blue = chroma;
    } else if (240 <= hue && hue < 300) {
      red = x;
      green = 0;
      blue = chroma;
    } else if (300 <= hue && hue < 360) {
      red = chroma;
      green = 0;
      blue = x;
    }
    red = Math.round((red + matchLight) * 255);
    green = Math.round((green + matchLight) * 255);
    blue = Math.round((blue + matchLight) * 255);

    return [red, green, blue];
  };
  RGBtoXY = (red, green, blue) => {
    // convert RGB values to be between 0 and 1
    red /= 255;
    green /= 255;
    blue /= 255;

    // apply gamma correction -> make colors more vivid
    red = (red > 0.04045) ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4) : (red / 12.92);
    green = (green > 0.04045) ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4) : (green / 12.92);
    blue = (blue > 0.04045) ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4) : (blue / 12.92);

    // convert rgb to XYZ using Wide RGB D65 conversion formula
    let X = red * 0.649926 + green * 0.103455 + blue * 0.197109;
    let Y = red * 0.234327 + green * 0.743075 + blue * 0.022598;
    let Z = red * 0.0000000 + green * 0.053077 + blue * 1.035763;

    // calculate xy
    let x = X / (X + Y + Z);
    let y = Y / (X + Y + Z);
    x = x.toFixed(4);
    y = y.toFixed(4);

    return [x, y]
  };

  // update color
  changeWebsiteColor = (classSelector, color) => {
    $(classSelector).css('background', color);
  };
  changeLightBulbColor = (x, y) => {
    let body = {
      "xy": [
        parseFloat(x),
        parseFloat(y)
      ]
    };

    LIGHT_ID.forEach(id => {
      let endpoint = `lights/${id}/state/`;
      $.ajax({
          type: 'PUT',
          url: URL + endpoint,
          data: JSON.stringify(body)
        })
        .done(data => {
          // change website bg 
          let return_boolean = Object.keys(data[0])[0]
          if (return_boolean === "success") {
            classSelector = '.body-color';
            changeWebsiteColor(classSelector, `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
          };
        });
    });
  };

  // send button clicked
  sendColorToLights = () => {
    let hsl = [hue, 100, light];

    rgb = HSLtoRGB(...hsl);
    xy = RGBtoXY(...rgb);
    changeLightBulbColor(...xy);
  };

  // Get Current Light Setup
  getLightsOnStartup = () => {
    $.ajax({
        type: 'GET',
        url: URL + 'lights/1',
      })
      .done(data => {
        rgb = XYtoRGB(...data.state.xy, data.state.bri);
        let classSelector = '.body-color';
        let color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        if (data.state.on) {
          changeWebsiteColor(classSelector, color);
          $('#toggle').prop('checked', true);
        };
      });
  };

  // toggle lights on or off
  $('#toggle').change(function() {
    
    // 'lights' API can handle 10 commands/second
    // 'groups' API can handle 1 command/second
    // loop through light Id's and make calls individually -> more responsive
    let body = {"on": this.checked};

    LIGHT_ID.forEach(id => {
      let endpoint = `lights/${id}/state/`;

      $.ajax({
        type: 'PUT',
        url: URL + endpoint,
        data: JSON.stringify(body)
      })
      .done(data => {
        // change website bg 
        let return_boolean = Object.keys(data[0])[0]
        if (return_boolean === "success") {
          let color;
          if (this.checked)
            color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          else
            color = 'rgba(0, 0, 0, 0.9)';
          classSelector = '.body-color';
          changeWebsiteColor(classSelector, color);
        } else {
          this.checked = !this.checked;
        }
      })
    })
  });

  // update website slider values
  $('#hue-range').on("change mousemove", function () {
    hue = this.value;
    colorSliderHelper();
  });
  $('#light-range').on('change mousemove', function() {
    light = this.value;
    colorSliderHelper();
  });
  colorSliderHelper = () => {
    let color = `hsl(${hue}, 100%, ${light}%)`;
    let classSelector = '.preview-color';
    changeWebsiteColor(classSelector, color);
  };


  getLightsOnStartup();
});