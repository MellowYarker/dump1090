var planeObject = {
	oldlat		: null,
	oldlon		: null,
	oldalt		: null,

	// Basic location information
	altitude	: null,
	speed		: null,
	track		: null,
	latitude	: null,
	longitude	: null,
	coord_change: false,

	// Info about the plane
	callsign	: null,
	squawk		: null,
	icao		: null,
	is_selected	: false,

	// Data packet numbers
	messages	: null,
	seen		: null,

	// Vaild...
	vPosition	: false,
	vTrack		: false,

	// GMap Details
	// TODO (MILAN): We can use this for mapbox too.
	/**	marker would be the actual mapbox marker object
	 *
	 */
	marker		: null,
	marked		: false, // true if mapbox marker exists for this plane, else false
	markerColor	: MarkerColor,
	lines		: [],
	trackdata	: new Array(),
	trackline	: new Array(),

	// When was this last updated?
	updated		: null,
	reapable	: false,

	// Appends data to the running track so we can get a visual tail on the plane
	// Only useful for a long running browser session.
	funcAddToTrack	: function(){
			// TODO: Write this function out
			this.trackdata.push([this.longitude, this.latitude, this.altitude, this.track, this.speed]);
			this.trackline.push(new mapboxgl.LngLat(this.longitude, this.latitude));
		},

	// This is to remove the line from the screen if we deselect the plane
	funcClearLine	: function() {
			// if (this.line) {
			// 	this.line.setMap(null);
			// 	this.line = null;
			// }
		},

	// Should create an icon for us to use on the map...
	// TODO (MILAN): do we need to do anything? Our icon is just a PNG and we can
	// 		 control the rotation when we set the icon.
	funcGetIcon		: function() {
			this.markerColor = MarkerColor;
			// If this marker is selected we should make it lighter than the rest.
			if (this.is_selected == true) {
				this.markerColor = SelectedColor;
			}

			// If we have not seen a recent update, change color
			if (this.seen > 15) {
				this.markerColor = StaleColor;
			}

			// If the squawk code is one of the international emergency codes,
			// match the info window alert color.
			if (this.squawk == 7500) {
				this.markerColor = "rgb(255, 85, 85)";
			}
			if (this.squawk == 7600) {
				this.markerColor = "rgb(0, 255, 255)";
			}
			if (this.squawk == 7700) {
				this.markerColor = "rgb(255, 255, 0)";
			}

			// If we have not overwritten color by now, an extension still could but
			// just keep on trucking.  :)

			// return {
                // anchor: new google.maps.Point(32, 32), //anchor to middle of plane.
                // rotation: this.track
            // };
		},

	// TODO: Trigger actions of a selecting a plane
	funcSelectPlane	: function(selectedPlane){
			selectPlaneByHex(this.icao);
		},

	// Update the plane data that we recieve from the geoJSON response.
	funcUpdateData	: function(data){
			// So we can find out if we moved
			this.oldlat = this.latitude;
			this.oldlon = this.longitude;
			this.oldalt = this.altitude;

			var updateProperty  = data.properties; // property geoJSON
			var updateCoord 	= data.geometry.coordinates; // coordinate geoJSON
			// Update all of our data
			this.updated	= new Date().getTime();
			this.altitude	= updateProperty.altitude;
			this.speed	= updateProperty.speed;
			this.track	= updateProperty.track;
			this.longitude	= updateCoord[0];
			this.latitude	= updateCoord[1];
			this.callsign	= updateProperty.callsign;
			this.squawk	= updateProperty.squawk;
			this.icao	= updateProperty.hex;
			this.messages	= updateProperty.messages;
			this.seen	= updateProperty.seen;

			// If no packet in over 58 seconds, consider the plane reapable
			// This way we can hold it, but not show it just in case the plane comes back
			if (this.seen > 58) {
				this.reapable = true;
				if (this.marked) {
					this.marker.remove();
					this.marked = false;
				}
				// TODO (MILAN): Come back to this when we can draw lines!
				// if (this.line) {
				// 	this.line.setMap(null);
				// 	this.line = null;
				// }
				if (SelectedPlane == this.icao) {
					if (this.is_selected) {
						this.is_selected = false;
					}
					SelectedPlane = null;
				}
			} else {
				// TODO (MILAN): this doesn't do anything, what could we have it do?
				if (this.reapable == true) {
				}
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
				// TODO (MILAN): if we add 3D, we will want to modify this!
				if ((changeLat == true) || (changeLon == true)) {
					this.coord_change = true;
					this.funcAddToTrack();
					// TODO (MILAN): another line situation.
					if (this.is_selected) {
						this.line = this.funcUpdateLines();
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
				// if we have 2 points, animate the transition
				// some times looks a bit jumpy on the map due to lack of
				// coordinate updates

				// Yes, this should be a function, but requestAnimationFrame
				// requires 'start' to be undefined each time we restart the
				// animation.
				let start = null;
				let loop = (timestamp) => {
					if (!start) {
						start = timestamp;
					}
					const elapsed = timestamp - start;

					let duration = 0.94; // duration of the animation in seconds, subject for review.
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
				// the pop up is kind of stupid, maybe we can do something cooler.
				this.marker = new mapboxgl.Marker(el)
					.setLngLat([this.longitude, this.latitude])
					.setPopup(new mapboxgl.Popup({ offset: 25 }) // add popups
					.setHTML('<h3>' + this.callsign.length === 0 ? this.hex : this.callsign + ' ('+ this.icao + ')' + '</h3><p>' + 'add something here' + '</p>')) // popup content
					.addTo(map);

				this.marked = true;
			}

			this.marker.setRotation(this.track); // rotate the plane icon

				// Trap clicks for this marker.
				// TODO (MILAN): we want to do something similar!
				// google.maps.event.addListener(this.marker, 'click', this.funcSelectPlane);
			return this.marker;
		},

	// Update our planes tail line,
	// TODO: Make this multi colored based on options
	//		altitude (default) or speed
	funcUpdateLines: function() {
			// if (this.line) {
			// 	var path = this.line.getPath();
			// 	path.push(new google.maps.LatLng(this.latitude, this.longitude));
			// } else {
			// 	this.line = new google.maps.Polyline({
			// 		strokeColor: '#000000',
			// 		strokeOpacity: 1.0,
			// 		strokeWeight: 3,
			// 		map: GoogleMap,
			// 		path: this.trackline
			// 	});
			// }
			return this.line;
		}
};
