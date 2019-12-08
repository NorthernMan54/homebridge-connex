/*

Index URL Comments
6 1 https://user-field.aylanetworks.com/users/refresh_token.json Session refresh token - similar to Alexa
10 2 https://ads-field.aylanetworks.com/apiv1/devices.json Device summary information

15 7 https://ads-field.aylanetworks.com/apiv1/dsns/DSN/properties.json

32 11 https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z1Name.json Get Zone Name
33 12 https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z2Name.json Get Zone Name
34 13 https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z2Image.json 404
35 14 https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z3Name.json Get Zone Name
36 15 https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z3Image.json 404
37 16 https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z4Name.json Get Zone Name
162 17 https://ads-field.aylanetworks.com/apiv1/properties/ZONE_KEY/datapoints.json Set temperature
197 18 https://ads-field.aylanetworks.com/apiv1/properties/ZONE_KEY/datapoints.json Set temperature
215 19 https://ads-field.aylanetworks.com/apiv1/properties/ZONE_KEY/datapoints.json Set temperature

*/

var debug = require('debug')('connex-lib');
var request = require('request');
var Queue = require('better-queue');

const LOGIN_URL = 'https://user-field.aylanetworks.com/users/sign_in.json';
const DEVICE_URL = 'https://ads-field.aylanetworks.com/apiv1/devices.json';
const PROPERTIES_URL = 'https://ads-field.aylanetworks.com/apiv1/dsns/';
const SET_URL = 'https://ads-field.aylanetworks.com/apiv1/properties/';

var HEADER = {
  'accept': '*/*',
  'content-type': 'application/json',
  'accept-encoding': 'gzip, deflate, br',
  'user-agent': 'AMAP/5.8.8 (iPad; iOS 13.1.3; Scale/2.00)',
  'accept-language': 'en-CA;q=1'
};

var devices = {};

var messageQueue = new Queue(function(options, cb) {
  // debug("Queue", messageQueue.getStats());
  request(options, cb);
}, {
  concurrent: 1,
  autoResume: true,
  maxRetries: 0
});

module.exports = {
  connex: connex
};

/**
 * connex - description
 *
 * @param  {type} options.user description
 * @param  {type} options.password description
 * @param  {type} options.location description
 * @param  {type} options.zone description
 * @param  {type} options.target_temp description
 * @return {type}         description
 */

function connex(options, callback) {
  // debug("Setting up connex component", options);
  this._username = options.username;
  this._password = options.password;
  this._refresh = options.refresh;
  this._defaultTemp = options.defaultTemp;
  this.devices = {};
  pollDevices.call(this, function(err, result) {
    if (!err) {
      // debug("initial", result);
      devices = result;
    } else {
      // debug("inital Error", err);
    }
    // debug("what is this", this);
    callback(err, result);
  });
}

connex.prototype = {
  getDevices: function() {
    return devices;
  }
};

connex.prototype.poll = function(callback) {
  // debug("poll", this);
  pollDevices.call(this, function(err, devices) {
    callback(err, devices);
  });
};

async function pollDevices(callback) {
  // debug("pollDevices");
  try {
    devices = {
      connection_status: "Cloud Offline"
    };
    var result = await _login.call(this, devices);
    devices = await _getDevices(result);
    devices = await _getZone(devices, 'Z1');
    devices = await _getZone(devices, 'Z2');
    devices = await _getZone(devices, 'Z3');
    devices = await _getZone(devices, 'Z4');
    devices = await _getProperties(devices);
    callback(null, devices);
  } catch (err) {
    console.error("pollDevices Error:", err, devices);
    callback(err, devices);
  }
}

function _getZone(devices, zone) {
  return new Promise((resolve, reject) => {
    // Update zone/device data for the given zone name.

    //
    // make sure the location is already configured
    if (!devices || !HEADER.authorization) {
      console.error("Missing devices");
      reject(new Error("Missing devices"));
    }

    var options = {
      method: 'GET',
      url: PROPERTIES_URL + devices.dsn + '/data/' + zone + 'Name.json',
      timeout: 5000,
      strictSSL: false,
      headers: HEADER
    };
    // options.id = options.method + options.url;
    // debug("DEvices", devices);
    messageQueue.push(options, function(err, response) {
      if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
        delete HEADER.authorization;
        if (err) {
          console.error("Error: _getZones", err);
          reject(err);
        } else {
          console.error("_getZone Error ", response.statusCode);
          debug("Error", PROPERTIES_URL + devices.dsn + '/data/' + zone + 'Name.json', JSON.stringify(HEADER));
          reject(new Error("HTTP Error:", response.statusCode));
        }
      } else {
        var json;
        //    console.log(response.body);
        try {
          json = JSON.parse(response.body);
        } catch (ex) {
          //                console.error(ex);
          console.error(response.statusCode, response.statusMessage);
          console.error(response.body);
          //                console.error(response);
          reject(new Error("JSON Error:", response.body));
        }
        if (json) {
          // debug("_getZones Response", zone, JSON.stringify(json, null, 4));

          devices.zones[zone] = {
            name: json.datum.value
          };
          // debug("_getZone", JSON.stringify(devices, null, 4));
          resolve(devices);
        }
      }
    });
  });
}

