/*jslint node: true */
'use strict';

var debug = require('debug')('connex');
var os = require("os");
var hostname = os.hostname();
var Connex = require('./lib/connex.js').connex;
// var inherits = require('util').inherits;

var Accessory, Service, Characteristic, UUIDGen;
var myAccessories = [];
var thermostats;

module.exports = function(homebridge) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform("homebridge-connex", "connex", connexPlatform);
};

function connexPlatform(log, config, api) {
  this.username = config['username'];
  this.password = config['password'];
  this.refresh = config['refresh'] || 60; // Update every minute
  this.defaultTemp = config['defaultTemp'] || 18; // default to 18
  this.log = log;
  if (api) {
    this.api = api;
    this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  }
}

connexPlatform.prototype.didFinishLaunching = function() {
  this.log("didFinishLaunching");

  thermostats = new Connex(this, function(err, device) {
    if (!err) {
      this.log("Found %s zone(s)", Object.keys(device.zones).length);

      for (var zone in device.zones) {
        var newAccessory = new ConnexAccessory(this, device.zones[zone].name, device.zones[zone]);
      }
    }
    pollDevices.call(this);
  }.bind(this));

  setInterval(pollDevices.bind(this), this.refresh * 1000); // Poll every minute
};

function pollDevices() {
  // debug("pollDevices - thermo", thermostats);
  thermostats.poll(function(err, devices) {
    if (err) {
      this.log("ERROR: pollDevices", err, devices);
    }
    // this.log("pollDevices - devices", devices);
    //  if (!err) {
    myAccessories.forEach(function(accessory) {
      // thermostats.getDevices().zones.forEach(function(zone) {
      // debug("forZone", zone);
      updateStatus.call(this, accessory, devices);
    }.bind(this));
    //  } else {
    //    this.log("ERROR: pollDevices", err, devices);
    //  }
  }.bind(this));
}

/*
function getAccessory(zoneId) {
  var value;
  // debug("myAccessories", myAccessories);
  myAccessories.forEach(function(accessory) {
    // debug("getAccessory zone", JSON.stringify(accessory, null, 4), zoneId);
    if (accessory.context.zone.zone === zoneId) {
      value = accessory;
    }
  });
  return value;
}
*/

function getAccessoryByName(name) {
  var value;
  myAccessories.forEach(function(accessory) {
    // debug("getAccessoryByName zone", accessory.name, name);
    if (accessory.displayName === name) {
      value = accessory;
    }
  });
  return value;
}

function updateStatus(accessory, devices) {
  // debug("updateStatus %s", accessory.displayName, devices);
  // var accessory = getAccessory(zone.zone);
  // debug("updateStatus acc", accessory);
  var service = accessory.getService(Service.Thermostat);

  if (devices.connection_status === 'Online') {
    var zone = devices.zones[accessory.context.zone.zone];
    var targetTemperature = zone.Setpoint;
    if (service.getCharacteristic(Characteristic.TargetTemperature).value !== targetTemperature / 10) {
      debug("Updating TargetTemperature %s ==> %s", accessory.displayName, targetTemperature / 10);
    }
    service.getCharacteristic(Characteristic.TargetTemperature)
      .updateValue(Number(targetTemperature / 10));

    if (service.getCharacteristic(Characteristic.CurrentTemperature).value !== zone.CurrTemp / 10) {
      debug("Updating CurrentTemperature %s ==> %s", accessory.displayName, zone.CurrTemp / 10);
    }
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

    var TargetHeatingCoolingState = service.getCharacteristic(Characteristic.TargetHeatingCoolingState).value;
    var newMode;
    if (!zone.Hold) {
      newMode = "Auto";
      service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .updateValue(3);
    } else {
      if (service.getCharacteristic(Characteristic.TargetTemperature).value === 0) {
        newMode = "Off";
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .updateValue(0);
      } else {
        newMode = "Heat";
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .updateValue(1);
      }
    }
    if (service.getCharacteristic(Characteristic.TargetHeatingCoolingState).value !== TargetHeatingCoolingState) {
      debug("Updating MODE %s ==> %s", accessory.displayName, newMode);
    }
  } else {
    this.log("ERROR: %s Thermostat ==> %s", accessory.displayName, devices.connection_status);
    service.getCharacteristic(Characteristic.TargetTemperature)
      .updateValue(new Error("Thermostat offline"));
  }
}

// give this function all the parameters needed

