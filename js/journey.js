/* ==========================================================================
   journey.js — "second life" map. A garment travels two routes as you scroll:
   wearable (closet → donation → new owner → another story)
   damaged  (closet → recycling → new material)
   ========================================================================== */
(function () {
  "use strict";
  var section = document.getElementById("how");
  var mapEl = document.getElementById("journey-map");
  var caption = document.getElementById("journey-caption");
  if (!section || !mapEl) return;

  var NS = "http://www.w3.org/2000/svg";
  var COPY = {
    closet: "It starts in your closet.",
    donation: "Wearable clothes are collected for donation.",
    owner: "A new owner puts it on.",
    story: "Another story begins.",
    recycling: "Damaged clothes are separated for recycling.",
    material: "Shredded and transformed into recycled yarn."
  };

  /* Layouts: wide (horizontal) and narrow (vertical) */
  var LAYOUTS = {
    wide: {
      box: [1000, 460],
      nodes: { closet: [90, 230], donation: [380, 100], owner: [640, 100], story: [900, 100], recycling: [380, 360], material: [740, 360] },
      A: "M90 230C230 230 240 100 380 100L900 100",
      B: "M90 230C230 230 240 360 380 360L740 360",
      label: function (n) { return n === "closet" ? [0, 44, "middle"] : (n === "recycling" || n === "material" ? [0, 44, "middle"] : [0, -30, "middle"]); }
    },
    narrow: {
      box: [360, 640],
      nodes: { closet: [180, 40], donation: [80, 170], owner: [80, 330], story: [80, 490], recycling: [280, 260], material: [280, 440] },
      A: "M180 40C180 110 80 100 80 170L80 490",
      B: "M180 40C180 150 280 130 280 260L280 440",
      label: function (n) { return n === "closet" ? [0, -22, "middle"] : (n === "recycling" || n === "material" ? [-18, 5, "end"] : [18, 5, "start"]); }
    }
  };
  var NAMES = { closet: "Your closet", donation: "Donation", owner: "New owner", story: "Another story", recycling: "Recycling", material: "New material" };
  var ROUTE_A = ["closet", "donation", "owner", "story"], ROUTE_B = ["closet", "recycling", "material"];

  var S = null;   // built scene
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function build() {
    var narrow = window.innerWidth < 820, L = narrow ? LAYOUTS.narrow : LAYOUTS.wide;
    mapEl.innerHTML = "";
    var svg = el("svg", { viewBox: "0 0 " + L.box[0] + " " + L.box[1], preserveAspectRatio: "xMidYMid meet" }, mapEl);
    var pA = el("path", { d: L.A, class: "j-base" }, svg), pB = el("path", { d: L.B, class: "j-base" }, svg);
    var dA = el("path", { d: L.A, class: "j-draw" }, svg), dB = el("path", { d: L.B, class: "j-draw alt" }, svg);
    var lenA = dA.getTotalLength(), lenB = dB.getTotalLength();
    dA.style.strokeDasharray = lenA; dB.style.strokeDasharray = lenB;

    var nodes = {};
    Object.keys(L.nodes).forEach(function (k) {
      var p = L.nodes[k], off = L.label(k);
      var c = el("circle", { cx: p[0], cy: p[1], r: 8, class: "j-node" }, svg);
      var t = el("text", { x: p[0] + off[0], y: p[1] + off[1], "text-anchor": off[2], class: "j-label" }, svg);
      t.textContent = NAMES[k];
      nodes[k] = { c: c, t: t, at: { A: frac(dA, lenA, p), B: frac(dB, lenB, p) } };
    });

    var g = el("g", { class: "j-garment" }, svg);
    var u = el("use", { href: "#g-tee", x: -26, y: -26, width: 52, height: 52 }, g);
    S = { dA: dA, dB: dB, lenA: lenA, lenB: lenB, nodes: nodes, g: g, last: "" };
    update();
  }

  /* Find how far along a path a node sits (nearest sampled point) */
  function frac(path, len, p) {
    var best = 0, bd = Infinity;
    for (var l = 0; l <= len; l += 3) {
      var q = path.getPointAtLength(l), d = (q.x - p[0]) * (q.x - p[0]) + (q.y - p[1]) * (q.y - p[1]);
      if (d < bd) { bd = d; best = l; }
    }
    return best / len;
  }

  function update() {
    if (!S) return;
    var p = PD.progress(section);
    var a = PD.clamp(p / 0.44, 0, 1), b = PD.clamp((p - 0.56) / 0.44, 0, 1);
    var onB = p >= 0.5, path = onB ? S.dB : S.dA, len = onB ? S.lenB : S.lenA, f = onB ? b : a;

    S.dA.style.strokeDashoffset = S.lenA * (1 - a);
    S.dB.style.strokeDashoffset = S.lenB * (1 - b);

    var pos = path.getPointAtLength(len * f);
    S.g.setAttribute("transform", "translate(" + pos.x.toFixed(1) + " " + pos.y.toFixed(1) + ")");
    // Fade out at the end of route A, reappear at the start of route B
    var fade = p < 0.44 ? 1 : p < 0.5 ? 1 - (p - 0.44) / 0.06 : p < 0.56 ? (p - 0.5) / 0.06 : 1;
    S.g.style.opacity = fade;

    var active = "closet";
    ROUTE_A.forEach(function (k) { if (a >= S.nodes[k].at.A - 0.02 && k !== "closet" && p < 0.5) active = k; });
    if (p >= 0.5) ROUTE_B.forEach(function (k) { if (k !== "closet" && b >= S.nodes[k].at.B - 0.02) active = k; });
    if (p >= 0.5 && active === "closet") active = "closet";
    // After route A completes, keep "story" lit until route B starts
    Object.keys(S.nodes).forEach(function (k) {
      var n = S.nodes[k], on = k === "closet" ? true :
        (ROUTE_A.indexOf(k) > -1 && a >= n.at.A - 0.02) || (ROUTE_B.indexOf(k) > -1 && b >= n.at.B - 0.02);
      n.c.classList.toggle("on", on); n.t.classList.toggle("on", on);
    });
    if (active !== S.last) { S.last = active; caption.textContent = COPY[active]; }
  }

  build();
  PD.onScroll(update);
  var rt, lastNarrow = window.innerWidth < 820;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var n = window.innerWidth < 820;
      if (n !== lastNarrow) { lastNarrow = n; build(); }
    }, 150);
  });
})();
