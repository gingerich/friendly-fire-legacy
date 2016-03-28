var config = require('../../config/config.js');
var redis = require('redis'),
    _ = require('lodash'),
    Promise = require('bluebird');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

var LOCATION_KEY = 'friendlyfire:user-locations';

function Geo() {
    if (!(this instanceof Geo)) {
        return new Geo();
    }
    this.client = redis.createClient(config.redis);
    this.client.on('error', console.error.bind(console));
    this.client.on('end', console.log.bind(console, 'Redis connection closed'));

    // Bind redis methods
    ['geoadd', 'geopos', 'georadius', 'georadiusbymember'].forEach(function(method) {
        this['_' + method] = this.client[method + 'Async'].bind(this.client, LOCATION_KEY);
    }, this);
};

Geo.prototype.update = function(data) {
    var name = this.getName(data);
    return this._geoadd(data.lon, data.lat, name).then(function(results) {
        console.log(results);
        return results;
    });;
};

Geo.prototype.get = function() {
    var locationNames = _.map(arguments, this.getName);
    return this._geopos(locationNames).then(function(results) {
        console.log(results);
        return results;
    });;
};

Geo.prototype.find = function(query) {
    _.defaults(query, { radius: 1000, unit: 'm' });
    var arg, method;
    if (query.user) {
        args = [this.getName(query)];
        method = '_georadiusbymember';
    } else {
        args = [query.lon, query.lat];
        method = '_georadius';
    }
    args.push(query.radius, query.unit, 'WITHDIST', 'WITHCOORD');
    if (query.count) {
        args.push('COUNT', query.count);
    }
    return this[method](args).then(function(results) {
        console.log(results);
        return results;
    });
};

Geo.prototype.getName = function(data) {
    return 'user:' + data.user + ':device:' + data.device;
};

module.exports = new Geo();
