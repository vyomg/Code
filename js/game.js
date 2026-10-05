/* ==========================================================================
   game.js — "The Closet Game"
   A 30-second arcade run: steer a hanger, collect wearable garments, dodge
   waste. Never starts by itself; pauses when you leave it. One canvas, one
   rAF loop that only runs while a round is in progress.
   ========================================================================== */
(function () {
  "use strict";

  var box = document.getElementById("game-box");
  var canvas = document.getElementById("game-canvas");
  if (!box || !canvas) return;

  var ctx = canvas.getContext("2d");
  var el = {
    score: document.getElementById("g-score"),
    time: document.getElementById("g-time"),
    saved: document.getElementById("g-saved"),
    combo: document.getElementById("g-combo"),
    final: document.getElementById("g-final"),
    finalStats: document.getElementById("g-final-stats"),
    live: document.getElementById("g-live"),
    start: document.getElementById("g-start"),
    resume: document.getElementById("g-resume"),
    again: document.getElementById("g-again")
  };

  /* ---------- Config ---------- */
  var DURATION = 30;          // seconds
  var WASTE_TIME_PENALTY = 2; // seconds lost per waste item
  var WASTE_SCORE_PENALTY = 15;
  var GARMENT_POINTS = 10;

  var GARMENTS = [
    { path: new Path2D("M30 12h12q8 10 16 0h12l22 16-10 16-10-6v46H28V38l-10 6L8 28Z"), color: "#1557b0" },                                  // tee
    { path: new Path2D("M34 14q16 12 32 0l24 16-6 20-10-4v44H26V46l-10 4-6-20Z"), color: "#4d9fff" },                                          // hoodie
    { path: new Path2D("M26 8h48l4 84H55L50 38l-5 54H22Z"), color: "#0e3c7d" },                                                                  // jeans
    { path: new Path2D("M32 10l18 8 18-8 22 14 2 60H80l-4-40-2 48H26l-2-48-4 40H8l2-60Z"), color: "#6fa8e8" }                                    // jacket
  ];
  var WASTE_PATH = new Path2D("M50 8L66 18 84 16 82 36 94 50 80 62 84 84 62 80 48 94 36 80 16 84 20 62 6 50 20 36 18 16 36 18Z");
  var WASTE_CREASE = new Path2D("M30 34L52 50 38 70M70 32L56 52M62 78L50 58");

  /* ---------- State ---------- */
  var state = "intro";        // intro | play | pause | over
  var W = 0, H = 0, dpr = 1, unit = 40;
  var player = { x: 0, y: 0, tx: 0, ty: 0, r: 20 };
  var items = [], parts = [], pops = [], rings = [];
  var keys = {};
  var score = 0, saved = 0, time = DURATION, elapsed = 0, spawnIn = 0.4, streak = 0, best = 0;
  var raf = 0, last = 0;

  /* ---------- Helpers ---------- */
  function pad(n, len) { n = String(Math.max(0, Math.round(n))); while (n.length < len) n = "0" + n; return n; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function setState(s) {
    state = s;
    box.dataset.state = s;
    document.body.classList.toggle("playing", s === "play");
  }
  function multiplier() { return Math.min(3, 1 + Math.floor(streak / 4)); }

  function hud() {
    el.score.textContent = pad(score, 3);
    el.time.textContent = Math.ceil(time);
    el.saved.textContent = pad(saved, 2);
    var m = multiplier();
    el.combo.textContent = "x" + m;
    el.combo.classList.toggle("on", m > 1);
  }

  /* ---------- Sizing ---------- */
  function resize() {
    var r = box.getBoundingClientRect();
    var ow = W, oh = H;
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    unit = PD.clamp(W * 0.05, 30, 54);
    player.r = unit * 0.5;
    if (ow && oh) {         // keep the player in the same relative place
      player.x *= W / ow; player.y *= H / oh; player.tx *= W / ow; player.ty *= H / oh;
    } else { player.x = player.tx = W / 2; player.y = player.ty = H * 0.72; }
    if (state !== "play") drawIdle();
  }

  /* ---------- Drawing ---------- */
  function drawItem(it) {
    var s = it.size;
    ctx.fillStyle = "rgba(10,42,94,0.10)";                       // soft ground shadow
    ctx.beginPath(); ctx.ellipse(it.x + 4, it.y + s * 0.46, s * 0.3, s * 0.08, 0, 0, 6.2832); ctx.fill();
    ctx.save();
    ctx.translate(it.x, it.y); ctx.rotate(it.rot); ctx.scale(s / 100, s / 100); ctx.translate(-50, -50);
    if (it.waste) {
      ctx.globalAlpha = it.alpha;
      ctx.fillStyle = "#c9ced9"; ctx.fill(WASTE_PATH);
      ctx.lineWidth = 3; ctx.strokeStyle = "#5b6880"; ctx.setLineDash([6, 5]); ctx.stroke(WASTE_PATH);
      ctx.setLineDash([]); ctx.lineWidth = 2.5; ctx.strokeStyle = "#7d889c"; ctx.stroke(WASTE_CREASE);
    } else {
      ctx.globalAlpha = it.alpha;
      ctx.fillStyle = it.g.color; ctx.fill(it.g.path);
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.stroke(it.g.path);
    }
    ctx.restore();
  }

  function drawPlayer() {
    var k = unit / 28, x = player.x, y = player.y;
    var g = ctx.createRadialGradient(x, y, 0, x, y, player.r * 2.6);   // soft light around the hanger
    g.addColorStop(0, "rgba(77,159,255,0.30)"); g.addColorStop(1, "rgba(77,159,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, player.r * 2.6, 0, 6.2832); ctx.fill();
    ctx.save();
    ctx.translate(x, y + 2 * k); ctx.scale(k, k);
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = 3; ctx.strokeStyle = "#0a2a5e";
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(-22, 9); ctx.quadraticCurveTo(-24, 12, -20, 12); ctx.lineTo(20, 12); ctx.quadraticCurveTo(24, 12, 22, 9); ctx.closePath();
    ctx.fillStyle = "rgba(21,87,176,0.16)"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, -11); ctx.arc(0, -15, 4, Math.PI / 2, Math.PI * 2.3, false); ctx.stroke();
    ctx.restore();
  }

  function drawFx() {
    var i, p;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.2832); ctx.fill();
    }
    for (i = 0; i < rings.length; i++) {
      p = rings[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.8;
      ctx.strokeStyle = "#0a2a5e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.font = "700 " + Math.round(unit * 0.42) + "px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    for (i = 0; i < pops.length; i++) {
      p = pops[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.c; ctx.fillText(p.t, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < items.length; i++) drawItem(items[i]);
    drawPlayer();
    drawFx();
  }

  /* Static backdrop for the intro / game-over screens (drawn once, no loop) */
  function drawIdle() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var spots = [[0.12, 0.2, 0], [0.86, 0.16, 2], [0.2, 0.78, 3], [0.8, 0.74, 1], [0.5, 0.1, 3], [0.08, 0.5, 1], [0.93, 0.48, 0]];
    ctx.globalAlpha = 0.45;
    spots.forEach(function (s, i) {
      drawItem({ x: W * s[0], y: H * s[1], size: unit * 1.5, rot: (i - 3) * 0.2, alpha: 1, waste: i === 5, g: GARMENTS[s[2]] });
    });
    ctx.globalAlpha = 1;
  }

  /* ---------- Game flow ---------- */
  function reset() {
    items.length = 0; parts.length = 0; pops.length = 0; rings.length = 0;
    score = 0; saved = 0; time = DURATION; elapsed = 0; spawnIn = 0.4; streak = 0;
    player.x = player.tx = W / 2; player.y = player.ty = H * 0.72;
    keys = {};
    hud();
  }

  function start() {
    reset();
    setState("play");
    box.focus({ preventScroll: true });
    el.live.textContent = "Game started.";
    last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }

  function pause() {
    if (state !== "play") return;
    setState("pause");
    cancelAnimationFrame(raf);
    draw();
  }
  function resume() {
    if (state !== "pause") return;
    setState("play");
    box.focus({ preventScroll: true });
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function end() {
    cancelAnimationFrame(raf);
    best = Math.max(best, score);
    el.final.textContent = pad(saved, 2);
    el.finalStats.textContent = "Score " + pad(score, 3) + "  ·  Best " + pad(best, 3);
    el.live.textContent = "Your closet run is over. Clothes saved: " + saved + ". Score: " + score + ".";
    setState("over");
    drawIdle();
    hud();
    setTimeout(function () { if (state === "over") el.again.focus({ preventScroll: true }); }, 450);
  }

  /* ---------- Spawning + effects ---------- */
  function spawn() {
    var wasteShare = 0.2 + Math.min(0.2, elapsed * 0.007);          // 20% rising to 40%
    var waste = Math.random() < wasteShare;
    var size = unit * rand(1.25, 1.65);
    items.push({
      x: rand(size * 0.6, W - size * 0.6), y: -size,
      vy: (unit * 3.3 + elapsed * unit * 0.14) * rand(0.8, 1.3),
      vx: rand(-unit * 0.6, unit * 0.6),
      size: size, r: size * 0.34, rot: rand(-0.5, 0.5), vr: rand(-0.8, 0.8),
      waste: waste, g: GARMENTS[(Math.random() * GARMENTS.length) | 0], alpha: 1
    });
  }

  function burst(x, y, color) {
    if (PD.reduced) return;
    for (var i = 0; i < 9; i++) {
      var a = rand(0, 6.2832), v = rand(unit * 1.2, unit * 3);
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: rand(1.5, 3.2), life: 0.5, max: 0.5, c: color });
    }
  }
  function pop(x, y, text, color) { pops.push({ x: x, y: y - unit * 0.6, t: text, c: color, life: 0.8, max: 0.8 }); }
  function flashTime() {
    el.time.classList.add("hit");
    setTimeout(function () { el.time.classList.remove("hit"); }, 350);
  }

  /* ---------- Frame ---------- */
  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    elapsed += dt; time -= dt;
    var i, it, p;

    // movement: arrow keys / WASD take priority, otherwise glide to the pointer
    var kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (kx || ky) {
      var sp = unit * 13 * dt, n = Math.sqrt(kx * kx + ky * ky);
      player.x += kx / n * sp; player.y += ky / n * sp;
      player.tx = player.x; player.ty = player.y;
    } else {
      var f = 1 - Math.exp(-16 * dt);
      player.x += (player.tx - player.x) * f; player.y += (player.ty - player.y) * f;
    }
    player.x = PD.clamp(player.x, player.r, W - player.r); player.y = PD.clamp(player.y, player.r, H - player.r);

    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = Math.max(0.28, 0.75 - elapsed * 0.014); }

    for (i = items.length - 1; i >= 0; i--) {
      it = items[i];
      it.y += it.vy * dt; it.x += it.vx * dt; it.rot += it.vr * dt;
      if (it.x < it.size * 0.3 || it.x > W - it.size * 0.3) it.vx = -it.vx;
      var dx = it.x - player.x, dy = it.y - player.y, hit = it.r + player.r * 0.85;
      if (dx * dx + dy * dy < hit * hit) {
        items.splice(i, 1);
        if (it.waste) {
          streak = 0;
          score = Math.max(0, score - WASTE_SCORE_PENALTY); time = Math.max(0, time - WASTE_TIME_PENALTY);
          burst(it.x, it.y, "#7d889c"); pop(it.x, it.y, "-" + WASTE_TIME_PENALTY + "s", "#0a2a5e");
          if (!PD.reduced) rings.push({ x: it.x, y: it.y, r: unit * 0.5, life: 0.45, max: 0.45 });
          flashTime();
        } else {
          streak++; saved++;
          var pts = GARMENT_POINTS * multiplier();
          score += pts;
          burst(it.x, it.y, it.g.color); pop(it.x, it.y, "+" + pts, "#1557b0");
        }
        hud();
      } else if (it.y > H + it.size) {
        items.splice(i, 1);
      }
    }

    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i]; p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
    }
    for (i = rings.length - 1; i >= 0; i--) {
      p = rings[i]; p.life -= dt; p.r += unit * 3.5 * dt;
      if (p.life <= 0) rings.splice(i, 1);
    }
    for (i = pops.length - 1; i >= 0; i--) {
      p = pops[i]; p.life -= dt; if (!PD.reduced) p.y -= unit * 1.1 * dt;
      if (p.life <= 0) pops.splice(i, 1);
    }

    el.time.textContent = Math.max(0, Math.ceil(time));
    draw();
    if (time <= 0) { time = 0; end(); return; }
    raf = requestAnimationFrame(frame);
  }

  /* ---------- Input ---------- */
  function pointerTo(e) {
    if (state !== "play") return;
    var r = box.getBoundingClientRect();
    player.tx = PD.clamp(e.clientX - r.left, 0, W);
    // On touch the finger would hide the hanger, so hold it a little above
    player.ty = PD.clamp(e.clientY - r.top - (e.pointerType === "touch" ? unit * 1.6 : 0), 0, H);
    keys = {};
  }
  box.addEventListener("pointermove", pointerTo);
  box.addEventListener("pointerdown", function (e) {
    if (state === "play") { pointerTo(e); if (e.pointerType !== "mouse") try { box.setPointerCapture(e.pointerId); } catch (err) {} }
  });

  var KEYMAP = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down", A: "left", D: "right", W: "up", S: "down" };
  window.addEventListener("keydown", function (e) {
    if (state !== "play") return;
    if (e.key === "Escape") { pause(); return; }
    var k = KEYMAP[e.key];
    if (k) { keys[k] = true; e.preventDefault(); }
  });
  window.addEventListener("keyup", function (e) { var k = KEYMAP[e.key]; if (k) keys[k] = false; });

  el.start.addEventListener("click", start);
  el.again.addEventListener("click", start);
  el.resume.addEventListener("click", resume);

  /* Pause whenever the player can't see the game */
  new IntersectionObserver(function (en) { if (!en[0].isIntersecting) pause(); }, { threshold: 0.3 }).observe(box);
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });
  window.addEventListener("blur", pause);

  if (window.ResizeObserver) new ResizeObserver(resize).observe(box); else window.addEventListener("resize", resize);
  resize();
  hud();
})();