function ConnexAccessory(that, name, zone) {
  this.log = that.log;
  this.name = name;
  this.zone = zone;
  // this.defaultTemp = that.defaultTemp;
  this.log_event_counter = 0;
  var uuid = UUIDGen.generate(name);

  if (!getAccessoryByName(name)) {
    this.log("Adding connex Device", name, zone);
    this.accessory = new Accessory(name, uuid, 10);

    this.accessory.log = this.log;
    this.accessory.context.zone = zone;
    this.accessory.context.defaultTemp = that.defaultTemp;

    this.accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, "connex")
      .setCharacteristic(Characteristic.SerialNumber, hostname + "-" + this.name)
      .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);
    // Thermostat Service
    //

    this.accessory.addService(Service.Thermostat, this.name);
    this.accessory
      .getService(Service.Thermostat).isPrimaryService = true;

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

    this.accessory
      .getService(Service.Thermostat)
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: [0, 1, 3]
      });

    this.accessory
      .getService(Service.Thermostat)
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('set', setTargetHeatingCooling.bind(this.accessory));

    this.accessory
      .getService(Service.Thermostat)
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minStep: 0.5,
        minValue: -0,
        maxValue: 30
      })
      .on('set', setTargetTemperature.bind(this.accessory));

    this.accessory
      .getService(Service.Thermostat)
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -100,
        maxValue: 100
      });

    this.accessory
      .getService(Service.Thermostat).getCharacteristic(Characteristic.TargetTemperature)
      .updateValue(Number(this.zone.Setpoint / 10));

    this.accessory
      .getService(Service.Thermostat).getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(Number(this.zone.CurrTemp / 10));

    if (this.accessory.getService(Service.Thermostat).getCharacteristic(Characteristic.CurrentTemperature).value > this.accessory.getService(Service.Thermostat).getCharacteristic(Characteristic.TargetTemperature).value) {
      this.accessory.getService(Service.Thermostat).getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .updateValue(0);
    } else {
      this.accessory.getService(Service.Thermostat).getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .updateValue(1);
    }

    if (!this.zone.Hold) {
      this.accessory.getService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .updateValue(3);
    } else {
      if (this.accessory.getService(Service.Thermostat).getCharacteristic(Characteristic.TargetTemperature).value === 0) {
        this.accessory.getService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .updateValue(0);
      } else {
        this.accessory.getService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .updateValue(1);
      }
    }

    that.api.registerPlatformAccessories("homebridge-connex", "connex", [this.accessory]);
    myAccessories.push(this.accessory);
  } else {
    this.log("Existing connex accessory", name);
  }
}

// inherits(Accessory);

ConnexAccessory.prototype = {

};

function setTargetTemperature(value, callback) {
  this.log("Setting target temperature for", this.displayName, "to", value + "°");
  thermostats.setTargetTemperature(this, value, function(err) {
    pollDevices.call(this);
    callback(err);
  }.bind(this));
}

function setTargetHeatingCooling(value, callback) {
  this.log("Setting MODE switch for", this.displayName, "to", value);
  switch (value) {
    case 0: // Off
      thermostats.setTargetTemperature(this, 0, function(err) {
        if (!err) {
          thermostats.setHold(this, 1, function(err) {
            pollDevices.call(this);
            callback(err);
          }.bind(this));
        } else {
          pollDevices.call(this);
          callback(err);
        }
      }.bind(this));
      break;
    case 1: // Heat
      // ConnexAccessory.prototype.setTargetTemperature.call(this, this.defaultTemp, callback);
      thermostats.setTargetTemperature(this, this.context.defaultTemp, function(err) {
        if (!err) {
          thermostats.setHold(this, 1, function(err) {
            pollDevices.call(this);
            callback(err);
          }.bind(this));
        } else {
          pollDevices.call(this);
          callback(err);
        }
      }.bind(this));
      break;
    case 3: // Heat
      thermostats.setHold(this, 0, function(err) {
        pollDevices.call(this);
        callback(err);
      }.bind(this));
      break;
  }
}

connexPlatform.prototype.configureAccessory = function(accessory) {
  this.log("configureAccessory %s", accessory.displayName);

  accessory.context.defaultTemp = this.defaultTemp;

  if (accessory.getService(Service.Thermostat)) {
    accessory.log = this.log;
    accessory
      .getService(Service.Thermostat)
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('set', setTargetHeatingCooling.bind(accessory));

    accessory
      .getService(Service.Thermostat)
      .getCharacteristic(Characteristic.TargetTemperature)
      .on('set', setTargetTemperature.bind(accessory));
  }

  myAccessories.push(accessory);
};
