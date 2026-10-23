/* ============================================================
   GRAVITY — scroll-scrubbed image-sequence hero + cart
   Recipe: priority preload w/ real % → canvas cover-crop draw,
   DPR<=2 → GSAP ScrollTrigger scrub:1 on a sticky stage →
   Lenis on GSAP's single ticker, lagSmoothing(0).
   Fallbacks: nearest loaded frame, native-scroll scrub if the
   GSAP CDN fails, static mid-frame for prefers-reduced-motion,
   poster <img> for no-JS.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- Frame sets ---------------- */
  var MOBILE_BREAKPOINT = 768;
  var SETS = {
    desktop: { dir: 'frames/',        count: 147, pad: 4 },
    mobile:  { dir: 'frames-mobile/', count: 98,  pad: 4 }
  };
  var isMobile = window.matchMedia('(max-width: ' + MOBILE_BREAKPOINT + 'px)').matches;
  var SET = isMobile ? SETS.mobile : SETS.desktop;
  var FRAME_COUNT = SET.count;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frameURL(i) {
    var n = String(i + 1);
    while (n.length < SET.pad) n = '0' + n;
    return SET.dir + 'frame_' + n + '.webp';
  }

  /* ---------------- DOM ---------------- */
  var preloader = document.getElementById('preloader');
  var preCount  = document.getElementById('preCount');
  var preBar    = document.getElementById('preBar');
  var preNote   = preloader ? preloader.querySelector('.pre-note') : null;
  var stage     = document.getElementById('stage');
  var canvas    = document.getElementById('heroCanvas');
  var ctx       = canvas.getContext('2d');
  var hint      = document.getElementById('scrollHint');
  var cap3      = document.getElementById('cap3');

  if (preNote) {
    preNote.textContent = 'Loading ' + FRAME_COUNT + ' frames of pure levitation';
  }

  /* ---------------- Canvas sizing (DPR capped at 2) ---------------- */
  var viewW = 0, viewH = 0;
  function sizeCanvas() {
    var rect = stage.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = Math.max(1, Math.round(rect.width));
    viewH = Math.max(1, Math.round(rect.height));
    canvas.width  = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawNearest(currentFrame);
  }

  /* ---------------- Frame store + nearest-loaded draw ---------------- */
  var frames = new Array(FRAME_COUNT);       // Image objects (decoded or not)
  var loaded = new Array(FRAME_COUNT).fill(false);
  var currentFrame = 0;

  /* Cover-crop: scale the frame to COVER the stage, centre it, never stretch. */
  function drawImageCover(img) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih || !viewW) return;
    var scale = Math.max(viewW / iw, viewH / ih);
    var w = iw * scale, h = ih * scale;
    ctx.drawImage(img, (viewW - w) / 2, (viewH - h) / 2, w, h);
  }

  /* Never clear to blank: walk outward to the closest loaded frame. */
  function drawNearest(i) {
    i = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(i)));
    currentFrame = i;
    if (loaded[i]) { drawImageCover(frames[i]); return; }
    for (var d = 1; d < FRAME_COUNT; d++) {
      if (i - d >= 0 && loaded[i - d])          { drawImageCover(frames[i - d]); return; }
      if (i + d < FRAME_COUNT && loaded[i + d]) { drawImageCover(frames[i + d]); return; }
    }
  }

  /* ---------------- Preloader ----------------
     Priority frames first (0 / 25% / 50% / 75% / last) so frame 0 is
     sharp instantly; the rest fill in with limited concurrency.
     Progress = real loaded count / total. Errors count as processed
     and simply fall back to a neighbour at draw time. */
  var loadedCount = 0;
  var onAllLoaded = null;

  function noteProgress() {
    var pct = Math.round((loadedCount / FRAME_COUNT) * 100);
    if (preCount) preCount.textContent = pct;
    if (preBar)   preBar.style.width = pct + '%';
    if (loadedCount === FRAME_COUNT && onAllLoaded) {
      var cb = onAllLoaded; onAllLoaded = null; cb();
    }
  }

  function loadFrame(i) {
    return new Promise(function (resolve) {
      if (loaded[i]) { resolve(); return; }
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        frames[i] = img; loaded[i] = true; loadedCount++;
        if (i === 0) drawNearest(0);
        noteProgress(); resolve();
      };
      img.onerror = function () {
        loadedCount++; noteProgress(); resolve();   // missing != fatal
      };
      img.src = frameURL(i);
    });
  }

  function preloadAll(done) {
    onAllLoaded = done;
    var q = Math.round(FRAME_COUNT * 0.25), h = Math.round(FRAME_COUNT * 0.5),
        t = Math.round(FRAME_COUNT * 0.75);
    var priority = [0, q, h, t, FRAME_COUNT - 1];
    var rest = [];
    for (var i = 0; i < FRAME_COUNT; i++) {
      if (priority.indexOf(i) === -1) rest.push(i);
    }
    Promise.all(priority.map(loadFrame)).then(function () {
      var idx = 0, CONCURRENCY = 6;
      (function pump() {
        var batch = [];
        while (idx < rest.length && batch.length < CONCURRENCY) batch.push(rest[idx++]);
        if (!batch.length) return;
        Promise.all(batch.map(loadFrame)).then(pump);
      })();
    });
  }

  function finishPreload() {
    window.__gravityReady = true;
    if (window.__gravityWatchdog) clearTimeout(window.__gravityWatchdog);
    drawNearest(0);                                    // land on a sharp frame 0
    if (preloader) {
      preloader.classList.add('is-done');
      setTimeout(function () { preloader.style.display = 'none'; }, 950);
    }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  /* ---------------- Caption / hint / shadow state ---------------- */
  function setProgressUI(p) {
    if (hint) hint.classList.toggle('is-gone', p > 0.02);
    if (cap3) cap3.classList.toggle('is-live', p > 0.8);
  }

  /* ---------------- Scroll engines ---------------- */
  function initGSAPScroll() {
    gsap.registerPlugin(ScrollTrigger);

    /* Lenis on GSAP's single ticker — one clock, not three. */
    if (window.Lenis) {
      var lenis = new Lenis({ lerp: 0.1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    var state = { frame: 0 };
    var D = 10; /* timeline seconds; frame tween spans all of it */

    var tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      scrollTrigger: {
        trigger: '#sequence',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) { setProgressUI(self.progress); }
      }
    });

    /* The scrub itself: ease 'none' — scroll position IS the easing. */
    tl.to(state, {
      frame: FRAME_COUNT - 1, duration: D, ease: 'none',
      onUpdate: function () { drawNearest(Math.round(state.frame)); }
    }, 0);

    /* Contact shadow: the burger floats up, the shadow shrinks & softens. */
    tl.fromTo('#contactShadow',
      { scale: 1,    opacity: 0.95 },
      { scale: 0.78, opacity: 0.5, duration: D, ease: 'none' }, 0);

    /* Beat 1 — visible on arrival, exits as the film gets going. */
    tl.to('#cap1', { y: -70, autoAlpha: 0, duration: 1.1, ease: 'expo.inOut' }, 1.7);
    /* Beat 2 — the suspended-ingredients moment. */
    tl.fromTo('#cap2', { y: 46, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.0 }, 3.7);
    tl.to('#cap2',     { y: -56, autoAlpha: 0, duration: 1.0, ease: 'expo.inOut' }, 5.9);
    /* Beat 3 — lands at the end and stays (CTA lives here). */
    tl.fromTo('#cap3', { y: 46, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1 }, 7.9);
  }

  /* Fallback if the GSAP CDN failed: native scroll + rAF lerp, still smooth. */
  function initNativeScroll() {
    var section = document.getElementById('sequence');
    var target = 0, current = 0, ticking = false;
    function measure() {
      var r = section.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      target = p * (FRAME_COUNT - 1);
      setProgressUI(p);
      setCaptionFallback(p);
      if (!ticking) { ticking = true; requestAnimationFrame(step); }
    }
    function step() {
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.05) current = target;
      drawNearest(Math.round(current));
      if (current !== target) requestAnimationFrame(step);
      else ticking = false;
    }
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    measure();
  }

  /* Caption crossfades for the no-GSAP path (transform/opacity via CSS classes). */
  function setCaptionFallback(p) {
    var c1 = document.getElementById('cap1'),
        c2 = document.getElementById('cap2'),
        c3 = document.getElementById('cap3');
    setCap(c1, p < 0.24);
    setCap(c2, p >= 0.36 && p < 0.66);
    setCap(c3, p >= 0.78);
    function setCap(el, on) {
      if (!el) return;
      el.style.opacity = on ? '1' : '0';
      el.style.visibility = on ? 'visible' : 'hidden';
      el.style.transform = on ? 'translateY(0)' : 'translateY(30px)';
      el.style.transition = 'opacity .6s cubic-bezier(.16,1,.3,1), transform .6s cubic-bezier(.16,1,.3,1)';
    }
  }

  /* ---------------- Boot ---------------- */
  sizeCanvas();
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeCanvas, 120);
  });

  if (REDUCED) {
    /* Reduced motion: no Lenis, no scrub — one still, mid-sequence. */
    var mid = Math.floor(FRAME_COUNT / 2);
    if (preNote) preNote.textContent = 'Loading a still frame';
    loadFrame(mid).then(function () {
      drawNearest(mid);
      var c1 = document.getElementById('cap1'), c2 = document.getElementById('cap2');
      if (c1) c1.style.display = 'none';
      if (c2) c2.style.display = 'none';
      if (cap3) {
        cap3.style.opacity = '1'; cap3.style.visibility = 'visible';
        cap3.classList.add('is-live');
      }
      if (hint) hint.style.display = 'none';
      var sh = document.getElementById('contactShadow');
      if (sh) { sh.style.transform = 'scale(.88)'; sh.style.opacity = '.7'; }
      finishPreload();
    });
  } else {
    preloadAll(function () {
      finishPreload();
      if (window.gsap && window.ScrollTrigger) initGSAPScroll();
      else initNativeScroll();
    });
  }

  /* ---------------- Section reveals (cheap, below the hero) ---------------- */
  var revealEls = document.querySelectorAll('.dish, .craft-card, .story-media, .story-copy, .visit-block, .intro');
  if ('IntersectionObserver' in window && !REDUCED) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  /* ---------------- Cart ---------------- */
  var TAX_RATE = 0.085;
  var cart = {};   /* id -> {name, price, qty} */

  var drawer   = document.getElementById('cartDrawer');
  var overlay  = document.getElementById('cartOverlay');
  var countEl  = document.getElementById('cartCount');
  var itemsEl  = document.getElementById('cartItems');
  var emptyEl  = document.getElementById('cartEmpty');
  var totalsEl = document.getElementById('cartTotals');
  var subEl    = document.getElementById('subTotal');
  var taxEl    = document.getElementById('taxTotal');
  var grandEl  = document.getElementById('grandTotal');
  var checkoutBtn = document.getElementById('checkoutBtn');
  var cartView = document.getElementById('cartView');
  var confirmView = document.getElementById('confirmView');
  var orderNumberEl = document.getElementById('orderNumber');

  function money(n) { return '$' + n.toFixed(2); }

  function cartTotals() {
    var sub = 0, count = 0;
    Object.keys(cart).forEach(function (id) {
      sub += cart[id].price * cart[id].qty;
      count += cart[id].qty;
    });
    var tax = sub * TAX_RATE;
    return { sub: sub, tax: tax, total: sub + tax, count: count };
  }

  function renderCart() {
    var t = cartTotals();
    countEl.textContent = t.count;
    itemsEl.innerHTML = '';
    var ids = Object.keys(cart);
    emptyEl.style.display = ids.length ? 'none' : 'block';
    totalsEl.hidden = !ids.length;
    checkoutBtn.disabled = !ids.length;

    ids.forEach(function (id) {
      var item = cart[id];
      var li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML =
        '<div><div class="cart-item-name"></div>' +
        '<div class="cart-item-unit">' + money(item.price) + ' each</div></div>' +
        '<div class="cart-item-controls">' +
          '<button class="qty-btn" type="button" data-dec="' + id + '" aria-label="Decrease quantity">−</button>' +
          '<span class="qty-num">' + item.qty + '</span>' +
          '<button class="qty-btn" type="button" data-inc="' + id + '" aria-label="Increase quantity">+</button>' +
        '</div>' +
        '<button class="remove-btn" type="button" data-remove="' + id + '">Remove</button>' +
        '<div class="cart-item-unit">' + money(item.price * item.qty) + '</div>';
      li.querySelector('.cart-item-name').textContent = item.name;
      itemsEl.appendChild(li);
    });

    subEl.textContent = money(t.sub);
    taxEl.textContent = money(t.tax);
    grandEl.textContent = money(t.total);
  }

  function openCart() {
    cartView.hidden = false;
    confirmView.hidden = true;
    overlay.hidden = false;
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
      drawer.classList.add('is-open');
    });
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeCart() {
    overlay.classList.remove('is-open');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    setTimeout(function () { overlay.hidden = true; }, 520);
  }

  document.getElementById('cartButton').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });

  document.querySelectorAll('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-id');
      if (!cart[id]) {
        cart[id] = {
          name: btn.getAttribute('data-name'),
          price: parseFloat(btn.getAttribute('data-price')),
          qty: 0
        };
      }
      cart[id].qty++;
      renderCart();
      btn.classList.add('is-added');
      var original = btn.textContent;
      btn.textContent = 'Added ✓';
      setTimeout(function () { btn.classList.remove('is-added'); btn.textContent = original; }, 1100);
    });
  });

  itemsEl.addEventListener('click', function (e) {
    var inc = e.target.getAttribute('data-inc');
    var dec = e.target.getAttribute('data-dec');
    var rem = e.target.getAttribute('data-remove');
    if (inc && cart[inc]) cart[inc].qty++;
    if (dec && cart[dec]) { cart[dec].qty--; if (cart[dec].qty <= 0) delete cart[dec]; }
    if (rem && cart[rem]) delete cart[rem];
    if (inc || dec || rem) renderCart();
  });

  checkoutBtn.addEventListener('click', function () {
    if (!Object.keys(cart).length) return;
    orderNumberEl.textContent = 'GRV-' + Math.floor(1000 + Math.random() * 9000);
    cart = {};
    renderCart();
    cartView.hidden = true;
    confirmView.hidden = false;
  });
  document.getElementById('confirmDone').addEventListener('click', closeCart);

  renderCart();
})();
