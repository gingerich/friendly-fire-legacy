var config = {
  google_api_key: 'AIzaSyDDe_zOHsZnqrGpTkC4s3x4nv5FbAlXHQY',
  auth_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1NmZhMDBiZmM1MDczZWQ1MDU3Yzk5ZTIiLCJlbWFpbCI6InRlc3QyQHRlc3QuY29tIiwiaGFzaGVkX3Bhc3N3b3JkIjoiNDgyMzU5ODlmZTA4M2ZjYmNjZGY4ZjI0OTA2ZmI1YWUyZDVlMzM4NyIsImlhdCI6MTQ1OTgyNjQ2NCwiZXhwIjoxNDYwNDMxMjY0LCJhdWQiOiJsb2NhbGhvc3Q6MzAwMCIsImlzcyI6IkZyaWVuZGx5RmlyZSIsInN1YiI6InRlc3QyQHRlc3QuY29tIn0.oihIN87KoR5fNKdGHWtwkcikC1jn_tceoTwmLypqhDY',
};

function initMap () {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 7
  });

  map.addListener('click', function (e) {
    var latlng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    geoio.emit('update', latlng);
  });

  init();
}

function init () {
  window.app = (function controller () {
    var markers = {};

    function detectLocation (cb) {
      // Try HTML5 geolocation.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
          cb({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }, function () {
          handleLocationError(true);
        });
      } else {
        // Browser doesn't support Geolocation
        handleLocationError(false);
      }
    }

    function handleLocationError (browserHasGeolocation) {
      console.log(browserHasGeolocation
        ? 'Error: The Geolocation service failed.'
        : "Error: Your browser doesn't support geolocation.");
    }

    $('form[name="projectileForm"]').on('submit', function (e) {
      e.preventDefault();
      var velocity = $(this).find('input[name="velocity"]').val();
      var bearing = $(this).find('input[name="bearing"]').val();
      var angle = $(this).find('input[name="angle"]').val();
      attackio.emit('launch', {
        velocity: velocity,
        bearing: bearing,
        angle: angle,
        origin: [markers.me.getPosition().lng(), markers.me.getPosition().lat()]
      });
    });

    var markers = {};
    function addMarker (name, position) {
      markers[name] = markers[name] || new google.maps.Marker({ map: map });
      markers[name].setPosition(position);
    }

    return {
      onAuthenticated: function (socket) {
        detectLocation(function (geo) {
          socket.emit('update', geo);
          map.panTo(geo);
          map.setZoom(18);
          addMarker('me', geo);
        });
      },
      onLocationUpdate: function (data) {
        addMarker(data.user, { lng: data.lng, lat: data.lat });
      },
      removeMarker: function (userId) {
        if (!markers[userId]) return;
        markers[userId].setMap(null);
        delete markers[userId];
      },
      onTargetHit: function () { console.log('hit!'); },
      onTargetMiss: function (impact) {
        addMarker('shot', { lat: impact[1], lng: impact[0]});
      }
    };
  })();

  window.authio = (function initSocket (controller) {
    var socket = io()
      .on('connect', function () {
        socket.emit('authenticate', { token: config.auth_token });
      })
      .on('authenticated', function () {
        console.log('authenticated');
        controller.onAuthenticated(socket);
      })
      .on('unauthorized', function (err) {
        err = err.data;
        if (err.type === 'UnauthorizedError' || err.code === 'invalid_token') {
          // redirect user to login page perhaps?
          console.log("User's token has expired");
        }
      });

    window.geoio = (function initSocket (controller) {
      var socket = io('/geo')
        .on('update', controller.onLocationUpdate)
        .on('outofsight', controller.removeMarker);
      return socket;
    })(app);

    window.attackio = (function initSocket (controller) {
      var socket = io('/attack')
        .on('launch:hit', controller.onTargetHit)
        .on('launch:miss', controller.onTargetMiss);
      return socket;
    })(app);
    return socket;
  })(app);
}
