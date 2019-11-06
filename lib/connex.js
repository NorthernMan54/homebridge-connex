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

const LOGIN_URL = 'https://user-field.aylanetworks.com/users/refresh_token.json';
const DEVICE_URL = 'https://ads-field.aylanetworks.com/apiv1/devices.json';
const PROPERTIES_URL = 'https://ads-field.aylanetworks.com/apiv1/dsns/';
// const URL = 'https://apil.warmup.com/graphql';
const APP_TOKEN = 'M=;He<Xtg"$}4N%5k{$:PD+WA"]D<;#PriteY|VTuA>_iyhs+vA"4lic{6-LqNM:';
const HEADER = {
  'accept': '*/*',
  'content-type': 'application/json',
  'accept-encoding': 'gzip, deflate, br',
  'user-agent': 'AMAP/5.8.8 (iPad; iOS 13.1.3; Scale/2.00)',
  'accept-language': 'en-CA;q=1'
};

var AccessToken = null;
var devices;

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
  this._location_name = options.location;
  this._zone_name = options.zone;
  this._target_temperature = options.target_temp;
  this._refresh = options.refresh;
  this._duration = options.duration;
  this.zone = [];

  this.devices = null;
  this._zone = null;
  this._current_temperature = 0;
  this._away = false;
  this._on = true;

  // debug("Setting up connex component", this);
  this.setup_finished = false;
  _login.call(this, function() {
    _getDevices.call(this, function(err, locations) {
      _getZones.call(this, function(err, zones) {
        callback(null, zones);
      })
    }.bind(this));
  }.bind(this));

  setInterval(pollDevices.bind(this), this._refresh * 1000 / 2); // Poll every minute
}

function pollDevices() {
  // debug("Poll");
  _getZones.call(this, function(err, zones) {});
}

/*
function get_run_mode(self) {
  // return current mode, e.g. 'off', 'fixed', 'prog'.
  if (!this._zone) {
    return 'off'
  }
  return this.RUN_MODE[this._zone['runModeInt']]
}

function update_zone(self) {
  // Update zone/device data for the given zone name.

  //
  // make sure the location is already configured
  if (!this.devices || !AccessToken || !this._zone_name) {
    return false
  }

  body = {
    "query": "query QUERY{ user{ currentLocation: location { id name zones{ id zoneName runModeInt targetTemp currentTemp thermostat4ies {minTemp maxTemp}}  }}  } "
  }
  header_with_token = this.HEADER.copy()
  header_with_token['warmup-authorization'] = str(AccessToken)
  response = requests.post(url = this.URL, headers = header_with_token, json = body)
  // check if request was acceppted and if request was successful
  if (response.status_code != 200 || response.json()['status'] != 'success') {
    debug("updating new zone failed, %s", response);
    return false
  }
  // extract and store zoneId for later use
  zones = response.json()['data']['user']['currentLocation']['zones']
  zone_updated = false
  for zone in zones:
    if zone['zoneName'] == this._zone_name:
    this._zone = zone
  debug("Successfully updated data for zone '%s' "
    "with ID %s", this._zone['zoneName'],
    this._zone['id']);
  zone_updated = true
  break
  if not zone_updated:
    return false
  // update temperatures values
  this._target_temperature = int(this._zone['targetTemp']) / 10
  this._target_temperature_low = int(this._zone['thermostat4ies'][0]['minTemp']) / 10
  this._target_temperature_high = int(this._zone['thermostat4ies'][0]['maxTemp']) / 10
  this._current_temperature = int(this._zone['currentTemp']) / 10
  return true ''
  '
}

*/

