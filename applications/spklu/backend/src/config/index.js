/**
 * Configuration barrel export
 * Central export point for all configuration files
 */

const constants = require('./constants');
const database = require('../configs/database');
const postgre = require('../configs/postgre');
const doku = require('../configs/doku');

module.exports = {
  constants,
  database,
  postgre,
  doku
};