function _getProperties(devices) {
  return new Promise((resolve, reject) => {
    // Update zone/device data for the given zone name.

    //
    // make sure the location is already configured
    if (!devices || !HEADER.authorization) {
      console.error("Missing devices");
      reject(new Error("Missing devices"));
    }
    var options = {
      method: 'GET',
      url: PROPERTIES_URL + devices.dsn + '/properties.json',
      timeout: 30000,
      strictSSL: false,
      headers: HEADER
    };
    // options.id = options.method + options.url;

    messageQueue.push(options, function(err, response) {
      if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
        delete HEADER.authorization;
        if (err) {
          console.error("Error: _getProperties", err);
          console.error("URL:", PROPERTIES_URL + this.devices.dsn + '/properties.json');
          console.error("HEADER:", JSON.stringify(HEADER));
          reject(err);
        } else {
          console.error("_getProperties Error ", response.statusCode);
          debug("Error", PROPERTIES_URL + devices.dsn + '/properties.json', JSON.stringify(HEADER));
          reject(new Error("HTTP Error:", response.statusCode));
        }
      } else {
        var json;
        //    console.log(response.body);
        try {
          json = JSON.parse(response.body);
        } catch (ex) {
          //                console.error(ex);
          console.error(response.statusCode, response.statusMessage);
          console.error(response.body);
          //                console.error(response);
          reject(new Error("JSON Error:", response.body));
        }
        if (json) {
          // debug("_getProperties Response", JSON.stringify(json, null, 4));

          resolve(_parseProperties(json, devices));
        }
      }
    }.bind(this));
  });
}

function _parseProperties(properties, devices) {
  properties.forEach(function(element) {
    // console.log(element.property);
    if (element.property.name.substring(0, 1) === "Z") {
      var zone = element.property.name.substring(0, 2);
      var key = element.property.name.substring(2);
      devices.zones[zone][key] = element.property.value;
      devices.zones[zone][key + 'key'] = element.property.key;
      devices.zones[zone].CurrTemp = devices.CurrTemp;
      devices.zones[zone].zone = zone;
    } else if (element.property.name === "CurrTemp") {
      devices.CurrTemp = element.property.value;
    }
    // parsed[element.property.name] = element.property;
  });
  return (devices);
}

function _login(devices) {
  return new Promise((resolve, reject) => {
    // retrieve access token from server
    // debug("_login", devices, this);
    var body = {
      "user": {
        "email": this._username,
        "application": {
          "app_id": "dimplex1-id",
          "app_secret": "dimplex1-3787640"
        },
        "password": this._password
      }
    };

    var options = {
      method: 'POST',
      url: LOGIN_URL,
      timeout: 5000,
      strictSSL: false,
      headers: HEADER,
      body: JSON.stringify(body)
    };
    // options.id = options.method + options.url;

    if (devices && !HEADER.authorization) {
      debug("logging in");
      messageQueue.push(options, function(err, response) {
        if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
          if (err) {
            // console.error("Error: _login", err);
            reject(err);
          } else if (response.statusCode === 401) {
            reject(new Error(JSON.stringify(response.body)));
          } else {
            console.error("Error ", response.statusCode, response.body);
            // debug("Error", JSON.stringify(response.body));
            reject(new Error("HTTP Error:", response.statusCode));
          }
        } else {
          var json;
          // debug("_Login Okay", JSON.stringify(body));
          /* {
        "access_token": "92b9851782f14bf58da03c92228b68cc",
         "expires_in": 86399,
         "refresh_token": "82dd628473794622ab42a2be7fc9d5d5",
         "role": "EndUser",
         "role_tags": []
          }
      */
          try {
            json = JSON.parse(response.body);
          } catch (ex) {
            //                console.error(ex);
            // console.error(response.statusCode, response.statusMessage);
            // console.error(response.body);
            //                console.error(response);
            reject(new Error("JSON Error:", response.body));
          }
          if (json) {
            // debug("Login Response ", response.body, json);
            // debug("_login Response", JSON.stringify(json, null, 4));
            // devices.AccessToken = json.access_token;
            HEADER = {
              'accept': '*/*',
              'content-type': 'application/json',
              'accept-encoding': 'gzip, deflate, br',
              'user-agent': 'AMAP/5.8.8 (iPad; iOS 13.1.3; Scale/2.00)',
              'accept-language': 'en-CA;q=1',
              'authorization': 'auth_token ' + json.access_token
            };
            resolve(devices);
          }
        }
      });
    } else {
      // debug("skipping login");
      resolve(devices);
    }
  });
}

