var config = require('config');
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
    ['geoadd', 'geopos', 'geodist', 'georadius', 'georadiusbymember']
    .forEach(function(method) {
        this['_' + method] = this.client[method + 'Async'].bind(this.client, LOCATION_KEY);
    }, this);
};

Geo.prototype.update = function(data) {
    var locationId = this.getLocationId(data);
    return this._geoadd(data.lng, data.lat, locationId);
};

Geo.prototype.get = function(locations) {
    var locationIds = _.map(arguments, this.getLocationId);
    return this._geopos(locationIds).then(function(items) {
        var results = _.map(items, function(item, index) {
            return {
                id: locationIds[index],
                geo: item,
            };
        });
        return results;
    });;
};

Geo.prototype.distance = function(loc1, loc2) {
    var args = [loc1, loc2].map(this.getLocationId);
    return this._geodist(args, 'm');
};

Geo.prototype.near = function(query) {
    _.defaults(query, { radius: 1000, unit: 'm' });
    var arg, method;
    if (query.user) {
        args = [this.getLocationId(query)];
        method = '_georadiusbymember';
    } else {
        args = [query.lng, query.lat];
        method = '_georadius';
    }
    args.push(query.radius, query.unit, 'WITHDIST', 'WITHCOORD', 'ASC');
    args.push('COUNT', query.count || 25);
    return this[method](args).then(function(items) {
        var results = _.map(items, function(item) {
            return {
                id: item[0],
                distance: item[1],
                geo: item[2],
            };
        });
        return results;
    });
};

Geo.prototype.getLocationId = function(data) {
    return 'user:' + data.user;
};

module.exports = new Geo();