function _getZones(callback) {
  // Update zone/device data for the given zone name.

  //
  // make sure the location is already configured
  if (!devices || !AccessToken) {
    console.error("Missing devices");
    callback(new Error("Missing devices"));
  }

  // debug("_getZones", JSON.stringify(body));
  // debug("_getZones: URL", TOKEN_URL, "HEADER", HEADER, "body", body);
  request({
    method: 'POST',
    url: ZONE_URL,
    timeout: 1000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: _getZones", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
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
        // debug("Response", json.response.zones);
        if (json.response.zones) {
          var zones = json.response.zones;
          zones.forEach(function(zone) {
            // debug("diff %s = ", zone.zoneId, JSON.stringify(diff(this.zone[zone.zoneId], zone)));
            this.zone[zone.zoneId] = zone;
          }.bind(this));
          callback(null, zones);
        } else {
          // debug("Response", JSON.stringify(json.response, null, 4));
          callback(new Error("JSON Error:", response.body));
        }
      }
    }
  }.bind(this));

  /*
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug("updating zone failed, %s", response);
  return false
  // extract and store zoneId for later use
  zones = response.json()['response']['zones']
  zone_updated = false
  for zone in zones:
    if zone['zoneName'] == this._zone_name:
    this._zone = zone
  debug("Successfully updated data for zone '%s' "
    "with ID %s", this._zone['zoneName'],
    this._zone['zoneId'])
  zone_updated = true
  break
  if not zone_updated:
    return false
  // update temperatures values
  this._target_temperature = int(this._zone['targetTemp']) / 10
  this._target_temperature_low = int(this._zone['minTemp']) / 10
  this._target_temperature_high = int(this._zone['maxTemp']) / 10
  this._current_temperature = int(this._zone['currentTemp']) / 10
  return true ''
  '
*/
}
/*
function get_target_temmperature(self) {
  // return target temperature
  return this._target_temperature
}

function get_current_temmperature(self) {
  // return currrent temperature
  return this._current_temperature
}

function get_target_temperature_low(self) {
  // return minimum temperature
  return this._target_temperature_low
}

function get_target_temperature_high(self) {
  // return maximum temperature
  return this._target_temperature_high
}
*/
function _login(callback) {
  // retrieve access token from server
  // debug("_login", this);
  var body = {
    user: {
      refresh_token: this._username
    }
  };

  // debug("URL", TOKEN_URL, "HEADER", HEADER, "body", body);
  request({
    method: 'POST',
    url: LOGIN_URL,
    timeout: 1000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: _login", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
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
        debug("Response ", response.body, json.response.token);
        AccessToken = json.response.access_token;
        callback(null);
      }
    }
  });

  /*
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug("generating AccessToken failed, %s", response)
  return false
  // extract and store access token for later use
  AccessToken = response.json()['response']['token']
  return true
  */
}

function _getDevices(callback) {
  // retrieve location ID that corrresponds to this._location_name
  // make sure we have an accessToken
  if (!AccessToken) {
    console.error("Missing access token.");
    callback(new Error("Missing access token."));
  }

  HEADER.authorization = "auth_token " + AccessToken;

  // debug("_getDevices: URL", TOKEN_URL, "HEADER", HEADER, "body", body);
  request({
    method: 'POST',
    url: DEVICE_URL,
    timeout: 1000,
    strictSSL: false,
    headers: HEADER
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: _login", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
        callback(new Error("HTTP Error:", response.statusCode));
      }
    } else {
      var json;
      console.log(response.body);
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
        // debug("Response", JSON.stringify(json, null, 4), json.response.locations[0].id);
        devices = json.response.devices[0].device;
        callback(null);
      }
    }
  });
  /*
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug("initialising failed, %s", response)
  return false
  // extract and store locationId for later use
  locations = response.json()['response']['locations']
  for loc in locations:
    if loc['name'] == this._location_name:
    this.devices = loc['id']
  debug(
    "Successfully fetched location ID %s for location '%s'",
    this.devices, this._location_name)
  break
  if this.devices is null:
    return false
  return true
  */
}

/*
var body = {
  "account": {
    "email": this._username,
    "token": AccessToken
  },
  "request": {
    "method": "setProgramme",
    "zoneId": zoneId,
    "zoneMode": "fixed",
    "fixed": {
      "fixedTemp": parseInt(value * 10)
    }
  }
};
*/

connex.prototype.setTargetTemperature = function(zoneId, value, callback) {
  // method: "setOverride", zones: ["$device.deviceNetworkId"], type: 3, temp: getBoostTempValue(), until: getBoostEndTime()
  var oldDateObj = new Date();
  var today = new Date(oldDateObj.getTime() + this._duration * 60000);
  var until = ("00" + today.getHours()).slice(-2) + ":" + ("00" + today.getMinutes()).slice(-2);
  var body = {
    "account": {
      "email": this._username,
      "token": AccessToken
    },
    "request": {
      "method": "setOverride",
      "zones": [zoneId],
      "type": 3,
      "temp": parseInt(value * 10),
      "until": until
    }
  };
  // {"runMode":"override","overrideTemp":190,"overrideDur":9999}
  debug("setTargetTemperature", JSON.stringify(body));
  this.zone[zoneId] = null; // clear cache
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 1000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: setTargetTemperature", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
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
        debug("Response", JSON.stringify(json, null, 4));
        // devices = json.response.locations[0].id;
        callback(null);
      }
    }
  });

  /*
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug(
      "Setting new target temperature failed, %s", response)
  return
  response_temp = response.json()["message"]["targetTemp"]
  if new_temperature != int(response_temp) / 10:
    debug("Server declined to set new target temperature "
      "to %.1f°C; response from server: '%s'",
      new_temperature, response.text)
  return
  this._target_temperature = new_temperature
  debug("Successfully set new target temperature to %.1f°C; "
    "response from server: '%s'",
    this._target_temperature, response.text)
  */
};


