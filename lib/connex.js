/*

Index		URL	Comments
6	1	https://user-field.aylanetworks.com/users/refresh_token.json	Session refresh token - similar to Alexa
10	2	https://ads-field.aylanetworks.com/apiv1/devices.json	Device summary information

15	7	https://ads-field.aylanetworks.com/apiv1/dsns/DSN/properties.json

32	11	https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z1Name.json	Get Zone Name
33	12	https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z2Name.json	Get Zone Name
34	13	https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z2Image.json	404
35	14	https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z3Name.json	Get Zone Name
36	15	https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z3Image.json	404
37	16	https://ads-field.aylanetworks.com/apiv1/dsns/DSN/data/Z4Name.json	Get Zone Name
162	17	https://ads-field.aylanetworks.com/apiv1/properties/ZONE_KEY/datapoints.json	Set temperature
197	18	https://ads-field.aylanetworks.com/apiv1/properties/ZONE_KEY/datapoints.json	Set temperature
215	19	https://ads-field.aylanetworks.com/apiv1/properties/ZONE_KEY/datapoints.json	Set temperature

*/

var debug = require('debug')('connex-lib');
var request = require('request');

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

var AccessToken = null;
// var devices = {};

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

  this.devices = {};

  // debug("Setting up connex component", this);
  this.setup_finished = false;
  _login.call(this, function(err) {
    if (!err) {
      _getDevices.call(this, function(err, devices) {
        _getZones.call(this, devices, function(err, devices) {
          _getProperties.call(this, devices, function(err, devices) {
            debug("Devices", JSON.stringify(devices, null, 4));
            this.devices = devices;
            callback(null, devices);
          })
        }.bind(this));
      }.bind(this));
    };
  }.bind(this));

  setInterval(pollDevices.bind(this), this._refresh * 1000); // Poll every minute
}

function pollDevices() {
  debug("Poll");
  _getProperties.call(this, function(err, zones) {
    if (!err) {
      debug("Poll success");
    } else {
      debug("Poll Error");
    }
  });
}

function _getZones(devices, callback) {
  _getZone.call(this, devices, 'Z1', function(err, devices) {
    _getZone.call(this, devices, 'Z2', function(err, devices) {
      _getZone.call(this, devices, 'Z3', function(err, devices) {
        _getZone.call(this, devices, 'Z4', function(err, devices) {
          callback(null, devices);
        })
      }.bind(this));
    }.bind(this));
  }.bind(this));
}

function _getZone(devices, zone, callback) {
  // Update zone/device data for the given zone name.

  //
  // make sure the location is already configured
  if (!devices || !AccessToken) {
    console.error("Missing devices");
    callback(new Error("Missing devices"));
  }

  debug("DEvices", devices);
  request({
    method: 'GET',
    url: PROPERTIES_URL + devices.dsn + '/data/' + zone + 'Name.json',
    timeout: 5000,
    strictSSL: false,
    headers: HEADER
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: _getZones", err);
        callback(err);
      } else {
        console.error("_getZone Error ", response.statusCode);
        debug("Error", PROPERTIES_URL + devices.dsn + '/data/' + zone + 'Name.json', JSON.stringify(HEADER));
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
        // debug("_getZones Response", zone, JSON.stringify(json, null, 4));
        // debug("_getZones", JSON.stringify(devices, null, 4));
        devices.zones[zone] = {
          name: json.datum.value
        };
        callback(null, devices);
      }
    }
  });
}

function _getProperties(devices, callback) {
  // Update zone/device data for the given zone name.

  //
  // make sure the location is already configured
  if (!devices || !AccessToken) {
    console.error("Missing devices");
    callback(new Error("Missing devices"));
  }

  request({
    method: 'GET',
    url: PROPERTIES_URL + devices.dsn + '/properties.json',
    timeout: 30000,
    strictSSL: false,
    headers: HEADER
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: _getProperties", err);
        console.error("URL:", PROPERTIES_URL + this.devices.dsn + '/properties.json');
        console.error("HEADER:", JSON.stringify(HEADER));
        callback(err);
      } else {
        console.error("_getProperties Error ", response.statusCode);
        debug("Error", PROPERTIES_URL + devices.dsn + '/data/' + zone + 'Name.json', JSON.stringify(HEADER));
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
        // debug("_getProperties Response", JSON.stringify(json, null, 4));

        callback(null, _parseProperties(json, devices));
      }
    }
  }.bind(this));
}

