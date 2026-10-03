// Shared helpers used by every page: API calls, login state, cart, navbar, toasts.
// If the page is opened from the Express server (port 5000) we use a relative URL.
// If it is opened with Live Server / another port, we call the backend directly.
const API_BASE = location.port === '5000' ? '/api' : 'http://localhost:5000/api';
const STATUS_FLOW = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];

/* ---------- small utilities ---------- */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const money = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const qs = (name) => new URLSearchParams(location.search).get(name);
const $ = (id) => document.getElementById(id);

function imgTag(src, alt) {
  return `<img src="${esc(src || 'images/placeholder.svg')}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder.svg'">`;
}
const loadingHtml = (msg = 'Loading...') => `<div class="loading"><div class="spinner"></div>${esc(msg)}</div>`;
const emptyHtml = (icon, title, text = '') => `<div class="empty"><div class="big">${icon}</div><h2>${esc(title)}</h2><p>${text}</p></div>`;

function toast(message, type = 'info') {
  let box = $('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = message;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function showAlert(id, message, type = 'error') {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.className = 'alert show ' + type;
}

/* ---------- login state (token kept in localStorage) ---------- */
const Auth = {
  get token() { return localStorage.getItem('token'); },
  get user() { try { return JSON.parse(localStorage.getItem('user')); } catch (e) { return null; } },
  save(token, user) { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); },
  logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); location.href = 'login.html'; }
};

// Call at the top of a protected page. role is optional ('admin' or 'user').
function requireLogin(role) {
  const user = Auth.user;
  if (!Auth.token || !user) {
    location.href = 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
    return false;
  }
  if (role && user.role !== role) {
    alert(role === 'admin' ? 'Admins only.' : 'This page is for customer accounts.');
    location.href = user.role === 'admin' ? 'admin.html' : 'index.html';
    return false;
  }
  return true;
}

/* ---------- API calls ---------- */
async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Auth.token) headers.Authorization = 'Bearer ' + Auth.token;
  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    throw new Error('Cannot reach the server. Is the backend running (npm start)?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && Auth.token) { // token expired
      localStorage.removeItem('token'); localStorage.removeItem('user');
    }
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

/* ---------- cart (kept in localStorage) ---------- */
const Cart = {
  items() { try { return JSON.parse(localStorage.getItem('cart')) || []; } catch (e) { return []; } },
  save(items) { localStorage.setItem('cart', JSON.stringify(items)); updateCartBadge(); },
  count() { return this.items().reduce((n, i) => n + i.qty, 0); },
  total() { return this.items().reduce((s, i) => s + i.price * i.qty, 0); },
  add(p, qty = 1) {
    const items = this.items();
    const found = items.find((i) => i.id === p.id);
    const current = found ? found.qty : 0;
    if (current + qty > p.stock) { toast(`Only ${p.stock} in stock.`, 'error'); return false; }
    if (found) { found.qty += qty; found.stock = p.stock; found.price = Number(p.price); }
    else items.push({ id: p.id, name: p.name, price: Number(p.price), image: p.image, stock: p.stock, qty });
    this.save(items);
    return true;
  },
  setQty(id, qty) {
    let items = this.items();
    const it = items.find((i) => i.id === id);
    if (!it) return;
    if (qty > it.stock) { toast(`Only ${it.stock} in stock.`, 'error'); return; }
    items = qty < 1 ? items.filter((i) => i.id !== id) : items.map((i) => (i.id === id ? { ...i, qty } : i));
    this.save(items);
  },
  remove(id) { this.save(this.items().filter((i) => i.id !== id)); },
  clear() { this.save([]); }
};

function updateCartBadge() {
  const b = $('cart-count');
  if (b) b.textContent = Cart.count();
}

/* ---------- navbar & footer (same on every page) ---------- */
function renderNav() {
  const host = $('navbar');
  if (!host) return;
  const user = Auth.user && Auth.token ? Auth.user : null;
  const page = location.pathname.split('/').pop() || 'index.html';
  const link = (href, text) => `<a href="${href}" class="${page === href ? 'active' : ''}">${text}</a>`;

  let links = link('index.html', 'Home') + link('products.html', 'Products');
  if (!user || user.role === 'user') links += link('cart.html', `Cart <span class="cart-badge" id="cart-count">0</span>`);
  if (user && user.role === 'user') links += link('orders.html', 'My Orders');
  if (user && user.role === 'admin') links += link('admin.html', 'Admin Dashboard');
  if (user) links += `<span class="nav-user">Hi, ${esc(user.name.split(' ')[0])}</span><button class="linklike" id="logout-btn">Logout</button>`;
  else links += link('login.html', 'Login') + link('register.html', 'Register');

  host.className = 'navbar';
  host.innerHTML = `<div class="container nav-inner"><a class="brand" href="index.html">🛍️ ShopEasy</a>
    <button class="menu-btn" id="menu-btn" aria-label="Menu">☰</button><nav class="nav-links" id="nav-links">${links}</nav></div>`;
  $('menu-btn').onclick = () => $('nav-links').classList.toggle('open');
  const lo = $('logout-btn');
  if (lo) lo.onclick = () => Auth.logout();
  updateCartBadge();

  const f = $('footer');
  if (f) f.innerHTML = '© ' + new Date().getFullYear() + ' ShopEasy · Student E-Commerce Project';
}
document.addEventListener('DOMContentLoaded', renderNav);
