/**
 * Validation Logic Unit Tests
 * Asserts table capacity checks and booking overlap checks.
 */

const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

// Set Mock environment variables manually
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mock-mongodb-uri';

const { validateCapacity, checkOverlap } = require('../src/utils/validation');

// Setup mock DB for tests
const setupMockDb = () => {
  // Force db config into mock state
  const mockDbPath = path.join(__dirname, '..', 'data', 'db.json');
  
  // Set mock data
  const testData = {
    users: [
      { _id: 'user_1', name: 'Test User', email: 'user@test.com', role: 'customer' }
    ],
    tables: [
      { _id: 'table_2seat', tableNumber: 'Table 1 (2 Seats)', capacity: 2, isActive: true },
      { _id: 'table_4seat', tableNumber: 'Table 2 (4 Seats)', capacity: 4, isActive: true },
      { _id: 'table_inactive', tableNumber: 'Table Inactive', capacity: 4, isActive: false }
    ],
    reservations: [
      {
        _id: 'res_existing_1',
        user: 'user_1',
        table: 'table_2seat',
        date: '2026-07-20',
        timeSlot: '18:00-19:30',
        guests: 2,
        status: 'confirmed'
      },
      {
        _id: 'res_existing_2',
        user: 'user_1',
        table: 'table_4seat',
        date: '2026-07-20',
        timeSlot: '19:30-21:00',
        guests: 3,
        status: 'cancelled'
      }
    ]
  };

  // Mock db module
  db.isMock = () => true;
  db.getMockData = () => testData;
  db.saveMockData = (data) => {}; // No-op to avoid writing to disk during tests
};

const runTests = async () => {
  console.log('Running Backend Validation Tests...\n');
  setupMockDb();
  
  let failed = false;
  const assert = (condition, message) => {
    if (condition) {
      console.log(`[PASS] ${message}`);
    } else {
      console.error(`[FAIL] ${message}`);
      failed = true;
    }
  };

  // 1. Table Capacity Tests
  try {
    const check1 = await validateCapacity('table_2seat', 2);
    assert(check1.isValid === true, 'Capacity check: Table of 2 should accommodate 2 guests');

    const check2 = await validateCapacity('table_2seat', 1);
    assert(check2.isValid === true, 'Capacity check: Table of 2 should accommodate 1 guest');

    const check3 = await validateCapacity('table_2seat', 3);
    assert(check3.isValid === false && check3.error.includes('accommodates up to 2'), 'Capacity check: Table of 2 should REJECT 3 guests');

    const check4 = await validateCapacity('table_nonexistent', 2);
    assert(check4.isValid === false && check4.error.includes('does not exist'), 'Capacity check: Invalid table should be rejected');

    const check5 = await validateCapacity('table_inactive', 2);
    assert(check5.isValid === false && check5.error.includes('currently inactive'), 'Capacity check: Inactive table should be rejected');
  } catch (err) {
    console.error('Capacity check tests error:', err);
    failed = true;
  }

  // 2. Overlap Checks Tests
  try {
    const overlap1 = await checkOverlap('table_2seat', '2026-07-20', '18:00-19:30');
    assert(overlap1.isOverlapping === true, 'Overlap check: Confirmed booking should block same table, date, slot');

    const overlap2 = await checkOverlap('table_2seat', '2026-07-20', '19:30-21:00');
    assert(overlap2.isOverlapping === false, 'Overlap check: Different time slot on same table and date should be allowed');

    const overlap3 = await checkOverlap('table_2seat', '2026-07-21', '18:00-19:30');
    assert(overlap3.isOverlapping === false, 'Overlap check: Same slot on different date should be allowed');

    const overlap4 = await checkOverlap('table_4seat', '2026-07-20', '18:00-19:30');
    assert(overlap4.isOverlapping === false, 'Overlap check: Different table on same date/slot should be allowed');

    const overlap5 = await checkOverlap('table_4seat', '2026-07-20', '19:30-21:00');
    assert(overlap5.isOverlapping === false, 'Overlap check: Cancelled booking should NOT block slot');

    const overlap6 = await checkOverlap('table_2seat', '2026-07-20', '18:00-19:30', 'res_existing_1');
    assert(overlap6.isOverlapping === false, 'Overlap check: Overlap should ignore own reservation ID when updating');
  } catch (err) {
    console.error('Overlap check tests error:', err);
    failed = true;
  }

  console.log('\n----------------------------------------');
  if (failed) {
    console.error('TESTS FAILED!');
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  }
};

runTests();
