var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utils = require('utils');
var _ = require('lodash');

const HIT_RADIUS_METERS = 3;

function GeoAction (geostore) {
  if (!(this instanceof GeoAction)) {
    return new GeoAction(geostore);
  }
  this.geostore = geostore;
  this.r = new R3();
}

util.inherits(GeoAction, EventEmitter);

GeoAction.prototype.r3 = function () {
  this.r = new R3();
  return this;
};

GeoAction.prototype.launch = function (options, simulate) {
  var _this = this;
  var p;
  if (simulate) {
    var sim = this.r.projectile(options).simulator();
    sim.on('tick', this.emit.bind(this, 'tick'));
    p = utils.promisify(sim.on.bind(sim, 'end'));
    sim.start();
  } else {
    var impact = this.r.projectile(options).getImpactSite();
    p = Promise.resolve(impact);
  }
  return p.then(function (impact) {
    return _this.geostore.near({
      lng: impact[0],
      lat: impact[1],
      radius: HIT_RADIUS_METERS,
      unit: 'm'
    });
  }).then(function (results) {
    return {
      impact: impact,
      hit: !!results.length
    };
  });
};

function R3 () {
  this.g = 9.80665; // Gravitational acceleration (m/s^2)
  this.height = 1.5; // Height in meters from which actions are initiated
}

/*
* origin: lat,lng from which the trajctory originated
* velocity: initial velocity of the projectile
* bearing: (0, 360] degrees east of magnetic north of the trajectory
* [angle]: (-90, 90] vertical degrees from level at which the trajectory initiated
*/
R3.prototype.toVector = function (velocity, bearing, angle) {
  var rBearing = deg2Rad(bearing);
  var rAngle = deg2Rad(angle || 0);
  var vXY = Math.cos(rAngle) * velocity;
  var vX = Math.sin(rBearing) * vXY;
  var vY = Math.cos(rBearing) * vXY;
  var vZ = Math.sin(rAngle) * velocity;
  return [vX, vY, vZ];
};

R3.prototype.projectile = function (opts) {
  opts = _.defaults(opts, {
    origin: [0, 0],
    initialHeight: 1.5, // Default launch height (meters)
    velocity: 0,
    bearing: 0,
    angle: 0
  });
  opts.r3 = this;
  return new Projectile(opts);
};

function Projectile (options) {
  if (!(this instanceof Projectile)) {
    return new Projectile(options);
  }
  this.r3 = options.r3;
  this.originLatLng = options.origin;
  this.originHeight = options.initialHeight;
  this.vector = this.r3.toVector(options.velocity, options.bearing, options.angle);
}

Projectile.prototype.getImpactSite = function () {
  var originLng = this.originLatLng[0];
  var originLat = this.originLatLng[1];
  var t = Math.max(0, (2 / this.r3.g) * this.vector[2]); // Flight time when projectile reaches original height
  var vZ = Math.abs(this.vector[2] - (this.r3.g * t)); // Descent velocity at height of launch
  var t2 = Math.max.apply(null, quadraticRoots(this.r3.g / 2, vZ, -this.originHeight)); // Time to ground after time t
  var tD = t + t2; // Total flight time
  var dX = this.vector[0] * tD; // Max distance in x direction
  var dY = this.vector[1] * tD; // Max distance in y direction
  var lng = originLng + metersToLng(dX, originLat);
  var lat = originLat + metersToLat(dY, originLat);
  return [lng, lat];
};

Projectile.prototype.simulator = function () {
  return new Simulator(this);
};

function Simulator (projectile) {
  if (!(this instanceof Simulator)) {
    return new Simulator(projectile);
  }
  this.projectile = projectile;
  this.g = this.projectile.r3.g;
  this.relativeZ = this.projectile.originHeight;
  this.position = [0, 0, projectile.originHeight];
  this.t = 0;
}

util.inherits(Simulator, EventEmitter);

Simulator.prototype.getState = function () {
  return {
    t: this.t,
    x: this.position[0],
    y: this.position[1],
    z: this.position[2]
  };
};

Simulator.prototype.start = function () {
  var FLIGHT_TIMEOUT = 100; // seconds
  function tick (t) {
    this.position[0] = this.projectile.vector[0] * t;
    this.position[1] = this.projectile.vector[1] * t;
    this.position[2] = (this.projectile.vector[2] * t) - ((this.g * Math.pow(t, 2)) / 2);
    this.position[2] += this.relativeZ;
    if (this.position[2] <= 0 || t > FLIGHT_TIMEOUT) {
      return this.emit('end', this.getState());
    }
    // Emit displacement in all 3 dimensions
    this.emit('tick', this.getState());
    setTimeout(tick.bind(this), 1000, ++this.t);
  }
  this.emit('start', this.getState());
  setTimeout(tick.bind(this), 1000, ++this.t);
};

function deg2Rad (angle) {
  return angle * (Math.PI / 180);
}

function rad2Deg (angle) {
  return angle * (180 / Math.PI);
}

function metersToLat (d, lat) {
  function latitudeMetersAtLat (lat) {
    var m1 = 111132.92; // latitude calculation term 1
    var m2 = -559.82; // latitude calculation term 2
    var m3 = 1.175; // latitude calculation term 3
    var m4 = -0.0023; // latitude calculation term 4
    lat = deg2Rad(lat);

    // Calculate the length of a degree of latitude in meters
    return m1 + (m2 * Math.cos(2 * lat)) + (m3 * Math.cos(4 * lat)) + (m4 * Math.cos(6 * lat));
  }
  return d / latitudeMetersAtLat(lat);
}

function metersToLng (d, lat) {
  function longitudeMetersAtLat (lat) {
    var p1 = 111412.84; // longitude calculation term 1
    var p2 = -93.5; // longitude calculation term 2
    var p3 = 0.118; // longitude calculation term 3
    lat = deg2Rad(lat);

    // Calculate the length of a degree of longitude in meters
    return (p1 * Math.cos(lat)) + (p2 * Math.cos(3 * lat)) + (p3 * Math.cos(5 * lat));
  }
  return d / longitudeMetersAtLat(lat);
}

function quadraticRoots (a, b, c) {
  var term = Math.sqrt((b * b) - (4 * a * c));
  var x1 = (term - b) / (2 * a);
  var x2 = (-b - term) / (2 * a);
  // x1=-b/2/a+Math.pow(Math.pow(b,2)-4*a*c,0.5)/2/a;
  // x2=-b/2/a-Math.pow(Math.pow(b,2)-4*a*c,0.5)/2/a;
  return [x1, x2];
}

module.exports = GeoAction;
module.exports.R3 = R3;
