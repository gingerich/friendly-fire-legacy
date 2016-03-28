
/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var User = mongoose.model('User');
var JwtBearerStrategy = require('passport-http-jwt-bearer').Strategy;

var config = require('config');

/**
 * Expose
 */

module.exports = new JwtBearerStrategy(
    config.jwtSecret,
    /* { options }, */
    function(token, done) {
        User.findOne({ email: token.sub }).exec()
        .then(function(user) {
            if (!user) return done(null, false);
            done(null, user, { scope: 'all' });
        })
        .catch(done);
    }
);
