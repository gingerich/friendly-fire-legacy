var GeoStore = require('geostore');
var GeoAction = require('geoaction');

function GeoKit (redis) {
  this.store = new GeoStore(redis);
  this.action = new GeoAction(this.store);
  this.hash = require('geohash');
}

GeoKit.prototype.geoaction = function () {
  return new GeoAction(this.store);
};

exports = module.exports = GeoKit;

// Expose constructors
exports.GeoStore = GeoStore;
exports.GeoAction = GeoAction;
