const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/db'); 

const app = express();

app.use(cors());
app.use(express.json());

// 👉 YAHAN HUMNE NAYE AUTH ROUTES ADD KIYE HAIN
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('<h1>HIETFINDIT Server is Running Live! 🌐</h1>');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});