/*
platform that offers a connection to a warmup4ie device.

this platform is inspired by the following code:
https://github.com/alex-0103/warmup4IE/blob/master/warmup4ie/warmup4ie.py

to setup this component, you need to register to warmup first.
see
https://my.warmup.com/login

Then add to your
configuration.yaml

climate:
  - platform: warmup4ie
    name: YOUR_DESCRIPTION
    username: YOUR_E_MAIL_ADDRESS
    password: YOUR_PASSWORD
    location: YOUR_LOCATION_NAME
    room: YOUR_ROOM_NAME

# the following issues are not yet implemented, since i have currently no need
# for them
# OPEN  - holiday mode still missing
#       - commands for setting/retrieving programmed times missing
*/

var debug = require('debug')('warmup4ie-lib');
var request = require('request');

const TOKEN_URL = 'https://api.warmup.com/apps/app/v1';
// const URL = 'https://apil.warmup.com/graphql';
const APP_TOKEN = 'M=;He<Xtg"$}4N%5k{$:PD+WA"]D<;#PriteY|VTuA>_iyhs+vA"4lic{6-LqNM:';
const HEADER = {
  'user-agent': 'WARMUP_APP',
  'accept-encoding': 'br, gzip, deflate',
  'accept': '*/*',
  'Connection': 'keep-alive',
  'content-type': 'application/json',
  'app-token': APP_TOKEN,
  'app-version': '1.8.1',
  'accept-language': 'de-de'
};

var WarmupAccessToken = null;
var LocId;

module.exports = {
  Warmup4IE: Warmup4IE
};

/**
 * Warmup4IE - description
 *
 * @param  {type} options.user description
 * @param  {type} options.password description
 * @param  {type} options.location description
 * @param  {type} options.room description
 * @param  {type} options.target_temp description
 * @return {type}         description
 */

function Warmup4IE(options, callback) {
  // debug("Setting up Warmup4IE component", options);
  this._username = options.username;
  this._password = options.password;
  this._location_name = options.location;
  this._room_name = options.room;
  this._target_temperature = options.target_temp;
  this._refresh = options.refresh;
  this._duration = options.duration;
  this.room = [];

  this.LocId = null;
  this._room = null;
  this._current_temperature = 0;
  this._away = false;
  this._on = true;

  // debug("Setting up Warmup4IE component", this);
  this.setup_finished = false;
  _generate_access_token.call(this, function() {
    _getLocations.call(this, function(err, locations) {
      _getRooms.call(this, function(err, rooms) {
        callback(null, rooms);
      })
    }.bind(this));
  }.bind(this));

  setInterval(pollDevices.bind(this), this._refresh * 1000 / 2); // Poll every minute
}

function pollDevices() {
  // debug("Poll");
  _getRooms.call(this, function(err, rooms) {
  });
}

/*
function get_run_mode(self) {
  // return current mode, e.g. 'off', 'fixed', 'prog'.
  if (!this._room) {
    return 'off'
  }
  return this.RUN_MODE[this._room['runModeInt']]
}

function update_room(self) {
  // Update room/device data for the given room name.

  //
  // make sure the location is already configured
  if (!this.LocId || !WarmupAccessToken || !this._room_name) {
    return false
  }

  body = {
    "query": "query QUERY{ user{ currentLocation: location { id name rooms{ id roomName runModeInt targetTemp currentTemp thermostat4ies {minTemp maxTemp}}  }}  } "
  }
  header_with_token = this.HEADER.copy()
  header_with_token['warmup-authorization'] = str(WarmupAccessToken)
  response = requests.post(url = this.URL, headers = header_with_token, json = body)
  // check if request was acceppted and if request was successful
  if (response.status_code != 200 || response.json()['status'] != 'success') {
    debug("updating new room failed, %s", response);
    return false
  }
  // extract and store roomId for later use
  rooms = response.json()['data']['user']['currentLocation']['rooms']
  room_updated = false
  for room in rooms:
    if room['roomName'] == this._room_name:
    this._room = room
  debug("Successfully updated data for room '%s' "
    "with ID %s", this._room['roomName'],
    this._room['id']);
  room_updated = true
  break
  if not room_updated:
    return false
  // update temperatures values
  this._target_temperature = int(this._room['targetTemp']) / 10
  this._target_temperature_low = int(this._room['thermostat4ies'][0]['minTemp']) / 10
  this._target_temperature_high = int(this._room['thermostat4ies'][0]['maxTemp']) / 10
  this._current_temperature = int(this._room['currentTemp']) / 10
  return true ''
  '
}

*/

