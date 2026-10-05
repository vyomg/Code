/* ==========================================================================
   quiz.js — "What kind of closet are you?"
   Five questions, one at a time. Every answer adds weight to four closet
   types; the highest total wins. Nothing is stored or sent anywhere.
   ========================================================================== */
(function () {
  "use strict";

  var card = document.getElementById("quiz-card");
  if (!card) return;

  var FORM = "https://forms.gle/fsKPXXu5b3eww1VeA";

  // Weights: M = minimalist, C = collector, R = reuser, P = pass-downer
  var QUESTIONS = [
    { q: "How often do you wear the same favourite outfit?", a: [
      { t: "Basically every week", w: { M: 2, R: 1 } },
      { t: "When I can’t decide", w: { R: 1, P: 1 } },
      { t: "I rotate everything", w: { P: 1, C: 1 } },
      { t: "I have 47 favourites", w: { C: 3 } }
    ] },
    { q: "What happens when you stop wearing something?", a: [
      { t: "It stays in my closet", w: { C: 3 } },
      { t: "I give it to someone", w: { P: 2, R: 1 } },
      { t: "I donate it", w: { P: 3 } },
      { t: "I forget about it", w: { C: 2 } }
    ] },
    { q: "What condition are your old clothes usually in?", a: [
      { t: "Still wearable", w: { P: 2, M: 1 } },
      { t: "A little worn", w: { R: 1, P: 1 } },
      { t: "Very worn", w: { R: 2 } },
      { t: "Don’t ask", w: { C: 2, R: 1 } }
    ] },
    { q: "How often do you clean out your wardrobe?", a: [
      { t: "Regularly", w: { M: 3 } },
      { t: "Sometimes", w: { P: 1, R: 1 } },
      { t: "Almost never", w: { C: 3 } },
      { t: "Only when I run out of space", w: { C: 1, R: 1 } }
    ] },
    { q: "If a shirt is too damaged to wear, what should happen?", a: [
      { t: "Trash", w: { M: 1 } },
      { t: "Sit in the closet forever", w: { C: 2 } },
      { t: "Reuse or recycle it", w: { R: 2, P: 1 } },
      { t: "Turn it into something new", w: { R: 3 } }
    ] }
  ];

  var USE = function (id, x, y, s, color, extra) {
    return '<use href="#g-' + id + '" x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" style="color:' + color + '"' + (extra || "") + " />";
  };

  var RESULTS = {
    M: { name: "The Minimalist", desc: "You know what you wear — and you don’t hold onto what you don’t.",
      art: USE("tee", 75, 25, 90, "#0a2a5e") + '<path d="M60 128h120" stroke="#0a2a5e" stroke-opacity=".35" stroke-width="2" />' },
    C: { name: "The Collector", desc: "Your wardrobe has more stories than you can remember.",
      art: USE("jacket", 10, 40, 64, "#0e3c7d") + USE("hoodie", 56, 24, 70, "#4d9fff") + USE("jeans", 104, 38, 66, "#1557b0") + USE("tee", 150, 22, 72, "#6fa8e8") + USE("skirt", 88, 74, 60, "#0a2a5e") },
    R: { name: "The Reuser", desc: "You see potential in things other people would throw away.",
      art: '<g opacity=".35">' + USE("jeans", 60, 22, 100, "#0a2a5e") + "</g>" + USE("jeans", 80, 30, 100, "#1557b0") +
        '<path d="M196 50a34 34 0 1 1-10-24" fill="none" stroke="#0a2a5e" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 7" /><path d="M188 14l-2 14 14-1" fill="none" stroke="#0a2a5e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />' },
    P: { name: "The Pass-Downer", desc: "You know that a garment’s story doesn’t have to end with you.",
      art: '<g transform="translate(-10 0) rotate(-4 90 80)">' + USE("tee", 30, 28, 100, "#0a2a5e", ' clip-path="inset(0 50% 0 0)"') + "</g>" +
        '<g transform="translate(10 0) rotate(4 150 80)">' + USE("tee", 80, 28, 100, "#8fb8ea", ' clip-path="inset(0 0 0 50%)"') + "</g>" +
        '<path d="M120 20v120" stroke="#0a2a5e" stroke-width="1.5" stroke-dasharray="3 4" />' }
  };
  var PRIORITY = ["P", "R", "M", "C"];   // used only to break exact ties

  var step = 0, totals;

  function reset() { step = 0; totals = { M: 0, C: 0, R: 0, P: 0 }; }

  function renderQuestion() {
    var Q = QUESTIONS[step], letters = ["A", "B", "C", "D"];
    card.innerHTML =
      '<div class="q">' +
        '<div class="q-top"><span class="q-count">' + pad(step + 1) + " / " + pad(QUESTIONS.length) + '</span>' +
        '<span class="q-bar" role="presentation"><i style="--p:' + ((step + 1) / QUESTIONS.length) + '"></i></span></div>' +
        '<h3 class="q-title" tabindex="-1">' + Q.q + "</h3>" +
        '<div class="q-answers" role="group" aria-label="Answers">' +
          Q.a.map(function (a, i) {
            return '<button class="ans" type="button" data-i="' + i + '"><b aria-hidden="true">' + letters[i] + "</b><span>" + a.t + "</span></button>";
          }).join("") +
        "</div>" +
      "</div>";
  }

  function renderResult() {
    var key = PRIORITY.reduce(function (best, k) { return totals[k] > totals[best] ? k : best; }, PRIORITY[0]);
    var R = RESULTS[key];
    card.innerHTML =
      '<div class="res">' +
        '<div class="res-visual"><svg viewBox="0 0 240 160" role="img" aria-label="' + R.name + ' illustration">' + R.art + "</svg></div>" +
        "<div>" +
          '<p class="eyebrow">Your closet is</p>' +
          '<h3 class="res-title" tabindex="-1">' + R.name + "</h3>" +
          '<p class="res-desc">' + R.desc + "</p>" +
          '<div class="ov-actions">' +
            '<button class="btn" type="button" data-act="again">Take the quiz again</button>' +
            '<a class="btn btn-solid" href="' + FORM + '" target="_blank" rel="noopener">Pass it down <i class="arrow" aria-hidden="true">&rarr;</i></a>' +
          "</div>" +
        "</div>" +
      "</div>";
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function focusHeading() {
    var h = card.querySelector(".q-title, .res-title");
    if (h) h.focus({ preventScroll: true });
  }

  card.addEventListener("click", function (e) {
    var ans = e.target.closest(".ans");
    if (ans && !card.classList.contains("busy")) {
      var weights = QUESTIONS[step].a[+ans.dataset.i].w;
      for (var k in weights) totals[k] += weights[k];
      ans.classList.add("picked");
      card.classList.add("busy");                           // ignore double taps during the short transition
      setTimeout(function () {
        card.classList.remove("busy");
        step++;
        if (step < QUESTIONS.length) renderQuestion(); else renderResult();
        focusHeading();
      }, PD.reduced ? 0 : 380);
      return;
    }
    if (e.target.closest("[data-act=again]")) { reset(); renderQuestion(); focusHeading(); }
  });

  reset();
  renderQuestion();
})();
