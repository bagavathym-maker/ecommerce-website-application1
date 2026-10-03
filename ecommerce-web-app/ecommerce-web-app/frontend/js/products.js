// Product listing (home + catalog) and product details page.
function productCard(p) {
  const out = p.stock < 1;
  const badge = out ? '<span class="badge out">Out of stock</span>'
    : p.stock <= 5 ? `<span class="badge low">Only ${p.stock} left</span>` : '<span class="badge ok">In stock</span>';
  const isAdmin = Auth.user && Auth.user.role === 'admin';
  return `<article class="product-card">
    <a href="product-details.html?id=${p.id}">${imgTag(p.image, p.name)}</a>
    <div class="pc-body">
      <span class="pc-cat">${esc(p.category)}</span>
      <a class="pc-name" href="product-details.html?id=${p.id}">${esc(p.name)}</a>
      <div class="pc-price">${money(p.price)}</div>
      <div>${badge}</div>
      <div class="pc-actions">
        <a class="btn btn-outline btn-sm" href="product-details.html?id=${p.id}">Details</a>
        ${isAdmin ? '' : `<button class="btn btn-sm" data-add="${p.id}" ${out ? 'disabled' : ''}>Add to cart</button>`}
      </div></div></article>`;
}

let loadedProducts = [];
function bindAddButtons(container) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const p = loadedProducts.find((x) => x.id === Number(btn.dataset.add));
    if (p && Cart.add(p, 1)) toast(`"${p.name}" added to cart`, 'success');
  });
}

async function loadGrid(grid, params = '') {
  grid.innerHTML = loadingHtml('Loading products...');
  try {
    loadedProducts = await api('/products' + params);
    grid.innerHTML = loadedProducts.length
      ? loadedProducts.map(productCard).join('')
      : emptyHtml('🔍', 'No products found', 'Try a different search or category.');
  } catch (err) {
    grid.innerHTML = emptyHtml('⚠️', 'Could not load products', esc(err.message));
  }
}

/* Home page: first 8 products */
const featured = $('featured-grid');
if (featured) {
  bindAddButtons(featured);
  loadGrid(featured, '?limit=8');
}

/* Catalog page: search + category filter */
const grid = $('product-grid');
if (grid) {
  bindAddButtons(grid);
  let category = qs('category') || '';
  const search = $('search');
  const chips = $('chips');
  if (qs('search')) search.value = qs('search');

  const refresh = () => {
    const p = new URLSearchParams();
    if (search.value.trim()) p.set('search', search.value.trim());
    if (category) p.set('category', category);
    loadGrid(grid, p.toString() ? '?' + p.toString() : '');
  };

  const drawChips = (cats) => {
    chips.innerHTML = ['', ...cats].map((c) =>
      `<button class="chip ${c === category ? 'active' : ''}" data-cat="${esc(c)}">${c ? esc(c) : 'All'}</button>`).join('');
  };
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    category = b.dataset.cat;
    chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === b));
    refresh();
  });

  let timer;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(refresh, 300); });

  api('/products/categories').then(drawChips).catch(() => drawChips([]));
  refresh();
}

/* Details page */
const detail = $('product-detail');
if (detail) {
  (async () => {
    detail.innerHTML = loadingHtml('Loading product...');
    try {
      const p = await api('/products/' + encodeURIComponent(qs('id') || ''));
      document.title = p.name + ' - ShopEasy';
      const out = p.stock < 1;
      const isAdmin = Auth.user && Auth.user.role === 'admin';
      let qty = 1;
      detail.innerHTML = `<div class="detail">
        <div>${imgTag(p.image, p.name)}</div>
        <div>
          <span class="pc-cat">${esc(p.category)}</span>
          <h1>${esc(p.name)}</h1>
          <div class="price">${money(p.price)}</div>
          <p style="margin-bottom:14px">${esc(p.description) || '<span class="muted">No description.</span>'}</p>
          <p style="margin-bottom:16px">${out ? '<span class="badge out">Out of stock</span>' : `<span class="badge ok">${p.stock} in stock</span>`}</p>
          ${out || isAdmin ? '' : `<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <div class="qty"><button id="minus">−</button><span id="qty">1</span><button id="plus">+</button></div>
            <button class="btn" id="add">Add to cart</button></div>`}
          <p style="margin-top:20px"><a href="products.html">← Back to products</a></p>
        </div></div>`;
      if (!out && !isAdmin) {
        $('minus').onclick = () => { qty = Math.max(1, qty - 1); $('qty').textContent = qty; };
        $('plus').onclick = () => { qty = Math.min(p.stock, qty + 1); $('qty').textContent = qty; };
        $('add').onclick = () => { if (Cart.add(p, qty)) toast('Added to cart', 'success'); };
      }
    } catch (err) {
      detail.innerHTML = emptyHtml('😕', 'Product not found', `<a href="products.html">Browse all products</a>`);
    }
  })();
}
