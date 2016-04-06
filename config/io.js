var socketioJwt = require('socketio-jwt');
var _ = require('lodash');
var Geo = require('geokit');

const GEO_ROOM_PRECISION = 7;

module.exports = function (io, config) {
  var geo = new Geo();
  var authorize = socketioJwt.authorize({
    secret: config.jwtSecret, // Buffer(config.jwtSecret, 'base64'),
    timeout: 15000 // 15 seconds to send the authentication message
  });

  // Authenticated socket.io controller
  io.on('connection', authorize)
    // without `once`, the namespaces get initiated multiple times per socket, causing duplicated message/event handling
    // This did not seem to be the case when each namespace was authenticated individually
    .once('authenticated', function (socket) {
      console.log('Authenticated: ' + socket.decoded_token.email);
      var authSocket = socket;

      io.of('/geo')
        .on('connection', function (socket) {
          socket.on('update', function (data) {
            data.user = authSocket.decoded_token._id;
            geo.store.update(data).then(function (geohash) {
              // Remove geohash precision to create geo buckets, or, "rooms"
              var geoRoom = geo.hash.toPrecision(geohash, GEO_ROOM_PRECISION); // geo.hash.encode(data.lat, data.lng, GEO_ROOM_PRECISION);
              var geoNeighbours = geo.hash.getNeighboursList(geoRoom);
              socket.geohash = geohash; // Store full geohash

              // Need to check if socket still belongs in the same room
              if (socket.geoRoom !== geoRoom) {
                var prevRooms = socket.geoRoom ? [socket.geoRoom].concat(socket.geoNeighbours) : [];
                socket.join(geoRoom);
                socket.geoRoom = geoRoom;
                socket.geoNeighbours = geoNeighbours;
                var roomsToLeave = _.difference(prevRooms, [socket.geoRoom].concat(socket.geoNeighbours));
                roomsToLeave.forEach(function (room) {
                  socket.leave(room);
                  socket.in(room).emit('outofsight', data.user);
                });
              }
              socket.broadcast.in(socket.geoRoom).emit('update', data);
              socket.geoNeighbours.forEach(function broadcastToNeighbour (geoNeighbour) {
                socket.broadcast.in(geoNeighbour).emit('update', data);
              });
            }, function (err) {
              socket.emit('update:error', err);
            });
          });

          socket.once('disconnect', function () {
            console.log('disconnected');
            var user = authSocket.decoded_token._id;
            // Notifiy everyone
            socket.broadcast.in(socket.geoRoom).emit('outofsight', user);
            if (socket.geoNeighbours) {
              socket.geoNeighbours.forEach(function broadcastToNeighbour (geoNeighbour) {
                socket.broadcast.in(geoNeighbour).emit('outofsight', user);
              });
            }
          });
        });

      io.of('/attack')
        .on('connection', function (socket) {
          socket.on('launch', function (data) {
            // geo.action.on('tick', console.log.bind(console));
            geo.action.r3().launch(data).then(function (result) {
              if (result.hit) {
                socket.emit('launch:hit', result.impact);
              } else {
                socket.emit('launch:miss', result.impact);
              }
            });
          });
        });
    });
};
