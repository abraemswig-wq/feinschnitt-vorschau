/* =========================================================================
   FeinSchnitt Hair Studio — Variante „Driessen"
   Nachgebaut ohne Lenis/GSAP/ScrollTrigger: nativer Scroll + ein rAF-Loop.
   verify.py prüft Verhalten, nicht Technik.

   WICHTIG (teuer gelernt): sobald JS ein `transform` auf ein Element schreibt,
   darf kein Breakpoint dasselbe `transform` fürs Layout benutzen. Der Parallax
   geht deshalb als CSS-Variable `--py` herein, komponiert wird im CSS.
   ========================================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noMotion = reduced || localStorage.getItem('fs-motion') === 'off';
  if (noMotion) document.body.classList.add('no-motion');

  /* ---------------------------------------------------------------------
     Einspieler — Referenz: ~2042 ms Creme-Overlay mit Opazitätsrampe
     --------------------------------------------------------------------- */
  var intro = $('#intro'), introBar = $('#introBar');
  var INTRO_MS = 2042;

  function endIntro() {
    document.body.classList.add('intro-done');
    document.body.classList.remove('is-locked');
    if (intro) intro.setAttribute('aria-hidden', 'true');
    reveal();
  }

  if (noMotion || !intro) {
    if (intro) intro.remove();
    document.body.classList.add('intro-done');
  } else {
    document.body.classList.add('is-locked');
    var t0 = performance.now();
    (function tick(now) {
      var p = Math.min(1, (now - t0) / INTRO_MS);
      if (introBar) introBar.style.width = (p * 100).toFixed(1) + '%';
      if (p < 1) requestAnimationFrame(tick); else endIntro();
    })(t0);
    // Klick überspringt
    intro.addEventListener('click', endIntro);
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !document.body.classList.contains('intro-done')) endIntro();
    });
  }

  /* ---------------------------------------------------------------------
     Reveal-on-Scroll
     --------------------------------------------------------------------- */
  var io = null;
  function reveal() {
    var els = $$('.rv, .wipe, .ph');
    if (noMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('is-in'); });
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    // Der rootMargin von −12 % zieht die Auslöselinie über den unteren
    // Fensterrand. Was beim Laden schon sichtbar ist — der ganze untere
    // Hero-Block — liegt darunter und bliebe bis zum ersten Scrollen weg.
    // Deshalb einmal alles aufdecken, was wirklich im Bild steht.
    var vh = window.innerHeight;
    els.forEach(function (e) {
      var r = e.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) e.classList.add('is-in');
      else io.observe(e);
    });
  }
  if (document.body.classList.contains('intro-done')) reveal();

  /* ---------------------------------------------------------------------
     Parallax — die Referenz deklariert 8 data-scroll-speed-Elemente
     (−20 ×1, −1 ×6, −0.5 ×1). Hier als data-speed, gefahren per rAF.
     Keine Pins: spec.scrollDeclared meldet 0 sticky, 0 horizontal.
     --------------------------------------------------------------------- */
  var pxEls = $$('[data-speed]').map(function (el) {
    return { el: el, s: parseFloat(el.getAttribute('data-speed')) || 0 };
  });

  var bar = $('#bar'), hero = $('#hero');
  var ticking = false, lastY = -1;

  function frame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;

    if (!noMotion) {
      for (var i = 0; i < pxEls.length; i++) {
        var o = pxEls[i], r = o.el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        // Fortschritt des Elements durch das Fenster, −1 … +1
        var t = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        // Versatz skaliert mit der Fensterhöhe, nicht fix in px —
        // feste Distanzen sind auf dem Telefon zu groß.
        o.el.style.setProperty('--py', (t * o.s * vh * 0.085).toFixed(1) + 'px');
      }
    }

    // Kopfleiste: über dem Hero transparent/weiß, danach massiv
    if (hero) {
      var over = y < hero.offsetHeight - 90;
      bar.classList.toggle('bar--over', over);
      bar.classList.toggle('bar--solid', !over);
    }
    document.body.classList.toggle('scrolled', y > 180);
    lastY = y;
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();

  /* ---------------------------------------------------------------------
     Hero-Video — Referenz-Muster `playVideoOnScroll`: kein autoplay-Attribut,
     sondern starten sobald es im Bild ist und pausieren sobald es raus ist.
     Spart Akku und Daten, und bei abgeschalteter Bewegung bleibt das poster
     stehen — das ist genau das Standbild, das vorher dort lag.
     --------------------------------------------------------------------- */
  var heroVid = $('#heroVideo');

  function playHero() {
    if (!heroVid || noMotion) return;
    var pr = heroVid.play();
    // Verweigert der Browser die Wiedergabe (Datensparmodus, Energiesparmodus),
    // ist das kein Fehler: das poster bleibt stehen.
    if (pr && pr.catch) pr.catch(function () {});
  }
  function pauseHero() { if (heroVid && !heroVid.paused) heroVid.pause(); }

  if (heroVid) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) playHero(); else pauseHero();
      }, { threshold: 0.05 }).observe(heroVid);
    } else {
      playHero();
    }
    // Im Hintergrundtab nicht weiterlaufen lassen
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pauseHero();
      else if (heroVid.getBoundingClientRect().bottom > 0) playHero();
    });
  }

  /* ---------------------------------------------------------------------
     Mobil-Menü
     --------------------------------------------------------------------- */
  var burger = $('#burger'), menu = $('#menu');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    document.body.classList.toggle('is-locked', open);
    if (burger) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    }
    if (menu) {
      $$('a', menu).forEach(function (a, i) {
        a.style.transitionDelay = open ? (0.08 + i * 0.05) + 's' : '0s';
      });
    }
  }
  if (burger) burger.addEventListener('click', function () {
    setMenu(!document.body.classList.contains('menu-open'));
  });
  if (menu) $$('a', menu).forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
  });

  /* ---------------------------------------------------------------------
     Leistungs-Liste — eine Zeile offen, Rest zu
     --------------------------------------------------------------------- */
  $$('#svcList .svc__link').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('.svc__row');
      var open = row.classList.contains('is-open');
      $$('#svcList .svc__row').forEach(function (r) {
        r.classList.remove('is-open');
        $('.svc__link', r).setAttribute('aria-expanded', 'false');
      });
      if (!open) { row.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---------------------------------------------------------------------
     Stimmen-Karussell
     --------------------------------------------------------------------- */
  var VOICES = [
    { q: 'Der perfekte Schnitt ist nicht Arbeit, sondern Hobby.',
      b: 'FeinSchnitt Hair Studio', s: 'Friseurmeister, Münster', ac: 'Hobby' },
    { q: 'Klasse statt Masse. Wir nehmen uns die Zeit, die es braucht — ohne Hetze, ohne Kompromisse.',
      b: 'Unser Anspruch', s: 'Nevinghoff 16, Münster', ac: 'Klasse statt Masse.' },
    { q: 'Ein Schnitt ist dann gut, wenn er am Tag danach ohne uns genauso sitzt.',
      b: 'Was wir versprechen', s: 'Schnitt · Farbe · Finish', ac: 'ohne uns' }
  ];
  function esc(t) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function accentuate(text, acc) {
    var out = esc(text);
    if (!acc) return out;
    var a = esc(acc);
    return out.replace(a, '<em class="ac">' + a + '</em>');
  }
  var vi = 0;
  var vQ = $('#voiceQ'), vBy = $('#voiceBy'), vNo = $('#voiceNo'), vSec = $('#voice');

  function setVoice(n) {
    vi = (n + VOICES.length) % VOICES.length;
    var v = VOICES[vi];
    var write = function () {
      /* Das Zitat trägt wie die Headlines einen kursiven Akzent. Der Text
         wird vorher escaped — nur der eigene Akzent-Ausschnitt wird zu Markup,
         damit ein später geänderter Zitattext nichts injizieren kann. */
      vQ.innerHTML = accentuate(v.q, v.ac);
      vBy.innerHTML = '<b>' + v.b + '</b><span>' + v.s + '</span>';
      vNo.textContent = ('0' + (vi + 1)).slice(-2) + ' / 0' + VOICES.length;
      vSec.classList.remove('is-fading');
    };
    if (noMotion) { write(); return; }
    vSec.classList.add('is-fading');
    setTimeout(write, 380);
  }
  if (vQ) {
    $('#voiceNext').addEventListener('click', function () { setVoice(vi + 1); });
    $('#voicePrev').addEventListener('click', function () { setVoice(vi - 1); });
  }

  /* ---------------------------------------------------------------------
     Öffnungszeiten — heutiger Tag hervorgehoben
     --------------------------------------------------------------------- */
  var today = new Date().getDay();
  var todayLi = $('#hours li[data-d="' + today + '"]');
  if (todayLi) todayLi.classList.add('is-today');

  /* ---------------------------------------------------------------------
     Eigener Cursor — die Referenz fährt div.customCursor
     --------------------------------------------------------------------- */
  var cur = $('#cursor');
  if (cur && !noMotion && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    var cx = 0, cy = 0, tx = 0, ty = 0, curOn = false;
    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!curOn) { curOn = true; cx = tx; cy = ty; document.body.classList.add('has-cursor'); }
    }, { passive: true });
    (function loop() {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
    $$('a, button, .svc__link, .card').forEach(function (el) {
      el.addEventListener('mouseenter', function () { document.body.classList.add('cursor-lg'); });
      el.addEventListener('mouseleave', function () { document.body.classList.remove('cursor-lg'); });
    });
  }

  /* ---------------------------------------------------------------------
     Cookie-Hinweis — technisch notwendige Speicherung,
     § 25 Abs. 2 Nr. 2 TDDDG, daher einwilligungsfrei
     --------------------------------------------------------------------- */
  var cc = $('#cc');
  function showCC() {
    cc.hidden = false;
    requestAnimationFrame(function () { cc.classList.add('is-in'); });
  }
  function hideCC() {
    cc.classList.remove('is-in');
    setTimeout(function () { cc.hidden = true; }, 650);
  }
  if (cc) {
    if (localStorage.getItem('fs-cookie-ack') !== '1') setTimeout(showCC, 1200 + (noMotion ? 0 : INTRO_MS));
    $('#ccOk').addEventListener('click', function () {
      try { localStorage.setItem('fs-cookie-ack', '1'); } catch (e) {}
      hideCC();
    });
    var ccOpen = $('#ccOpen');
    if (ccOpen) ccOpen.addEventListener('click', showCC);
  }

  /* ---------------------------------------------------------------------
     Bewegungsschalter
     --------------------------------------------------------------------- */
  var mt = $('#motionToggle');
  var mtF = $('#motionToggleFoot');
  var toggles = [mt, mtF].filter(Boolean);

  function setMotion(off) {
    noMotion = off || reduced;
    document.body.classList.toggle('no-motion', noMotion);
    toggles.forEach(function (t) {
      t.setAttribute('aria-pressed', off ? 'true' : 'false');
      t.textContent = off ? 'Bewegung einschalten' : 'Bewegung pausieren';
    });
    try { localStorage.setItem('fs-motion', off ? 'off' : 'on'); } catch (e) {}
    if (off) {
      // Alles zurücksetzen, was der Loop geschrieben hat
      pxEls.forEach(function (o) { o.el.style.removeProperty('--py'); });
      if (cur) cur.style.transform = '';
      $$('.rv, .wipe, .ph').forEach(function (e) { e.classList.add('is-in'); });
      pauseHero();   // Bewegung aus heißt auch: Hero-Video steht
    } else {
      frame();
      if (heroVid && heroVid.getBoundingClientRect().bottom > 0) playHero();
    }
  }
  if (toggles.length) {
    if (localStorage.getItem('fs-motion') === 'off') setMotion(true);
    toggles.forEach(function (t) {
      t.addEventListener('click', function () {
        setMotion(t.getAttribute('aria-pressed') !== 'true');
      });
    });
  }

  // Der schwebende Schalter lag unten links auf der Copyright-Zeile des
  // Fußes. Sobald der Fuß im Bild ist, übernimmt der Schalter in der Fußzeile.
  var footEl = $('.foot');
  if (footEl && mt && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      document.body.classList.toggle('foot-in', en[0].isIntersecting);
    }, { threshold: 0 }).observe(footEl);
  }
})();
