const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all active tables
// @route   GET /api/tables
// @access  Public
router.get('/', async (req, res) => {
  const showAll = req.query.all === 'true';
  try {
    if (db.isMock()) {
      const mockData = db.getMockData();
      const filtered = showAll ? mockData.tables : mockData.tables.filter((t) => t.isActive);
      // Sort by tableNumber alphanumerically
      filtered.sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true, sensitivity: 'base' }));
      return res.json({ success: true, count: filtered.length, data: filtered });
    } else {
      const query = showAll ? {} : { isActive: true };
      const tables = await Table.find(query).sort('tableNumber');
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

// @desc    Update a table
// @route   PUT /api/tables/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const { tableNumber, capacity, isActive } = req.body;

  try {
    if (db.isMock()) {
      const mockData = db.getMockData();
      const tableIdx = mockData.tables.findIndex((t) => t._id === req.params.id);

      if (tableIdx === -1) {
        return res.status(404).json({ success: false, error: 'Table not found' });
      }

      const table = mockData.tables[tableIdx];

      if (tableNumber) {
        const exists = mockData.tables.some(
          (t) => t.tableNumber.toLowerCase() === tableNumber.toLowerCase() && t._id !== req.params.id
        );
        if (exists) {
          return res.status(400).json({ success: false, error: 'Table number already exists' });
        }
        table.tableNumber = tableNumber;
      }

      if (capacity !== undefined) {
        if (capacity <= 0) {
          return res.status(400).json({ success: false, error: 'Capacity must be greater than zero' });
        }
        table.capacity = parseInt(capacity);
      }

      if (isActive !== undefined) {
        table.isActive = isActive;
      }

      mockData.tables[tableIdx] = table;
      db.saveMockData(mockData);

      return res.json({ success: true, data: table });
    } else {
      let table = await Table.findById(req.params.id);

      if (!table) {
        return res.status(404).json({ success: false, error: 'Table not found' });
      }

      if (tableNumber) {
        const exists = await Table.findOne({ tableNumber, _id: { $ne: req.params.id } });
        if (exists) {
          return res.status(400).json({ success: false, error: 'Table number already exists' });
        }
        table.tableNumber = tableNumber;
      }

      if (capacity !== undefined) {
        if (capacity <= 0) {
          return res.status(400).json({ success: false, error: 'Capacity must be greater than zero' });
        }
        table.capacity = capacity;
      }

      if (isActive !== undefined) {
        table.isActive = isActive;
      }

      await table.save();
      return res.json({ success: true, data: table });
    }
  } catch (error) {
    console.error('Update table error:', error);
    return res.status(500).json({ success: false, error: 'Server error updating table' });
  }
});

module.exports = router;
