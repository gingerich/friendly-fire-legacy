
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
var userPlugin = require('mongoose-user');
var Schema = mongoose.Schema;
var Promise = require('bluebird');
var _ = require('lodash');
var jwt = require('jsonwebtoken');
var moment = require('moment');
var config = require('../../config/config.js');

var PUBLIC_FIELDS = 'name username'.split(' ');
var TOKEN_FIELDS = '_id email hashed_password'.split(' ');

/**
 * User schema
 */

var UserSchema = new Schema({
    name: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true, sparse: true },
    hashed_password: { type: String, default: '' },
    salt: { type: String, default: '' },
    token: { type: String },
    admin: { type: Boolean, default: false },
});

/**
 * User plugin
 */

UserSchema.plugin(userPlugin, {});

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

 UserSchema.virtual('decoded_token')
.get(function() {
    var decoded = jwt.decode(this.token);
    return {
        token: this.token,
        issued_at: moment.unix(decoded.iat),
        expires_at: moment.unix(decoded.exp),
        expires_in: (decoded.exp - decoded.iat) * 1000,  // ms
        claims: decoded,
    };
});

/**
 * Methods
 */

UserSchema.method({
    public: function() {
        return _.pick(this, PUBLIC_FIELDS);
    },

    generateToken: function() {
        var profile = _.pick(this.toJSON(), TOKEN_FIELDS);
        return this.token = jwt.sign(profile, config.jwtSecret, {
            expiresIn: '7d',
            issuer: 'FriendlyFire',
            subject: this.email,
            audience: config.root_url,
        });
    },

    refreshToken: function() {
        var _this = this;
        var verify = Promise.promisify(jwt.verify);
        return verify(this.token, config.jwtSecret, {
            issuer: 'FriendlyFire',
            subject: this.email,
            audience: config.root_url,
            ignoreExpiration: true,
        }).then(function(decoded) {
            return _this.generateToken();
        });
    },
});

/**
 * Statics
 */

UserSchema.static({

});

/**
 * Register
 */

mongoose.model('User', UserSchema);
