const pool = require('../config/db');
const { HttpError, clean } = require('../config/helpers');

const FIELDS = 'id, name, description, price, category, image, stock, created_at';

// Validates product data from the admin form
function parseProduct(body) {
  const name = clean(body.name);
  const description = clean(body.description);
  const category = clean(body.category);
  const image = clean(body.image);
  const price = Number(body.price);
  const stock = Number(body.stock);

  if (name.length < 2 || name.length > 150) throw new HttpError(400, 'Product name must be 2-150 characters.');
  if (!category || category.length > 50) throw new HttpError(400, 'Category is required (max 50 characters).');
  if (!Number.isFinite(price) || price < 0 || price > 10000000) throw new HttpError(400, 'Enter a valid price.');
  if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) throw new HttpError(400, 'Stock must be a whole number (0 or more).');
  if (image.length > 255) throw new HttpError(400, 'Image path/URL is too long.');
  return { name, description, category, image: image || 'images/placeholder.svg', price: price.toFixed(2), stock };
}

exports.list = async (req, res) => {
  const search = clean(req.query.search);
  const category = clean(req.query.category);
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);

  const where = [];
  const params = [];
  if (search) {
    where.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  const sql =
    `SELECT ${FIELDS} FROM products` +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY id ASC LIMIT ?';
  params.push(limit);

  const [rows] = await pool.query(sql, params);
  res.json(rows);
};

exports.categories = async (req, res) => {
  const [rows] = await pool.query('SELECT DISTINCT category FROM products ORDER BY category');
  res.json(rows.map((r) => r.category));
};

exports.getOne = async (req, res) => {
  const [rows] = await pool.query(`SELECT ${FIELDS} FROM products WHERE id = ?`, [req.params.id]);
  if (!rows.length) throw new HttpError(404, 'Product not found.');
  res.json(rows[0]);
};

exports.create = async (req, res) => {
  const p = parseProduct(req.body);
  const [result] = await pool.query(
    'INSERT INTO products (name, description, price, category, image, stock) VALUES (?, ?, ?, ?, ?, ?)',
    [p.name, p.description, p.price, p.category, p.image, p.stock]
  );
  const [rows] = await pool.query(`SELECT ${FIELDS} FROM products WHERE id = ?`, [result.insertId]);
  res.status(201).json(rows[0]);
};

exports.update = async (req, res) => {
  const p = parseProduct(req.body);
  const [result] = await pool.query(
    'UPDATE products SET name = ?, description = ?, price = ?, category = ?, image = ?, stock = ? WHERE id = ?',
    [p.name, p.description, p.price, p.category, p.image, p.stock, req.params.id]
  );
  if (!result.affectedRows) throw new HttpError(404, 'Product not found.');
  const [rows] = await pool.query(`SELECT ${FIELDS} FROM products WHERE id = ?`, [req.params.id]);
  res.json(rows[0]);
};

exports.remove = async (req, res) => {
  // order_items.product_id is ON DELETE SET NULL, so past orders are kept.
  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Product not found.');
  res.json({ message: 'Product deleted.' });
};
