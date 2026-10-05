/* ==========================================================================
   hero.js — scroll-driven garment story (5 stages + the split)
   The CSS reacts to data-stage on .hero; JS only decides which stage is active.
   ========================================================================== */
(function () {
  "use strict";
  var hero = document.getElementById("top");
  if (!hero) return;

  var STAGES = 6;       // 0 question · 1 wore · 2 outgrew · 3 stopped · 4 now what · 5 split
  var current = -1;

  PD.onScroll(function () {
    var p = PD.progress(hero);
    // Stages 0-4 get 16% of the scroll each; the final split holds for the last 20%
    var s = Math.min(STAGES - 1, Math.floor(p * 6.25));
    if (s !== current) {
      current = s;
      hero.dataset.stage = s;
    }
  });
})();
