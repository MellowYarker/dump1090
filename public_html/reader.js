var map = null;
var Planes        = {}; // key-value pair consisting of key(Plane ICAO): value(PlaneObject)
var PlanesOnMap   = 0;
var PlanesOnTable = 0; // unused currently
var PlanesToReap  = 0; // unused currently
var SelectedPlane = null; // unused currently
var SpecialSquawk = false;

var data_url = 'dump1090/geodata.json';

function fetchData() {
    var data_request = new XMLHttpRequest(); // TODO: use fetch instead of XHR.
    PlanesOnMap = 0;
    SpecialSquawk = false;

    data_request.open('GET', data_url, true);
    data_request.send();
    data_request.onload = function() {
        if (this.status === 200) {
            var result = JSON.parse(this.response);
            for (var j = 0; j < result.features.length; j++) {
                // We know about this plane already
                if (Planes[result.features[j].properties.hex]) {
                    var plane = Planes[result.features[j].properties.hex]
                } else {
                    // create a new planeObject
                    var plane = Object.assign({}, planeObject);
                }

                // Set SpecialSquawk-value
                if (result.features[j].properties.squawk == '7500' || result.features[j].properties.squawk == '7600' || 
                    result.features[j].properties.squawk == '7700') {
                    SpecialSquawk = true;
                }

                // Update our plane object with the new result.
                plane.funcUpdateData(result.features[j]);

                // Copy the plane into Planes
                Planes[plane.icao] = plane;
            }
        } else {
            console.log("Failed to fetch from server!");
            data_request.abort();
            data_request = null;
        }
    } 
};

function initialize() {
    map = new mapboxgl.Map({
        container: 'map_canvas',
        style: MapStyle,
        center: [-79.3832, 43.6532],
        zoom: 9
    });
    // Add zoom and rotation controls to the map.
    map.addControl(new mapboxgl.NavigationControl());
    // Disable rotation for now, otherwise the icons behave strangely.
    map.dragRotate.disable();
    window.setInterval(function() {
        fetchData();
    }, 1000);
}
