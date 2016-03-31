var geo = require('../lib/geo.js');

exports.geo = function (socket) {
  socket.on('update', function (data) {
    console.log(data);
    geo.update(data);
    socket.broadcast.emit('update', data);
  });

  socket.on('disconnect', function () {
    console.log('disconnected');
  });
};
