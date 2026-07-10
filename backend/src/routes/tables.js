const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all active tables
// @route   GET /api/tables
// @access  Public
router.get('/', async (req, res) => {
  try {
    if (db.isMock()) {
      const mockData = db.getMockData();
      const activeTables = mockData.tables.filter((t) => t.isActive);
      return res.json({ success: true, count: activeTables.length, data: activeTables });
    } else {
      const tables = await Table.find({ isActive: true }).sort('tableNumber');
      return res.json({ success: true, count: tables.length, data: tables });
    }
  } catch (error) {
    console.error('Fetch tables error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching tables' });
  }
});

// @desc    Create a new table
// @route   POST /api/tables
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  const { tableNumber, capacity } = req.body;

  if (!tableNumber || !capacity) {
    return res.status(400).json({ success: false, error: 'Please provide a table number and capacity' });
  }

  if (capacity <= 0) {
    return res.status(400).json({ success: false, error: 'Capacity must be greater than zero' });
  }

  try {
    if (db.isMock()) {
      const mockData = db.getMockData();
      const exists = mockData.tables.some(
        (t) => t.tableNumber.toLowerCase() === tableNumber.toLowerCase()
      );

      if (exists) {
        return res.status(400).json({ success: false, error: 'Table number already exists' });
      }

      const newTable = {
        _id: `table_mock_${Date.now()}`,
        tableNumber,
        capacity: parseInt(capacity),
        isActive: true,
        createdAt: new Date().toISOString()
      };

      mockData.tables.push(newTable);
      db.saveMockData(mockData);

      return res.status(201).json({ success: true, data: newTable });
    } else {
      const exists = await Table.findOne({ tableNumber });
      if (exists) {
        return res.status(400).json({ success: false, error: 'Table number already exists' });
      }

      const table = await Table.create({
        tableNumber,
        capacity
      });

      return res.status(201).json({ success: true, data: table });
    }
  } catch (error) {
    console.error('Create table error:', error);
    return res.status(500).json({ success: false, error: 'Server error creating table' });
  }
});

module.exports = router;
