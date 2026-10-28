/**
 * Date and time utilities
 * Helper functions for date manipulation
 */

/**
 * Get current date in Jakarta timezone
 */
const now = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date;
};

/**
 * Format date to ISO string in Jakarta timezone
 */
const toISOString = (date = new Date()) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString();
};

/**
 * Add minutes to date
 */
const addMinutes = (date, minutes) => {
  return new Date(date.getTime() + minutes * 60000);
};

/**
 * Add hours to date
 */
const addHours = (date, hours) => {
  return new Date(date.getTime() + hours * 3600000);
};

/**
 * Add days to date
 */
const addDays = (date, days) => {
  return new Date(date.getTime() + days * 86400000);
};

/**
 * Check if date is expired
 */
const isExpired = (date) => {
  return new Date(date) < new Date();
};

/**
 * Get difference in minutes
 */
const diffMinutes = (date1, date2) => {
  return Math.floor((date2 - date1) / 60000);
};

/**
 * Get difference in hours
 */
const diffHours = (date1, date2) => {
  return Math.floor((date2 - date1) / 3600000);
};

/**
 * Format date to Indonesian format
 */
const formatIndonesian = (date) => {
  const d = new Date(date);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
};

/**
 * Parse timestamp to Date object
 */
const parseTimestamp = (timestamp) => {
  return new Date(parseInt(timestamp));
};

module.exports = {
  now,
  toISOString,
  addMinutes,
  addHours,
  addDays,
  isExpired,
  diffMinutes,
  diffHours,
  formatIndonesian,
  parseTimestamp
};