function _getRooms(callback) {
  // Update room/device data for the given room name.

  //
  // make sure the location is already configured
  if (!LocId || !WarmupAccessToken) {
    console.error("Missing LocId");
    callback(new Error("Missing LocId"));
  }

  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "getRooms",
      "locId": LocId
    }
  };

  // debug("_getRooms", JSON.stringify(body));
  // debug("_getRooms: URL", TOKEN_URL, "HEADER", HEADER, "body", body);
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
        console.error("Error: _getRooms", err);
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
        // debug("Response", json.response.rooms);
        if (json.response.rooms) {
          var rooms = json.response.rooms;
          rooms.forEach(function(room) {
            // debug("diff %s = ", room.roomId, JSON.stringify(diff(this.room[room.roomId], room)));
            this.room[room.roomId] = room;
          }.bind(this));
          callback(null, rooms);
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
    debug("updating room failed, %s", response);
  return false
  // extract and store roomId for later use
  rooms = response.json()['response']['rooms']
  room_updated = false
  for room in rooms:
    if room['roomName'] == this._room_name:
    this._room = room
  debug("Successfully updated data for room '%s' "
    "with ID %s", this._room['roomName'],
    this._room['roomId'])
  room_updated = true
  break
  if not room_updated:
    return false
  // update temperatures values
  this._target_temperature = int(this._room['targetTemp']) / 10
  this._target_temperature_low = int(this._room['minTemp']) / 10
  this._target_temperature_high = int(this._room['maxTemp']) / 10
  this._current_temperature = int(this._room['currentTemp']) / 10
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
function _generate_access_token(callback) {
  // retrieve access token from server
  // debug("_generate_access_token", this);
  var body = {
    'request': {
      'email': this._username,
      'password': this._password,
      'method': 'userLogin',
      'appId': 'WARMUP-APP-V001'
    }
  };

  // debug("URL", TOKEN_URL, "HEADER", HEADER, "body", body);
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
        console.error("Error: _generate_access_token", err);
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
        // debug("Response ", response.body, json.response.token);
        WarmupAccessToken = json.response.token;
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
  WarmupAccessToken = response.json()['response']['token']
  return true
  */
}

function _getLocations(callback) {
  // retrieve location ID that corrresponds to this._location_name
  // make sure we have an accessToken
  if (!WarmupAccessToken) {
    console.error("Missing access token.");
    callback(new Error("Missing access token."));
  }
  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "getLocations"
    }
  };

  // debug("_getLocations: URL", TOKEN_URL, "HEADER", HEADER, "body", body);
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
        console.error("Error: _generate_access_token", err);
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
        // debug("Response", JSON.stringify(json, null, 4), json.response.locations[0].id);
        LocId = json.response.locations[0].id;
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
    this.LocId = loc['id']
  debug(
    "Successfully fetched location ID %s for location '%s'",
    this.LocId, this._location_name)
  break
  if this.LocId is null:
    return false
  return true
  */
}

/*
var body = {
  "account": {
    "email": this._username,
    "token": WarmupAccessToken
  },
  "request": {
    "method": "setProgramme",
    "roomId": roomId,
    "roomMode": "fixed",
    "fixed": {
      "fixedTemp": parseInt(value * 10)
    }
  }
};
*/

Warmup4IE.prototype.setTargetTemperature = function(roomId, value, callback) {
  // method: "setOverride", rooms: ["$device.deviceNetworkId"], type: 3, temp: getBoostTempValue(), until: getBoostEndTime()
  var oldDateObj = new Date();
  var today = new Date(oldDateObj.getTime() + this._duration * 60000);
  var until = ("00" + today.getHours()).slice(-2) + ":" + ("00" + today.getMinutes()).slice(-2);
  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "setOverride",
      "rooms": [roomId],
      "type": 3,
      "temp": parseInt(value * 10),
      "until": until
    }
  };
  // {"runMode":"override","overrideTemp":190,"overrideDur":9999}
  debug("setTargetTemperature", JSON.stringify(body));
  this.room[roomId] = null; // clear cache
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
        // LocId = json.response.locations[0].id;
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


Warmup4IE.prototype.setRoomAuto = function(roomId, callback) {
  // set device to automatic mode
  // make sure the room/device is already configured
  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "setProgramme",
      "roomId": roomId,
      "roomMode": "prog"
    }
  };

  this.room[roomId] = null; // clear cache
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
        console.error("Error: setRoomAuto", err);
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
        // LocId = json.response.locations[0].id;
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

Warmup4IE.prototype.setRoomOverRide = function(roomId, callback) {
  // set device to manual mode
  // make sure the room/device is already configured

  // method: "setOverride", rooms: ["$device.deviceNetworkId"], type: 3, temp: getBoostTempValue(), until: getBoostEndTime()

  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "setProgramme",
      "roomId": roomId,
      "roomMode": "override"
    }
  };

  // debug("setRoomOn", JSON.stringify(body));
  this.room[roomId] = null; // clear cache
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
        console.error("Error: setRoomOn", err);
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
        // LocId = json.response.locations[0].id;
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

Warmup4IE.prototype.setRoomFixed = function(roomId, callback) {
  // set device to manual mode
  // make sure the room/device is already configured

  // method: "setOverride", rooms: ["$device.deviceNetworkId"], type: 3, temp: getBoostTempValue(), until: getBoostEndTime()

  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "setProgramme",
      "roomId": roomId,
      "roomMode": "fixed"
    }
  };

  // debug("setRoomOn", JSON.stringify(body));
  this.room[roomId] = null; // clear cache
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
        console.error("Error: setRoomOn", err);
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
        // LocId = json.response.locations[0].id;
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
  // make sure the room/device is already configured
  if this.LocId is null or WarmupAccessToken is null:
    return
  body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "setModes",
      "values": {
        "holEnd": "-",
        "fixedTemp": "",
        "holStart": "-",
        "geoMode": "0",
        "holTemp": "-",
        "locId": this.LocId,
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

Warmup4IE.prototype.setRoomOff = function(roomId, callback) {
  //  turn off device
  // make sure the room/device is already configured
  var body = {
    "account": {
      "email": this._username,
      "token": WarmupAccessToken
    },
    "request": {
      "method": "setModes",
      "values": {
        "holEnd": "-",
        "fixedTemp": "",
        "holStart": "-",
        "geoMode": "0",
        "holTemp": "-",
        "locId": LocId,
        "locMode": "off"
      }
    }
  };

  // debug("setRoomOff", JSON.stringify(body));
  this.room[roomId] = null; // clear cache
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
        console.error("Error: setRoomOff", err);
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
        // LocId = json.response.locations[0].id;
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

Sample response from a room

{
    "roomId": 68345,
    "roomName": "Ensuite",    --> name
    "isOwner": true,
    "roomType": "a",
    "roomMode": "program",
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
    "mainRoom": true,
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
