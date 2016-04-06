var config = require('config');
var redis = require('redis');
var _ = require('lodash');
var Promise = require('bluebird');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

var APP_PREFIX = 'friendlyfire:';
var GEOLOCATION_KEY = APP_PREFIX + 'user.geolocations';

var GEOLOCATION_HISTORY_LENGTH = 99;

function GeoStore () {
  if (!(this instanceof GeoStore)) {
    return new GeoStore();
  }
  this.client = redis.createClient(config.redis);
  this.client.on('error', console.error.bind(console));
  this.client.on('end', console.log.bind(console, 'Redis connection closed'));

  // Bind redis methods
  ['geoadd', 'geopos', 'geodist', 'georadius', 'georadiusbymember']
    .forEach(function (method) {
      this['_' + method] = this.client[method + 'Async'].bind(this.client, GEOLOCATION_KEY);
    }, this);
}

GeoStore.prototype.update = function (data) {
  var locationId = this.getLocationId(data);
  var key = APP_PREFIX + 'user:' + data.user + ':geolocation.history';
  return this.client.batch()
    .geoadd(GEOLOCATION_KEY, data.lng, data.lat, locationId)
    .geohash(GEOLOCATION_KEY, locationId)
    .lpush(key, JSON.stringify({ lat: data.lat, lng: data.lng }))
    .ltrim(key, 0, GEOLOCATION_HISTORY_LENGTH)
    .execAsync().then(function (result) {
      var geohashResult = result[1];
      return geohashResult[0];
    });
};

GeoStore.prototype.get = function (locations) {
  var locationIds = _.map(arguments, this.getLocationId);
  return this._geopos(locationIds).then(function (items) {
    var results = _.map(items, function (item, index) {
      return {
        id: locationIds[index],
        geo: item
      };
    });
    return results;
  });
};

GeoStore.prototype.distance = function (loc1, loc2) {
  var args = [loc1, loc2].map(this.getLocationId);
  return this._geodist(args, 'm');
};

GeoStore.prototype.geohash = function (locations) {
  var args = _.map(arguments, this.getLocationId);
  return this._geohash(args).then(function (items) {
    return items;
  });
};

GeoStore.prototype.near = function (query) {
  _.defaults(query, { radius: 1000, unit: 'm' });
  var args, method;
  if (query.user) {
    args = [this.getLocationId(query)];
    method = '_georadiusbymember';
  } else {
    args = [query.lng, query.lat];
    method = '_georadius';
  }
  args.push(query.radius, query.unit, 'WITHDIST', 'WITHCOORD', 'ASC');
  args.push('COUNT', query.count || 25);
  return this[method](args).then(function (items) {
    var results = _.map(items, function (item) {
      return {
        id: item[0],
        distance: item[1],
        geo: item[2]
      };
    });
    return results;
  });
};

GeoStore.prototype.getLocationId = function (data) {
  return 'user:' + data.user;
};

GeoStore.prototype.getLocationHistoryKey = function (data) {
  return 'user:' + data.user + ':geolocation.history';
};

module.exports = GeoStore;
