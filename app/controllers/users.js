var winston = require('winston'),
    mongoose = require('mongoose'),
    User = mongoose.model('User');

exports.authenticated = function(req, res) {
    User.findById(req.user).exec().then(function(user) {
        if (!user) {
            return res.send(400, 'Authenticated user could not be found');
        }
        res.jsonp(req.user.decoded_token);
    })
    .catch(function(err) {
        winston.error(err);
        res.send(500, { error: err });
    });
};

exports.createToken = function(req, res, next) {
    req.user.generateToken();
    req.user.save(next);
};

exports.refreshToken = function(req, res, next) {
    req.user.refreshToken().then(function(token) {
        req.user.save(next);
    });
};

exports.token = function(req, res) {
    res.jsonp(req.user.decoded_token);
};

exports.create = function(req, res) {
    var user = new User(req.body);
    user.save().then(function(newUser) {
        res.jsonp(newUser);
    }, function(err) {
        // Detect duplicate key error
        if ([11001, 11000].indexOf(err.code) != -1) {
            res.status(400);
        } else {
            winston.error(err);
            res.status(500);
        }
        res.jsonp({ error: err });
    });
};

exports.user = function(req, res, next, id) {
    User.findById(id).exec().then(function(user) {
        if (!user) return res.send(404, 'User does not exist');
        req._user = user;
        next();
    })
    .catch(next);
};

exports.show = function(req, res) {
    res.jsonp(req._user.public());
};
