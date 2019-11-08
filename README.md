# homebridge-warmup4ie

Homebridge plugin for the WarmUP 4iE thermostat.

Plugin works with program mode only, and changes to the temperature are treated as an override.  Fixed temperature mode is not supported.  

# Table of Contents

<!--ts-->
   * [homebridge-warmup4ie](#homebridge-warmup4ie)
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
2 - Fix long running sessions
3 - Queue requests to dimplex connex

## Done



# Using the plugin

Thermostats are retrieved from the my.warmup.com site, and are automatically created in the Home App.

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
  "platform": "warmup4ie",
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
