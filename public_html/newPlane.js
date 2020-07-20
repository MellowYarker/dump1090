var planeObject = {
    oldlat      : null,
    oldlon      : null,
    oldalt      : null,
    delta_alt   : 0,

    // Basic location information
    altitude    : null,
    speed       : null,
    track       : null,
    latitude    : null,
    longitude   : null,
    coord_change: false,

    // Info about the plane
    callsign    : null,
    squawk      : null,
    icao        : null,
    is_selected : false,

    // Data packet numbers
    messages    : null,
    seen        : null,

    // Vaild...
    vPosition   : false,
    vTrack      : false,

    // Map Details
    // marker will be an actual mapbox marker object
    marker      : null,
    marked      : false, // true if mapbox marker exists for this plane, else false
    markerColor : MarkerColor,
    line        : {
                    "type": "geojson",
                    "data": {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": []
                        },
                        "properties": {}
                    }
                },
    sourceID    : null, // name of the source + layer for geoJSON line representing plane tail
    trackdata   : [],
    trackline   : [], // coordinates for plane tail line

    // When was this last updated?
    updated     : null,
    reapable    : false,
    count_down  : 10, // decrements each time the new altitude position is the same as the old one


    // Update our planes tail line,
    // TODO: Make this multi colored based on options
    //		altitude (default) or speed
    // (milan): we can do this if we make the line an array of geoJSON objects.
    funcUpdateLines : function() {
            // update our cooridinates array
            this.line.data.geometry.coordinates = this.trackline;
            var source = map.getSource(this.sourceID);
            // either update or create the line source
            if (source) {
                source.setData(this.line.data);
            } else {
                map.addSource(this.sourceID, this.line);
            }
            if (this.is_selected) {
                vm.ascending = false;
                vm.descending = false;

                if (this.delta_alt > 150) {
                    vm.ascending  = true;
                } else if (this.delta_alt < -150){
                    vm.descending = true;
                }
            }
        },


    // Appends data to the running track so we can get a visual tail on the plane
    // Only useful for a long running browser session.
    funcAddToTrack  : function() {
            this.trackdata.push([this.longitude, this.latitude, this.altitude, this.track, this.speed]);
            this.trackline.push([this.longitude, this.latitude]);
        },


    // This is to remove the line from the screen if we deselect the plane
    funcClearLine   : function() {
            // only try to remove if a layer is found
            if (map.getLayer(this.sourceID)) {
                map.removeLayer(this.sourceID);
            }
        },


    // Closes info box and resets Vue instance.
    funcUnselectPlane: function() {
            this.is_selected = false;

            // zero out the data in the info window
            vm.view     = false;
            vm.callsign = null;
            vm.icao     = null;
            vm.altitude = null
            vm.speed    = null;
        },


    // update and display the planes tail line
    funcSelectPlane : function() {
            this.is_selected = true;
            this.funcUpdateLines();
            // add the layer to the map
            map.addLayer({
                "id"    :  	this.sourceID,
                "type"  : "line",
                "source": this.sourceID,
                "layout": {
                    "line-join" : "round",
                    "line-cap"  : "round",
                },
                "paint": {
                    "line-color"   : "#e96c51",
                    "line-width"    : 5
                }
            });

            // update Vue instance for info window
            vm.callsign = this.callsign;
            vm.icao = this.icao;
            vm.altitude = this.altitude;
            vm.speed = this.speed;
            vm.view = true; // displays the window
        },


    // Update the plane data that we recieve from the geoJSON response.
    funcUpdateData  : function(data){
            // So we can find out if we moved
            this.oldlat = this.latitude;
            this.oldlon = this.longitude;
            this.oldalt = this.altitude;

            var updateProperty  = data.properties; // property geoJSON
            var updateCoord     = data.geometry.coordinates; // coordinate geoJSON
            // Update all of our data
            this.updated    = new Date().getTime();
            this.altitude   = updateProperty.altitude;
            this.speed      = updateProperty.speed;
            this.track      = updateProperty.track;
            this.longitude  = updateCoord[0];
            this.latitude   = updateCoord[1];
            this.callsign   = updateProperty.callsign;
            this.squawk     = updateProperty.squawk;
            this.icao       = updateProperty.hex;
            this.messages   = updateProperty.messages;
            this.seen       = updateProperty.seen;

            // set the sourceID for the line
            if (!this.sourceID && this.icao) {
                this.sourceID = this.icao + "-line";
            }
            // If no packet in over 58 seconds, consider the plane reapable
            // This way we can hold it, but not show it just in case the plane comes back
            if (this.seen > 58) {
                this.reapable = true;
                if (this.marked) {
                    this.marker.remove();
                    this.marked = false;
                }
                if (map.getSource(this.sourceID)) {
                    this.line.data.geometry.coordinates = [];
                    this.trackline = [];
                    this.trackdata = [];
                    this.funcClearLine();
                }
                if (this.is_selected) {
                    this.funcUnselectPlane();
                }
            } else {
                // TODO (MILAN): is this a plane that has returned from a reaped state?
                if (this.reapable == true) {}
                this.reapable = false;
            }

            // Is the position valid?
            if ((updateProperty.validposition == 1) && (this.reapable == false)) {
                this.vPosition = true;

                // Detect if the plane has moved
                changeLat = false;
                changeLon = false;
                changeAlt = false;
                if (this.oldlat != this.latitude) {
                    changeLat = true;
                }
                if (this.oldlon != this.longitude) {
                    changeLon = true;
                }
                if (this.oldalt != this.altitude) {
                    changeAlt = true;
                }
                // Right now we only care about lat/long, if alt is updated only, oh well
                // TODO (MILAN): modify this if we add 3D or line colour that depends on alt
                if (changeLat || changeLon || changeAlt) {
                    this.coord_change = true;
                    this.funcAddToTrack();
                    this.funcUpdateLines(); // will only display change if selected

                    if (this.oldalt != null) {
                        // handle altitude change
                        if (changeAlt) {
                            this.delta_alt += this.altitude - this.oldalt; // decrease in alt decreases overall position.
                            this.count_down = 10; // reset our counter
                        } else {
                            // if unchanged for 10 messages, reset altitude point of reference
                            if (this.count_down === 0) {
                                this.delta_alt = 0;
                                this.count_down = 10;
                            } else {
                                this.count_down--;
                            }
                        }
                    }
                } else {
                    this.coord_change = false;

                }

                this.marker = this.funcUpdateMarker();
                PlanesOnMap++;
            } else {
                this.vPosition = false;
            }

            // Do we have a valid track for the plane?
            if (updateProperty.validtrack == 1)
                this.vTrack = true;
            else
                this.vTrack = false;
        },


    // Update our marker on the map
    /** We do this in 3 ways
     * 	1. 	If a marker exists but we haven't gotten an update/there is no
     * 		previous position data, just set the position.
     *
     * 2. 	If we have a new position and a previous position, we can animate
     * 		the transition between coordinates.
     *
     * 3. 	We are handling a newly discovered aircraft, so we should create
     * 		a new marker.
     */
    funcUpdateMarker: function() {
            if (this.marked && (this.oldlon === null || !this.coord_change)) {
                this.marker.setLngLat([this.longitude, this.latitude]);
            } else if (this.marked && this.coord_change) {
                // if we have 2 points, animate the transition.
                // some times looks a bit jumpy on the map due to lack of
                // coordinate updates

                // Yes, this should be a separate function, but requestAnimationFrame
                // requires 'start' to be undefined each time we restart the
                // animation.
                let start = null;
                let loop = (timestamp) => {
                    if (!start) {
                        start = timestamp;
                    }
                    const elapsed = timestamp - start;

                    let duration = 0.999; // duration of the animation in seconds, subject for review.
                    let x, y;
                    // Transition from old pos to new pos in a line.
                    // y = m(x - x_0) + y_0,   where *_0 is old position coord.

                    // position delta's
                    let del_y = Math.abs(this.oldlat) - Math.abs(this.latitude);
                    let del_x = Math.abs(this.oldlon) - Math.abs(this.longitude);

                    // x is our independent variable, we will move del_x units
                    // in duration seconds, dividing gives the change per ms.
                    // elapsed gives us the number of ms that have passed.
                    let candidate = (Math.abs(del_x) * (1/(duration * 1000))) * elapsed;

                    // slope of our transition line, we deal with the sign below
                    let m = Math.abs(del_y / del_x);

                    // If the old position is the origin of the cartesian plane,
                    // the sign of the slope is:
                    // 	 + if direction of travel is SW/NE
                    // 	 - if direction of travel is SE/NW
                    let north, south, east, west = false;

                    this.latitude > this.oldlat ? north = true : south = true;
                    this.longitude > this.oldlon ? east = true : west = true;
                    // Set the slope's sign.
                    if ((north && west) || (south && east)) {
                        m = (-1) * m
                    }

                    // We only need to determine x, since y depends on x
                    if (west) {
                        // transition right to left
                        x = Math.max(this.longitude, this.oldlon - candidate);
                    } else {
                        // transition left to right
                        x = Math.min(this.longitude, this.oldlon + candidate);
                    }

                    // occasionally may have 0*0.
                    if (isNaN(m*(x - this.oldlon))) {
                        y = this.oldlat;
                    } else {
                        y = m * (x - this.oldlon) + this.oldlat;
                    }

                    this.marker.setLngLat([x, y]); // new marker position
                    // loop for duration seconds
                    if (elapsed < duration * 1000){
                        requestAnimationFrame(loop.bind(this));
                    }
                };
                requestAnimationFrame(loop.bind(this));
            } else {
                // create a HTML element for the marker.
                var el = document.createElement('div');
                el.className = 'marker';

                // make a new marker and add it to the map.
                this.marker = new mapboxgl.Marker(el)
                    .setLngLat([this.longitude, this.latitude])
                    .addTo(map);

                this.marked = true;

                // mapbox markers are too restrictive, so we use our own
                // click handler
                el.addEventListener('click', () => {
                    if (this.is_selected === false) {
                        this.funcSelectPlane();
                    } else {
                        this.funcUnselectPlane();
                        this.funcClearLine();
                    }
                });
            }

            this.marker.setRotation(this.track); // rotate the plane icon
            return this.marker;
    }
};
