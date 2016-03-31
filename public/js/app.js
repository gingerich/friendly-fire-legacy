var config = {
    google_api_key: 'AIzaSyDDe_zOHsZnqrGpTkC4s3x4nv5FbAlXHQY',
    auth_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1NmY4YWU5M2UyYThmYTQ2NGNjMGM0MDciLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJoYXNoZWRfcGFzc3dvcmQiOiJmMTVkZTUzMzlhYjc0NGRiMjViZDkwN2UxMTVlYTViYmUyYWJiZDBkIiwiaWF0IjoxNDU5MjE5NzUwLCJleHAiOjE0NTk4MjQ1NTAsImF1ZCI6ImxvY2FsaG9zdDozMDAwIiwiaXNzIjoiRnJpZW5kbHlGaXJlIiwic3ViIjoidGVzdEB0ZXN0LmNvbSJ9.XO23WsYX1JyLDs4xzlRguGfC7novob3rjDM8hTH9YtE',
};

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: -34.397, lng: 150.644},
        zoom: 7
    });

    map.addListener('click', function(e) {
        var latlng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        geoio.emit('update', latlng);
    });
}

var app = (function controller() {
    var markers = {};

    function detectLocation(cb) {
      // Try HTML5 geolocation.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          cb({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }, function() {
          handleLocationError(true);
        });
      } else {
        // Browser doesn't support Geolocation
        handleLocationError(false);
      }
    }

    function handleLocationError(browserHasGeolocation) {
      console.log(browserHasGeolocation ?
                            'Error: The Geolocation service failed.' :
                            'Error: Your browser doesn\'t support geolocation.');
    }
    
    return {
        onAuthenticated: function(socket) {
            detectLocation(function(geo) {
                socket.emit('update', geo);
                map.panTo(geo);
                map.setZoom(18);
                // var marker = markers.me = (markers.me || new google.maps.Marker({
                //     map: map,
                //     title: 'My Location',
                // }));
                // marker.setPosition(geo);
            });
        },
        onLocationUpdate: function(data) {
            var marker = markers[data.user] = (markers[data.user] || new google.maps.Marker({ map: map }));
            marker.setPosition({ lng: data.lng, lat: data.lat });
        },
        removeMarker: function(userId) {
            if (!markers[userId]) return;
            markers[userId].setMap(null);
            delete markers[userId];
        }
    };
})();

var geoio = (function initSocket(controller) {
    var socket = io('/geo')
    .on('connect', function() {
        socket.emit('authenticate', { token: config.auth_token });
    })
    .on('authenticated', function() {
        console.log('authenticated');
        socket.on('update', controller.onLocationUpdate);
        socket.on('outofsight', controller.removeMarker);
        controller.onAuthenticated(socket);
    })
    .on('unauthorized', function(err) {
        err = err.data;
        if (err.type === "UnauthorizedError" || err.code === "invalid_token") {
            // redirect user to login page perhaps?
            console.log("User's token has expired");
        }
    });
    return socket;
})(app);
