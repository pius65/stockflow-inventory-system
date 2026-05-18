import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stockflow_inventory',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});

export async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Database connection refused. Start MySQL and import database/inventory.sql.');
    }
    if (error.code === 'ER_BAD_DB_ERROR') {
      throw new Error('Database stockflow_inventory was not found. Import database/inventory.sql.');
    }
    throw error;
  }
}
