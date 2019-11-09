# homebridge-connex

Homebridge plugin for the WarmUP 4iE thermostat.

Plugin works with program mode only, and changes to the temperature are treated as an override.  Fixed temperature mode is not supported.  

# Table of Contents

<!--ts-->
   * [homebridge-connex](#homebridge-connex)
   * [Table of Contents](#table-of-contents)
   * [Using the plugin](#using-the-plugin)
      * [Temperature Control](#temperature-control)
      * [Mode Setting](#mode-setting)
   * [Settings](#settings)
      * [Required settings](#required-settings)
      * [Optional settings](#optional-settings)

<!-- Added by: sgracey, at:  -->

<!--te-->

# Roadmap

## To do

1 - Repair connections after failure
2 - Add support for multiple controllers on a single account
3 - Queue requests to dimplex connex

## Done

1 - Reverse engineer the interface
2 - Fix long running sessions

# Known Issues

1 - Does not support multiple dimplex connex wifi thermostats on a single account ( I don't have the ability to test ).  If you have  multiple dimplex connex wifi thermostats, and have the time to work with me to get it working, please let me know.

# Using the plugin

Thermostats are retrieved from the dimplex connex site, and are automatically created in the Home App.

## Temperature Control

Changes to the temperature create a temperature override for the current setting.  Length of the override defaults to 60 Minutes ( or the duration setting).  

## Mode Setting

`Off` - Turns off the thermostat
`Heat` - Turns on the thermostat and resumes current program
`Auto` - Turns on the thermostat and resumes current program

When the thermostat is in temperature override mode, the Mode setting is set to `Heat`.  To clear the override and resume program mode, turn the mode control to `Auto`.

# Settings

```
"platforms": [{
  "platform": "connex",
  "name": "WarmUP",
  "username": "XXXXXXXXXXXX",
  "password": "XXXXXXXXXXXX"
}]
```

## Required settings

* `username` - Your My.Warmup.com email address / login
* `password` - Your My.Warmup.com password

## Optional settings

* `refresh` - Data polling interval in seconds, defaults to 60 seconds
* `storage` - Storage of chart graphing data for history graphing, either fs or googleDrive, defaults to fs
* `duration` - Duration of temperature override, defaults to 60 minutes
