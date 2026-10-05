/* ==========================================================================
   wheel.js — draggable wheel with real momentum physics
   Pointer Events cover mouse, touch and pen. touch-action:none is set in CSS
   on the wheel only, so the rest of the page keeps scrolling normally.
   ========================================================================== */
(function () {
  "use strict";

  var box = document.getElementById("wheel");
  var rotEl = document.getElementById("wheel-rot");
  if (!box || !rotEl) return;

  var FORM = "https://forms.gle/fsKPXXu5b3eww1VeA";
  var SEGMENTS = [
    { name: "Donate", copy: "Someone else could wear it.", cta: "Donate your clothes", href: FORM, external: true, fill: "#0a2a5e" },
    { name: "Reuse", copy: "Hand it on to someone who will keep wearing it. Wearable clothes keep their value.", cta: "See your closet", href: "#closet", fill: "#1557b0" },
    { name: "Recycle", copy: "Too worn to wear? It can still have another purpose.", cta: "See how it works", href: "#how", fill: "#0e3c7d" },
    { name: "Learn", copy: "Every garment can have a second life. Here is how.", cta: "Show me", href: "#how", scroll: true, fill: "#2f6fc7" },
    { name: "Take action", copy: "Got clothes you don’t wear? Let’s get them moving.", cta: "Take me to the form", href: "#donate", scroll: true, fill: "#12489a" }
  ];
  var N = SEGMENTS.length, STEP = 360 / N;

  /* ---------- Build the SVG ---------- */
  function pt(r, deg) {
    var a = deg * Math.PI / 180;
    return (r * Math.sin(a)).toFixed(2) + " " + (-r * Math.cos(a)).toFixed(2);
  }
  var R0 = 74, R1 = 176, svg = "";
  svg += '<circle r="199" fill="#f6f3ec" stroke="#0a2a5e" stroke-opacity=".35"/>';
  svg += '<circle class="ring" r="191"/>';
  var ticks = "";
  for (var t = 0; t < 72; t++) ticks += "M" + pt(184, t * 5) + "L" + pt(t % 6 === 0 ? 190 : 187, t * 5);
  svg += '<path d="' + ticks + '" stroke="#0a2a5e" stroke-opacity=".5" fill="none"/>';
  SEGMENTS.forEach(function (s, i) {
    var a0 = i * STEP - STEP / 2, a1 = a0 + STEP;
    var d = "M" + pt(R0, a0) + "L" + pt(R1, a0) + "A" + R1 + " " + R1 + " 0 0 1 " + pt(R1, a1) +
            "L" + pt(R0, a1) + "A" + R0 + " " + R0 + " 0 0 0 " + pt(R0, a0) + "Z";
    svg += '<path class="seg" data-i="' + i + '" d="' + d + '" fill="' + s.fill + '" stroke="#f6f3ec" stroke-width="2"/>';
  });
  svg += '<circle class="ring" r="' + (R1 + 6) + '" stroke-dasharray="1 4"/><circle class="ring" r="' + (R0 - 6) + '"/>';
  SEGMENTS.forEach(function (s, i) {
    svg += '<g class="lab" data-i="' + i + '" transform="rotate(' + i * STEP + ')">' +
      '<text class="seg-num" y="-158" text-anchor="middle">0' + (i + 1) + '</text>' +
      '<text class="seg-label" y="-122" text-anchor="middle">' + s.name + '</text></g>';
  });
  rotEl.innerHTML = '<svg viewBox="-200 -200 400 400" role="presentation">' + svg + "</svg>";
  var segEls = rotEl.querySelectorAll(".seg");
  var labEls = rotEl.querySelectorAll(".lab");

  /* ---------- State ---------- */
  var pointer = box.querySelector(".wheel-pointer");
  var rot = 0, vel = 0;                 // degrees, degrees per ms
  var dragging = false, raf = 0, lastTick = 0;
  var startAngle = 0, samples = [], autoTimer = 0;

  var ui = {
    result: document.getElementById("wheel-result"),
    kicker: document.getElementById("wheel-kicker"),
    answer: document.getElementById("wheel-answer"),
    copy: document.getElementById("wheel-copy"),
    cta: document.getElementById("wheel-cta"),
    ctaLabel: document.getElementById("wheel-cta-label")
  };

  function render() {
    rotEl.style.transform = "rotate(" + rot + "deg)";
    // Tick feedback when a segment boundary passes the pointer
    var b = Math.floor((-rot + STEP / 2) / STEP);
    if (b !== lastTick) { lastTick = b; flick(); }
  }

  function flick() {
    if (PD.reduced || !pointer.animate) return;
    pointer.animate([{ transform: "rotate(" + (vel >= 0 ? -18 : 18) + "deg)" }, { transform: "rotate(0deg)" }], { duration: 180, easing: "ease-out" });
  }

  function angleOf(e) {
    var r = box.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  }
  function wrap(d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }

  function setLive(on) { box.classList.toggle("live", on); }
  function clearSelection() {
    segEls.forEach(function (s) { s.classList.remove("on"); });
    labEls.forEach(function (s) { s.classList.remove("on"); });
  }
  function cancelAuto() { clearTimeout(autoTimer); }

  /* ---------- Dragging ---------- */
  box.addEventListener("pointerdown", function (e) {
    if (e.target.closest(".wheel-hub") || (e.pointerType === "mouse" && e.button !== 0)) return;
    cancelAnimationFrame(raf); cancelAuto();
    dragging = true; vel = 0;
    box.classList.add("dragging"); setLive(true);
    box.setPointerCapture(e.pointerId);
    startAngle = angleOf(e);
    samples = [{ t: performance.now(), r: rot }];
    clearSelection();
  });

  box.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var a = angleOf(e);
    rot += wrap(a - startAngle);
    startAngle = a;
    var now = performance.now();
    samples.push({ t: now, r: rot });
    while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
    vel = Math.sign(rot - samples[0].r) || vel;
    render();
  });

  function release() {
    if (!dragging) return;
    dragging = false;
    box.classList.remove("dragging");
    var first = samples[0], last = samples[samples.length - 1];
    var stale = performance.now() - last.t > 80;      // pointer rested before release
    var dt = Math.max(last.t - first.t, 16);
    vel = stale ? 0 : PD.clamp((last.r - first.r) / dt, -3, 3);
    coast();
  }
  box.addEventListener("pointerup", release);
  box.addEventListener("pointercancel", release);
  box.addEventListener("lostpointercapture", release);

  /* ---------- Momentum ---------- */
  var FRICTION = 0.0022;                // per ms; higher = stops sooner
  function coast() {
    cancelAnimationFrame(raf);
    var prev = performance.now();
    (function step(now) {
      var dt = Math.min(now - prev, 32); prev = now;
      rot += vel * dt;
      vel *= Math.exp(-FRICTION * dt);
      render();
      if (Math.abs(vel) > 0.02) raf = requestAnimationFrame(step);
      else settle();
    })(prev);
  }

  /* Ease to the nearest segment centre, then announce it */
  function settle() {
    var from = rot, idx = Math.round(-from / STEP);
    glide(from, -idx * STEP, 420, function () {
      setLive(false);
      choose(((idx % N) + N) % N);
    });
  }

  function glide(from, to, ms, done) {
    var start = performance.now(), dur = PD.reduced ? 1 : ms;
    (function step(now) {
      var t = PD.clamp((now - start) / dur, 0, 1);
      rot = from + (to - from) * (1 - Math.pow(1 - t, 3));
      render();
      if (t < 1) raf = requestAnimationFrame(step);
      else done();
    })(start);
  }

  /* ---------- Spin button + keyboard ---------- */
  function spin() {
    cancelAuto(); clearSelection(); setLive(true);
    cancelAnimationFrame(raf);
    vel = (1.1 + Math.random() * 1.3) * (Math.random() < 0.15 ? -1 : 1);
    coast();
  }
  function turn(dir) {
    cancelAuto(); cancelAnimationFrame(raf); clearSelection();
    var idx = Math.round(-rot / STEP) + dir;
    vel = -dir;
    glide(rot, -idx * STEP, 380, function () { choose(((idx % N) + N) % N); });
  }
  document.getElementById("wheel-spin").addEventListener("click", spin);
  box.addEventListener("keydown", function (e) {
    if (e.target !== box) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); turn(1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); turn(-1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spin(); }
  });

  /* ---------- Result ---------- */
  function choose(i) {
    var s = SEGMENTS[i];
    segEls[i].classList.add("on"); labEls[i].classList.add("on");
    ui.kicker.textContent = "It landed on";
    ui.answer.textContent = s.name;
    ui.copy.textContent = s.copy;
    ui.ctaLabel.textContent = s.cta;
    ui.cta.href = s.href;
    if (s.external) { ui.cta.target = "_blank"; ui.cta.rel = "noopener"; }
    else { ui.cta.removeAttribute("target"); ui.cta.removeAttribute("rel"); }
    ui.cta.hidden = false;
    ui.result.classList.remove("pop"); void ui.result.offsetWidth; ui.result.classList.add("pop");

    // Learn / Take action: carry the user there unless they do something else first
    if (s.scroll && !PD.reduced) {
      autoTimer = setTimeout(function () {
        var el = document.querySelector(s.href);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 1800);
    }
  }
  ["wheel", "touchstart", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, function (e) { if (!(e.target instanceof Node) || !box.contains(e.target)) cancelAuto(); }, { passive: true });
  });
})();
