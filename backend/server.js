const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: [
    'https://hietfindit.web.app', 
    'https://hietfindit.netlify.app',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize DB & Add New Columns for Claimant tracking
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(100), email VARCHAR(100) UNIQUE, password VARCHAR(255), role VARCHAR(50));
      ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50);
      
      CREATE TABLE IF NOT EXISTS faculty (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, department VARCHAR(100) NOT NULL, designation VARCHAR(100) NOT NULL, cabin VARCHAR(100), photo TEXT);
      ALTER TABLE faculty ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

      CREATE TABLE IF NOT EXISTS complaints (id SERIAL PRIMARY KEY, title VARCHAR(200), description TEXT, status VARCHAR(50) DEFAULT 'Pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      ALTER TABLE complaints ADD COLUMN IF NOT EXISTS student_name VARCHAR(100);
      ALTER TABLE complaints ADD COLUMN IF NOT EXISTS student_email VARCHAR(100);
      ALTER TABLE complaints ADD COLUMN IF NOT EXISTS title VARCHAR(200);
      ALTER TABLE complaints ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE complaints ADD COLUMN IF NOT EXISTS attachment TEXT;

      CREATE TABLE IF NOT EXISTS transport (id SERIAL PRIMARY KEY, bus_number VARCHAR(50), route_name VARCHAR(200), stops TEXT, timing VARCHAR(100));
      ALTER TABLE transport ADD COLUMN IF NOT EXISTS rc_number VARCHAR(100);
      ALTER TABLE transport ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100);
      ALTER TABLE transport ADD COLUMN IF NOT EXISTS bus_photo TEXT;
      ALTER TABLE transport ADD COLUMN IF NOT EXISTS driver_photo TEXT;

      CREATE TABLE IF NOT EXISTS lost_found (id SERIAL PRIMARY KEY, status VARCHAR(50) DEFAULT 'Unclaimed', date_reported TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      ALTER TABLE lost_found ADD COLUMN IF NOT EXISTS item_name VARCHAR(100);
      ALTER TABLE lost_found ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE lost_found ADD COLUMN IF NOT EXISTS location VARCHAR(100);
      ALTER TABLE lost_found ADD COLUMN IF NOT EXISTS item_photo TEXT;
      
      -- 🚀 NEW COLUMNS FOR TRACKING WHO CLAIMED IT
      ALTER TABLE lost_found ADD COLUMN IF NOT EXISTS claimed_by_name VARCHAR(100);
      ALTER TABLE lost_found ADD COLUMN IF NOT EXISTS claimed_by_email VARCHAR(100);

      CREATE TABLE IF NOT EXISTS courses (id SERIAL PRIMARY KEY, name VARCHAR(255), duration VARCHAR(100), seats INT, eligibility VARCHAR(255), description TEXT, image TEXT);
      CREATE TABLE IF NOT EXISTS academics (id SERIAL PRIMARY KEY, course VARCHAR(255), semester VARCHAR(100), timetable_img TEXT, syllabus_link TEXT);
    `);
    console.log('Connected to Cloud PostgreSQL Database & All Tables Verified 🚀');
  } catch (err) { console.error('DB Init Error:', err); }
};
initDB();

// --- 1. AUTHENTICATION ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await pool.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *', [name, email, hashedPassword, role]);
    res.json(newUser.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 2. FACULTY ROUTES ---
app.post('/api/faculty', async (req, res) => {
  const { name, department, designation, cabin, photo } = req.body;
  try { const newFaculty = await pool.query('INSERT INTO faculty (name, department, designation, cabin, photo) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name, department, designation, cabin, photo]); res.status(201).json(newFaculty.rows[0]); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/faculty', async (req, res) => {
  try { const allFaculty = await pool.query('SELECT * FROM faculty ORDER BY sort_order ASC, id DESC'); res.json(allFaculty.rows); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/faculty/reorder', async (req, res) => {
  const { orderedIds } = req.body;
  try { for (let i = 0; i < orderedIds.length; i++) { await pool.query('UPDATE faculty SET sort_order = $1 WHERE id = $2', [i, orderedIds[i]]); } res.json({ message: 'Order updated successfully' }); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/faculty/:id', async (req, res) => {
  try { const { id } = req.params; await pool.query('DELETE FROM faculty WHERE id = $1', [id]); res.json({ message: 'Faculty deleted successfully' }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 3. COMPLAINTS ROUTES ---
app.post('/api/complaints', async (req, res) => {
  const { student_name, student_email, title, description, attachment } = req.body;
  try { const newComplaint = await pool.query('INSERT INTO complaints (student_name, student_email, title, description, attachment) VALUES ($1, $2, $3, $4, $5) RETURNING *', [student_name, student_email, title, description, attachment]); res.status(201).json(newComplaint.rows[0]); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/complaints', async (req, res) => {
  try { const allComplaints = await pool.query('SELECT * FROM complaints ORDER BY id DESC'); res.json(allComplaints.rows); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/complaints/:id', async (req, res) => {
  try { const { id } = req.params; const { status } = req.body; await pool.query('UPDATE complaints SET status = $1 WHERE id = $2', [status, id]); res.json({ message: 'Complaint Status Updated' }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 4. TRANSPORT ROUTES ---
app.post('/api/transport', async (req, res) => {
  const { bus_number, route_name, stops, timing, rc_number, driver_name, bus_photo, driver_photo } = req.body;
  try { const newBus = await pool.query('INSERT INTO transport (bus_number, route_name, stops, timing, rc_number, driver_name, bus_photo, driver_photo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [bus_number, route_name, stops, timing, rc_number, driver_name, bus_photo, driver_photo]); res.status(201).json(newBus.rows[0]); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/transport', async (req, res) => {
  try { const allBuses = await pool.query('SELECT * FROM transport ORDER BY id DESC'); res.json(allBuses.rows); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/transport/:id', async (req, res) => {
  const { id } = req.params; const { bus_number, route_name, stops, timing, bus_photo } = req.body;
  try { await pool.query('UPDATE transport SET bus_number=$1, route_name=$2, stops=$3, timing=$4, bus_photo=COALESCE($5, bus_photo) WHERE id=$6', [bus_number, route_name, stops, timing, bus_photo, id]); res.json({ message: 'Transport Updated' }); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/transport/:id', async (req, res) => {
  try { const { id } = req.params; await pool.query('DELETE FROM transport WHERE id = $1', [id]); res.json({ message: 'Bus Route Deleted' }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 5. LOST & FOUND ROUTES ---
app.post('/api/lost-found', async (req, res) => {
  const { item_name, description, location, item_photo } = req.body;
  try { const newItem = await pool.query('INSERT INTO lost_found (item_name, description, location, item_photo) VALUES ($1, $2, $3, $4) RETURNING *', [item_name, description, location, item_photo]); res.status(201).json(newItem.rows[0]); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/lost-found', async (req, res) => {
  try { const allItems = await pool.query('SELECT * FROM lost_found ORDER BY id DESC'); res.json(allItems.rows); } catch (err) { res.status(500).json({ error: err.message }); }
});

// 🚀 UPDATED: Student Requests Claim (Saves Student Details too)
app.put('/api/lost-found/request-claim/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { student_name, student_email } = req.body; // Extract user info
    await pool.query(
      "UPDATE lost_found SET status = 'Claim Requested', claimed_by_name = $1, claimed_by_email = $2 WHERE id = $3", 
      [student_name, student_email, id]
    );
    res.json({ message: 'Claim Request Sent' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Approves Claim
app.put('/api/lost-found/:id', async (req, res) => {
  try { const { id } = req.params; await pool.query("UPDATE lost_found SET status = 'Claimed' WHERE id = $1", [id]); res.json({ message: 'Item Marked as Claimed' }); } catch (err) { res.status(500).json({ error: err.message }); }
});
// Admin Deletes Lost & Found Item Completely
app.delete('/api/lost-found/:id', async (req, res) => {
  try { const { id } = req.params; await pool.query('DELETE FROM lost_found WHERE id = $1', [id]); res.json({ message: 'Item Deleted Successfully' }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 6. COURSES ROUTES ---
app.post('/api/courses', async (req, res) => {
  const { name, duration, seats, eligibility, description, image } = req.body;
  try { const newCourse = await pool.query('INSERT INTO courses (name, duration, seats, eligibility, description, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [name, duration, seats, eligibility, description, image]); res.status(201).json(newCourse.rows[0]); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/courses', async (req, res) => {
  try { const allCourses = await pool.query('SELECT * FROM courses ORDER BY id DESC'); res.json(allCourses.rows); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/courses/:id', async (req, res) => {
  try { const { id } = req.params; await pool.query('DELETE FROM courses WHERE id = $1', [id]); res.json({ message: 'Course deleted successfully' }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 7. ACADEMICS ROUTES ---
app.post('/api/academics', async (req, res) => {
  const { course, semester, timetable_img, syllabus_link } = req.body;
  try { const newRecord = await pool.query('INSERT INTO academics (course, semester, timetable_img, syllabus_link) VALUES ($1, $2, $3, $4) RETURNING *', [course, semester, timetable_img, syllabus_link]); res.status(201).json(newRecord.rows[0]); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/academics', async (req, res) => {
  try { const allAcademics = await pool.query('SELECT * FROM academics ORDER BY id DESC'); res.json(allAcademics.rows); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/academics/:id', async (req, res) => {
  try { const { id } = req.params; await pool.query('DELETE FROM academics WHERE id = $1', [id]); res.json({ message: 'Academic record deleted' }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => res.send('HIETFINDIT Extended Server is Running! 🚀'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));