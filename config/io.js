var socketioJwt = require('socketio-jwt');
var geo = require('../app/lib/geo.js');
var _ = require('lodash');

const GEO_ROOM_PRECISION = 7;

module.exports = function(io, config) {
    var authorize = socketioJwt.authorize({
        secret: config.jwtSecret,//Buffer(config.jwtSecret, 'base64'),
        timeout: 15000, // 15 seconds to send the authentication message
    });

    var geoio = io.of('/geo')
    .on('connection', authorize)
    .on('authenticated', function(socket) {
        console.log('Authenticated: ' + socket.decoded_token.email);

        socket.on('update', function(data) {
            data.user = socket.decoded_token._id;
            geo.update(data).then(function(geohash) {
                // Remove geohash precision to create geo buckets, or, "rooms"
                var geoRoom = geo.hash.toPrecision(geohash, GEO_ROOM_PRECISION),// geo.hash.encode(data.lat, data.lng, GEO_ROOM_PRECISION);
                    geoNeighbours = geo.hash.getNeighboursList(geoRoom);
                socket.geohash = geohash;   // Store full geohash

                // Need to check if socket still belongs in the same room
                if (socket.geoRoom !== geoRoom) {
                    var prevRooms = socket.geoRoom ? [socket.geoRoom].concat(socket.geoNeighbours) : [];
                    socket.join(geoRoom);
                    socket.geoRoom = geoRoom;
                    socket.geoNeighbours = geoNeighbours;
                    var roomsToLeave = _.difference(prevRooms, [socket.geoRoom].concat(socket.geoNeighbours));
                    roomsToLeave.forEach(function(room) {
                        socket.leave(room);
                        socket.in(room).emit('outofsight', data.user);
                    });
                }
                socket.broadcast.in(socket.geoRoom).emit('update', data);
                socket.geoNeighbours.forEach(function broadcastToNeighbour(geoNeighbour) {
                    socket.broadcast.in(geoNeighbour).emit('update', data);
                });
            }, function(err) {
                socket.emit('update:error', err);
            });
        });

        socket.on('disconnect', function() {
            console.log('disconnected');
        });
    });

    io.of('/attack')
    .on('connection', function(socket) {
        socket.on('fire', function(data) {
            
        });
    });
};
