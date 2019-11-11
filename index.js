/*jslint node: true */
'use strict';

var debug = require('debug')('connex');
var Service, Characteristic;
var os = require("os");
var hostname = os.hostname();
var Connex = require('./lib/connex.js').connex;

var myAccessories = [];
var thermostats;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerPlatform("homebridge-connex", "connex", connexPlatform);
};

function connexPlatform(log, config, api) {
  this.username = config['username'];
  this.password = config['password'];
  this.refresh = config['refresh'] || 60; // Update every minute
  this.defaultTemp = config['defaultTemp'] || 18; // default to 18
  this.log = log;
}

connexPlatform.prototype = {
  accessories: function(callback) {
    this.log("Logging into connex...");
    // debug("zones", this);
    thermostats = new Connex(this, function(err, device) {
      if (!err) {
        this.log("Found %s zone(s)", device.zones);

        for (var zone in device.zones) {
          // this.log("Adding", zone);
          var newAccessory = new ConnexAccessory(this, device.zones[zone].name, device.zones[zone]);
          // myAccessories[zone.zoneId] = newAccessory;
          myAccessories.push(newAccessory);
        }
        // debug("myAccessories", myAccessories);
        callback(myAccessories);
      }
      pollDevices.call(this);
    }.bind(this));

    setInterval(pollDevices.bind(this), this.refresh * 1000); // Poll every minute
  }
};

function pollDevices() {
  debug("pollDevices - thermo", thermostats);
  thermostats.poll(function(err, devices) {
    // debug("pollDevices - devices", devices);
    if (!err) {
      for (var zone in devices.zones) {
        // thermostats.getDevices().zones.forEach(function(zone) {
        debug("forZone", zone);
        if (zone) {
          updateStatus(thermostats.getDevices().zones[zone]);
        }
      }
    } else {
      debug("ERROR: pollDevices", err);
    }
  });
}

function getAccessory(accessories, zoneId) {
  var value;
  accessories.forEach(function(accessory) {
    // debug("getAccessory zone", accessory.zone, zoneId);
    if (accessory.zone.zone === zoneId) {
      value = accessory;
    }
  });
  return value;
}

function updateStatus(zone) {
  debug("updateStatus %s", JSON.stringify(zone, null, 4));
  var acc = getAccessory(myAccessories, zone.zone);
  debug("updateStatus acc", acc.name);
  var service = acc.thermostatService;

  var targetTemperature = zone.Setpoint;
  service.getCharacteristic(Characteristic.TargetTemperature)
    .updateValue(Number(targetTemperature / 10));

  service.getCharacteristic(Characteristic.CurrentTemperature)
    .updateValue(Number(zone.CurrTemp / 10));

  if (service.getCharacteristic(Characteristic.CurrentTemperature).value > service.getCharacteristic(Characteristic.TargetTemperature).value) {
    service.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .updateValue(0);
  } else {
    service.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .updateValue(1);
  }

  // temp holdOn HoldOff
  //   0    Off   Auto
  //  >0   Heat   Auto

  if (!zone.Hold) {
    debug("%s TargetHeatingCoolingState = Auto", acc.name);
    service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .updateValue(3);
  } else {
    if (service.getCharacteristic(Characteristic.TargetTemperature).value === 0) {
      debug("%s TargetHeatingCoolingState = Off", acc.name);
      service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .updateValue(0);
    } else {
      debug("%s TargetHeatingCoolingState = Heat", acc.name);
      service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .updateValue(1);
    }
  }
}

// give this function all the parameters needed

function ConnexAccessory(that, name, zone) {
  this.log = that.log;
  this.log("Adding connex Device", name, zone);
  this.name = name;
  this.zone = zone;
  this.defaultTemp = that.defaultTemp;
  this.log_event_counter = 0;
}

