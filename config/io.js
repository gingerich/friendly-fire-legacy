var socketioJwt = require('socketio-jwt');
var geo = require('../app/lib/geo.js');

module.exports = function(io, config) {
    var authorize = socketioJwt.authorize({
        secret: config.jwtSecret,//Buffer(config.jwtSecret, 'base64'),
        timeout: 15000, // 15 seconds to send the authentication message
    });

    io.of('/geo')
    .on('connection', authorize)
    .on('authenticated', function(socket) {
        console.log('Authenticated: ' + socket.decoded_token.email);

        socket.on('update', function(data) {
            console.log(data);
            data.user = socket.decoded_token._id;
            geo.update(data).then(function() {
                socket.broadcast.emit('update', data);
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
