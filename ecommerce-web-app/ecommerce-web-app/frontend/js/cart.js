// Cart page
const cartBox = $('cart-box');
if (cartBox) {
  if (Auth.user && Auth.user.role === 'admin') location.href = 'admin.html';

  function drawCart() {
    const items = Cart.items();
    if (!items.length) {
      cartBox.innerHTML = emptyHtml('🛒', 'Your cart is empty', '<a class="btn" href="products.html">Start shopping</a>');
      return;
    }
    cartBox.innerHTML = `<div class="two-col">
      <div class="card">${items.map((i) => `
        <div class="cart-item">
          ${imgTag(i.image, i.name)}
          <div><a href="product-details.html?id=${i.id}"><strong>${esc(i.name)}</strong></a>
            <div class="muted">${money(i.price)} each</div></div>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <div class="qty"><button data-dec="${i.id}">−</button><span>${i.qty}</span><button data-inc="${i.id}">+</button></div>
            <strong style="min-width:90px;text-align:right">${money(i.price * i.qty)}</strong>
            <button class="btn btn-danger btn-sm" data-rm="${i.id}">Remove</button>
          </div></div>`).join('')}
      </div>
      <div class="card"><h2>Order summary</h2>
        <div class="summary-row"><span>Items</span><span>${Cart.count()}</span></div>
        <div class="summary-row"><span>Shipping</span><span>Free</span></div>
        <div class="summary-row summary-total"><span>Total</span><span>${money(Cart.total())}</span></div>
        <a class="btn btn-block" style="margin-top:14px" href="checkout.html">Proceed to checkout</a>
        <button class="btn btn-outline btn-block" style="margin-top:8px" id="clear">Clear cart</button>
      </div></div>`;
  }

  cartBox.addEventListener('click', (e) => {
    const t = e.target;
    const find = (id) => Cart.items().find((i) => i.id === Number(id));
    if (t.dataset.inc) Cart.setQty(Number(t.dataset.inc), find(t.dataset.inc).qty + 1);
    else if (t.dataset.dec) Cart.setQty(Number(t.dataset.dec), find(t.dataset.dec).qty - 1);
    else if (t.dataset.rm) Cart.remove(Number(t.dataset.rm));
    else if (t.id === 'clear') Cart.clear();
    else return;
    drawCart();
  });
  drawCart();
}
