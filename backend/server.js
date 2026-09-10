const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration for Netlify and Local testing
app.use(cors({
  origin: ['https://hietfindit.netlify.app', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));

// Increased limit to 10mb for uploading Base64 photos
app.use(express.json({ limit: '10mb' })); 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize Database Tables & Fix Column Mismatches
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        role VARCHAR(50)
      );

      -- Fix any old column mismatch safely
      ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50);
      
      CREATE TABLE IF NOT EXISTS faculty (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        designation VARCHAR(100) NOT NULL,
        cabin VARCHAR(100),
        photo TEXT
      );
    `);
    console.log('Connected to Cloud PostgreSQL Database & Tables Verified');
  } catch (err) {
    console.error('DB Init Error:', err);
  }
};
initDB();

// --- 1. AUTHENTICATION ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, hashedPassword, role]
    );
    res.json(newUser.rows[0]);
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) return res.status(400).json({ error: 'Invalid Email or Password' });

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid Email or Password' });

    const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email, role: user.rows[0].role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. FACULTY DIRECTORY ROUTES ---
app.post('/api/faculty', async (req, res) => {
  const { name, department, designation, cabin, photo } = req.body;
  try {
    const newFaculty = await pool.query(
      'INSERT INTO faculty (name, department, designation, cabin, photo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, department, designation, cabin, photo]
    );
    res.status(201).json(newFaculty.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/faculty', async (req, res) => {
  try {
    const allFaculty = await pool.query('SELECT * FROM faculty ORDER BY id DESC');
    res.json(allFaculty.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/faculty/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM faculty WHERE id = $1', [id]);
    res.json({ message: 'Faculty deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('HIETFINDIT Server is Running!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));