connex.prototype.setzoneAuto = function(zoneId, callback) {
  // set device to automatic mode
  // make sure the zone/device is already configured
  var body = {
    "account": {
      "email": this._username,
      "token": AccessToken
    },
    "request": {
      "method": "setProgramme",
      "zoneId": zoneId,
      "zoneMode": "prog"
    }
  };

  this.zone[zoneId] = null; // clear cache
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 1000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: setzoneAuto", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
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
        debug("Response", JSON.stringify(json, null, 4));
        // devices = json.response.locations[0].id;
        callback(null);
      }
    }
  });

  /*
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug(
      "Setting new target temperature to auto failed, %s", response)
  return
  debug("Successfully set new target temperature to auto, "
    "response from server: '%s'", response.text)
    */
};

connex.prototype.setzoneOverRide = function(zoneId, callback) {
  // set device to manual mode
  // make sure the zone/device is already configured

  // method: "setOverride", zones: ["$device.deviceNetworkId"], type: 3, temp: getBoostTempValue(), until: getBoostEndTime()

  var body = {
    "account": {
      "email": this._username,
      "token": AccessToken
    },
    "request": {
      "method": "setProgramme",
      "zoneId": zoneId,
      "zoneMode": "override"
    }
  };

  // debug("setzoneOn", JSON.stringify(body));
  this.zone[zoneId] = null; // clear cache
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 1000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: setzoneOn", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
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
        debug("Response", JSON.stringify(json, null, 4));
        // devices = json.response.locations[0].id;
        callback(null);
      }
    }
  });

  /*
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug(
      "Setting new target temperature to "
      "manual failed, %s", response)
  return

  debug("Successfully set new target temperature to manual, "
    "response from server: '%s'", response.text)
    */
};

connex.prototype.setzoneFixed = function(zoneId, callback) {
  // set device to manual mode
  // make sure the zone/device is already configured

  // method: "setOverride", zones: ["$device.deviceNetworkId"], type: 3, temp: getBoostTempValue(), until: getBoostEndTime()

  var body = {
    "account": {
      "email": this._username,
      "token": AccessToken
    },
    "request": {
      "method": "setProgramme",
      "zoneId": zoneId,
      "zoneMode": "fixed"
    }
  };

  // debug("setzoneOn", JSON.stringify(body));
  this.zone[zoneId] = null; // clear cache
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 1000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: setzoneOn", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
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
        debug("Response", JSON.stringify(json, null, 4));
        // devices = json.response.locations[0].id;
        callback(null);
      }
    }
  });

  /*
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug(
      "Setting new target temperature to "
      "manual failed, %s", response)
  return

  debug("Successfully set new target temperature to manual, "
    "response from server: '%s'", response.text)
    */
};

/*
function set_location_to_frost(self) {
  // set device to frost protection mode
  // make sure the zone/device is already configured
  if this.devices is null or AccessToken is null:
    return
  body = {
    "account": {
      "email": this._username,
      "token": AccessToken
    },
    "request": {
      "method": "setModes",
      "values": {
        "holEnd": "-",
        "fixedTemp": "",
        "holStart": "-",
        "geoMode": "0",
        "holTemp": "-",
        "devices": this.devices,
        "locMode": "frost"
      }
    }
  }

  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug(
      "Setting location to frost protection failed, %s", response)
  return
  debug("Successfully set location to frost protection, response "
    "from server: '%s'", response.text)
}

*/

