Dump1090 README
===

This software requires an RTL-SDR and an antenna, for more details, see the full Dump 1090 [README](https://github.com/MalcolmRobb/dump1090/blob/master/README.md).

This README is a largely stripped down version of the one linked above, which goes into much more depth on the dump1090 ModeS decoder. This repo is a fork of MalcolmRobb's [dump1090](https://github.com/MalcolmRobb/dump1090/) repo, effectively all changes can be found in the frontend browser client. If you want to extend dump1090's browser frontend with mapbox, then this software lays out the groundwork for you.

Changes
---
* We use Mapbox GL JS instead of Google Maps, enabling a new dimension of map customization.
  - The map's style can be changed by linking a style in `public_html/config.js`
  - You can use [Mapbox Studio](https://www.mapbox.com/mapbox-studio/) to style your maps.
  - If you're dedicated, you can replace the 2D map with a 3D map that includes [extruded buildings](https://docs.mapbox.com/mapbox-gl-js/example/3d-buildings/) and [3D models](https://docs.mapbox.com/mapbox-gl-js/example/add-3d-model/), though you'll need to find some good `.gltf` aircraft models.
* The original frontend only displays planes at their known locations, 
  whereas we animate the transition between known locations. This can be slightly buggy when an aircraft's signal is low or if the broadcast frequency is inconsistent.
* We use VueJS to display a reactive information window when a plane is selected.

Old Map
---
![alt-text-1](/media/choppy.gif "Old")

New Map
---

The gif is slightly blurry, for a more accurate representation of the  map, see the image below the gif.
![alt-text-2](/media/up.gif "New")

![alt-text-2](/media/newmap.png "Clear")

Installation
---

Type "make".

Normal usage
---
First, add your mapbox API key to `public_html/config.js`. You can modify the map style url there too.

To open the map in your browser at http://localhost:8080, run:

    ./dump1090 --interactive --net

You can also view the original google map at http://localhost:8080/gmap.html

Aggressive mode
---

With --aggressive it is possible to activate the *aggressive mode* that is a
modified version of the Mode S packet detection and decoding.
The aggresive mode uses more CPU usually (especially if there are many planes
sending DF17 packets), but can detect a few more messages.

The algorithm in aggressive mode is modified in the following ways:

* Up to two demodulation errors are tolerated (adjacent entires in the
  magnitude vector with the same eight). Normally only messages without
  errors are checked.
* It tries to fix DF17 messages with CRC errors resulting from any two bit
  errors.

The use of aggressive mode is only advised in places where there is
low traffic in order to have a chance to capture some more messages.


Testing the program
---

If you have an RTLSDR device and you happen to be in an area where there
are aircrafts flying over your head, just run the program and check for signals.

However if you don't have an RTLSDR device, or if the presence
of aircrafts is very limited, you may want to try the sample file distributed
with the Dump1090 distribution under the "testfiles" directory.

Just run it like this:

    ./dump1090 --ifile testfiles/modes1.bin

Credits
---

Dump1090 was written by Salvatore Sanfilippo <antirez@gmail.com> and is
released under the BSD three clause license.
