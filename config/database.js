// Place this file in: library-management-system/config/database.js

const mysql = require('mysql2/promise');

// Create MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',        // Replace with your MySQL username
  password: '',        // Replace with your MySQL password
  database: 'library_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection established successfully');
    connection.release();
  } catch (error) {
    console.error('Error connecting to the database:', error.message);
    process.exit(1); // Exit if cannot connect to database
  }
}

testConnection();

module.exports = pool;