ConnexAccessory.prototype = {

  // Off = set target temperature to 0, and place on hold
  // Heat = set target temperature to defaultTemp, and place on hold
  // Auto = remove hold

  setTargetHeatingCooling: function(value, callback) {
    this.log("Setting system switch for", this.name, "to", value);
    switch (value) {
      case 0: // Off
        debug("%s setTargetHeatingCooling ==> ", this.name, 0);
        thermostats.setTargetTemperature(this.zone, 0, function(err) {
          if (!err) {
            thermostats.setHold(this.zone, 1, function(err) {
              pollDevices.call(this);
              callback(err);
            });
          } else {
            pollDevices.call(this);
            callback(err);
          }
        }.bind(this));
        break;
      case 1: // Heat
        debug("%s setTargetHeatingCooling ==> ", this.name, value);
        // ConnexAccessory.prototype.setTargetTemperature.call(this, this.defaultTemp, callback);
        thermostats.setTargetTemperature(this.zone, this.defaultTemp, function(err) {
          if (!err) {
            thermostats.setHold(this.zone, 1, function(err) {
              pollDevices.call(this);
              callback(err);
            });
          } else {
            pollDevices.call(this);
            callback(err);
          }
        }.bind(this));
        break;
      case 3: // Heat
        debug("%s setTargetHeatingCooling ==> ", this.name, value);
        thermostats.setHold(this.zone, 0, function(err) {
          pollDevices.call(this);
          callback(err);
        });
        break;
    }
  },

  setTargetTemperature: function(value, callback) {
    this.log("Setting target temperature for", this.name, "to", value + "°");
    thermostats.setTargetTemperature(this.zone, value, function(err) {
      pollDevices.call(this);
      callback(err);
    });
  },

  getServices: function() {
    // var that = this;
    // this.log("getServices", this.name);

    // debug("getServices", this);
    // Information Service
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "connex")
      .setCharacteristic(Characteristic.SerialNumber, hostname + "-" + this.name)
      .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);
    // Thermostat Service
    //

    this.thermostatService = new Service.Thermostat(this.name);
    this.thermostatService.isPrimaryService = true;

    /*
    Describes the current state of the device
    this.addCharacteristic(Characteristic.CurrentHeatingCoolingState);
      Characteristic.CurrentHeatingCoolingState.OFF = 0;
      Characteristic.CurrentHeatingCoolingState.HEAT = 1;
      Characteristic.CurrentHeatingCoolingState.COOL = 2;
    this.addCharacteristic(Characteristic.TargetHeatingCoolingState);
      Characteristic.TargetHeatingCoolingState.OFF = 0;
      Characteristic.TargetHeatingCoolingState.HEAT = 1;
      Characteristic.TargetHeatingCoolingState.COOL = 2;
      Characteristic.TargetHeatingCoolingState.AUTO = 3;
    this.addCharacteristic(Characteristic.CurrentTemperature);
    this.addCharacteristic(Characteristic.TargetTemperature);
    this.addCharacteristic(Characteristic.TemperatureDisplayUnits);
      Characteristic.TemperatureDisplayUnits.CELSIUS = 0;
    */

    this.thermostatService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: [0, 1, 3]
      });

    this.thermostatService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('set', this.setTargetHeatingCooling.bind(this));

    this.thermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minStep: 0.5,
        minValue: -0,
        maxValue: 30
      })
      .on('set', this.setTargetTemperature.bind(this));

    this.thermostatService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -100,
        maxValue: 100
      });

    this.thermostatService.getCharacteristic(Characteristic.TargetTemperature)
      .updateValue(Number(this.zone.Setpoint / 10));

    this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(Number(this.zone.CurrTemp / 10));

    if (this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature).value > this.thermostatService.getCharacteristic(Characteristic.TargetTemperature).value) {
      this.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .updateValue(0);
    } else {
      this.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .updateValue(1);
    }

    if (!this.zone.Hold) {
      this.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .updateValue(3);
    } else {
      if (this.thermostatService.getCharacteristic(Characteristic.TargetTemperature).value === 0) {
        this.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .updateValue(0);
      } else {
        this.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .updateValue(1);
      }
    }

    return [informationService, this.thermostatService];
  }
};
