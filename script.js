(function () {
  // ====== SUPABASE SETTINGS: paste yours here ======
  const SUPABASE_URL = 'https://rmtvaxyvvsrxnydhkgie.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_9HktNtzmNDVTWFZ6wpSZ-A_v3mSmj_D';
  // =================================================

  const redeemed = new Set();
  const redeemedAt = {};

  const inner = document.getElementById('inner');
  const counterEl = document.getElementById('counter');
  const dotsEl = document.getElementById('dots');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const toastEl = document.getElementById('toast');

  let current = 0;
  const totalPages = COUPONS.length + 2; // cover + coupons + closing

  // ---------- Supabase ----------
  let db = null;
  if (window.supabase && SUPABASE_URL.startsWith('http')) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.warn('Supabase not configured: redemptions will not be saved.');
  }

  function markRedeemed(id, iso) {
    redeemed.add(id);
    redeemedAt[id] = iso || new Date().toISOString();
  }

  async function loadRedemptions() {
    if (!db) return;
    const { data, error } = await db.from('redemptions').select('coupon_id, redeemed_at');
    if (error) { console.error(error); return; }
    data.forEach(r => markRedeemed(r.coupon_id, r.redeemed_at));
    renderPage();
  }

  function subscribeLive() {
    if (!db) return;
    db.channel('redemptions-live')
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'redemptions' },
          payload => {
            const id = payload.new.coupon_id;
            if (redeemed.has(id)) return;
            markRedeemed(id, payload.new.redeemed_at);
            renderPage();
          })
      .subscribe();
  }

  // ---------- Helpers ----------
  function redeemedCount() { return redeemed.size; }

  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    catch (e) { return ''; }
  }

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ---------- Rendering ----------
  function renderCover() {
    inner.innerHTML = '';
    inner.parentElement.className = 'page-frame type-cover';
    inner.appendChild(el('div', 'crown', '♔'));
    inner.appendChild(el('h1', 'title', '25 Birthday Coupons'));
    inner.appendChild(el('p', 'subtitle', 'For My Birthday Boy ♡'));
    const lede = el('p', 'lede');
    lede.innerHTML = '25 coupons. 25 ways to spoil you.<br>And maybe a few ways to get you into trouble.';
    inner.appendChild(lede);
    inner.appendChild(el('div', 'spacer'));
    const meta = el('div', 'meta');
    meta.innerHTML = 'Issued to: My favourite man<br>Issued by: Your favourite girl<br>Expiration: Never ♡';
    meta.appendChild(el('div', 'redeemed-line', redeemedCount() + ' of ' + COUPONS.length + ' redeemed'));
    inner.appendChild(meta);
  }

  function renderClosing() {
    inner.innerHTML = '';
    inner.parentElement.className = 'page-frame type-cover type-closing';
    const row = el('div', 'crown-row');
    row.appendChild(el('span', 'crown', '♔'));
    row.appendChild(el('h2', 'closing-title', 'The Birthday Boy Collection'));
    row.appendChild(el('span', 'crown', '♔'));
    inner.appendChild(row);
    inner.appendChild(el('p', 'closing-sub', COUPONS.length + ' coupons · unlimited memories · one very lucky birthday boy'));
    inner.appendChild(el('div', 'spacer'));
    inner.appendChild(el('p', 'closing-happy', 'Happy 25th Birthday, my baby ❤'));
    inner.appendChild(el('div', 'spacer'));
    const love = el('p', 'closing-love');
    love.innerHTML = 'Love,<br><span class="who">Your favourite girl ♡</span>';
    inner.appendChild(love);
  }

  function renderCoupon(c) {
    inner.innerHTML = '';
    inner.parentElement.className = 'page-frame type-coupon';
    inner.appendChild(el('div', 'ticks left'));
    inner.appendChild(el('div', 'ticks right'));
    inner.appendChild(el('p', 'coupon-label', '♥ COUPON #' + String(c.id).padStart(2, '0') + ' ♥'));
    inner.appendChild(el('h2', 'coupon-title', c.title));
    const body = el('p', 'coupon-body');
    body.innerHTML = c.body.split('\n').join('<br><br>');
    inner.appendChild(body);
    inner.appendChild(el('div', 'spacer'));

    const isRedeemed = redeemed.has(c.id);
    const redeemRow = el('div', 'redeem-row');
    const btn = el('button', 'redeem-btn', isRedeemed ? '✓ Redeemed' : 'Redeem');
    btn.type = 'button';
    btn.disabled = isRedeemed;
    btn.addEventListener('click', () => redeemCoupon(c.id));
    redeemRow.appendChild(btn);
    if (isRedeemed) redeemRow.appendChild(el('div', 'status-text', 'Redeemed ' + fmtDate(redeemedAt[c.id])));
    inner.appendChild(redeemRow);
    inner.appendChild(el('p', 'coupon-footer', 'Birthday Boy Collection  •  Redeem with your favourite girl ♡'));
  }

  function renderDots() {
    dotsEl.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
      const d = el('span', 'dot' + (i === current ? ' active' : ''));
      if (i > 0 && i < totalPages - 1 && redeemed.has(COUPONS[i - 1].id) && i !== current) d.className += ' done';
      dotsEl.appendChild(d);
    }
  }

  function renderPage() {
    if (current === 0) renderCover();
    else if (current === totalPages - 1) renderClosing();
    else renderCoupon(COUPONS[current - 1]);
    counterEl.textContent = (current + 1) + ' / ' + totalPages;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === totalPages - 1;
    renderDots();
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 2000);
  }

  // ---------- Redeeming ----------
  async function redeemCoupon(id) {
    if (redeemed.has(id)) return; // already locked

    // Show it instantly, then save
    markRedeemed(id);
    renderPage();

    if (!db) { showToast('Redeemed ♡ (not saved online)'); return; }

    const { error } = await db.from('redemptions').insert({ coupon_id: id });
    if (error && error.code !== '23505') { // 23505 = already redeemed elsewhere, which is fine
      console.error(error);
      redeemed.delete(id);
      delete redeemedAt[id];
      renderPage();
      showToast('Could not save, please try again');
      return;
    }
    showToast('Redeemed ♡ — locked in');
  }

  // ---------- Navigation ----------
  prevBtn.addEventListener('click', () => { if (current > 0) { current--; renderPage(); } });
  nextBtn.addEventListener('click', () => { if (current < totalPages - 1) { current++; renderPage(); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && current > 0) { current--; renderPage(); }
    if (e.key === 'ArrowRight' && current < totalPages - 1) { current++; renderPage(); }
  });

  renderPage();
  loadRedemptions();
  subscribeLive();
})();
