const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

if (!process.env.JWT_SECRET) {
  console.error('\n[ERROR] JWT_SECRET is missing. Copy .env.example to .env and set it.\n');
  process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '100kb' }));

// API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));

// Serve the frontend too, so http://localhost:5000 works with no extra server
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON.' });
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

// Creates the demo accounts (with properly hashed passwords) if they do not exist.
async function seedDemoUsers() {
  if (process.env.SEED_DEMO_USERS === 'false') return;
  const demo = [
    { name: 'Admin', email: 'admin@shop.com', password: 'Admin@123', role: 'admin' },
    { name: 'Demo User', email: 'user@shop.com', password: 'User@123', role: 'user' }
  ];
  for (const u of demo) {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [u.email]);
    if (!rows.length) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [u.name, u.email, hash, u.role]);
      console.log(`Created demo ${u.role}: ${u.email}`);
    }
  }
}

const PORT = Number(process.env.PORT) || 5000;

(async () => {
  try {
    await pool.query('SELECT 1');
    await seedDemoUsers();
  } catch (err) {
    console.error('\n[ERROR] Could not use the MySQL database:', err.message);
    console.error('Check your .env values and that you imported database/ecommerce.sql.\n');
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
})();
