const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let isMockMode = false;
const mockDbPath = path.join(__dirname, '..', '..', 'data', 'db.json');

// Ensure data folder exists for mock DB
const ensureMockDir = () => {
  const dir = path.dirname(mockDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-reservation';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000 // Timeout quickly to fallback to mock
    });
    console.log('MongoDB connected successfully.');
    isMockMode = false;
  } catch (error) {
    console.warn('\n==================================================');
    console.warn('WARNING: Failed to connect to MongoDB.');
    console.warn(`Connection string tried: ${uri}`);
    console.warn('FALLING BACK TO LOCAL JSON DATABASE MOCK MODE.');
    console.warn(`Mock data will be saved at: ${mockDbPath}`);
    console.warn('==================================================\n');
    isMockMode = true;
    ensureMockDir();
    initializeMockFile();
  }
};

const initializeMockFile = () => {
  if (!fs.existsSync(mockDbPath)) {
    const defaultData = {
      users: [],
      tables: [],
      reservations: []
    };
    fs.writeFileSync(mockDbPath, JSON.stringify(defaultData, null, 2));
  }
};

const getMockData = () => {
  initializeMockFile();
  const data = fs.readFileSync(mockDbPath, 'utf8');
  return JSON.parse(data);
};

const saveMockData = (data) => {
  ensureMockDir();
  fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2));
};

module.exports = {
  connectDB,
  isMock: () => isMockMode,
  getMockData,
  saveMockData
};
