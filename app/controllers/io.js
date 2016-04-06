var geo = require('geokit');

exports.geo = function (socket) {
  socket.on('update', function (data) {
    console.log(data);
    geo.store.update(data);
    socket.broadcast.emit('update', data);
  });

  socket.on('disconnect', function () {
    console.log('disconnected');
  });
};
