const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const User = require('../models/User');
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');
const { validateCapacity, checkOverlap } = require('../utils/validation');

// Helper to populate reservation in mock mode
const populateReservationMock = (resObj, mockData) => {
  const user = mockData.users.find((u) => u._id === resObj.user);
  const table = mockData.tables.find((t) => t._id === resObj.table);
  return {
    ...resObj,
    user: user ? { _id: user._id, name: user.name, email: user.email } : null,
    table: table ? { _id: table._id, tableNumber: table.tableNumber, capacity: table.capacity } : null
  };
};

// @desc    Get occupied table IDs for a date & time slot
// @route   GET /api/reservations/occupied
// @access  Private
router.get('/occupied', protect, async (req, res) => {
  const { date, timeSlot } = req.query;

  if (!date || !timeSlot) {
    return res.status(400).json({ success: false, error: 'Please provide date and timeSlot query params' });
  }

  try {
    if (db.isMock()) {
      const mockData = db.getMockData();
      const occupiedTables = mockData.reservations
        .filter((r) => r.date === date && r.timeSlot === timeSlot && r.status === 'confirmed')
        .map((r) => r.table);
      
      return res.json({ success: true, occupiedTableIds: occupiedTables });
    } else {
      const reservations = await Reservation.find({
        date,
        timeSlot,
        status: 'confirmed'
      }).select('table');

      const occupiedTableIds = reservations.map((r) => r.table.toString());
      return res.json({ success: true, occupiedTableIds });
    }
  } catch (error) {
    console.error('Get occupied tables error:', error);
    return res.status(500).json({ success: false, error: 'Server error checking table availability' });
  }
});

// @desc    Create a new reservation
// @route   POST /api/reservations
// @access  Private
router.post('/', protect, async (req, res) => {
  const { tableId, date, timeSlot, guests } = req.body;

  if (!tableId || !date || !timeSlot || !guests) {
    return res.status(400).json({ success: false, error: 'Please provide tableId, date, timeSlot and guests count' });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ success: false, error: 'Please provide date in YYYY-MM-DD format' });
  }

  try {
    // 1. Validate Table Capacity
    const capacityCheck = await validateCapacity(tableId, guests);
    if (!capacityCheck.isValid) {
      return res.status(400).json({ success: false, error: capacityCheck.error });
    }

    // 2. Prevent Double Bookings (Overlapping checks)
    const overlapCheck = await checkOverlap(tableId, date, timeSlot);
    if (overlapCheck.isOverlapping) {
      return res.status(409).json({ success: false, error: overlapCheck.error });
    }

    if (db.isMock()) {
      const mockData = db.getMockData();
      
      const newReservation = {
        _id: `res_mock_${Date.now()}`,
        user: req.user.id || req.user._id,
        table: tableId,
        date,
        timeSlot,
        guests: parseInt(guests),
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };

      mockData.reservations.push(newReservation);
      db.saveMockData(mockData);

      const populated = populateReservationMock(newReservation, mockData);
      return res.status(201).json({ success: true, data: populated });
    } else {
      const reservation = await Reservation.create({
        user: req.user.id || req.user._id,
        table: tableId,
        date,
        timeSlot,
        guests
      });

      const populated = await Reservation.findById(reservation._id)
        .populate('user', 'name email')
        .populate('table', 'tableNumber capacity');

      return res.status(201).json({ success: true, data: populated });
    }
  } catch (error) {
    console.error('Create reservation error:', error);
    return res.status(500).json({ success: false, error: 'Server error creating reservation' });
  }
});

// @desc    Get current user's reservations
// @route   GET /api/reservations/my
// @access  Private
router.get('/my', protect, async (req, res) => {
  const userId = req.user.id || req.user._id;
  try {
    if (db.isMock()) {
      const mockData = db.getMockData();
      const userRes = mockData.reservations
        .filter((r) => r.user === userId)
        .map((r) => populateReservationMock(r, mockData));
      
      // Sort by date and time slot (newest first)
      userRes.sort((a, b) => new Date(b.date) - new Date(a.date));
      return res.json({ success: true, count: userRes.length, data: userRes });
    } else {
      const reservations = await Reservation.find({ user: userId })
        .populate('table', 'tableNumber capacity')
        .sort('-date');
      
      return res.json({ success: true, count: reservations.length, data: reservations });
    }
  } catch (error) {
    console.error('Get my reservations error:', error);
    return res.status(500).json({ success: false, error: 'Server error retrieving reservations' });
  }
});

