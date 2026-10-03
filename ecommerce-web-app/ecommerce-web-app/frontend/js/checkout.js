// Checkout page: collect details, create the order, show confirmation.
const checkoutBox = $('checkout-box');
if (checkoutBox && requireLogin('user')) {
  const items = Cart.items();
  if (!items.length) {
    checkoutBox.innerHTML = emptyHtml('🛒', 'Your cart is empty', '<a class="btn" href="products.html">Browse products</a>');
  } else {
    $('summary-items').innerHTML = items.map((i) =>
      `<div class="summary-row"><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join('');
    $('summary-total').textContent = money(Cart.total());
    $('customer_name').value = Auth.user.name;
    $('email').value = Auth.user.email || '';

    $('checkout-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('place-btn');
      btn.disabled = true;
      btn.textContent = 'Placing order...';
      try {
        const order = await api('/orders', {
          method: 'POST',
          body: {
            customer_name: $('customer_name').value, email: $('email').value, phone: $('phone').value,
            address: $('address').value, city: $('city').value, state: $('state').value, pincode: $('pincode').value,
            payment_method: document.querySelector('input[name=payment]:checked').value,
            items: Cart.items().map((i) => ({ product_id: i.id, quantity: i.qty }))
          }
        });
        Cart.clear();
        checkoutBox.innerHTML = `<div class="card confirm">
          <div class="tick">✅</div><h1>Order placed!</h1>
          <p class="muted">Thank you, ${esc(order.customer_name)}.</p>
          <p style="margin:14px 0">Your order ID</p><div class="order-id">#${order.id}</div>
          <p style="margin:14px 0">Total: <strong>${money(order.total_amount)}</strong> · ${esc(order.payment_method)}</p>
          <p class="muted">Status: <span class="status s-${order.status}">${order.status}</span></p>
          <p style="margin-top:20px"><a class="btn" href="orders.html">Track my orders</a>
          <a class="btn btn-outline" href="products.html">Continue shopping</a></p></div>`;
        window.scrollTo(0, 0);
      } catch (err) {
        showAlert('form-alert', err.message);
        btn.disabled = false;
        btn.textContent = 'Place order';
      }
    });
  }
}