function _parseProperties(properties, devices) {
  properties.forEach(function(element) {
    // console.log(element.property);
    if (element.property.name.substring(0, 1) === "Z") {
      var zone = element.property.name.substring(0, 2);
      var key = element.property.name.substring(2);
      devices.zones[zone][key] = element.property.value;
      devices.zones[zone][key + 'key'] = element.property.key;
      devices.zones[zone].CurrTemp = this.devices.CurrTemp;
    } else if (element.property.name === "CurrTemp") {
      devices.CurrTemp = element.property.value;
    }
    // parsed[element.property.name] = element.property;
  });
  return (devices);
}

function _login(callback) {
  // retrieve access token from server
  // debug("_login", this);
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

  request({
    method: 'POST',
    url: LOGIN_URL,
    timeout: 5000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: _login", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode, response.body);
        debug("Error", JSON.stringify(body));
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      //    console.log(response.body);
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
        console.error(response.statusCode, response.statusMessage);
        console.error(response.body);
        //                console.error(response);
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        // debug("Login Response ", response.body, json);
        // debug("_login Response", JSON.stringify(json, null, 4));
        AccessToken = json.access_token;
        callback(null);
      }
    }
  });
}

function _getDevices(callback) {
  // retrieve location ID that corrresponds to this._location_name
  // make sure we have an accessToken
  if (!AccessToken) {
    console.error("Missing access token.");
    callback(new Error("Missing access token."));
  }

  HEADER = {
    'accept': '*/*',
    'content-type': 'application/json',
    'accept-encoding': 'gzip, deflate, br',
    'user-agent': 'AMAP/5.8.8 (iPad; iOS 13.1.3; Scale/2.00)',
    'accept-language': 'en-CA;q=1',
    'authorization': 'auth_token ' + AccessToken
  };
  debug("_getDevices", this);
  request({
    method: 'GET',
    url: DEVICE_URL,
    timeout: 5000,
    strictSSL: false,
    headers: HEADER
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: _login", err);
        callback(err);
      } else {
        console.error("_getDevices Error ", response.statusCode, response, HEADER);
        callback(new Error("HTTP Error:", response.statusCode));
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
        callback(new Error("JSON Error:", response.body));
      }
      if (json) {
        debug("_getDevices Response", JSON.stringify(json, null, 4));
        this.devices = json[0].device;
        this.devices.zones = {};
        callback(null, this.devices);
      }
    }
  });
}

connex.prototype.setTargetTemperature = function(zone, value, callback) {
  debug("setTargetTemperature", zone);
  var body = {
    "datapoint": {
      "value": value * 10,
      "metadata": null
    }
  };
  debug("setTargetTemperature", JSON.stringify(body));

  request({
    method: 'POST',
    url: SET_URL + zone.Setpointkey + '/datapoints.json',
    timeout: 5000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function(err, response) {
    if (err || response.statusCode !== 201) {
      if (err) {
        console.error("Error: setTargetTemperature", err, SET_URL + zone.Setpointkey + '/datapoints.json');
        callback(err);
      } else {
        console.error("Error ", response.statusCode, SET_URL + zone.Setpointkey + '/datapoints.json', response.message);
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
        debug("setTargetTemperature", SET_URL + zone.Setpointkey + '/datapoints.json', JSON.stringify(json, null, 4));
        // devices = json.response.locations[0].id;
        callback(null);
      }
    }
  });
};

function isEmptyObject(obj) {
  var name;
  for (name in obj) {
    return false;
  }
  return true;
}

function diff(obj1, obj2) {
  var result = {};
  var change;
  for (var key in obj1) {
    if (typeof obj2[key] === 'object' && typeof obj1[key] === 'object') {
      change = diff(obj1[key], obj2[key]);
      if (isEmptyObject(change) === false) {
        result[key] = change;
      }
    } else if (obj2[key] !== obj1[key]) {
      result[key] = obj2[key];
    }
  }
  return result;
}
