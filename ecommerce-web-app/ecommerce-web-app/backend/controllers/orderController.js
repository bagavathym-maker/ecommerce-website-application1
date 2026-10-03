const pool = require('../config/db');
const { HttpError, EMAIL_RE, clean, } = require('../config/helpers');

const STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
const PAYMENTS = ['Cash on Delivery', 'Demo Payment'];

// Changes an order's status inside a transaction. Cancelling returns stock.
async function changeStatus(conn, orderId, newStatus) {
  const [rows] = await conn.query('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [orderId]);
  if (!rows.length) throw new HttpError(404, 'Order not found.');
  const current = rows[0].status;

  if (current === newStatus) return;
  if (current === 'Cancelled') throw new HttpError(400, 'A cancelled order cannot be changed.');

  if (newStatus === 'Cancelled') {
    const [items] = await conn.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL',
      [orderId]
    );
    for (const it of items) {
      await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [it.quantity, it.product_id]);
    }
  }
  await conn.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId]);
}

async function inTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

exports.create = async (req, res) => {
  const b = req.body || {};
  const info = {
    customer_name: clean(b.customer_name),
    email: clean(b.email).toLowerCase(),
    phone: clean(b.phone),
    address: clean(b.address),
    city: clean(b.city),
    state: clean(b.state),
    pincode: clean(b.pincode),
    payment_method: clean(b.payment_method) || 'Cash on Delivery'
  };

  if (info.customer_name.length < 2) throw new HttpError(400, 'Enter the customer name.');
  if (!EMAIL_RE.test(info.email)) throw new HttpError(400, 'Enter a valid email address.');
  if (!/^[0-9]{10}$/.test(info.phone)) throw new HttpError(400, 'Phone number must be 10 digits.');
  if (info.address.length < 5) throw new HttpError(400, 'Enter the full address.');
  if (!info.city) throw new HttpError(400, 'Enter the city.');
  if (!info.state) throw new HttpError(400, 'Enter the state.');
  if (!/^[0-9]{6}$/.test(info.pincode)) throw new HttpError(400, 'Pincode must be 6 digits.');
  if (!PAYMENTS.includes(info.payment_method)) throw new HttpError(400, 'Invalid payment method.');
  if (!Array.isArray(b.items) || !b.items.length) throw new HttpError(400, 'Your cart is empty.');

  // Merge duplicate product ids and validate quantities
  const wanted = new Map();
  for (const it of b.items) {
    const id = Number(it.product_id);
    const qty = Number(it.quantity);
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(qty) || qty < 1 || qty > 100) {
      throw new HttpError(400, 'Invalid item in cart.');
    }
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }

  const orderId = await inTransaction(async (conn) => {
    let total = 0;
    const lines = [];

    // Prices always come from the database, never from the browser.
    for (const [id, qty] of [...wanted.entries()].sort((a, c) => a[0] - c[0])) {
      const [rows] = await conn.query(
        'SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!rows.length) throw new HttpError(400, `A product in your cart no longer exists.`);
      const p = rows[0];
      if (p.stock < qty) {
        throw new HttpError(400, `Only ${p.stock} left in stock for "${p.name}".`);
      }
      total += Number(p.price) * qty;
      lines.push({ p, qty });
    }

    const [orderResult] = await conn.query(
      `INSERT INTO orders
        (user_id, total_amount, status, customer_name, email, phone, address, city, state, pincode, payment_method)
       VALUES (?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, total.toFixed(2), info.customer_name, info.email, info.phone,
       info.address, info.city, info.state, info.pincode, info.payment_method]
    );
    const newId = orderResult.insertId;

    for (const { p, qty } of lines) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [newId, p.id, p.name, qty, p.price]
      );
      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [qty, p.id]);
    }
    return newId;
  });

  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  res.status(201).json(rows[0]);
};

exports.list = async (req, res) => {
  let sql =
    `SELECT o.*, u.name AS user_name, u.email AS user_email,
            (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o JOIN users u ON u.id = o.user_id`;
  const params = [];
  if (req.user.role !== 'admin') {
    sql += ' WHERE o.user_id = ?';
    params.push(req.user.id);
  }
  sql += ' ORDER BY o.created_at DESC, o.id DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
};

exports.getOne = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT o.*, u.name AS user_name FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?',
    [req.params.id]
  );
  const order = rows[0];
  // Users can only see their own orders; we answer 404 so ids are not leaked.
  if (!order || (req.user.role !== 'admin' && order.user_id !== req.user.id)) {
    throw new HttpError(404, 'Order not found.');
  }
  const [items] = await pool.query(
    `SELECT oi.id, oi.product_id, oi.quantity, oi.price,
            COALESCE(p.name, oi.product_name) AS name, p.image
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [order.id]
  );
  res.json({ ...order, items });
};

// Admin: set any status
exports.updateStatus = async (req, res) => {
  const status = clean(req.body.status);
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Invalid status.');
  await inTransaction((conn) => changeStatus(conn, req.params.id, status));
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
};

// User: cancel own order, only while it is still Pending
exports.cancel = async (req, res) => {
  await inTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT user_id, status FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length || rows[0].user_id !== req.user.id) throw new HttpError(404, 'Order not found.');
    if (rows[0].status !== 'Pending') throw new HttpError(400, 'Only pending orders can be cancelled.');
    await changeStatus(conn, req.params.id, 'Cancelled');
  });
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
};