connex.prototype.setzoneOff = function(zoneId, callback) {
  //  turn off device
  // make sure the zone/device is already configured
  var body = {
    "account": {
      "email": this._username,
      "token": AccessToken
    },
    "request": {
      "method": "setModes",
      "values": {
        "holEnd": "-",
        "fixedTemp": "",
        "holStart": "-",
        "geoMode": "0",
        "holTemp": "-",
        "devices": devices,
        "locMode": "off"
      }
    }
  };

  // debug("setzoneOff", JSON.stringify(body));
  this.zone[zoneId] = null; // clear cache
  request({
    method: 'POST',
    url: TOKEN_URL,
    timeout: 1000,
    strictSSL: false,
    headers: HEADER,
    body: JSON.stringify(body)
  }, function(err, response) {
    if (err || response.statusCode !== 200 || response.statusMessage !== "OK") {
      if (err) {
        console.error("Error: setzoneOff", err);
        callback(err);
      } else {
        console.error("Error ", response.statusCode);
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
        debug("Response", JSON.stringify(json, null, 4));
        // devices = json.response.locations[0].id;
        callback(null);
      }
    }
  });

  /*
  response = requests.post(url = this.TOKEN_URL, headers = this.HEADER, json = body)
  // check if request was acceppted and if request was successful
  if response.status_code != 200 or\
  response.json()['status']['result'] != 'success':
    debug("Setting location to off mode failed, %s", response)
  return
  debug("Successfully set location to off mode, "
    "response from server: '%s'", response.text)
    */
};

/*

Sample response from a zone

{
    "zoneId": 68345,
    "zoneName": "Ensuite",    --> name
    "isOwner": true,
    "zoneType": "a",
    "zoneMode": "program",
    "runMode": "off",         --> Is this CurrentHeatingCoolingState
    "targetTemp": 210,        --> TargetTemperature
    "overrideTemp": 0,
    "overrideDur": 0,
    "currentTemp": 220,       --> CurrentTemperature
    "airTemp": "230",         --> Air Temp
    "floor1Temp": "220",
    "floor2Temp": "0",
    "fixedTemp": 210,
    "heatingTarget": 0,
    "setbackTemp": 160,
    "comfortTemp": 200,
    "sleepTemp": 180,
    "sleepActive": false,
    "floorType": false,
    "minTemp": 50,
    "maxTemp": 300,
    "energy": "0.00",
    "cost": "0.00",
    "mainzone": true,
    "schedule": [
        {
            "type": "0",
            "mode": "0",
            "day": 0,
            "node": "2",
            "value": [
                {
                    "start": "06:00",
                    "end": "08:00",
                    "temp": "210"
                },
                {
                    "start": "18:00",
                    "end": "22:00",
                    "temp": "210"
                }
            ]
        },
        {
            "type": "0",
            "mode": "0",
            "day": "1",
            "node": "2",
            "value": [
                {
                    "start": "06:00",
                    "end": "08:00",
                    "temp": "210"
                },
                {
                    "start": "18:00",
                    "end": "22:00",
                    "temp": "210"
                }
            ]
        },
        {
            "type": "0",
            "mode": "0",
            "day": "2",
            "node": "2",
            "value": [
                {
                    "start": "06:00",
                    "end": "08:00",
                    "temp": "210"
                },
                {
                    "start": "18:00",
                    "end": "22:00",
                    "temp": "210"
                }
            ]
        },
        {
            "type": "0",
            "mode": "0",
            "day": "3",
            "node": "2",
            "value": [
                {
                    "start": "06:00",
                    "end": "08:00",
                    "temp": "210"
                },
                {
                    "start": "18:00",
                    "end": "22:00",
                    "temp": "210"
                }
            ]
        },
        {
            "type": "0",
            "mode": "0",
            "day": "4",
            "node": "2",
            "value": [
                {
                    "start": "06:00",
                    "end": "08:00",
                    "temp": "210"
                },
                {
                    "start": "18:00",
                    "end": "22:00",
                    "temp": "210"
                }
            ]
        },
        {
            "type": "0",
            "mode": "0",
            "day": "5",
            "node": "2",
            "value": [
                {
                    "start": "06:00",
                    "end": "08:00",
                    "temp": "210"
                },
                {
                    "start": "18:00",
                    "end": "22:00",
                    "temp": "210"
                }
            ]
        },
        {
            "type": "0",
            "mode": "0",
            "day": "6",
            "node": "2",
            "value": [
                {
                    "start": "06:00",
                    "end": "08:00",
                    "temp": "210"
                },
                {
                    "start": "18:00",
                    "end": "22:00",
                    "temp": "210"
                }
            ]
        }
    ],
    "sensorFault": "001",
    "hasPolled": true,
    "lastPoll": 0

*/

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
