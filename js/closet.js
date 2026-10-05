/* ==========================================================================
   closet.js — interactive wardrobe (hover, focus and tap all work)
   ========================================================================== */
(function () {
  "use strict";
  var rail = document.getElementById("rail");
  var info = document.getElementById("closet-info");
  var toggle = document.getElementById("closet-toggle");
  if (!rail) return;

  var items = rail.querySelectorAll(".item");
  var DEFAULT = "Hover or tap a garment.";

  function show(item) {
    items.forEach(function (i) { i.classList.toggle("active", i === item); });
    info.textContent = item ? item.dataset.state + " — " + item.dataset.info : DEFAULT;
  }

  items.forEach(function (item) {
    item.addEventListener("mouseenter", function () { show(item); });
    item.addEventListener("focus", function () { show(item); });
    item.addEventListener("click", function () { show(item.classList.contains("active") && !matchMedia("(hover: hover)").matches ? null : item); });
  });
  rail.addEventListener("mouseleave", function () { if (!rail.contains(document.activeElement)) show(null); });

  toggle.addEventListener("click", function () {
    var on = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", String(on));
    toggle.textContent = on ? "Show everything" : "Show what I don’t wear";
    rail.classList.toggle("show-unworn", on);
    if (on) info.textContent = "Everything that isn’t a favourite could be passed down.";
    else show(null);
  });
})();
