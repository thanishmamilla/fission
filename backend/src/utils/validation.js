const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const db = require('../config/db');

/**
 * Validate if a table can accommodate the number of guests
 * @param {string} tableId - Table database ID
 * @param {number} guests - Number of guests
 * @returns {Promise<{isValid: boolean, error?: string, table?: object}>}
 */
const validateCapacity = async (tableId, guests) => {
  if (!guests || guests <= 0) {
    return { isValid: false, error: 'Guests count must be greater than zero' };
  }

  let table;
  if (db.isMock()) {
    const mockData = db.getMockData();
    table = mockData.tables.find((t) => t._id === tableId);
  } else {
    table = await Table.findById(tableId);
  }

  if (!table) {
    return { isValid: false, error: 'Selected table does not exist' };
  }

  if (!table.isActive) {
    return { isValid: false, error: 'Selected table is currently inactive' };
  }

  if (table.capacity < guests) {
    return {
      isValid: false,
      error: `Selected table only accommodates up to ${table.capacity} guests (you requested ${guests})`,
      table
    };
  }

  return { isValid: true, table };
};

/**
 * Check if there is an overlapping reservation for the same table at the same date & time slot
 * @param {string} tableId - Table database ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} timeSlot - Time slot string (e.g. '18:00-19:30')
 * @param {string} [excludeReservationId] - Reservation ID to ignore (for updates)
 * @returns {Promise<{isOverlapping: boolean, error?: string}>}
 */
const checkOverlap = async (tableId, date, timeSlot, excludeReservationId = null) => {
  if (db.isMock()) {
    const mockData = db.getMockData();
    const existing = mockData.reservations.find(
      (r) =>
        r.table === tableId &&
        r.date === date &&
        r.timeSlot === timeSlot &&
        r.status === 'confirmed' &&
        r._id !== excludeReservationId
    );

    if (existing) {
      return {
        isOverlapping: true,
        error: `This table is already reserved for the ${timeSlot} slot on ${date}.`
      };
    }
  } else {
    const query = {
      table: tableId,
      date,
      timeSlot,
      status: 'confirmed'
    };

    if (excludeReservationId) {
      query._id = { $ne: excludeReservationId };
    }

    const existing = await Reservation.findOne(query);
    if (existing) {
      return {
        isOverlapping: true,
        error: `This table is already reserved for the ${timeSlot} slot on ${date}.`
      };
    }
  }

  return { isOverlapping: false };
};

module.exports = {
  validateCapacity,
  checkOverlap
};
