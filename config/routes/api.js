var winston = require('winston');

module.exports = function(passport) {
    var router = require('express').Router();

    var users = require('users');
    router.route('/users')
        .post(users.create);

    router.route('/auth')
        .post(passport.authenticate('local', { session: false }), users.createToken, users.authenticated);

    /*
    * All subsequent routes require token authentication
    */
    router.use(passport.authenticate('jwt-bearer', { session: false }));

    router.route('/auth/token')
        .get(users.token)

    router.route('/auth/refresh')
        .post(users.refreshToken);

    router.param('id', users.user);
    router.route('/users/:id')
        .get(users.show);

    var search = require('search');
    router.route('/search/players')
        .get(search.players);

    /*
    * Error Handling
    */
    router.use(function(err, req, res, next) {
        winston.error(err);
        res.send(500, { error: err });
    });

    return router;
};
