const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  table: {
    type: mongoose.Schema.ObjectId,
    ref: 'Table',
    required: true
  },
  date: {
    type: String, // Stored as 'YYYY-MM-DD' to prevent timezone offsets
    required: [true, 'Please add a date']
  },
  timeSlot: {
    type: String, // e.g., "12:00-13:30", "18:00-19:30"
    required: [true, 'Please add a time slot']
  },
  guests: {
    type: Number,
    required: [true, 'Please add number of guests']
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled'],
    default: 'confirmed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Reservation', ReservationSchema);
