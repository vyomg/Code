/* ==========================================================================
   core.js — shared helpers + site-wide behaviour
   Exposes window.PD: { reduced, clamp, onScroll, progress, inView }
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---- One shared, rAF-throttled scroll loop ---- */
  var listeners = [];
  var queued = false;
  function run() {
    queued = false;
    for (var i = 0; i < listeners.length; i++) listeners[i]();
  }
  function schedule() {
    if (!queued) { queued = true; requestAnimationFrame(run); }
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);

  /* Progress (0..1) through a tall section that contains a sticky stage */
  function progress(section) {
    var r = section.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
  }

  window.PD = {
    reduced: reduced,
    clamp: clamp,
    progress: progress,
    onScroll: function (fn) { listeners.push(fn); fn(); }
  };

  /* ---- Footer year ---- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---- Header: translucent after scrolling ---- */
  var header = document.getElementById("site-header");
  PD.onScroll(function () { header.classList.toggle("scrolled", window.scrollY > 40); });

  /* ---- Mobile menu ---- */
  var toggle = header.querySelector(".nav-toggle");
  var menu = document.getElementById("menu");
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
  }
  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  window.matchMedia("(min-width: 821px)").addEventListener("change", function () { setMenu(false); });

  /* ---- Split headlines into words, then reveal ---- */
  document.querySelectorAll("[data-split]").forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", words.join(" "));
    el.innerHTML = words.map(function (w, i) {
      return '<span class="w" aria-hidden="true" style="--i:' + i + '"><span>' + w + "</span></span> ";
    }).join("");
  });

  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); revealIO.unobserve(en.target); }
    });
  }, { threshold: 0.2, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll("[data-reveal], [data-split]").forEach(function (el) { revealIO.observe(el); });

  /* ---- Count-up numbers ---- */
  var countIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      countIO.unobserve(en.target);
      var el = en.target, target = +el.dataset.count, start = performance.now(), dur = 1800;
      if (reduced) { el.textContent = target.toLocaleString(); return; }
      (function tick(now) {
        var t = clamp((now - start) / dur, 0, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 4))).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
      })(start);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach(function (el) {
    el.textContent = "0";
    countIO.observe(el);
  });

  /* ---- Desktop-only: custom cursor + magnetic buttons ---- */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var cursor = document.getElementById("cursor");
  if (fine && !reduced && cursor) {
    var label = cursor.querySelector("span");
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false;

    function loop() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3) requestAnimationFrame(loop);
      else running = false;
    }
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add("vis");
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", function () { cursor.classList.remove("vis"); });

    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest("[data-cursor]");
      if (t) { label.textContent = t.dataset.cursor; cursor.classList.add("label"); }
      else cursor.classList.remove("label");
    });

    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * 0.2;
        var y = (e.clientY - (r.top + r.height / 2)) * 0.3;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }
})();
