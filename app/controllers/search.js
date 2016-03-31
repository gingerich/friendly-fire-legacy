var winston = require('winston'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  geo = require('../lib/geo');

exports.players = function (req, res) {
  geo.near(req.query).then(function (data) {
    res.jsonp(data);
  })
    .catch(function (err) {
      winston.error(err);
      res.send(500, { error: err });
    });
};
