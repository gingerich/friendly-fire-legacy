var config = require('config');
var redis = require('redis'),
    _ = require('lodash'),
    Promise = require('bluebird');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

var APP_PREFIX = 'friendlyfire:';
var GEOLOCATION_KEY = APP_PREFIX + 'user.geolocations';

var GEOLOCATION_HISTORY_LENGTH = 99;

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
        this['_' + method] = this.client[method + 'Async'].bind(this.client, GEOLOCATION_KEY);
    }, this);
};

Geo.prototype.update = function(data) {
    var locationId = this.getLocationId(data);
    var key = APP_PREFIX + 'user:' + data.user + ':geolocation.history';
    return this.client.batch()
        .geoadd(GEOLOCATION_KEY, data.lng, data.lat, locationId)
        .geohash(GEOLOCATION_KEY, locationId)
        .lpush(key, JSON.stringify({ lat: data.lat, lng: data.lng }))
        .ltrim(key, 0, GEOLOCATION_HISTORY_LENGTH)
        .execAsync().then(function(result) {
            var geohashResult = result[1];
            return geohashResult[0];
        });
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
    });
};

Geo.prototype.distance = function(loc1, loc2) {
    var args = [loc1, loc2].map(this.getLocationId);
    return this._geodist(args, 'm');
};

Geo.prototype.geohash = function(locations) {
    var args = _.map(arguments, this.getLocationId);
    return this._geohash(args).then(function(items) {
        return items;
    });
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

Geo.prototype.getLocationHistoryKey = function(data) {
    return 'user:' + data.user + ':geolocation.history';
};

function toPrecision(geohash, precision) {
    return geohash.slice(0, precision);
}

function getNeighbours(geohash) {
    var Geohash = require('geohash-helper/lib/geohash');
    var neighbours = {
        'n':  Geohash.calculateAdjacent(geohash, 'top'),
        'e':  Geohash.calculateAdjacent(geohash, 'right'),
        's':  Geohash.calculateAdjacent(geohash, 'bottom'),
        'w':  Geohash.calculateAdjacent(geohash, 'left'),
    };
    neighbours.ne = Geohash.calculateAdjacent(neighbours.n, 'right');
    neighbours.se = Geohash.calculateAdjacent(neighbours.s, 'right');
    neighbours.sw = Geohash.calculateAdjacent(neighbours.s, 'left');
    neighbours.nw = Geohash.calculateAdjacent(neighbours.n, 'left');
    return neighbours;
}

function getNeighboursList(geohash) {
    return _.values(getNeighbours(geohash));
}

module.exports = new Geo();
module.exports.hash = require('geohash-helper/lib/helper');
module.exports.hash.toPrecision = toPrecision;
module.exports.hash.getNeighbours = getNeighbours;
module.exports.hash.getNeighboursList = getNeighboursList;
