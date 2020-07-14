var map             = null;
var Planes          = {}; // key-value pair consisting of key(Plane ICAO): value(PlaneObject)
var PlanesOnMap     = 0;
var PlanesOnTable   = 0; // currently unused
var PlanesToReap    = 0;
var SelectedPlane   = null; // currently unused
var SpecialSquawk   = false;
var data_url        = 'dump1090/geodata.json';

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
                    /** this Object.assign thingy is modifying properties like
                     * plane.altitude/trackline/trackdata and it's messing
                     * w/ my vibe (and the lines on the map!) so
                     * we're just gonna make sure that the data is reset here.
                     *
                     * The better way to do this would be to create a
                     * planeObject constructor, so we can initalize it that way,
                     * but it's not super important right now
                     **/
                    plane.altitude = null;
                    plane.trackline = [];
                    plane.trackdata = [];
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
    map.on('load', function() {
        // Add zoom and rotation controls to the map.
        map.addControl(new mapboxgl.NavigationControl());
        // Disable rotation, otherwise the icons behave in ~mysterious~ ways.
        map.dragRotate.disable();

        window.setInterval(function() {
            fetchData();
            reaper();
        }, 1000);
    });
}

// This looks for planes to reap out of the master Planes variable
function reaper() {
    PlanesToReap = 0;
    // When did the reaper start?
    reaptime = new Date().getTime();
    // Loop the planes
    for (var reap in Planes) {
        // Is this plane possibly reapable?
        if (Planes[reap].reapable == true) {
            // Has it not been seen for 5 minutes?
            // This way we still have it if it returns before then
            // due to loss of signal or other reasons
            if ((reaptime - Planes[reap].updated) > 300000) {
                // Reap it
                if (map.getSource(Planes[reap].sourceID)) {
                    map.removeSource(Planes[reap].sourceID);
                }
                delete Planes[reap];
            }
            PlanesToReap++
        }
    }
}
