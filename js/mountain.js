/* ==========================================================================
   mountain.js — "textile mountain". As you scroll, the counter climbs from 1
   to 92 million TONNES (the UNEP global textile-waste estimate) while a pile of
   garments grows on a log scale. The pile is capped at MAX_DRAWN shapes: it is
   a visualization of scale, not a count of 92 million garments. One <canvas>;
   small garments are blitted from a handful of pre-rendered sprites (fast even
   with thousands), large ones are drawn as vectors. Redrawn only when the drawn
   count changes.
   ========================================================================== */
(function () {
  "use strict";
  var section = document.getElementById("scale");
  var canvas = document.getElementById("mountain-canvas");
  if (!section || !canvas) return;

  var ctx = canvas.getContext("2d");
  var numEl = document.getElementById("mountain-num");
  var unitEl = document.getElementById("mountain-unit");
  var ticksEl = document.getElementById("mountain-ticks");

  var TOTAL = 92000000;                                   // tonnes of textile waste per year, globally
  var STEPS = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, TOTAL];
  var LABELS = ["1", "10", "100", "1K", "10K", "100K", "1M", "10M", "92M"];
  var MAX_DRAWN = 2600;                                   // set per screen size in resize()
  var shirt = new Path2D("M30 12h12q8 10 16 0h12l22 16-10 16-10-6v46H28V38l-10 6L8 28Z");
  // Back-of-pile tones are deeper, front tones lighter: that is all the "depth" the pile needs
  var BACK = ["#1557b0", "#0e3c7d", "#2f78d6", "#1b4f9c"];
  var FRONT = ["#4d9fff", "#b9d3f2", "#eaf4ff", "#8fb8ea", "#6fa8e8", "#b9d3f2"];
  var SPR_ROT = 12, SPR_PX = 56, sprites = null;           // sprites[tone][rotation] = small canvas

  LABELS.forEach(function (label) {
    var li = document.createElement("li");
    li.textContent = label;
    ticksEl.appendChild(li);
  });
  var tickEls = ticksEl.children;

  var W = 0, H = 0, dpr = 1, lastDrawn = -1, lastSize = -1;
  var copyEl = document.querySelector(".mountain-copy"), room = 9999;   // vertical space below the copy

  /* Measure the copy at its tallest ("92 MILLION" + unit) so the pile can never climb into it */
  function measureRoom() {
    if (!copyEl) return;
    var n = numEl.textContent, u = unitEl.textContent;
    numEl.textContent = "92 MILLION"; unitEl.textContent = "TONNES EVERY YEAR";
    room = H - (copyEl.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top) - 12;
    numEl.textContent = n; unitEl.textContent = u;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    MAX_DRAWN = W < 820 ? 4200 : 8000;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    measureRoom();
    lastDrawn = -1;
    update();
  }

  /* Cheap deterministic hash → 0..1, so a given garment keeps its look between redraws */
  function rnd(n) {
    n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4;
    n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15;
    return (n >>> 0) / 4294967296;
  }

  function buildSprites() {
    sprites = [];
    BACK.concat(FRONT).forEach(function (color) {
      var row = [];
      for (var r = 0; r < SPR_ROT; r++) {
        var c = document.createElement("canvas"), g;
        c.width = c.height = SPR_PX; g = c.getContext("2d");
        g.translate(SPR_PX / 2, SPR_PX / 2); g.rotate(r * 2 * Math.PI / SPR_ROT);
        g.scale(SPR_PX / 100 * 0.92, SPR_PX / 100 * 0.92); g.translate(-50, -50);
        g.fillStyle = color; g.fill(shirt);
        g.lineWidth = 3.4; g.lineJoin = "round"; g.strokeStyle = "rgba(6,26,61,0.4)"; g.stroke(shirt);   // hairline keeps layers legible
        row.push(c);
      }
      sprites.push(row);
    });
  }

  /* Organic silhouette: a broad mound whose width and centre drift with height */
  function profile(u) {
    var p = 1 - Math.pow(Math.min(u, 1), 1.55);
    var n = 1 + 0.07 * Math.sin(u * 11 + 1.3) + 0.05 * Math.sin(u * 27 + 4.1);
    return Math.max(p * n, 0.05);
  }
  function drift(u) { return W * 0.035 * Math.sin(u * 4.2 + 1.1); }

  /* Big garments (few of them) sit side by side; small ones (thousands) overlap heavily */
  function loose(size) { return Math.max(0, Math.min(1, (size - 30) / 90)); }
  function rowH(size) { return size * (0.36 + 0.3 * loose(size)); }
  function colW(size) { return size * (0.5 + 0.3 * loose(size)); }

  /* Height of the pile for a given garment size (rows are laid bottom-up) */
  function pileH(size, k, baseW, height) {
    var rh = rowH(size), cw = colW(size), placed = 0, row = 0;
    while (placed < k && row < 900) {
      placed += Math.max(1, Math.floor(baseW * profile(row * rh / height) / cw)); row++;
    }
    return (row - 1) * rh + size;
  }

  function draw(k) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (k < 1) return;
    var narrow = W < 820;
    var baseW = W * 0.98, height = Math.min(H * (narrow ? 0.58 : 0.64), baseW * (narrow ? 1.05 : 0.8));
    if (room > 80) height = Math.min(height, room);
    var smax = Math.min(W, H) * 0.34, size = smax;
    // Choose the garment size so the pile exactly fills its band, whatever k is
    if (pileH(smax, k, baseW, height) > height) {
      var lo = 4, hi = smax;
      for (var it = 0; it < 18; it++) {
        var mid = (lo + hi) / 2;
        if (pileH(mid, k, baseW, height) > height) hi = mid; else lo = mid;
      }
      size = lo;
    }
    var rowHt = rowH(size), colWd = colW(size), ground = H - 2, placed = 0, row = 0;
    var useSprites = size < 44;
    if (useSprites && !sprites) buildSprites();

    // Lay out every garment first, then paint back layer → front layer
    var X = [], Y = [], S = [], T = [], R = [], D = [];
    while (placed < k && row < 900) {
      var u = row * rowHt / height;
      var width = baseW * profile(u), cap = Math.max(1, Math.floor(width / colWd));
      var n = Math.min(cap, k - placed), step = width / cap;
      var x0 = W / 2 + drift(u) - (n * step) / 2;
      for (var i = 0; i < n; i++) {
        var id = placed + i, d = rnd(id * 5 + 1);
        var sc = (0.72 + 0.7 * rnd(id * 5 + 2)) * (0.88 + 0.28 * d);
        X.push(x0 + (i + 0.5) * step + (rnd(id * 5 + 3) - 0.5) * colWd * 1.5);
        Y.push(ground - row * rowHt - size * 0.4 + (rnd(id * 5 + 4) - 0.5) * rowHt * 1.1);
        S.push(size * sc);
        T.push(d < 0.42 ? (rnd(id * 7 + 5) * BACK.length) | 0 : BACK.length + ((rnd(id * 7 + 6) * FRONT.length) | 0));
        R.push((rnd(id * 5 + 5) * SPR_ROT) | 0);
        D.push(d < 0.42 ? 0 : 1);
      }
      placed += n; row++;
    }
    for (var pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = pass === 0 ? 0.88 : 1;
      for (var j = 0; j < X.length; j++) {
        if (D[j] !== pass) continue;
        if (useSprites) {
          ctx.drawImage(sprites[T[j]][R[j]], X[j] - S[j] / 2, Y[j] - S[j] / 2, S[j], S[j]);
        } else {
          ctx.setTransform(S[j] / 100 * dpr, 0, 0, S[j] / 100 * dpr, X[j] * dpr, Y[j] * dpr);
          ctx.rotate((R[j] / SPR_ROT - 0.5) * (0.9 + 5.4 * (1 - loose(size))));
          ctx.translate(-50, -50);
          ctx.fillStyle = (T[j] < BACK.length ? BACK[T[j]] : FRONT[T[j] - BACK.length]);
          ctx.fill(shirt);
          ctx.lineWidth = 2.4; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(6,26,61,0.4)"; ctx.stroke(shirt);
        }
      }
    }
    ctx.globalAlpha = 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Weight and light, applied only to the garments themselves: compressed dark base, lit crest
    ctx.globalCompositeOperation = "source-atop";
    var top = H - height - 10, g1 = ctx.createLinearGradient(0, H - height * 0.55, 0, H);
    g1.addColorStop(0, "rgba(6,26,61,0)"); g1.addColorStop(1, "rgba(6,26,61,0.42)");
    ctx.fillStyle = g1; ctx.fillRect(0, H - height * 0.55, W, height * 0.55 + 2);
    var g2 = ctx.createLinearGradient(0, top, 0, top + height * 0.4);
    g2.addColorStop(0, "rgba(185,211,242,0.14)"); g2.addColorStop(1, "rgba(185,211,242,0)");
    ctx.fillStyle = g2; ctx.fillRect(0, top, W, height * 0.4);
    ctx.globalCompositeOperation = "source-over";
  }

  /* 1,234 → "1,234"   3,400,000 → "3.4 MILLION"   92,000,000 → "92 MILLION" */
  function format(n) {
    if (n < 1e6) return n.toLocaleString();
    var m = n / 1e6;
    return (m >= 10 ? Math.round(m) : Math.round(m * 10) / 10) + " MILLION";
  }

  function update() {
    if (!W) return;
    var p = PD.progress(section);
    var t = PD.clamp(p / 0.92, 0, 1);
    var count = t >= 1 ? TOTAL : Math.round(Math.pow(TOTAL, t));        // 1 → 92,000,000 tonnes (log scale)
    numEl.textContent = format(count);
    unitEl.textContent = count === 1 ? "TONNE EVERY YEAR" : "TONNES EVERY YEAR";
    for (var i = 0; i < tickEls.length; i++) tickEls[i].classList.toggle("on", count >= STEPS[i]);

    var drawn = Math.max(1, Math.round(Math.pow(MAX_DRAWN, t)));          // pile grows on the same log scale, capped

    if (drawn !== lastDrawn) { lastDrawn = drawn; draw(drawn); }
  }

  var visible = false;
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) update(); }, { rootMargin: "100px" }).observe(section);
  PD.onScroll(function () { if (visible) update(); });
  window.addEventListener("resize", resize);
  resize();
})();
