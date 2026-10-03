// Admin dashboard: overview, product management, order management.
const adminRoot = $('admin-root');
let adminProducts = [];
let adminOrders = [];

function drawStats() {
  const revenue = adminOrders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + Number(o.total_amount), 0);
  $('stats').innerHTML = [
    ['Products', adminProducts.length], ['Orders', adminOrders.length],
    ['Pending orders', adminOrders.filter((o) => o.status === 'Pending').length],
    ['Low stock (≤5)', adminProducts.filter((p) => p.stock <= 5).length], ['Revenue', money(revenue)]
  ].map(([l, n]) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');
}

function drawProducts() {
  $('products-table').innerHTML = adminProducts.length ? `<table><thead><tr>
    <th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>
    ${adminProducts.map((p) => `<tr><td>${imgTag(p.image, p.name)}</td><td>${esc(p.name)}</td><td>${esc(p.category)}</td>
      <td>${money(p.price)}</td><td>${p.stock}</td>
      <td><button class="btn btn-outline btn-sm" data-edit="${p.id}">Edit</button>
      <button class="btn btn-danger btn-sm" data-del="${p.id}">Delete</button></td></tr>`).join('')}
    </tbody></table>` : emptyHtml('📦', 'No products yet', 'Click "Add product" to create one.');
}

function drawOrders() {
  $('orders-table').innerHTML = adminOrders.length ? `<table><thead><tr>
    <th>ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th>Update</th></tr></thead><tbody>
    ${adminOrders.map((o) => `<tr><td>#${o.id}</td>
      <td>${esc(o.customer_name)}<div class="muted">${esc(o.phone)} · ${esc(o.city)}</div></td>
      <td>${fmtDate(o.created_at)}</td><td>${money(o.total_amount)}</td><td>${esc(o.payment_method)}</td>
      <td><span class="status s-${o.status}">${o.status}</span></td>
      <td>${o.status === 'Cancelled' ? '<span class="muted">Final</span>' : `
        <select data-status="${o.id}" style="width:auto">${['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']
          .map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`}</td></tr>`).join('')}
    </tbody></table>` : emptyHtml('🧾', 'No orders yet');
}

async function loadAdmin() {
  try {
    [adminProducts, adminOrders] = await Promise.all([api('/products'), api('/orders')]);
    drawStats(); drawProducts(); drawOrders();
  } catch (err) {
    adminRoot.insertAdjacentHTML('afterbegin', `<div class="alert error show">${esc(err.message)}</div>`);
  }
}

if (adminRoot && requireLogin('admin')) {
  // tabs
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
    ['products', 'orders'].forEach((n) => { $('tab-' + n).hidden = n !== t.dataset.tab; });
  }));

  const dlg = $('product-dialog');
  const form = $('product-form');

  $('add-product').onclick = () => {
    form.reset(); $('p-id').value = ''; $('dialog-title').textContent = 'Add product';
    $('p-image').value = 'images/placeholder.svg'; $('dialog-alert').className = 'alert';
    dlg.showModal();
  };
  $('cancel-dialog').onclick = () => dlg.close();

  $('products-table').addEventListener('click', async (e) => {
    const edit = e.target.dataset.edit, del = e.target.dataset.del;
    if (edit) {
      const p = adminProducts.find((x) => x.id === Number(edit));
      $('dialog-title').textContent = 'Edit product'; $('dialog-alert').className = 'alert';
      $('p-id').value = p.id; $('p-name').value = p.name; $('p-desc').value = p.description || '';
      $('p-price').value = p.price; $('p-category').value = p.category; $('p-image').value = p.image; $('p-stock').value = p.stock;
      dlg.showModal();
    } else if (del) {
      const p = adminProducts.find((x) => x.id === Number(del));
      if (!confirm(`Delete "${p.name}"? Past orders will be kept.`)) return;
      try { await api('/products/' + del, { method: 'DELETE' }); toast('Product deleted', 'success'); loadAdmin(); }
      catch (err) { toast(err.message, 'error'); }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('p-id').value;
    const body = {
      name: $('p-name').value, description: $('p-desc').value, price: $('p-price').value,
      category: $('p-category').value, image: $('p-image').value, stock: $('p-stock').value
    };
    try {
      await api(id ? '/products/' + id : '/products', { method: id ? 'PUT' : 'POST', body });
      dlg.close(); toast(id ? 'Product updated' : 'Product added', 'success'); loadAdmin();
    } catch (err) { showAlert('dialog-alert', err.message); }
  });

  $('orders-table').addEventListener('change', async (e) => {
    const id = e.target.dataset.status;
    if (!id) return;
    try {
      await api(`/orders/${id}/status`, { method: 'PUT', body: { status: e.target.value } });
      toast(`Order #${id} is now ${e.target.value}`, 'success');
    } catch (err) { toast(err.message, 'error'); }
    loadAdmin();
  });

  loadAdmin();
}
