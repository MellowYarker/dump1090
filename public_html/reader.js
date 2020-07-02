var Planes        = {}; // key-value pair consisting of key(Plane ICAO): value(PlaneObject)
var PlanesOnMap   = 0;
var PlanesOnTable = 0;
var PlanesToReap  = 0;
var SelectedPlane = null;
var SpecialSquawk = false;

var url = 'dump1090/geodata.json';
var request = new XMLHttpRequest();

function fetch() {
    PlanesOnMap = 0;
    SpecialSquawk = false;

    request.open('GET', url, true);
    request.send();
    request.onload = function() {
        if (this.status === 200) {
            var result = JSON.parse(this.response);
            for (var j = 0; j < result.features.length; j++) {
                // We know about this plane already
                if (Planes[result.features[j].properties.hex]) {
                    var plane = Planes[result.features[j].properties.hex]
                    console.log("Found old plane!")
                } else {
                    // create a new planeObject
                    var plane = Object.assign({}, planeObject);
                    console.log("Found new plane!")
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
        }
    } 
    /*
        
        // Set SpecialSquawk-value
        if (data[j].squawk == '7500' || data[j].squawk == '7600' || data[j].squawk == '7700') {
            SpecialSquawk = true;
        }

        // Call the function update
        plane.funcUpdateData(data[j]);
        
        // Copy the plane into Planes
        Planes[plane.icao] = plane;
    }

    PlanesOnTable = data.length;
    */
};

function initialize() {
    window.setInterval(function() {
        fetch();
    }, 1000);
}
