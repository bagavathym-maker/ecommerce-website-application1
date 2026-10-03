// "My Orders" page: list, expand details, track status, cancel pending orders.
const ordersBox = $('orders-box');

function trackerHtml(status) {
  if (status === 'Cancelled') return '<p class="muted" style="margin:10px 0">This order was cancelled.</p>';
  const idx = STATUS_FLOW.indexOf(status);
  return `<div class="tracker">${STATUS_FLOW.map((s, i) => `<div class="step ${i <= idx ? 'done' : ''}">${s}</div>`).join('')}</div>`;
}

function orderHtml(o) {
  return `<div class="card order-card" id="order-${o.id}">
    <div class="order-head">
      <div><strong>Order #${o.id}</strong><div class="muted">${fmtDate(o.created_at)} · ${o.item_count} item(s)</div></div>
      <div><span class="status s-${o.status}">${o.status}</span></div>
    </div>
    ${trackerHtml(o.status)}
    <div class="order-head" style="margin:0">
      <strong>${money(o.total_amount)}</strong>
      <div>
        <button class="btn btn-outline btn-sm" data-view="${o.id}">View details</button>
        ${o.status === 'Pending' ? `<button class="btn btn-danger btn-sm" data-cancel="${o.id}">Cancel order</button>` : ''}
      </div></div>
    <div class="order-items" id="items-${o.id}" hidden></div></div>`;
}

async function loadOrders() {
  ordersBox.innerHTML = loadingHtml('Loading your orders...');
  try {
    const orders = await api('/orders');
    ordersBox.innerHTML = orders.length ? orders.map(orderHtml).join('')
      : emptyHtml('📦', 'No orders yet', '<a class="btn" href="products.html">Start shopping</a>');
  } catch (err) {
    ordersBox.innerHTML = emptyHtml('⚠️', 'Could not load orders', esc(err.message));
  }
}

if (ordersBox && requireLogin('user')) {
  ordersBox.addEventListener('click', async (e) => {
    const view = e.target.dataset.view;
    const cancel = e.target.dataset.cancel;
    if (view) {
      const box = $('items-' + view);
      if (!box.hidden) { box.hidden = true; e.target.textContent = 'View details'; return; }
      box.hidden = false;
      box.innerHTML = 'Loading...';
      try {
        const o = await api('/orders/' + view);
        box.innerHTML = o.items.map((i) =>
          `<div class="row"><span>${esc(i.name)} × ${i.quantity}</span><span>${money(i.price * i.quantity)}</span></div>`).join('') +
          `<p class="muted" style="margin-top:8px">Ship to: ${esc(o.customer_name)}, ${esc(o.address)}, ${esc(o.city)}, ${esc(o.state)} - ${esc(o.pincode)}<br>
          Phone: ${esc(o.phone)} · Payment: ${esc(o.payment_method)}</p>`;
        e.target.textContent = 'Hide details';
      } catch (err) { box.innerHTML = esc(err.message); }
    } else if (cancel) {
      if (!confirm('Cancel this order?')) return;
      try {
        await api(`/orders/${cancel}/cancel`, { method: 'PUT' });
        toast('Order cancelled', 'success');
        loadOrders();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
  loadOrders();
}
