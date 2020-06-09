const express = require("express");
const serveStatic = require('serve-static');
const path = require('path');
const server = require("http");
const httpProxy = require("http-proxy");
const bodyParser = require("body-parser");
const dotenv = require('dotenv');
const axios = require('axios');
const qs = require('querystring');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(bodyParser.json());
dotenv.config();

const appServer = server.createServer(app);
const apiProxy = httpProxy.createProxyServer(app);

const LIGHT_ID = ['1', '3', '4']; //ID of my closet lights
const username = process.env.username;
const access_token = process.env.access_token;
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${access_token}`
}


apiProxy.on("error", (err, req, res) => {
  console.log(err);
  console.log("error");
  res.status(500).send("Proxy Down");
});

// Color formulas
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

// refresh token on startup
refreshToken = () => {
  const refreshURL = 'https://api.meethue.com/oauth2/refresh?grant_type=refresh_token'
  const encodedData = Buffer.from(process.env.clientId + ':' + process.env.clientSecret).toString('base64');

  const body = {
    refresh_token: process.env.refresh_token,
  }
  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${encodedData}`
    }
  }

  axios.post(refreshURL, qs.stringify(body), config)
    .then(response => {
      console.log('access token: ', response.data.access_token);
      console.log('refresh token: ', response.data.refresh_token);
    })
    .catch(error => {
      console.log(error.data)
    });
};
// refreshToken()


app.all('/getLights', (req, res) => {
  const getLightsURL = `https://api.meethue.com/bridge/${username}/lights/`;

  axios({
    method: 'get',
    url: getLightsURL,
    headers,
  }).then(response => {
    res.send(response.data[1].state)
  }).catch(error => {
    console.log(error.data);
  })

})
app.all('/toggleLights', (req, res) => {
  // console.log(req.body.on)
  // 'lights' API can handle 10 commands/second
  // 'groups' API can handle 1 command/second
  // loop through light Id's and make calls individually -> more responsive
  LIGHT_ID.forEach(id => {
    let url = `https://api.meethue.com/bridge/${username}/lights/${id}/state/`;
    
    axios({
      method: 'put',
      url,
      data: req.body,
      headers,
    }).catch(error => {
      console.log(error);
    });
  });

  res.send(req.body.on);
});
app.post('/sendColorToLights', (req, res) => {
  let hsl = [req.body.hue, 100, req.body.light];

  let rgb = HSLtoRGB(...hsl);
  let xy = RGBtoXY(...rgb);
  
  let body = {
    'xy': [
      parseFloat(xy[0]),
      parseFloat(xy[1])
    ]
  };

  LIGHT_ID.forEach(id => {
    let url = `https://api.meethue.com/bridge/${username}/lights/${id}/state/`;
    axios({
      method: 'put',
      url,
      data: JSON.stringify(body),
      headers,
    }).catch(error => {
      console.log(error);
    });
  })

  res.send(true);
})

// server static frontend
app.use('/', serveStatic(path.join(__dirname, './eli/dist')));
// frontend proxy
app.all("/*", (req, res) => {
  apiProxy.web(req, res, { 
    target: process.env.FRONT_END_HOST || "http://localhost:8080/"
  });
});

appServer.listen(PORT, () => {
  console.log(`Backend Listening on port ${PORT}`)
});