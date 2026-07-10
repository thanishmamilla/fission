const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: [true, 'Please add a table number'],
    unique: true
  },
  capacity: {
    type: Number,
    required: [true, 'Please add table capacity']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Table', TableSchema);
