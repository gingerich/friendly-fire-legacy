module.exports = function (passport) {
  var router = require('express').Router();

  var home = require('home');
  router.route('/')
    .get(home.index);

  return router;
};
