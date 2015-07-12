/* global L */

function StationsMap(inputOptions){
    var defaultOptions = {
        url: '/stations_coordinates'
    };
    
    var options = $.extend({}, defaultOptions, inputOptions);
    
    var self = this;
    
    //Init map:
    var map = L.map('map').setView([41.6516913, -0.8949809], 12);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    $.ajax({
        url: options.url,
        timeout: 60 * 1000,//60 seconds
        type: 'GET',
        dataType: 'JSON',
        success: function(stations){
            console.log(stations);
            if(!stations || !stations.length){
                return;
            }
            
            for (var i = 0, max = stations.length; i < max; i++) {
                var station = stations[i];
                
                L.marker([station.coord1, station.coord2]).addTo(map)
                    .bindPopup(station.name)
                    .openPopup();
            }
        }
    });
    
    return self;
}