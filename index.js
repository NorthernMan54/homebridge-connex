/*jslint node: true */
'use strict';

var debug = require('debug')('connex');
var Service, Characteristic, FakeGatoHistoryService, CustomCharacteristic;
var os = require("os");
var hostname = os.hostname();
var connex = require('./lib/connex.js').connex;
const moment = require('moment');

var myAccessories = [];
var storage, thermostats;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  CustomCharacteristic = require('./lib/CustomCharacteristic.js')(homebridge);
  FakeGatoHistoryService = require('fakegato-history')(homebridge);

  homebridge.registerPlatform("homebridge-connex", "connex", connexPlatform);
};

function connexPlatform(log, config, api) {
  this.username = config['username'];
  this.password = config['password'];
  this.refresh = config['refresh'] || 60; // Update every minute
  this.duration = config['duration'] || 60; // duration in minutes
  this.log = log;
  storage = config['storage'] || "fs";

  /*
    if (api) {
      this.api = api;
      this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    }
    */
}

connexPlatform.prototype = {
  accessories: function(callback) {
    this.log("Logging into connex...");
    // debug("zones", this);
    thermostats = new connex(this, function(err, device) {
      if (!err) {
        this.log("Found %s zone(s)", device.zones);

        for (var zone in device.zones) {
          // this.log("Adding", zone);
          if (zone === "Z1") {
            var newAccessory = new connexAccessory(this, device.zones[zone].name, device.zones[zone]);
            // myAccessories[zone.zoneId] = newAccessory;
            myAccessories.push(newAccessory);
          }

        };
        debug("myAccessories", myAccessories);
        callback(myAccessories);
      }
      // pollDevices.call(this);
    }.bind(this));

    setInterval(pollDevices.bind(this), this.refresh * 1000); // Poll every minute
  }
};

function pollDevices() {
  // debug("pollDevices", thermostats);
  thermostats.zone.forEach(function(zone) {
    // debug("zone", zone);
    if (zone) {
      updateStatus(zone);
    }
  });
}

function getAccessory(accessories, zoneId) {
  var value;
  accessories.forEach(function(accessory) {
    // debug("zone", accessory.zone.zoneId, zoneId);
    if (accessory.zone.zoneId === zoneId) {
      value = accessory;
    }
  });
  return value;
}

function updateStatus(zone) {
  debug("updateStatus %s", zone.zoneId);
  var acc = getAccessory(myAccessories, zone.zoneId);
  // debug("acc", acc);
  var service = acc.thermostatService;

  var targetTemperature = (zone.targetTemp > zone.minTemp ? zone.targetTemp : zone.minTemp);
  service.getCharacteristic(Characteristic.TargetTemperature)
    .updateValue(Number(targetTemperature / 10));

  service.getCharacteristic(Characteristic.CurrentTemperature)
    .updateValue(Number(zone.currentTemp / 10));

  var currentHeatingCoolingState;
  switch (zone.runMode) {
    case "off":
      currentHeatingCoolingState = 0;
      break;
    default:
    case "fixed": // Heat
    case "override": // Heat
    case "schedule":
      if (zone.currentTemp < zone.targetTemp) {
        currentHeatingCoolingState = 1;
      } else {
        currentHeatingCoolingState = 0;
      }
      break;
  }

  service.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .updateValue(currentHeatingCoolingState);

  var targetHeatingCoolingState;
  switch (zone.runMode) {
    case "off":
      targetHeatingCoolingState = 0;
      break;
    default:
    case "fixed": // Heat
    case "override": // Heat
      targetHeatingCoolingState = 1;
      break;
    case "schedule":
      targetHeatingCoolingState = 3;
      break;
  }

  service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .updateValue(targetHeatingCoolingState);

  acc.log_event_counter++;
  if (!(acc.log_event_counter % 10)) {
    acc.loggingService.addEntry({
      time: moment().unix(),
      currentTemp: service.getCharacteristic(Characteristic.CurrentTemperature).value,
      setTemp: service.getCharacteristic(Characteristic.TargetTemperature).value,
      valvePosition: service.getCharacteristic(Characteristic.TargetHeatingCoolingState).value
    });
    acc.log_event_counter = 0;
  }

}

// give this function all the parameters needed

function connexAccessory(that, name, zone) {
  this.log = that.log;
  this.log("Adding connex Device", name);
  this.name = name;
  this.zone = zone;
  this.log_event_counter = 0;
}

connexAccessory.prototype = {

  setTargetHeatingCooling: function(value, callback) {
    this.log("Setting system switch for", this.name, "to", value);
    switch (value) {
      case 0: // Off
        thermostats.setzoneOff(this.zoneId, callback);
        break;
      case 1: // Heat
        if (this.zone.runMode === "fixed" || this.zone.runMode === "override") {
          callback(null);
        } else {
          thermostats.setzoneAuto(this.zoneId, callback);
        }
        break;
      case 3: // Auto
        thermostats.setzoneAuto(this.zoneId, callback);
        break;
    }
  },

  setTargetTemperature: function(value, callback) {
    this.log("Setting target temperature for", this.name, "to", value + "°");
    thermostats.setTargetTemperature(this.zoneId, value, callback);
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
        this.thermostatService
          .getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .setProps({
            validValues: [0, 1, 3]
          });
    *
    //    this.thermostatService
    //      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
    //      .on('set', this.setTargetHeatingCooling.bind(this));

        this.thermostatService
          .getCharacteristic(Characteristic.TargetTemperature)
          .on('set', this.setTargetTemperature.bind(this));

        this.thermostatService
          .getCharacteristic(Characteristic.TargetTemperature)
          .setProps({
            minValue: this.zone.minTemp / 10,
            maxValue: this.zone.maxTemp / 10
          });

        this.thermostatService
          .getCharacteristic(Characteristic.CurrentTemperature)
          .setProps({
            minValue: -100,
            maxValue: 100
          });

    /*
        this.thermostatService.log = this.log;
        this.loggingService = new FakeGatoHistoryService("thermo", this.thermostatService, {
          storage: storage,
          minutes: this.refresh * 10 / 60
        });

        this.thermostatService.addCharacteristic(CustomCharacteristic.ValvePosition);
        this.thermostatService.addCharacteristic(CustomCharacteristic.ProgramCommand);
        this.thermostatService.addCharacteristic(CustomCharacteristic.ProgramData);
    */
    this.thermostatService.getCharacteristic(Characteristic.TargetTemperature)
      .updateValue(Number(this.zone.Setpoint / 10));

    debug("CurrTemp", this.zone.CurrTemp);
    this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(Number(this.zone.CurrTemp / 10));
    /*
        var currentHeatingCoolingState;
        switch (this.zone.runMode) {
          case "off":
            currentHeatingCoolingState = 0;
            break;
          default:
          case "fixed": // Heat
          case "override": // Heat
          case "schedule":
            if (this.zone.currentTemp < this.zone.targetTemp) {
              currentHeatingCoolingState = 1;
            } else {
              currentHeatingCoolingState = 0;
            }
            break;
        }
    */

    //    this.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    //      .updateValue(currentHeatingCoolingState);

    /*
        var targetHeatingCoolingState;
        switch (this.zone.runMode) {
          case "off"
            targetHeatingCoolingState = 0;
            break;
          default:
          case "fixed": // Heat
          case "override": // Heat
            targetHeatingCoolingState = 1;
            break;
          case "schedule":
            targetHeatingCoolingState = 1;
            break;
        }
    */

    //    this.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    //      .updateValue(targetHeatingCoolingState);

    debug("getServices", this.name, informationService, this.thermostatService);
    return [informationService, this.thermostatService];
  }
};
