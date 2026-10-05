/* ==========================================================================
   mountain.js — "textile mountain". As you scroll, the counter climbs from 1
   to 92 million TONNES (the UNEP global textile-waste estimate) while a pile of
   tiny garments grows on a log scale. The pile is capped at MAX_DRAWN shapes:
   it is a visualization of scale, not a count of 92 million garments.
   One <canvas>, one reused Path2D, redrawn only when the drawn count changes.
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
  var MAX_DRAWN = 2600;
  var COLORS = ["#4d9fff", "#b9d3f2", "#1557b0", "#eaf4ff", "#8fb8ea"];
  var shirt = new Path2D("M30 12h12q8 10 16 0h12l22 16-10 16-10-6v46H28V38l-10 6L8 28Z");

  LABELS.forEach(function (label) {
    var li = document.createElement("li");
    li.textContent = label;
    ticksEl.appendChild(li);
  });
  var tickEls = ticksEl.children;

  var W = 0, H = 0, dpr = 1, lastDrawn = -1, lastSize = -1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    lastDrawn = -1;
    update();
  }

  /* Height of the pile for a given garment size (same row maths as draw) */
  function pileHeight(size, k, baseW, height) {
    var rowH = size * 0.5, colW = size * 0.62, placed = 0, row = 0;
    while (placed < k && row < 400) {
      var cap = Math.max(1, Math.floor(baseW * Math.max(0, 1 - (row * rowH) / height) / colW));
      placed += cap; row++;
    }
    return (row - 1) * rowH + size;
  }

  /* Pile: rows from the ground up, each row narrower than the one below (a triangle),
     filled from the centre outwards so the pile always looks symmetrical. */
  function draw(k) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (k < 1) return;
    var baseW = W * 0.96, height = Math.min(H * 0.62, baseW * 0.8), area = baseW * height / 2;
    var size = Math.min(Math.sqrt(area / (k * 0.31)), Math.min(W, H) * 0.34);
    size = Math.max(size, 6);
    // Few, large garments would otherwise tower into the copy: shrink until the pile fits its band
    for (var g = 0; g < 40 && size > 6 && pileHeight(size, k, baseW, height) > height; g++) size *= 0.92;
    var rowH = size * 0.5, colW = size * 0.62, ground = H - 6, placed = 0, row = 0;
    while (placed < k) {
      var y = ground - row * rowH - size;
      var width = baseW * Math.max(0.0, 1 - (row * rowH) / height);
      var cap = Math.max(1, Math.floor(width / colW));
      var n = Math.min(cap, k - placed);
      var x0 = W / 2 - (n * colW) / 2;
      for (var i = 0; i < n; i++) {
        var idx = placed + i;
        var jitter = ((idx * 9301 + 49297) % 233280) / 233280;
        ctx.setTransform(size / 100 * dpr, 0, 0, size / 100 * dpr, (x0 + i * colW) * dpr, y * dpr);
        ctx.rotate((jitter - 0.5) * 0.5);
        ctx.fillStyle = COLORS[idx % COLORS.length];
        ctx.fill(shirt);
      }
      placed += n; row++;
      if (row > 400) break;
    }
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
