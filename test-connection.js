// test-connection.js
require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔗 Testing MongoDB Atlas connection...');

// Hide password in the log for security
const connectionString = process.env.MONGODB_URI;
const maskedString = connectionString ? connectionString.replace(/:[^:]*@/, ':****@') : 'Not found';

console.log('Connection string:', maskedString);

async function testConnection() {
  try {
    if (!connectionString) {
      console.log('❌ MONGODB_URI not found in .env file');
      return;
    }

    console.log('⏳ Connecting to MongoDB Atlas...');
    
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    });

    console.log('✅ Connected successfully!');
    console.log('📊 Database name:', mongoose.connection.db.databaseName);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name));
    
    await mongoose.connection.close();
    console.log('🔌 Connection closed.');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'MongoNetworkError') {
      console.error('🔍 Network issue - Check your internet connection and IP whitelisting');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('🔍 Server selection error - Check your connection string and credentials');
    } else if (error.name === 'MongoParseError') {
      console.error('🔍 Parse error - Check your connection string format');
    } else if (error.name === 'MongoError') {
      console.error('🔍 General MongoDB error');
    }
  }
}

testConnection();