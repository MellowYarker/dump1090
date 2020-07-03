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
	funcGetIcon	: function() {
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

			return {
                // anchor: new google.maps.Point(32, 32), //anchor to middle of plane.
                // rotation: this.track
            };
		},

	// TODO: Trigger actions of a selecting a plane
	funcSelectPlane	: function(selectedPlane){
			selectPlaneByHex(this.icao);
		},

	// Update the plane data that we recieve from the geoJSON response.
	funcUpdateData	: function(data){
			// So we can find out if we moved
			var oldlat 	= this.latitude;
			var oldlon	= this.longitude;
			var oldalt	= this.altitude;

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
				if (oldlat != this.latitude) {
					changeLat = true;
				}
				if (oldlon != this.longitude) {
					changeLon = true;
				}
				if (oldalt != this.altitude) {
					changeAlt = true;
				}
				// Right now we only care about lat/long, if alt is updated only, oh well
				// TODO (MILAN): if we add 3D, we will want to modify this!
				if ((changeLat == true) || (changeLon == true)) {
					this.funcAddToTrack();
					// TODO (MILAN): another line situation.
					if (this.is_selected) {
						this.line = this.funcUpdateLines();
					}
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
	funcUpdateMarker: function() {
			// if this plane is already marked, update the position
			if (this.marked) {
				this.marker.setLngLat([this.longitude, this.latitude]);
			} else {
				// create a HTML element for the marker.
				var el = document.createElement('div');
				el.className = 'marker';

				// make a new marker and add it to the map.
				this.marker = new mapboxgl.Marker(el)
					.setLngLat([this.longitude, this.latitude])
					.setPopup(new mapboxgl.Popup({ offset: 25 }) // add popups
					.setHTML('<h3>' + this.callsign.length === 0 ? this.hex : this.callsign + ' ('+ this.icao + ')' + '</h3><p>' + 'add something here' + '</p>')) // popup content 
					.addTo(map);

				this.marked = true;
			}

			this.marker.setRotation(this.track); // rotate the plane icon

				// This is so we can match icao address
				// TODO (MILAN): why was this needed? our this.marker is a mapbox marker so we can't do this.
				// this.marker.icao = this.icao;

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
