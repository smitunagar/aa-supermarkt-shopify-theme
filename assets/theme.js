/* ============================================================
   A&A International Supermarkt — Theme JS
   Cart drawer, qty stepper, wishlist, mobile menu, sticky header
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Toast Notification ---- */
  const toastEl = createToast();
  function createToast() {
    const el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
    return el;
  }
  function showToast(msg, duration = 2500) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), duration);
  }

  /* ---- Sticky Header ---- */
  const header = document.getElementById('site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Search Toggle ---- */
  const searchToggle = document.getElementById('search-toggle');
  const searchBar    = document.getElementById('search-bar');
  if (searchToggle && searchBar) {
    searchToggle.addEventListener('click', () => {
      const open = searchBar.classList.toggle('hidden');
      if (!open) searchBar.querySelector('input')?.focus();
    });
  }

  /* ---- Mobile Menu ---- */
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu    = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  }

  /* ---- Cart Drawer ---- */
  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartPanel   = document.getElementById('cart-panel');
  const openCartBtn = document.getElementById('open-cart');
  const closeCartBtn = document.getElementById('close-cart');

  function openCart() {
    cartDrawer.classList.add('open');
    cartDrawer.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
    closeCartBtn?.focus();
  }
  function closeCart() {
    cartDrawer.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    openCartBtn?.focus();
  }

  openCartBtn?.addEventListener('click', openCart);
  closeCartBtn?.addEventListener('click', closeCart);
  cartOverlay?.addEventListener('click', closeCart);

  // ESC key closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartDrawer?.classList.contains('open')) closeCart();
  });

  /* ---- Cart: Update Item Qty ---- */
  async function updateCartItem(key, qty) {
    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ id: key, quantity: qty }),
    });
    return res.json();
  }

  async function refreshCartDrawer() {
    const res = await fetch('/?section_id=cart-items-section');
    if (!res.ok) return;
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const newItems = doc.querySelector('#cart-items-inner');
    const container = document.getElementById('cart-items-container');
    if (newItems && container) container.innerHTML = newItems.innerHTML;

    // Refresh cart count
    const cartRes = await fetch('/cart.js');
    const cart = await cartRes.json();
    const countEls = document.querySelectorAll('[data-cart-count]');
    countEls.forEach(el => { el.textContent = cart.item_count; });
    document.getElementById('cart-count-label')?.( (el) => el.textContent = cart.item_count );
    const badge = document.getElementById('cart-badge');
    if (badge) {
      badge.textContent = cart.item_count;
      badge.classList.toggle('hidden', cart.item_count === 0);
      badge.classList.toggle('flex', cart.item_count > 0);
    }
    const totalEl = document.getElementById('cart-total-price');
    if (totalEl) totalEl.textContent = formatMoney(cart.total_price);
  }

  // Update header badge counts
  async function updateCartBadge(cart) {
    const badge = document.getElementById('cart-badge');
    const label = document.getElementById('cart-count-label');
    const total = document.getElementById('cart-total-price');
    if (badge) {
      badge.textContent = cart.item_count;
      badge.classList.toggle('hidden', cart.item_count === 0);
      badge.classList.toggle('flex', cart.item_count > 0);
    }
    if (label) label.textContent = cart.item_count;
    if (total) total.textContent = formatMoney(cart.total_price);
  }

  function formatMoney(cents) {
    return '€' + (cents / 100).toFixed(2);
  }

  // Cart qty buttons (delegated)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.cart-qty-btn');
    if (!btn) return;
    const key = btn.dataset.key;
    const qty = parseInt(btn.dataset.qty, 10);
    if (!key) return;
    const cart = await updateCartItem(key, qty);
    await updateCartBadge(cart);

    // Re-render cart items
    const container = document.getElementById('cart-items-container');
    if (container) {
      const html = await fetchCartItemsHTML();
      container.innerHTML = html;
    }
    if (total) document.getElementById('cart-total-price').textContent = formatMoney(cart.total_price);
  });

  async function fetchCartItemsHTML() {
    const res = await fetch('/cart?view=items', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    if (res.ok) return res.text();
    return '';
  }

  /* ---- Add to Cart ---- */
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    const variantId = btn.dataset.variantId || btn.closest('[data-variant-id]')?.dataset.variantId;
    if (!variantId) return;

    // Get quantity from stepper if present
    const card = btn.closest('[data-product-card]');
    const qtyEl = card?.querySelector('[data-qty-value]');
    const qty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;

    btn.disabled = true;
    btn.textContent = 'Adding…';

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ id: variantId, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.description || 'Could not add to cart');

      // Refresh badge
      const cartRes = await fetch('/cart.js');
      const cart = await cartRes.json();
      updateCartBadge(cart);

      showToast(`✓ Added to cart`);
      openCart();
    } catch (err) {
      showToast('⚠ ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add to Cart';
    }
  });

  /* ---- Product Card: Qty Stepper ---- */
  document.addEventListener('click', (e) => {
    const minus = e.target.closest('[data-qty-minus]');
    const plus  = e.target.closest('[data-qty-plus]');
    if (!minus && !plus) return;
    const card = (minus || plus).closest('[data-product-card]');
    if (!card) return;
    const display = card.querySelector('[data-qty-value]');
    if (!display) return;
    let v = parseInt(display.textContent, 10) || 1;
    if (plus)  v = Math.min(v + 1, 99);
    if (minus) v = Math.max(v - 1, 1);
    display.textContent = v;
  });

  /* ---- Wishlist Toggle ---- */
  const WISHLIST_KEY = 'aa_wishlist';
  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }
    catch { return []; }
  }
  function saveWishlist(list) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  }

  // Initialize wishlist button states
  function initWishlistButtons() {
    const list = getWishlist();
    document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
      const id = btn.dataset.productId;
      if (id && list.includes(id)) btn.classList.add('active');
    });
  }
  initWishlistButtons();

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-wishlist-btn]');
    if (!btn) return;
    const id = btn.dataset.productId;
    if (!id) return;
    const list = getWishlist();
    const idx = list.indexOf(id);
    if (idx >= 0) {
      list.splice(idx, 1);
      btn.classList.remove('active');
      showToast('Removed from wishlist');
    } else {
      list.push(id);
      btn.classList.add('active');
      showToast('❤ Added to wishlist');
    }
    saveWishlist(list);
  });

  /* ---- Scroll Reveal ---- */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

  /* ---- PDP: Image Gallery ---- */
  const mainImage = document.getElementById('pdp-main-image');
  if (mainImage) {
    document.querySelectorAll('.pdp-thumbnail').forEach(thumb => {
      thumb.addEventListener('click', () => {
        document.querySelectorAll('.pdp-thumbnail').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const src = thumb.dataset.src;
        if (src) mainImage.src = src;
      });
    });
  }

  /* ---- PDP: Variant Selector ---- */
  document.querySelectorAll('[data-variant-option]').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('[data-variant-group]');
      if (group) {
        group.querySelectorAll('[data-variant-option]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      }
    });
  });

  /* ---- Collection: Filter ---- */
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  /* ---- Newsletter ---- */
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = newsletterForm.querySelector('input[type="email"]')?.value;
      if (email) showToast('🎉 You\'re subscribed! Check your inbox.');
      newsletterForm.reset();
    });
  }

});
