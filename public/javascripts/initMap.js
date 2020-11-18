// Callback function for the api request within maps.html
// a listener will wait for a user click and send those geo coordinates to the youtube API
function initMap() {
    let map;
    let clickCoord;
    var clickCircle = new google.maps.Circle;

    map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 41.8726, lng: 12.46736 },
    zoom: 2
    });

    // wait for a click and send details to video route
    map.addListener('click', function(mapsMouseEvent) {
        clickCoord = mapsMouseEvent.latLng.toString();
        clickCircle.setMap(null);
        clickCircle = new google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.5,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            map: map,
            center: mapsMouseEvent.latLng,
            radius: 150000
        });

        const inputTextDiv = document.getElementById("userInput");
        let inputText = inputTextDiv.value;
        let encodedInput = encodeURIComponent(inputText);

        // default query
        if(inputText == "") {inputText = "election";}

        var latLng = clickCoord.substring(1, clickCoord.length - 1).split(",");

        // change window to tweets path
        const path = `tweets?q=${encodedInput}&lat=${parseFloat(latLng[0]).toFixed(6)}&lng=${parseFloat(latLng[1].trim()).toFixed(6)}`;
        console.log("path: " + path)
        google.maps.event.clearListeners(map, 'click');
        window.location.replace(path);
    })

    // update geo-coordinate text
    map.addListener('mousemove', function(mapsMouseMoveEvent) {
        let currentMouseCoord = mapsMouseMoveEvent.latLng.toString();
        var latLng = currentMouseCoord.substring(1, currentMouseCoord.length - 1).split(",");
        currentMouseCoord = parseFloat(latLng[0]).toFixed(2) + "," + parseFloat(latLng[1].trim()).toFixed(2);

        const geoCoord = document.getElementById("geoCoordTag"); 
        geoCoord.innerText = "Geo-Coordinates: " + currentMouseCoord; 
    })

}