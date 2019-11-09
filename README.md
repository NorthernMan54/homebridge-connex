# homebridge-connex

Homebridge plugin for the [Dimplex Connex WiFi thermostat](https://www.dimplex.com/en/electric_heating/thermostats_controls/products/cxwifi/connex_sup_r_sup_wifi_multizone_programmable_controller).

# Table of Contents

<!--ts-->
   * [homebridge-connex](#homebridge-connex)
   * [Table of Contents](#table-of-contents)
   * [Roadmap](#roadmap)
      * [To do](#to-do)
      * [Done](#done)
   * [Using the plugin](#using-the-plugin)
      * [Temperature Control](#temperature-control)
      * [Mode Setting](#mode-setting)
   * [Settings](#settings)
      * [Required settings](#required-settings)
      * [Optional settings](#optional-settings)
   * [Known Issues](#known-issues)

<!-- Added by: sgracey, at:  -->

<!--te-->

# Roadmap

## To do

1 - Repair connections after failure, currently need to restart
2 - Add support for multiple controllers on a single account
3 - Queue requests to dimplex connex
4 - Have 'Auto' release hold on a zone, and resume schedule
5 - Have temperature setting changes trigger a Poll

## Done

1 - Reverse engineer the interface
2 - Fix long running sessions

# Using the plugin

Thermostats are retrieved from the dimplex connex site, and are automatically created in the Home App.

## Temperature Control

Changes to the temperature create a temperature override for the current setting.

## Mode Setting

`Off` - Turns the temperature setting of the zone to 0
`Heat` - Changes the temperature setting of the zone to defaultTemp ( Default is 18 Celsius).  See defaultTemp optional setting

# Settings

```
"platforms": [{
  "platform": "connex",
  "username": "XXXXXXXXXXXX",
  "password": "XXXXXXXXXXXX"
}]
```

## Required settings

* `username` - Your Connex Dimplex email address / login
* `password` - Your Connex Dimplex password

## Optional settings

* `defaultTemp` - Default temperature in Celsius to set a zone to when turning on ( Defaults to 18 Celsius)
* `refresh` - Data polling interval in seconds, defaults to 60 seconds

# Known Issues

1 - Does not support multiple dimplex connex wifi thermostats on a single account ( I don't have the ability to test ).  If you have  multiple dimplex connex wifi thermostats, and have the time to work with me to get it working, please let me know.
