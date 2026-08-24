/* =========================================================================
   NORMAN BROWN CAT — $NORMAN
   Interaction layer. Every behaviour is progressive: without JS the page
   still renders, scrolls, links out and reads correctly.
   ========================================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var $ = function (sel, ctx) {
    return (ctx || document).querySelector(sel);
  };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  /* ------------------------------------------------ Sticky header ------ */
  (function stickyHeader() {
    var header = $("#siteHeader");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  })();

  /* ------------------------------------------------ Mobile drawer ------ */
  (function drawer() {
    var nav = $("#primaryNav");
    var toggle = $("[data-nav-open]");
    var scrim = $(".nav-scrim");
    if (!nav || !toggle) return;

    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      nav.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("is-locked");
      if (scrim) {
        scrim.hidden = false;
        requestAnimationFrame(function () {
          scrim.classList.add("is-open");
        });
      }
      var first = $(".nav__close", nav);
      if (first) first.focus();
    }

    function close() {
      if (!nav.classList.contains("is-open")) return;
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("is-locked");
      if (scrim) {
        scrim.classList.remove("is-open");
        window.setTimeout(function () {
          scrim.hidden = true;
        }, 300);
      }
      if (lastFocus) lastFocus.focus();
    }

    toggle.addEventListener("click", function () {
      nav.classList.contains("is-open") ? close() : open();
    });
    $$("[data-nav-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    $$(".nav__link, .nav__drawer-cta a", nav).forEach(function (el) {
      el.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) close();
    });

    // Keep focus inside the drawer while it is open.
    nav.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !nav.classList.contains("is-open")) return;
      var focusables = $$("a[href], button:not([disabled])", nav).filter(
        function (el) {
          return el.offsetParent !== null;
        }
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  })();

  /* ------------------------------------------------ Scroll spy --------- */
  (function scrollSpy() {
    var links = $$(".nav__link");
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = {};
    var targets = [];
    links.forEach(function (link) {
      var id = link.getAttribute("href");
      if (!id || id.charAt(0) !== "#") return;
      var section = document.querySelector(id);
      if (section) {
        map[id.slice(1)] = link;
        targets.push(section);
      }
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (l) {
            l.classList.remove("is-active");
          });
          var active = map[entry.target.id];
          if (active) active.classList.add("is-active");
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    targets.forEach(function (t) {
      observer.observe(t);
    });
  })();

  /* ------------------------------------------------ Reveal on scroll --- */
  (function reveal() {
    var items = $$(".reveal");
    if (!items.length) return;
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -40px 0px", threshold: 0 }
    );
    items.forEach(function (el) {
      observer.observe(el);
    });

    // Safety net: never leave content permanently hidden if the observer
    // is starved (bfcache restore, print, very tall viewports).
    window.addEventListener("load", function () {
      window.setTimeout(function () {
        items.forEach(function (el) {
          var box = el.getBoundingClientRect();
          if (box.top < window.innerHeight && box.bottom > 0)
            el.classList.add("is-visible");
        });
      }, 400);
    });
  })();

  /* ------------------------------------------------ Marquee ------------ */
  (function marquee() {
    $$("[data-marquee]").forEach(function (track) {
      var group = $(".marquee__group", track);
      if (!group) return;

      function build() {
        // Reset to a single group before re-measuring.
        while (track.children.length > 1) track.removeChild(track.lastChild);
        track.classList.remove("is-ready");

        var groupWidth = group.getBoundingClientRect().width;
        if (!groupWidth) return;

        var needed = Math.max(
          2,
          Math.ceil((window.innerWidth * 1.2) / groupWidth)
        );
        var half = document.createDocumentFragment();
        for (var i = 1; i < needed; i++)
          half.appendChild(group.cloneNode(true));
        track.appendChild(half);

        // Duplicate the whole run so a -50% translation loops seamlessly.
        var mirror = document.createDocumentFragment();
        Array.prototype.forEach.call(track.children, function (child) {
          mirror.appendChild(child.cloneNode(true));
        });
        track.appendChild(mirror);

        // Constant speed regardless of how much content we ended up with.
        var total = track.getBoundingClientRect().width;
        track.style.animationDuration =
          Math.max(24, Math.round(total / 90)) + "s";
        if (!reduceMotion.matches) track.classList.add("is-ready");
      }

      build();
      var timer;
      window.addEventListener("resize", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(build, 250);
      });
      reduceMotion.addEventListener
        ? reduceMotion.addEventListener("change", build)
        : reduceMotion.addListener(build);
    });
  })();

  /* ------------------------------------------------ Toast -------------- */
  var toast = (function () {
    var el = $("#toast");
    var textEl = $("#toastText");
    var timer;
    return function (message) {
      if (!el || !textEl) return;
      textEl.textContent = message;
      el.hidden = false;
      window.clearTimeout(timer);
      requestAnimationFrame(function () {
        el.classList.add("is-visible");
      });
      timer = window.setTimeout(function () {
        el.classList.remove("is-visible");
        window.setTimeout(function () {
          el.hidden = true;
        }, 320);
      }, 2600);
    };
  })();

  /* ------------------------------------------------ Copy contract ------ */
  (function copyContract() {
    function legacyCopy(text) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    }

    $$("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var source = document.querySelector(btn.getAttribute("data-copy"));
        if (!source) return;
        var text = source.textContent.trim();

        var done = function (ok) {
          if (!ok) {
            toast("Copy failed. Select the address manually.");
            return;
          }
          toast("Copied. Norman remains unimpressed.");
          btn.classList.add("is-done");
          window.setTimeout(function () {
            btn.classList.remove("is-done");
          }, 1800);
        };

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(
            function () {
              done(true);
            },
            function () {
              done(legacyCopy(text));
            }
          );
        } else {
          done(legacyCopy(text));
        }
      });
    });
  })();

  /* ------------------------------------------------ Lightbox ----------- */
  (function lightbox() {
    var box = $("#lightbox");
    var imgEl = $("#lightboxImg");
    var capEl = $("#lightboxCaption");
    var countEl = $("#lightboxCount");
    var triggers = $$("[data-lightbox]");
    if (!box || !imgEl || !triggers.length) return;

    var slides = triggers.map(function (btn) {
      var thumb = $("img", btn);
      return {
        src: btn.getAttribute("data-full"),
        caption: btn.getAttribute("data-caption") || "",
        alt: thumb ? thumb.getAttribute("alt") : "",
      };
    });

    var index = 0;
    var lastFocus = null;

    function render() {
      var slide = slides[index];
      imgEl.src = slide.src;
      imgEl.alt = slide.alt;
      capEl.textContent = slide.caption;
      if (countEl) countEl.textContent = index + 1 + " / " + slides.length;
    }

    function open(i) {
      index = i;
      lastFocus = document.activeElement;
      box.hidden = false;
      document.body.classList.add("is-locked");
      render();
      requestAnimationFrame(function () {
        box.classList.add("is-open");
      });
      var closeBtn = $("[data-lb-close]", box);
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      box.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      window.setTimeout(function () {
        box.hidden = true;
        imgEl.removeAttribute("src");
      }, 280);
      if (lastFocus) lastFocus.focus();
    }

    function step(delta) {
      index = (index + delta + slides.length) % slides.length;
      render();
    }

    triggers.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        open(i);
      });
    });

    $$("[data-lb-close]", box).forEach(function (el) {
      el.addEventListener("click", close);
    });
    var prev = $("[data-lb-prev]", box);
    var next = $("[data-lb-next]", box);
    if (prev)
      prev.addEventListener("click", function () {
        step(-1);
      });
    if (next)
      next.addEventListener("click", function () {
        step(1);
      });

    box.addEventListener("click", function (e) {
      if (e.target === box || e.target === $(".lightbox__figure", box)) close();
    });

    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowLeft") {
        step(-1);
      } else if (e.key === "ArrowRight") {
        step(1);
      } else if (e.key === "Tab") {
        var focusables = $$("button", box).filter(function (el) {
          return el.offsetParent !== null;
        });
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Swipe between photos on touch devices.
    var startX = null;
    box.addEventListener(
      "touchstart",
      function (e) {
        startX = e.changedTouches[0].clientX;
      },
      { passive: true }
    );
    box.addEventListener(
      "touchend",
      function (e) {
        if (startX === null) return;
        var dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
        startX = null;
      },
      { passive: true }
    );
  })();

  /* ------------------------------------------------ Back to top -------- */
  (function backToTop() {
    var btn = $("#toTop");
    if (!btn) return;
    btn.hidden = false;
    var onScroll = function () {
      btn.classList.toggle(
        "is-visible",
        window.scrollY > window.innerHeight * 0.8
      );
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });
      var brand = $(".site-header .brand");
      if (brand) brand.focus({ preventScroll: true });
    });
  })();

  /* ------------------------------------------------ Sticker idle wiggle */
  (function stickerWiggle() {
    if (reduceMotion.matches) return;
    var stickers = $$("[data-wiggle]");
    if (!stickers.length) return;
    window.setInterval(function () {
      var pick = stickers[Math.floor(Math.random() * stickers.length)];
      if (!pick) return;
      pick.animate(
        [
          { transform: "rotate(var(--tilt, -4deg))" },
          { transform: "rotate(calc(var(--tilt, -4deg) + 5deg)) scale(1.03)" },
          { transform: "rotate(calc(var(--tilt, -4deg) - 3deg))" },
          { transform: "rotate(var(--tilt, -4deg))" },
        ],
        { duration: 900, easing: "cubic-bezier(.3,.8,.3,1)" }
      );
    }, 5200);
  })();
})();