// @desc    Cancel current user's reservation
// @route   PUT /api/reservations/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  const resId = req.params.id;
  const userId = req.user.id || req.user._id;

  try {
    if (db.isMock()) {
      const mockData = db.getMockData();
      const resIdx = mockData.reservations.findIndex((r) => r._id === resId);

      if (resIdx === -1) {
        return res.status(404).json({ success: false, error: 'Reservation not found' });
      }

      const reservation = mockData.reservations[resIdx];

      // Verify ownership
      if (reservation.user !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized to cancel this reservation' });
      }

      reservation.status = 'cancelled';
      mockData.reservations[resIdx] = reservation;
      db.saveMockData(mockData);

      const populated = populateReservationMock(reservation, mockData);
      return res.json({ success: true, data: populated });
    } else {
      let reservation = await Reservation.findById(resId);

      if (!reservation) {
        return res.status(404).json({ success: false, error: 'Reservation not found' });
      }

      // Verify ownership
      if (reservation.user.toString() !== userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized to cancel this reservation' });
      }

      reservation.status = 'cancelled';
      await reservation.save();

      const populated = await Reservation.findById(reservation._id)
        .populate('user', 'name email')
        .populate('table', 'tableNumber capacity');

      return res.json({ success: true, data: populated });
    }
  } catch (error) {
    console.error('Cancel reservation error:', error);
    return res.status(500).json({ success: false, error: 'Server error cancelling reservation' });
  }
});

// @desc    Get all reservations (Admin only)
// @route   GET /api/reservations
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  const { date } = req.query; // optional filter by date (YYYY-MM-DD)

  try {
    if (db.isMock()) {
      const mockData = db.getMockData();
      let allRes = mockData.reservations.map((r) => populateReservationMock(r, mockData));

      if (date) {
        allRes = allRes.filter((r) => r.date === date);
      }

      // Sort by date and time slot (newest first)
      allRes.sort((a, b) => new Date(b.date) - new Date(a.date));
      return res.json({ success: true, count: allRes.length, data: allRes });
    } else {
      const query = {};
      if (date) {
        query.date = date;
      }

      const reservations = await Reservation.find(query)
        .populate('user', 'name email')
        .populate('table', 'tableNumber capacity')
        .sort('-date');

      return res.json({ success: true, count: reservations.length, data: reservations });
    }
  } catch (error) {
    console.error('Get all reservations error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching all reservations' });
  }
});

// @desc    Update/cancel any reservation (Admin only)
// @route   PUT /api/reservations/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const resId = req.params.id;
  const { tableId, date, timeSlot, guests, status } = req.body;

  try {
    if (db.isMock()) {
      const mockData = db.getMockData();
      const resIdx = mockData.reservations.findIndex((r) => r._id === resId);

      if (resIdx === -1) {
        return res.status(404).json({ success: false, error: 'Reservation not found' });
      }

      const reservation = mockData.reservations[resIdx];

      // Update fields if provided
      if (tableId) reservation.table = tableId;
      if (date) reservation.date = date;
      if (timeSlot) reservation.timeSlot = timeSlot;
      if (guests) reservation.guests = parseInt(guests);
      if (status) reservation.status = status;

      // Validate capacity if table or guests updated
      if (tableId || guests) {
        const capacityCheck = await validateCapacity(reservation.table, reservation.guests);
        if (!capacityCheck.isValid) {
          return res.status(400).json({ success: false, error: capacityCheck.error });
        }
      }

      // Validate overlap if table, date, or slot updated, and reservation is confirmed
      if ((tableId || date || timeSlot || status) && reservation.status === 'confirmed') {
        const overlapCheck = await checkOverlap(
          reservation.table,
          reservation.date,
          reservation.timeSlot,
          resId
        );
        if (overlapCheck.isOverlapping) {
          return res.status(409).json({ success: false, error: overlapCheck.error });
        }
      }

      mockData.reservations[resIdx] = reservation;
      db.saveMockData(mockData);

      const populated = populateReservationMock(reservation, mockData);
      return res.json({ success: true, data: populated });
    } else {
      let reservation = await Reservation.findById(resId);

      if (!reservation) {
        return res.status(404).json({ success: false, error: 'Reservation not found' });
      }

      // Update fields
      if (tableId) reservation.table = tableId;
      if (date) reservation.date = date;
      if (timeSlot) reservation.timeSlot = timeSlot;
      if (guests) reservation.guests = guests;
      if (status) reservation.status = status;

      // Validate capacity
      if (tableId || guests) {
        const capacityCheck = await validateCapacity(reservation.table, reservation.guests);
        if (!capacityCheck.isValid) {
          return res.status(400).json({ success: false, error: capacityCheck.error });
        }
      }

      // Validate overlap
      if ((tableId || date || timeSlot || status) && reservation.status === 'confirmed') {
        const overlapCheck = await checkOverlap(
          reservation.table,
          reservation.date,
          reservation.timeSlot,
          resId
        );
        if (overlapCheck.isOverlapping) {
          return res.status(409).json({ success: false, error: overlapCheck.error });
        }
      }

      await reservation.save();

      const populated = await Reservation.findById(reservation._id)
        .populate('user', 'name email')
        .populate('table', 'tableNumber capacity');

      return res.json({ success: true, data: populated });
    }
  } catch (error) {
    console.error('Update reservation error:', error);
    return res.status(500).json({ success: false, error: 'Server error updating reservation' });
  }
});

module.exports = router;
