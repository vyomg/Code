/* ==========================================================================
   hero.js — scroll-driven garment story (5 stages + the split)
   The CSS reacts to data-stage on .hero; JS only decides which stage is active.
   ========================================================================== */
(function () {
  "use strict";
  var hero = document.getElementById("top");
  if (!hero) return;

  var STAGES = 6;       // 0 question · 1 wore · 2 outgrew · 3 stopped · 4 now what · 5 split
  var current = -1, settle = 0;

  /* Land on a stage without animating through the ones in between (page load at a
     restored scroll position, or a jump of several stages): no half-faded headings. */
  function calm() {
    hero.classList.add("no-anim");
    cancelAnimationFrame(settle);
    settle = requestAnimationFrame(function () {
      settle = requestAnimationFrame(function () { hero.classList.remove("no-anim"); });
    });
  }

  PD.onScroll(function () {
    var p = PD.progress(hero);
    // Stages 0-4 get 16% of the scroll each; the final split holds for the last 20%
    var s = Math.min(STAGES - 1, Math.floor(p * 6.25));
    if (s !== current) {
      if (current < 0 || Math.abs(s - current) > 2) calm();
      current = s;
      hero.dataset.stage = s;
    }
  });
})();