function _getDevices(devices) {
  return new Promise((resolve, reject) => {
    // retrieve location ID that corrresponds to this._location_name
    // make sure we have an accessToken
    if (!HEADER.authorization) {
      // console.error("Missing access token.");
      reject(new Error("Missing access token."));
    }

    // debug("_getDevices", devices);
    var options = {
      method: 'GET',
      url: DEVICE_URL,
      timeout: 5000,
      strictSSL: false,
      headers: HEADER
    };
    // options.id = options.method + options.url;

    messageQueue.push(options, function(err, response) {
      if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
        delete HEADER.authorization;
        if (err) {
          // console.error("Error: _login", err);
          reject(err);
        } else {
          // console.error("_getDevices Error ", response.statusCode, response.header, response.body, HEADER);
          reject(new Error("HTTP Error:", response.statusCode));
        }
      } else {
        var json;
        // console.log(response.body);
        try {
          json = JSON.parse(response.body);
        } catch (ex) {
          //                console.error(ex);
          console.error(response.statusCode, response.statusMessage);
          console.error(response.body);
          //                console.error(response);
          reject(new Error("JSON Error:", response.body));
        }
        if (json) {
          // debug("_getDevices Response", JSON.stringify(json, null, 4));
          var device = json[0].device;
          device.zones = {};
          resolve(device);
        }
      }
    });
  });
}

connex.prototype.setTargetTemperature = function(accessory, value, callback) {
  var body = {
    "datapoint": {
      "value": value * 10,
      "metadata": null
    }
  };
  debug("setTargetTemperature %s ===> ", accessory.displayName, JSON.stringify(body));

  var options = {
    method: 'POST',
    url: SET_URL + accessory.context.zone.Setpointkey + '/datapoints.json',
    timeout: 5000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  };
  // options.id = options.method + options.url + value;

  messageQueue.push(options, function(err, response) {
    if (err || response.statusCode !== 201) {
      delete HEADER.authorization;
      if (err) {
        // console.error("Error: setTargetTemperature", err, SET_URL + accessory.context.zone.Setpointkey + '/datapoints.json');
        callback(err);
      } else {
        // console.error("Error ", response.statusCode, SET_URL + accessory.context.zone.Setpointkey + '/datapoints.json', response.message);
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      //    console.log(response.body);
      try {
        json = JSON.parse(response.body);
      } catch (ex) {
        //                console.error(ex);
        console.error(response.statusCode, response.statusMessage);
        console.error(response.body);
        //                console.error(response);
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        // debug("setTargetTemperature", SET_URL + accessory.context.zone.Setpointkey + '/datapoints.json', JSON.stringify(json, null, 4));
        // devices = json.response.locations[0].id;
        callback(null);
      }
    }
  });
};

connex.prototype.setHold = function(accessory, value, callback) {
  var body = {
    "datapoint": {
      "value": value,
      "metadata": null
    }
  };

  debug("setHold %s ===> ", accessory.displayName, JSON.stringify(body));

  var options = {
    method: 'POST',
    url: SET_URL + accessory.context.zone.Holdkey + '/datapoints.json',
    timeout: 5000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  };
  // options.id = options.method + options.url + value;

  messageQueue.push(options, function(err, response) {
    if (err || response.statusCode !== 201) {
      delete HEADER.authorization;
      if (err) {
        // console.error("Error: setHold", err, SET_URL + accessory.context.zone.Holdkey + '/datapoints.json');
        callback(err);
      } else {
        // console.error("Error ", response.statusCode, SET_URL + accessory.context.zone.Holdkey + '/datapoints.json', response.message);
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      //    console.log(response.body);
      try {
        json = JSON.parse(response.body);
      } catch (ex) {
        //                console.error(ex);
        console.error(response.statusCode, response.statusMessage);
        console.error(response.body);
        //                console.error(response);
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        // debug("setHold", SET_URL + accessory.context.zone.Holdkey + '/datapoints.json', JSON.stringify(json, null, 4));
        // devices = json.response.locations[0].id;
        callback(null);
      }
    }
  });
};
