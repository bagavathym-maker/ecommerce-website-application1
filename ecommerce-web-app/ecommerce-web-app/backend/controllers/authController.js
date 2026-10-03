const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { HttpError, EMAIL_RE, clean } = require('../config/helpers');

function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

exports.register = async (req, res) => {
  const name = clean(req.body.name);
  const email = clean(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (name.length < 2 || name.length > 100) throw new HttpError(400, 'Name must be 2-100 characters.');
  if (!EMAIL_RE.test(email) || email.length > 100) throw new HttpError(400, 'Enter a valid email address.');
  if (password.length < 6 || password.length > 72) throw new HttpError(400, 'Password must be 6-72 characters.');

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) throw new HttpError(409, 'That email is already registered.');

  const hash = await bcrypt.hash(password, 10);
  // Role is ALWAYS "user" here. Admins cannot be created through the public API.
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, 'user']
  );
  const user = { id: result.insertId, name, email, role: 'user' };
  res.status(201).json({ token: makeToken(user), user: publicUser(user) });
};

exports.login = async (req, res) => {
  const email = clean(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!EMAIL_RE.test(email) || !password) throw new HttpError(400, 'Email and password are required.');

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) throw new HttpError(401, 'Incorrect email or password.');

  res.json({ token: makeToken(user), user: publicUser(user) });
};
