const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Table = require('./models/Table');
const User = require('./models/User');
const db = require('./config/db');

const seedData = async () => {
  const defaultTables = [
    { tableNumber: 'Table 1 (2 Seats)', capacity: 2 },
    { tableNumber: 'Table 2 (2 Seats)', capacity: 2 },
    { tableNumber: 'Table 3 (4 Seats)', capacity: 4 },
    { tableNumber: 'Table 4 (4 Seats)', capacity: 4 },
    { tableNumber: 'Table 5 (4 Seats)', capacity: 4 },
    { tableNumber: 'Table 6 (6 Seats)', capacity: 6 },
    { tableNumber: 'Table 7 (6 Seats)', capacity: 6 },
    { tableNumber: 'Table 8 (8 Seats)', capacity: 8 }
  ];

  const defaultUsers = [
    {
      name: 'Default Admin',
      email: 'admin@restaurant.com',
      password: 'admin123',
      role: 'admin'
    },
    {
      name: 'Jane Customer',
      email: 'customer@restaurant.com',
      password: 'customer123',
      role: 'customer'
    }
  ];

  if (db.isMock()) {
    console.log('Seeding Local JSON Database...');
    const data = db.getMockData();
    
    // Seed Tables if empty
    if (!data.tables || data.tables.length === 0) {
      data.tables = defaultTables.map((t, idx) => ({
        _id: `table_mock_id_${idx + 1}`,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        isActive: true,
        createdAt: new Date().toISOString()
      }));
      console.log('Local tables seeded.');
    }

    // Seed default users if they are not already in the mock list
    if (!data.users) data.users = [];
    let mockUsersSeeded = false;
    for (const u of defaultUsers) {
      const exists = data.users.some(existingU => existingU.email.toLowerCase() === u.email.toLowerCase());
      if (!exists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(u.password, salt);
        data.users.push({
          _id: `user_mock_id_${u.email.split('@')[0]}`,
          name: u.name,
          email: u.email.toLowerCase(),
          password: hashedPassword,
          role: u.role,
          createdAt: new Date().toISOString()
        });
        mockUsersSeeded = true;
      }
    }
    if (mockUsersSeeded) {
      console.log('Seeded missing default users in Mock DB.');
    }

    db.saveMockData(data);
  } else {
    // Mongoose MongoDB seeding
    try {
      // Seed tables
      const tableCount = await Table.countDocuments();
      if (tableCount === 0) {
        await Table.insertMany(defaultTables);
        console.log('MongoDB tables seeded.');
      }

      // Seed users (check by email)
      for (const u of defaultUsers) {
        const exists = await User.findOne({ email: u.email.toLowerCase() });
        if (!exists) {
          await User.create(u);
          console.log(`MongoDB default user seeded: ${u.email}`);
        }
      }
    } catch (err) {
      console.error('Error seeding MongoDB:', err);
    }
  }
};

module.exports = seedData;
