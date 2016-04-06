var _ = require('lodash');
var Geohash = require('geohash-helper/lib/geohash');

function toPrecision (geohash, precision) {
  return geohash.slice(0, precision);
}

function getNeighbours (geohash) {
  var neighbours = {
    'n': Geohash.calculateAdjacent(geohash, 'top'),
    'e': Geohash.calculateAdjacent(geohash, 'right'),
    's': Geohash.calculateAdjacent(geohash, 'bottom'),
    'w': Geohash.calculateAdjacent(geohash, 'left')
  };
  neighbours.ne = Geohash.calculateAdjacent(neighbours.n, 'right');
  neighbours.se = Geohash.calculateAdjacent(neighbours.s, 'right');
  neighbours.sw = Geohash.calculateAdjacent(neighbours.s, 'left');
  neighbours.nw = Geohash.calculateAdjacent(neighbours.n, 'left');
  return neighbours;
}

function getNeighboursList (geohash) {
  return _.values(getNeighbours(geohash));
}

module.exports = require('geohash-helper/lib/helper');
module.exports.toPrecision = toPrecision;
module.exports.getNeighbours = getNeighbours;
module.exports.getNeighboursList = getNeighboursList;
