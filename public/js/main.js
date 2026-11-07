/**
 * SNS Official — Stitch n Style
 * Main JavaScript Application
 *
 * Core Modules:
 * 1. State & Storage (Cart & Currency)
 * 2. Navigation & Mobile Menu
 * 3. Scroll Reveal Animations (IntersectionObserver with stagger)
 * 4. Carousels & Dots Synchronization
 * 5. Lightbox (Fullscreen multi-image viewer with swipe)
 * 6. Product Card Component & Size Selector
 * 7. Cart Drawer & Quantity Management
 * 8. Checkout Modal & WhatsApp Order Generator
 * 9. Shop Page Filter & Sort Management
 */

(function () {
  "use strict";

  // Mark JS enabled for smooth CSS reveals
  document.documentElement.classList.add("js");

  /* -------------------------------------------------------------------------
   * 1. State & Storage
   * ----------------------------------------------------------------------- */
  const STORAGE_KEY = "sns_cart_v1";
  const SITE_BASE_URL = "https://sns-official-three.vercel.app";
  const WHATSAPP_NUMBER = "923085220513"; // +92 308 5220513
  const INSTAGRAM_URL = "#"; // Change Instagram profile URL in this one place

  let cart = [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    cart = [];
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn("localStorage write failed", e);
    }
    updateCartUI();
  }

  function formatPKR(num) {
    return "Rs. " + Number(num || 0).toLocaleString("en-PK");
  }

  /* -------------------------------------------------------------------------
   * 2. Navigation & Slide-in Luxury Side Menu Drawer
   * ----------------------------------------------------------------------- */
  const navbar = document.querySelector(".nav");
  const navLogo = document.querySelector(".nav__logo");

  const sideMenuOpenBtn = document.getElementById("sideMenuOpenBtn");
  const sideMenuDrawer = document.getElementById("sideMenuDrawer");
  const sideMenuCloseBtn = document.getElementById("sideMenuCloseBtn");
  const sideMenuBackdrop = document.getElementById("sideMenuBackdrop");
  const sideMenuList = document.getElementById("sideMenuList");
  const sideMenuTabs = document.querySelectorAll("[data-drawer-tab]");

  // Built-in default menu structure (used as fallback if Supabase fails or is empty)
  const DEFAULT_MENU_TREE = {
    women: [
      { id: "def-new", section: "women", label: "New Arrivals", custom_url: "shop.html?sort=newest", sort_order: 10, children: [] },
      { id: "def-saree", section: "women", label: "Saree", custom_url: null, sort_order: 20, children: [] },
      { id: "def-dupatta", section: "women", label: "Dupatta", custom_url: null, sort_order: 30, children: [] },
      { id: "def-short", section: "women", label: "Short", custom_url: null, sort_order: 40, children: [] },
      { id: "def-maxi", section: "women", label: "Maxi", custom_url: null, sort_order: 50, children: [] }
    ],
    brides: []
  };

  window.MENU_TREE = {
    women: DEFAULT_MENU_TREE.women.slice(),
    brides: DEFAULT_MENU_TREE.brides.slice()
  };

  let activeDrawerTab = "women";

  // Logo reload requirement: "Clicking the logo fully reloads the page."
  if (navLogo) {
    navLogo.addEventListener("click", function (e) {
      e.preventDefault();
      const isHome = window.location.pathname.endsWith("index.html") ||
                     window.location.pathname.endsWith("/") ||
                     window.location.pathname === "";
      if (isHome) {
        window.location.reload();
      } else {
        window.location.href = "index.html";
      }
    });
  }

  // Smart navbar scroll behavior:
  // - Always solid dark (#0A0A0A) at all scroll positions
  // - Always visible near top (< 80px)
  // - Slides up (-100%) on scroll down, slides back in on scroll up
  // - Auto-hides after 1.5s of scroll inactivity when visible away from top
  // - Never hides while side menu drawer, cart drawer, or checkout modal is open
  const TOP_THRESHOLD = 80;
  const SCROLL_DELTA = 5;
  const IDLE_HIDE_DELAY = 1500;

  let lastScrollY = Math.max(0, window.scrollY);
  let navTicking = false;
  let navIdleTimer = null;

  function isNavLockedOpen() {
    const cartEl = document.getElementById("cartDrawer");
    const checkoutEl = document.getElementById("checkoutModal");
    return (
      document.body.classList.contains("menu-open") ||
      (sideMenuDrawer && sideMenuDrawer.classList.contains("is-open")) ||
      (cartEl && cartEl.classList.contains("is-open")) ||
      (checkoutEl && checkoutEl.classList.contains("is-open"))
    );
  }

  function clearNavIdleTimer() {
    if (navIdleTimer) {
      clearTimeout(navIdleTimer);
      navIdleTimer = null;
    }
  }

  function scheduleNavIdleHide() {
    clearNavIdleTimer();
    navIdleTimer = setTimeout(function () {
      if (!navbar) return;
      const currentY = Math.max(0, window.scrollY);
      if (currentY >= TOP_THRESHOLD && !isNavLockedOpen()) {
        navbar.classList.add("is-hidden");
      }
    }, IDLE_HIDE_DELAY);
  }

  function updateNavbarOnScroll() {
    navTicking = false;
    if (!navbar) return;

    const currentScrollY = Math.max(0, window.scrollY);
    const delta = currentScrollY - lastScrollY;

    // Never hide while side menu drawer, cart drawer, or checkout form is open
    if (isNavLockedOpen()) {
      navbar.classList.remove("is-hidden");
      clearNavIdleTimer();
      lastScrollY = currentScrollY;
      return;
    }

    // Always visible at the very top of the page (< 80px)
    if (currentScrollY < TOP_THRESHOLD) {
      navbar.classList.remove("is-hidden");
      clearNavIdleTimer();
      lastScrollY = currentScrollY;
      return;
    }

    // Apply scroll-delta threshold (~5px) to prevent flicker
    if (Math.abs(delta) >= SCROLL_DELTA) {
      if (delta > 0) {
        // Scrolling DOWN: slide navbar up and out of view
        navbar.classList.add("is-hidden");
        clearNavIdleTimer();
      } else {
        // Scrolling UP: slide navbar back into view immediately
        navbar.classList.remove("is-hidden");
      }
      lastScrollY = currentScrollY;
    }

    // When visible and not at the top, hide again after 1.5s of no scroll activity
    if (!navbar.classList.contains("is-hidden")) {
      scheduleNavIdleHide();
    }
  }

  window.addEventListener("scroll", function () {
    if (!navTicking) {
      navTicking = true;
      window.requestAnimationFrame(updateNavbarOnScroll);
    }
  }, { passive: true });
  updateNavbarOnScroll();

  // Keep navbar visible whenever side menu drawer, cart drawer, or checkout modal is open
  if ("MutationObserver" in window && navbar) {
    const overlayObserver = new MutationObserver(function () {
      if (isNavLockedOpen()) {
        navbar.classList.remove("is-hidden");
        clearNavIdleTimer();
      } else if (window.scrollY >= TOP_THRESHOLD && !navbar.classList.contains("is-hidden")) {
        scheduleNavIdleHide();
      }
    });
    overlayObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    const cartEl = document.getElementById("cartDrawer");
    const checkoutEl = document.getElementById("checkoutModal");
    if (sideMenuDrawer) overlayObserver.observe(sideMenuDrawer, { attributes: true, attributeFilter: ["class"] });
    if (cartEl) overlayObserver.observe(cartEl, { attributes: true, attributeFilter: ["class"] });
    if (checkoutEl) overlayObserver.observe(checkoutEl, { attributes: true, attributeFilter: ["class"] });
  }

  // Side Menu Drawer Open / Close & Focus Management
  function openSideMenu() {
    if (!sideMenuDrawer) return;
    sideMenuDrawer.classList.add("is-open");
    sideMenuDrawer.setAttribute("aria-hidden", "false");
    if (sideMenuBackdrop) {
      sideMenuBackdrop.classList.add("is-visible");
      sideMenuBackdrop.setAttribute("aria-hidden", "false");
    }
    if (sideMenuOpenBtn) {
      sideMenuOpenBtn.setAttribute("aria-expanded", "true");
    }
    document.body.classList.add("menu-open", "is-locked");
    if (navbar) {
      navbar.classList.remove("is-hidden");
      clearNavIdleTimer();
    }
    setTimeout(function () {
      if (sideMenuDrawer) sideMenuDrawer.focus();
    }, 30);
  }

  function closeSideMenu(returnFocus) {
    if (!sideMenuDrawer || !sideMenuDrawer.classList.contains("is-open")) return;
    sideMenuDrawer.classList.remove("is-open");
    sideMenuDrawer.setAttribute("aria-hidden", "true");
    if (sideMenuBackdrop) {
      sideMenuBackdrop.classList.remove("is-visible");
      sideMenuBackdrop.setAttribute("aria-hidden", "true");
    }
    if (sideMenuOpenBtn) {
      sideMenuOpenBtn.setAttribute("aria-expanded", "false");
    }
    document.body.classList.remove("menu-open", "is-locked");
    if (returnFocus !== false && sideMenuOpenBtn) {
      sideMenuOpenBtn.focus();
    }
  }

  if (sideMenuOpenBtn) {
    sideMenuOpenBtn.addEventListener("click", function () {
      if (sideMenuDrawer && sideMenuDrawer.classList.contains("is-open")) {
        closeSideMenu(true);
      } else {
        openSideMenu();
      }
    });
  }

  if (sideMenuCloseBtn) {
    sideMenuCloseBtn.addEventListener("click", function () {
      closeSideMenu(true);
    });
  }

  if (sideMenuBackdrop) {
    sideMenuBackdrop.addEventListener("click", function () {
      closeSideMenu(true);
    });
  }

  // Close drawer on Escape key
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sideMenuDrawer && sideMenuDrawer.classList.contains("is-open")) {
      e.preventDefault();
      closeSideMenu(true);
    }
  });

  // Automatically close drawer when any link inside it is clicked
  if (sideMenuDrawer) {
    sideMenuDrawer.addEventListener("click", function (e) {
      const link = e.target.closest("a");
      if (link) {
        closeSideMenu(false);
      }
    });
  }

  function buildMenuItemUrl(section, itemLabel, customUrl, subLabel) {
    const custom = String(customUrl || "").trim();
    if (custom) return custom;
    const sec = encodeURIComponent(String(section || "women").toLowerCase());
    const cat = encodeURIComponent(String(itemLabel || "").trim());
    if (subLabel) {
      return `shop.html?section=${sec}&category=${cat}&sub=${encodeURIComponent(String(subLabel).trim())}`;
    }
    return `shop.html?section=${sec}&category=${cat}`;
  }

  function renderSideMenuList(section, withFade) {
    if (!sideMenuList) return;
    const secKey = section === "brides" ? "brides" : "women";
    const items = (window.MENU_TREE && Array.isArray(window.MENU_TREE[secKey]))
      ? window.MENU_TREE[secKey]
      : [];

    const doRender = function () {
      sideMenuList.innerHTML = "";

      if (items.length === 0) {
        const emptyLi = document.createElement("li");
        emptyLi.className = "side-menu__empty";
        emptyLi.textContent = "Coming soon";
        sideMenuList.appendChild(emptyLi);
        return;
      }

      items.forEach(function (item) {
        const li = document.createElement("li");
        li.className = "side-menu__item";

        const children = Array.isArray(item.children) ? item.children : [];
        const itemUrl = buildMenuItemUrl(secKey, item.label, item.custom_url, null);

        if (children.length === 0) {
          // Item WITHOUT sub-options: link straight to shop
          const row = document.createElement("div");
          row.className = "side-menu__row";

          const a = document.createElement("a");
          a.className = "side-menu__link";
          a.href = itemUrl;
          a.textContent = item.label;

          row.appendChild(a);
          li.appendChild(row);
        } else {
          // Item WITH sub-options: accordion trigger + "+" icon
          const row = document.createElement("div");
          row.className = "side-menu__row";

          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "side-menu__trigger";
          btn.setAttribute("aria-expanded", "false");
          btn.innerHTML = `
            <span>${escapeHTML(item.label)}</span>
            <span class="side-menu__plus" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </span>
          `;

          const subWrap = document.createElement("div");
          subWrap.className = "side-menu__sub-wrap";
          const subInner = document.createElement("div");
          subInner.className = "side-menu__sub-inner";
          const subUl = document.createElement("ul");
          subUl.className = "side-menu__sub-list";

          // First sub-option is always "View All [Item name]"
          const viewAllLi = document.createElement("li");
          const viewAllA = document.createElement("a");
          viewAllA.className = "side-menu__sub-link side-menu__sub-link--all";
          viewAllA.href = itemUrl;
          viewAllA.textContent = `View All ${item.label}`;
          viewAllLi.appendChild(viewAllA);
          subUl.appendChild(viewAllLi);

          children.forEach(function (sub) {
            const subLi = document.createElement("li");
            const subA = document.createElement("a");
            subA.className = "side-menu__sub-link";
            subA.href = buildMenuItemUrl(secKey, item.label, sub.custom_url, sub.label);
            subA.textContent = sub.label;
            subLi.appendChild(subA);
            subUl.appendChild(subLi);
          });

          subInner.appendChild(subUl);
          subWrap.appendChild(subInner);

          btn.addEventListener("click", function () {
            const isExpanded = li.classList.contains("is-expanded");
            // Collapse any other expanded item in the drawer
            sideMenuList.querySelectorAll(".side-menu__item.is-expanded").forEach(function (other) {
              if (other !== li) {
                other.classList.remove("is-expanded");
                const otherBtn = other.querySelector(".side-menu__trigger");
                if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
              }
            });
            li.classList.toggle("is-expanded", !isExpanded);
            btn.setAttribute("aria-expanded", !isExpanded ? "true" : "false");
          });

          row.appendChild(btn);
          li.appendChild(row);
          li.appendChild(subWrap);
        }

        sideMenuList.appendChild(li);
      });
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (withFade && !reducedMotion) {
      sideMenuList.classList.add("is-fading");
      setTimeout(function () {
        doRender();
        requestAnimationFrame(function () {
          sideMenuList.classList.remove("is-fading");
        });
      }, 180);
    } else {
      doRender();
      sideMenuList.classList.remove("is-fading");
    }
  }

  // Drawer WOMEN / BRIDES Tab Switching
  sideMenuTabs.forEach(function (tabBtn) {
    tabBtn.addEventListener("click", function () {
      const targetTab = (tabBtn.getAttribute("data-drawer-tab") || "women").toLowerCase();
      if (targetTab === activeDrawerTab) return;
      activeDrawerTab = targetTab;

      sideMenuTabs.forEach(function (btn) {
        const isCurrent = btn.getAttribute("data-drawer-tab") === activeDrawerTab;
        btn.classList.toggle("is-active", isCurrent);
        btn.setAttribute("aria-selected", isCurrent ? "true" : "false");
      });

      renderSideMenuList(activeDrawerTab, true);
    });
  });

  /* -------------------------------------------------------------------------
   * 3. Scroll Reveal Animations (IntersectionObserver)
   * Slow, subtle pop up: elements fade in & slide up 30px over 1.1s.
   * Staggered reveals: ~160ms delay per sibling item.
   * Respects prefers-reduced-motion.
   * ----------------------------------------------------------------------- */
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initScrollReveals() {
    const revealEls = document.querySelectorAll(".reveal");
    if (!revealEls.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(el => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add("is-visible");
          observer.unobserve(el); // Only animate once
        }
      });
    }, {
      rootMargin: "0px 0px -40px 0px",
      threshold: 0.1
    });

    revealEls.forEach(el => observer.observe(el));
  }

  /* -------------------------------------------------------------------------
   * 4. Carousels & Dots Sync
   * ----------------------------------------------------------------------- */
  function setupCarousel(trackSelector, dotsContainerSelector, prevBtnSelector, nextBtnSelector) {
    const track = document.querySelector(trackSelector);
    if (!track) return;

    const items = track.children;
    const dotsContainer = dotsContainerSelector ? document.querySelector(dotsContainerSelector) : null;
    const prevBtn = prevBtnSelector ? document.querySelector(prevBtnSelector) : null;
    const nextBtn = nextBtnSelector ? document.querySelector(nextBtnSelector) : null;

    if (dotsContainer && items.length > 1) {
      dotsContainer.innerHTML = "";
      for (let i = 0; i < items.length; i++) {
        const dot = document.createElement("button");
        dot.className = "dot" + (i === 0 ? " is-active" : "");
        dot.setAttribute("aria-label", `Slide ${i + 1}`);
        dot.addEventListener("click", () => {
          items[i].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        });
        dotsContainer.appendChild(dot);
      }
    }

    // Update active dot on scroll
    if (!track.dataset.scrollBound) {
      track.dataset.scrollBound = "true";
      let ticking = false;
      track.addEventListener("scroll", () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            if (!dotsContainer) return;
            const dots = dotsContainer.querySelectorAll(".dot");
            if (!dots.length) return;

            const trackLeft = track.getBoundingClientRect().left;
            let activeIndex = 0;
            let minDiff = Infinity;

            for (let i = 0; i < items.length; i++) {
              const diff = Math.abs(items[i].getBoundingClientRect().left - trackLeft);
              if (diff < minDiff) {
                minDiff = diff;
                activeIndex = i;
              }
            }

            dots.forEach((d, idx) => d.classList.toggle("is-active", idx === activeIndex));
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    // Desktop arrow buttons
    if (prevBtn && !prevBtn.dataset.bound) {
      prevBtn.dataset.bound = "true";
      prevBtn.addEventListener("click", () => {
        if (!items[0]) return;
        const itemWidth = items[0].getBoundingClientRect().width + 20;
        track.scrollBy({ left: -itemWidth, behavior: "smooth" });
      });
    }
    if (nextBtn && !nextBtn.dataset.bound) {
      nextBtn.dataset.bound = "true";
      nextBtn.addEventListener("click", () => {
        if (!items[0]) return;
        const itemWidth = items[0].getBoundingClientRect().width + 20;
        track.scrollBy({ left: itemWidth, behavior: "smooth" });
      });
    }
  }

  /* -------------------------------------------------------------------------
   * 5. Lightbox (Fullscreen Image Viewer)
   * ----------------------------------------------------------------------- */
  let activeLightboxGallery = [];
  let currentLightboxIndex = 0;

  const lightbox = document.getElementById("lightbox");
  const lightboxTrack = lightbox ? lightbox.querySelector(".lightbox__track") : null;
  const lightboxCounter = lightbox ? lightbox.querySelector(".lightbox__counter") : null;
  const lightboxCaption = lightbox ? lightbox.querySelector(".lightbox__caption") : null;
  const lightboxClose = lightbox ? lightbox.querySelector(".lightbox__close") : null;
  const lightboxPrev = lightbox ? lightbox.querySelector(".lightbox__arrow--prev") : null;
  const lightboxNext = lightbox ? lightbox.querySelector(".lightbox__arrow--next") : null;

  function openLightbox(product, startIndex = 0) {
    if (!lightbox || !product) return;
    activeLightboxGallery = product.images || [null];
    currentLightboxIndex = startIndex;

    renderLightboxSlides(product);
    updateLightboxStage();

    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
  }

  function renderLightboxSlides(product) {
    if (!lightboxTrack) return;
    lightboxTrack.innerHTML = "";

    const safeName = escapeHTML(product.name || "SNS Official Piece");
    activeLightboxGallery.forEach((imgSrc) => {
      const slide = document.createElement("div");
      slide.className = "lightbox__slide";
      if (imgSrc) {
        slide.innerHTML = `<img src="${escapeHTML(imgSrc)}" class="product-photo" alt="${safeName}" width="600" height="800" loading="lazy" decoding="async">`;
      } else {
        slide.innerHTML = `
          <div class="placeholder">
            <img src="images/logo-mark.png" alt="" width="90" height="40" loading="lazy" decoding="async">
          </div>
        `;
      }
      lightboxTrack.appendChild(slide);
    });

    if (lightboxCaption) {
      lightboxCaption.textContent = product.name;
    }
  }

  function updateLightboxStage() {
    if (!lightboxTrack) return;
    const total = activeLightboxGallery.length;
    lightboxTrack.style.transform = `translateX(-${currentLightboxIndex * 100}%)`;
    if (lightboxCounter) {
      lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${total}`;
    }
    if (lightboxPrev) lightboxPrev.style.display = total > 1 ? "grid" : "none";
    if (lightboxNext) lightboxNext.style.display = total > 1 ? "grid" : "none";
  }

  if (lightbox) {
    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightboxPrev) {
      lightboxPrev.addEventListener("click", () => {
        currentLightboxIndex = (currentLightboxIndex - 1 + activeLightboxGallery.length) % activeLightboxGallery.length;
        updateLightboxStage();
      });
    }
    if (lightboxNext) {
      lightboxNext.addEventListener("click", () => {
        currentLightboxIndex = (currentLightboxIndex + 1) % activeLightboxGallery.length;
        updateLightboxStage();
      });
    }

    // Touch swipe gestures
    let touchStartX = 0;
    let touchEndX = 0;
    lightbox.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    lightbox.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 45) {
        // swipe left -> next
        if (activeLightboxGallery.length > 1) {
          currentLightboxIndex = (currentLightboxIndex + 1) % activeLightboxGallery.length;
          updateLightboxStage();
        }
      } else if (touchEndX - touchStartX > 45) {
        // swipe right -> prev
        if (activeLightboxGallery.length > 1) {
          currentLightboxIndex = (currentLightboxIndex - 1 + activeLightboxGallery.length) % activeLightboxGallery.length;
          updateLightboxStage();
        }
      }
    }, { passive: true });

    // Keyboard navigation
    window.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft" && activeLightboxGallery.length > 1) {
        currentLightboxIndex = (currentLightboxIndex - 1 + activeLightboxGallery.length) % activeLightboxGallery.length;
        updateLightboxStage();
      }
      if (e.key === "ArrowRight" && activeLightboxGallery.length > 1) {
        currentLightboxIndex = (currentLightboxIndex + 1) % activeLightboxGallery.length;
        updateLightboxStage();
      }
    });

    // Close when clicking outside stage
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  /* -------------------------------------------------------------------------
   * 6. Product Card Component, Stitch Type Toggle & Size Selector
   * ----------------------------------------------------------------------- */
  function normalizeAvailableTypes(raw) {
    if (!Array.isArray(raw)) return ["stitched", "unstitched"];
    const valid = raw
      .map(t => String(t || "").trim().toLowerCase())
      .filter(t => t === "stitched" || t === "unstitched");
    const unique = [];
    if (valid.includes("stitched")) unique.push("stitched");
    if (valid.includes("unstitched")) unique.push("unstitched");
    return unique.length > 0 ? unique : ["stitched", "unstitched"];
  }

  function getDefaultStitchType(product) {
    const avail = normalizeAvailableTypes(product && (product.availableTypes || product.available_types));
    return avail.includes("stitched") ? "stitched" : "unstitched";
  }

  function getProductPriceForType(product, type) {
    if (!product) return 0;
    const rawUnstitched = product.unstitchedPrice !== undefined ? product.unstitchedPrice : product.unstitched_price;
    if (
      String(type || "").toLowerCase() === "unstitched" &&
      rawUnstitched !== null &&
      rawUnstitched !== undefined &&
      rawUnstitched !== "" &&
      !isNaN(Number(rawUnstitched))
    ) {
      return Number(rawUnstitched);
    }
    return Number(product.price) || 0;
  }

  function formatStitchTypeLabel(type) {
    const clean = String(type || "").trim().toLowerCase();
    if (clean === "stitched") return "Stitched";
    if (clean === "unstitched") return "Unstitched";
    return null;
  }

  function createProductCardHTML(product, staggerDelay = 0) {
    const isMultiImage = product.images && product.images.length > 1;
    const isSoldOut = !product.inStock;
    const safeName = escapeHTML(product.name || "Untitled Piece");
    const safeCat = escapeHTML(product.categoryLabel || "Collection");

    const availTypes = normalizeAvailableTypes(product.availableTypes || product.available_types);
    const defaultType = getDefaultStitchType(product);
    const initialPrice = getProductPriceForType(product, defaultType);

    // Badges
    let badgeHTML = "";
    if (isSoldOut) {
      badgeHTML = `<span class="badge badge--soldout">Sold Out</span>`;
    } else if (product.badge) {
      const isSale = product.badge.toLowerCase() === "sale";
      badgeHTML = `<span class="badge ${isSale ? 'badge--sale' : ''}">${escapeHTML(product.badge)}</span>`;
    }

    // Gallery hint icon (small icon only, no text, no dots)
    const galleryHintHTML = isMultiImage ? `
      <span class="gallery-hint" title="View ${product.images.length} images">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </span>
    ` : "";

    // Image/Placeholder (with optional second image for desktop hover crossfade)
    const primaryImg = (product.images && product.images[0]) ? product.images[0] : null;
    const secondaryImg = (product.images && product.images.length > 1 && product.images[1]) ? product.images[1] : null;
    const hasSecondImgClass = (primaryImg && secondaryImg) ? " has-second-image" : "";
    const mediaInner = primaryImg
      ? `<img src="${escapeHTML(primaryImg)}" class="product-photo product-photo--primary" alt="${safeName}" width="600" height="800" loading="lazy" decoding="async">` +
        (secondaryImg ? `<img src="${escapeHTML(secondaryImg)}" class="product-photo product-photo--secondary" alt="" aria-hidden="true" width="600" height="800" loading="lazy" decoding="async">` : "")
      : `<div class="placeholder"><img src="images/logo-mark.png" alt="" width="90" height="40" loading="lazy" decoding="async"></div>`;

    // Stitched / Unstitched segmented toggle (or plain label if only one type is available)
    let stitchOptionHTML = "";
    if (availTypes.length > 1) {
      stitchOptionHTML = `
        <div class="stitch-option">
          <div class="stitch-toggle" role="group" aria-label="Select Type">
            <button type="button" class="stitch-toggle__btn" data-stitch-type="stitched" aria-pressed="${defaultType === 'stitched' ? 'true' : 'false'}" ${isSoldOut ? 'disabled' : ''}>Stitched</button>
            <button type="button" class="stitch-toggle__btn" data-stitch-type="unstitched" aria-pressed="${defaultType === 'unstitched' ? 'true' : 'false'}" ${isSoldOut ? 'disabled' : ''}>Unstitched</button>
          </div>
        </div>
      `;
    } else {
      const onlyLabel = formatStitchTypeLabel(availTypes[0]) || "Stitched";
      stitchOptionHTML = `
        <div class="stitch-option">
          <span class="stitch-label">${escapeHTML(onlyLabel)}</span>
        </div>
      `;
    }

    // Sizes (applies to Stitched only; hidden when Unstitched is selected)
    let sizesHTML = "";
    if (product.hasSizes && product.sizes && product.sizes.length > 0) {
      const sizeBtns = product.sizes.map(size => `
        <button type="button" class="size-btn" data-size="${escapeHTML(size)}" aria-pressed="false" ${isSoldOut ? 'disabled' : ''}>${escapeHTML(size)}</button>
      `).join("");
      const hideSizesClass = defaultType === "unstitched" ? " is-hidden" : "";
      sizesHTML = `
        <div class="sizes-collapse${hideSizesClass}" aria-hidden="${defaultType === 'unstitched' ? 'true' : 'false'}">
          <div class="sizes-collapse__inner">
            <div class="sizes" role="group" aria-label="Select Size">
              ${sizeBtns}
            </div>
            <div class="size-hint" aria-live="polite">Please select a size</div>
          </div>
        </div>
      `;
    }

    // Action button
    const actionBtn = isSoldOut
      ? `<button type="button" class="btn btn--outline" disabled>Sold Out</button>`
      : `<button type="button" class="btn btn--primary add-to-cart-btn">Add to Cart</button>`;

    // Stagger delay style
    const delayStyle = staggerDelay > 0 ? `style="transition-delay: ${staggerDelay}ms;"` : "";

    return `
      <article class="product-card reveal ${isSoldOut ? 'is-soldout' : ''}" data-product-id="${escapeHTML(product.id)}" ${delayStyle}>
        <div class="product-card__inner">
          <div class="product-card__media ${isMultiImage ? 'is-gallery' : ''}${hasSecondImgClass}" role="${isMultiImage ? 'button' : 'region'}" aria-label="${safeName}">
            ${badgeHTML}
            ${galleryHintHTML}
            ${mediaInner}
          </div>
          <div class="product-card__body">
            <span class="product-card__cat">${safeCat}</span>
            <h3 class="product-card__name">${safeName}</h3>
            <div class="product-card__price">
              <span class="product-card__price-val">${formatPKR(initialPrice)}</span>
              ${product.originalPrice ? `<s>${formatPKR(product.originalPrice)}</s>` : ""}
            </div>
            ${stitchOptionHTML}
            ${sizesHTML}
            <div class="product-card__actions">
              ${actionBtn}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function bindProductCardEvents(cardEl, product) {
    if (!cardEl || !product) return;

    // Gallery Lightbox trigger
    const mediaEl = cardEl.querySelector(".product-card__media");
    if (mediaEl) {
      mediaEl.addEventListener("click", () => {
        openLightbox(product, 0);
      });
    }

    // Stitch type & size selection state
    let selectedType = getDefaultStitchType(product);
    let selectedSize = null;

    const stitchBtns = cardEl.querySelectorAll(".stitch-toggle__btn");
    const priceValEl = cardEl.querySelector(".product-card__price-val");
    const sizesCollapseEl = cardEl.querySelector(".sizes-collapse");
    const sizeBtns = cardEl.querySelectorAll(".size-btn");
    const sizeHint = cardEl.querySelector(".size-hint");

    stitchBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const nextType = btn.getAttribute("data-stitch-type");
        if (!nextType || nextType === selectedType) return;

        selectedType = nextType;
        stitchBtns.forEach(b => {
          b.setAttribute("aria-pressed", b.getAttribute("data-stitch-type") === selectedType ? "true" : "false");
        });

        if (priceValEl) {
          priceValEl.textContent = formatPKR(getProductPriceForType(product, selectedType));
        }

        if (sizesCollapseEl) {
          if (selectedType === "unstitched") {
            sizesCollapseEl.classList.add("is-hidden");
            sizesCollapseEl.setAttribute("aria-hidden", "true");
            if (sizeHint) sizeHint.classList.remove("is-shown");
          } else {
            sizesCollapseEl.classList.remove("is-hidden");
            sizesCollapseEl.setAttribute("aria-hidden", "false");
          }
        }
      });
    });

    sizeBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        sizeBtns.forEach(b => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        selectedSize = btn.getAttribute("data-size");
        if (sizeHint) sizeHint.classList.remove("is-shown");
      });
    });

    // Add to Cart
    const addBtn = cardEl.querySelector(".add-to-cart-btn");
    if (addBtn && product.inStock) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const requiresSize = selectedType === "stitched" && product.hasSizes && product.sizes && product.sizes.length > 0;
        if (requiresSize && !selectedSize) {
          if (sizeHint) {
            sizeHint.classList.add("is-shown");
            setTimeout(() => sizeHint.classList.remove("is-shown"), 2800);
          }
          return;
        }

        const effectiveSize = requiresSize ? selectedSize : null;
        const typeLabel = formatStitchTypeLabel(selectedType) || "Stitched";
        addToCart(product.id, effectiveSize, 1, selectedType);
        showToast(`Added to cart: ${product.name} (${typeLabel}${effectiveSize ? `, ${effectiveSize}` : ""})`);
      });
    }
  }

  /* -------------------------------------------------------------------------
   * 7. Cart Drawer & Quantity Management
   * ----------------------------------------------------------------------- */
  const cartDrawer = document.getElementById("cartDrawer");
  const cartToggleBtns = document.querySelectorAll(".cart-toggle");
  const cartCloseBtn = document.querySelector(".cart__close");
  const cartBackdrop = document.querySelector(".cart-backdrop");
  const cartCountBadges = document.querySelectorAll(".cart-count");
  const cartItemsContainer = document.querySelector(".cart__items");
  const cartSubtotalEl = document.querySelector(".cart__subtotal strong");
  const checkoutOpenBtn = document.querySelector(".cart__checkout-btn");

  function openCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.add("is-open");
    cartDrawer.setAttribute("aria-hidden", "false");
    if (cartBackdrop) cartBackdrop.classList.add("is-visible");
    document.body.classList.add("is-locked");
  }

  function closeCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden", "true");
    if (cartBackdrop) cartBackdrop.classList.remove("is-visible");
    document.body.classList.remove("is-locked");
  }

  cartToggleBtns.forEach(btn => btn.addEventListener("click", openCart));
  if (cartCloseBtn) cartCloseBtn.addEventListener("click", closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

  function isSameCartLine(item, productId, size, type) {
    const itemType = item.type || null;
    const targetType = type || null;
    const itemSize = item.size || null;
    const targetSize = size || null;
    return item.id === productId && itemType === targetType && itemSize === targetSize;
  }

  function addToCart(productId, size = null, qty = 1, type = null) {
    const normalizedType = type ? String(type).toLowerCase() : null;
    const normalizedSize = normalizedType === "unstitched" ? null : (size || null);
    const existing = cart.find(item => isSameCartLine(item, productId, normalizedSize, normalizedType));
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ id: productId, type: normalizedType, size: normalizedSize, quantity: qty });
    }
    saveCart();

    // Bump animation on cart badge
    cartCountBadges.forEach(badge => {
      badge.classList.remove("is-bump");
      void badge.offsetWidth; // trigger reflow
      badge.classList.add("is-bump");
    });
  }

  function updateItemQty(productId, size, delta, type = null) {
    const item = cart.find(i => isSameCartLine(i, productId, size, type));
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter(i => !isSameCartLine(i, productId, size, type));
    }
    saveCart();
  }

  function removeItem(productId, size, type = null) {
    cart = cart.filter(i => !isSameCartLine(i, productId, size, type));
    saveCart();
  }

  function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Update badge count
    cartCountBadges.forEach(badge => {
      badge.textContent = totalItems;
      if (totalItems > 0) {
        badge.classList.remove("is-empty");
      } else {
        badge.classList.add("is-empty");
      }
    });

    if (!cartItemsContainer) return;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="cart__empty">
          <img src="images/logo-mark.png" alt="" width="70" height="31" loading="lazy" decoding="async">
          <p>Your bag is currently empty.</p>
          <a href="shop.html" class="btn btn--outline" onclick="SNS.closeCart()">Shop the Collection</a>
        </div>
      `;
      if (cartSubtotalEl) cartSubtotalEl.textContent = formatPKR(0);
      if (checkoutOpenBtn) checkoutOpenBtn.disabled = true;
      return;
    }

    if (checkoutOpenBtn) checkoutOpenBtn.disabled = false;

    let subtotal = 0;
    cartItemsContainer.innerHTML = "";

    cart.forEach(item => {
      const product = window.PRODUCTS ? window.PRODUCTS.find(p => p.id === item.id) : null;
      if (!product) return;

      const unitPrice = getProductPriceForType(product, item.type);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      const itemEl = document.createElement("div");
      itemEl.className = "cart-item";

      const safeName = escapeHTML(product.name || "Piece");
      const thumbHTML = (product.images && product.images[0])
        ? `<img src="${escapeHTML(product.images[0])}" class="product-photo" alt="${safeName}" width="72" height="96" loading="lazy" decoding="async">`
        : `<div class="placeholder"><img src="images/logo-mark.png" alt="" width="72" height="32" loading="lazy" decoding="async"></div>`;

      const typeLabel = formatStitchTypeLabel(item.type);
      const showSize = item.size && item.type !== "unstitched";
      const metaParts = [escapeHTML(product.categoryLabel)];
      if (typeLabel) metaParts.push(escapeHTML(typeLabel));
      if (showSize) metaParts.push(`Size: ${escapeHTML(item.size)}`);

      itemEl.innerHTML = `
        <div class="cart-item__thumb">${thumbHTML}</div>
        <div class="cart-item__info">
          <h3 class="cart-item__name">${safeName}</h3>
          <div class="cart-item__meta">${metaParts.join(" • ")}</div>
          <div class="cart-item__price">${formatPKR(unitPrice)}</div>
          <div class="qty" role="group" aria-label="Quantity">
            <button type="button" class="qty-minus" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" class="qty-plus" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button type="button" class="cart-item__remove" aria-label="Remove ${safeName}">Remove</button>
      `;

      const itemType = item.type || null;
      const itemSize = item.size || null;
      itemEl.querySelector(".qty-minus").addEventListener("click", () => updateItemQty(item.id, itemSize, -1, itemType));
      itemEl.querySelector(".qty-plus").addEventListener("click", () => updateItemQty(item.id, itemSize, 1, itemType));
      itemEl.querySelector(".cart-item__remove").addEventListener("click", () => removeItem(item.id, itemSize, itemType));

      cartItemsContainer.appendChild(itemEl);
    });

    if (cartSubtotalEl) cartSubtotalEl.textContent = formatPKR(subtotal);
  }

  /* -------------------------------------------------------------------------
   * 8. Checkout Modal & WhatsApp Order Generator
   * ----------------------------------------------------------------------- */
  const checkoutModal = document.getElementById("checkoutModal");
  const checkoutCloseBtn = checkoutModal ? checkoutModal.querySelector(".modal__close") : null;
  const checkoutBackdrop = checkoutModal ? checkoutModal.querySelector(".modal__backdrop") : null;
  const checkoutForm = document.getElementById("checkoutForm");
  const checkoutSummaryEl = document.getElementById("checkoutSummary");

  function openCheckout() {
    if (!checkoutModal || cart.length === 0) return;
    closeCart();

    renderCheckoutSummary();
    if (checkoutForm) {
      checkoutForm.style.display = "block";
      checkoutForm.reset();
      const successBox = checkoutModal.querySelector(".checkout-success");
      if (successBox) successBox.style.display = "none";
    }

    checkoutModal.classList.add("is-open");
    checkoutModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
  }

  function closeCheckout() {
    if (!checkoutModal) return;
    checkoutModal.classList.remove("is-open");
    checkoutModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
  }

  if (checkoutOpenBtn) checkoutOpenBtn.addEventListener("click", openCheckout);
  if (checkoutCloseBtn) checkoutCloseBtn.addEventListener("click", closeCheckout);
  if (checkoutBackdrop) checkoutBackdrop.addEventListener("click", closeCheckout);

  function renderCheckoutSummary() {
    if (!checkoutSummaryEl) return;
    let subtotal = 0;
    let rowsHTML = "";

    cart.forEach(item => {
      const product = window.PRODUCTS ? window.PRODUCTS.find(p => p.id === item.id) : null;
      if (!product) return;
      const unitPrice = getProductPriceForType(product, item.type);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      const typeLabel = formatStitchTypeLabel(item.type);
      const showSize = item.size && item.type !== "unstitched";
      const detailParts = [];
      if (typeLabel) detailParts.push(escapeHTML(typeLabel));
      if (showSize) detailParts.push(`Size ${escapeHTML(item.size)}`);
      const detailSuffix = detailParts.length ? ` (${detailParts.join(", ")})` : "";

      rowsHTML += `
        <div class="order-summary__row">
          <span>${escapeHTML(product.name)}${detailSuffix} × ${item.quantity}</span>
          <span>${formatPKR(lineTotal)}</span>
        </div>
      `;
    });

    rowsHTML += `
      <div class="order-summary__row order-summary__row--total">
        <span>Total Payable</span>
        <strong>${formatPKR(subtotal)}</strong>
      </div>
    `;

    checkoutSummaryEl.innerHTML = rowsHTML;
  }

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const fullName = (document.getElementById("custName")?.value || "").trim();
      const phone = (document.getElementById("custPhone")?.value || "").trim();
      const address = (document.getElementById("custAddress")?.value || "").trim();
      const altPhone = (document.getElementById("custAltPhone")?.value || "").trim();

      // Form validation
      let hasError = false;
      const fields = [
        { id: "custName", valid: fullName.length > 2 },
        { id: "custPhone", valid: phone.length >= 7 },
        { id: "custAddress", valid: address.length > 6 }
      ];

      fields.forEach(f => {
        const parent = document.getElementById(f.id)?.closest(".field");
        if (parent) {
          if (!f.valid) {
            parent.classList.add("has-error");
            hasError = true;
          } else {
            parent.classList.remove("has-error");
          }
        }
      });

      if (hasError) return;

      // Generate WhatsApp order message
      let orderItemsText = "";
      let totalAmount = 0;

      cart.forEach((item) => {
        const product = window.PRODUCTS ? window.PRODUCTS.find(p => p.id === item.id) : null;
        if (!product) return;
        const unitPrice = getProductPriceForType(product, item.type);
        const lineTotal = unitPrice * item.quantity;
        totalAmount += lineTotal;

        const typeLabel = formatStitchTypeLabel(item.type);
        const showSize = item.size && item.type !== "unstitched";
        const lineParts = [`${item.quantity}x ${product.name}`];
        if (typeLabel) lineParts.push(typeLabel);
        if (showSize) lineParts.push(`Size ${item.size}`);
        lineParts.push(formatPKR(lineTotal));

        orderItemsText += `${lineParts.join(" - ")}\n`;
      });

      const message =
`🌟 *NEW ORDER — SNS OFFICIAL* 🌟
_Stitch n Style — Premium Ladies Wear_

👤 *CUSTOMER DETAILS:*
• Name: ${fullName}
• Phone: ${phone}` +
(altPhone ? `\n• Alternate Phone: ${altPhone}` : "") +
`\n• Delivery Address: ${address}

🛍️ *ORDER ITEMS:*
${orderItemsText}
💰 *TOTAL AMOUNT:* ${formatPKR(totalAmount)}

_Thank you! I would like to proceed with payment and order confirmation via WhatsApp._`;

      const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      // Clear cart
      cart = [];
      saveCart();

      // Open WhatsApp in new tab
      window.open(whatsappURL, "_blank");

      // Show success message inside dialog
      checkoutForm.style.display = "none";
      let successBox = checkoutModal.querySelector(".checkout-success");
      if (!successBox) {
        successBox = document.createElement("div");
        successBox.className = "checkout-success";
        checkoutModal.querySelector(".modal__dialog").appendChild(successBox);
      }
      successBox.innerHTML = `
        <div class="checkout-success__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3 class="modal__title">Order Initiated</h3>
        <p>Your order details have been prepared and WhatsApp opened. If WhatsApp did not open automatically, click the button below:</p>
        <a href="${whatsappURL}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--block">Continue on WhatsApp</a>
      `;
      successBox.style.display = "block";
    });
  }

  /* -------------------------------------------------------------------------
   * 9. Toast Notifications
   * ----------------------------------------------------------------------- */
  let toastTimer = null;
  function showToast(message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <span>${message}</span>
      <button type="button">View Bag</button>
    `;

    toast.querySelector("button").addEventListener("click", () => {
      toast.classList.remove("is-shown");
      openCart();
    });

    toast.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("is-shown");
    }, 3600);
  }

  /* -------------------------------------------------------------------------
   * 10. Supabase Data Loaders & Page Specific Initializers
   * ----------------------------------------------------------------------- */
  function escapeHTML(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toAbsoluteUrl(urlOrPath) {
    const raw = String(urlOrPath || "").trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return SITE_BASE_URL.replace(/\/+$/, "") + "/" + raw.replace(/^\/+/, "");
  }

  // Dynamically generate ItemList / Product JSON-LD on shop.html when products load
  function updateShopJsonLd(products) {
    const ldScript = document.getElementById("shopProductJsonLd");
    if (!ldScript) return;

    const validProducts = (Array.isArray(products) ? products : []).filter(function (p) {
      return p && Number(p.price) > 0;
    });

    const itemListElements = validProducts.map(function (p, index) {
      const firstImg = (Array.isArray(p.images) && p.images[0]) ? toAbsoluteUrl(p.images[0]) : null;
      const productObj = {
        "@type": "Product",
        "name": String(p.name || "Untitled Piece"),
        "category": String(p.categoryLabel || p.category || "Ladies Wear"),
        "offers": {
          "@type": "Offer",
          "price": Number(p.price),
          "priceCurrency": "PKR",
          "availability": p.inStock !== false
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          "url": SITE_BASE_URL + "/shop.html"
        }
      };
      if (firstImg) {
        productObj.image = firstImg;
      }
      return {
        "@type": "ListItem",
        "position": index + 1,
        "item": productObj
      };
    });

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "SNS Official Ladies Wear Collection",
      "url": SITE_BASE_URL + "/shop.html",
      "numberOfItems": itemListElements.length,
      "itemListElement": itemListElements
    };

    ldScript.textContent = JSON.stringify(jsonLd, null, 2);
  }

  function normalizeDbProduct(row) {
    const rawSection = String(row.section || "women").trim().toLowerCase();
    const section = rawSection === "brides" ? "brides" : "women";
    const rawCat = String(row.category || "Collection").trim() || "Collection";
    const rawSub = row.subcategory ? String(row.subcategory).trim() : null;
    const cleanImages = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
    const cleanSizes = Array.isArray(row.sizes)
      ? row.sizes.map(s => String(s).trim()).filter(Boolean)
      : [];
    const availableTypes = normalizeAvailableTypes(row.available_types);
    const hasUnstitchedPrice =
      row.unstitched_price !== null &&
      row.unstitched_price !== undefined &&
      row.unstitched_price !== "" &&
      !isNaN(Number(row.unstitched_price)) &&
      Number(row.unstitched_price) >= 0;

    return {
      id: String(row.id),
      name: row.name || "Untitled Piece",
      section: section,
      category: rawCat.toLowerCase(),
      categoryLabel: rawCat,
      subcategory: rawSub || null,
      price: Number(row.price) || 0,
      unstitchedPrice: hasUnstitchedPrice ? Number(row.unstitched_price) : null,
      availableTypes: availableTypes,
      originalPrice: null,
      badge: row.badge ? String(row.badge).trim() : null,
      inStock: row.in_stock !== false,
      hasSizes: cleanSizes.length > 0,
      sizes: cleanSizes,
      images: cleanImages.length > 0 ? cleanImages : [null],
      date: row.created_at || new Date().toISOString()
    };
  }

  // Load visible menu items from Supabase; fall back to built-in default menu if Supabase fails or returns nothing
  async function loadMenuFromSupabase() {
    const sb = window.supabaseClient;
    if (!sb) {
      window.MENU_TREE = {
        women: DEFAULT_MENU_TREE.women.slice(),
        brides: DEFAULT_MENU_TREE.brides.slice()
      };
      renderSideMenuList(activeDrawerTab, false);
      return;
    }

    try {
      const { data, error } = await sb
        .from("menu_items")
        .select("*")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error || !Array.isArray(data) || data.length === 0) {
        throw error || new Error("Empty or invalid menu_items response");
      }

      const tree = { women: [], brides: [] };
      const topById = new Map();

      // First pass: top-level items (parent_id is null)
      data.forEach(function (row) {
        if (!row.parent_id) {
          const sec = String(row.section || "women").toLowerCase() === "brides" ? "brides" : "women";
          const item = {
            id: String(row.id),
            section: sec,
            label: String(row.label || "").trim(),
            custom_url: row.custom_url ? String(row.custom_url).trim() : null,
            sort_order: Number(row.sort_order) || 0,
            children: []
          };
          if (item.label) {
            tree[sec].push(item);
            topById.set(item.id, item);
          }
        }
      });

      // Second pass: sub-options (parent_id references a visible top-level item)
      data.forEach(function (row) {
        if (row.parent_id) {
          const parent = topById.get(String(row.parent_id));
          if (parent) {
            const subLabel = String(row.label || "").trim();
            if (subLabel) {
              parent.children.push({
                id: String(row.id),
                parent_id: String(row.parent_id),
                section: parent.section,
                label: subLabel,
                custom_url: row.custom_url ? String(row.custom_url).trim() : null,
                sort_order: Number(row.sort_order) || 0
              });
            }
          }
        }
      });

      // If both tabs somehow have 0 visible top-level items, fall back to built-in default
      if (tree.women.length === 0 && tree.brides.length === 0) {
        window.MENU_TREE = {
          women: DEFAULT_MENU_TREE.women.slice(),
          brides: DEFAULT_MENU_TREE.brides.slice()
        };
      } else {
        window.MENU_TREE = tree;
      }
    } catch (err) {
      console.warn("Could not load menu_items from Supabase; using built-in default menu:", err);
      window.MENU_TREE = {
        women: DEFAULT_MENU_TREE.women.slice(),
        brides: DEFAULT_MENU_TREE.brides.slice()
      };
    }

    renderSideMenuList(activeDrawerTab, false);
  }

  // Load products from Supabase; fall back to /public/js/products.js if Supabase fails
  async function loadProductsFromSupabase() {
    const sb = window.supabaseClient;
    if (!sb) {
      window.PRODUCTS = window.FALLBACK_PRODUCTS || window.PRODUCTS || [];
      updateShopJsonLd(window.PRODUCTS);
      return;
    }

    try {
      const { data, error } = await sb
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !Array.isArray(data)) {
        throw error || new Error("Invalid products response");
      }

      window.PRODUCTS = data.map(normalizeDbProduct);
    } catch (err) {
      console.warn("Could not load products from Supabase; using fallback catalog:", err);
      window.PRODUCTS = window.FALLBACK_PRODUCTS || window.PRODUCTS || [];
    }

    updateShopJsonLd(window.PRODUCTS);
  }

  // Load approved reviews from Supabase; keep existing placeholder reviews if none exist yet
  async function loadApprovedReviews() {
    const reviewsTrack = document.getElementById("reviewsTrack");
    const sb = window.supabaseClient;
    if (!reviewsTrack || !sb) return;

    try {
      const { data, error } = await sb
        .from("reviews")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error || !Array.isArray(data) || data.length === 0) {
        // Keep existing placeholder reviews if none approved yet or on error
        return;
      }

      reviewsTrack.innerHTML = "";
      const starSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

      data.forEach(rev => {
        const rating = Math.min(5, Math.max(1, Number(rev.rating) || 5));
        let starsHTML = "";
        for (let i = 1; i <= 5; i++) {
          starsHTML += `<span class="${i <= rating ? '' : 'is-off'}">${starSVG}</span>`;
        }

        const authorName = String(rev.name || "Patron").trim();
        const initial = (authorName.charAt(0) || "S").toUpperCase();
        const subline = rev.product_name ? escapeHTML(rev.product_name) : "";
        const photoAlt = rev.product_name
          ? `Review photo by ${escapeHTML(authorName)} wearing ${escapeHTML(rev.product_name)}`
          : `Review photo by ${escapeHTML(authorName)}`;

        const card = document.createElement("div");
        card.className = "review-card";
        card.innerHTML = `
          <div class="review-card__inner">
            <div class="stars" aria-label="${rating} out of 5 stars">
              ${starsHTML}
            </div>
            <p class="review-card__quote">&ldquo;${escapeHTML(rev.text)}&rdquo;</p>
            ${rev.photo_url ? `
              <div class="review-card__photo" role="button" tabindex="0" aria-label="View customer photo by ${escapeHTML(authorName)}">
                <img src="${escapeHTML(rev.photo_url)}" alt="${photoAlt}" width="56" height="56" loading="lazy" decoding="async">
              </div>
            ` : ""}
            <div class="review-card__author">
              <div class="avatar" aria-hidden="true">${escapeHTML(initial)}</div>
              <div>
                <strong class="review-card__name">${escapeHTML(authorName)}</strong>
                ${subline ? `<span class="review-card__city">${subline}</span>` : ""}
              </div>
            </div>
          </div>
        `;

        if (rev.photo_url) {
          const photoEl = card.querySelector(".review-card__photo");
          if (photoEl) {
            photoEl.addEventListener("click", () => {
              openLightbox({ name: authorName + (rev.product_name ? ` — ${rev.product_name}` : ""), images: [rev.photo_url] }, 0);
            });
          }
        }

        reviewsTrack.appendChild(card);
      });

      // Re-sync reviews carousel dots and arrows
      setupCarousel("#reviewsTrack", "#reviewsDots", "#reviewsPrev", "#reviewsNext");
    } catch (err) {
      console.warn("Could not load reviews from Supabase; keeping placeholder reviews:", err);
    }
  }

  // Apply single INSTAGRAM_URL constant to Instagram button(s) and ClothingStore JSON-LD (if real URL)
  function initInstagramLinks() {
    const igLinks = document.querySelectorAll('#instagramLink, a[aria-label="Follow us on Instagram"]');
    const isRealIgUrl = Boolean(INSTAGRAM_URL && INSTAGRAM_URL !== "#" && /^https?:\/\//i.test(INSTAGRAM_URL));
    igLinks.forEach(link => {
      link.setAttribute("href", INSTAGRAM_URL);
      if (isRealIgUrl) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });

    if (isRealIgUrl) {
      const ldStoreEl = document.getElementById("ldClothingStore");
      if (ldStoreEl) {
        try {
          const storeData = JSON.parse(ldStoreEl.textContent);
          storeData.sameAs = [INSTAGRAM_URL];
          ldStoreEl.textContent = JSON.stringify(storeData, null, 2);
        } catch (_e) {
          // Ignore JSON parse errors
        }
      }
    }
  }

  const SECTION_ORNAMENT_SVG = `<svg viewBox="0 0 160 18" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="9" x2="58" y2="9" stroke="currentColor" stroke-width="1" stroke-opacity="0.65"/><path d="M64 9 C69 3.5, 73.5 3.5, 76 9 C73.5 14.5, 69 14.5, 64 9 Z" stroke="currentColor" stroke-width="1.1" fill="none"/><polygon points="80,2.5 84.5,9 80,15.5 75.5,9" fill="currentColor"/><path d="M96 9 C91 3.5, 86.5 3.5, 84 9 C86.5 14.5, 91 14.5, 96 9 Z" stroke="currentColor" stroke-width="1.1" fill="none"/><line x1="102" y1="9" x2="158" y2="9" stroke="currentColor" stroke-width="1" stroke-opacity="0.65"/></svg>`;

  // --- HERO SLIDING BANNER CAROUSEL & ARCH FALLBACK ---
  let heroCarouselCleanup = null;

  function cleanupHeroCarousel() {
    if (typeof heroCarouselCleanup === "function") {
      heroCarouselCleanup();
      heroCarouselCleanup = null;
    }
  }

  function showHeroArchFallback() {
    cleanupHeroCarousel();
    const heroSection = document.getElementById("heroSection");
    const heroBanner = document.getElementById("heroBanner");
    const heroArchFallback = document.getElementById("heroArchFallback");
    if (!heroSection || !heroArchFallback) return;

    heroSection.classList.add("is-arch-fallback");

    if (heroBanner) {
      heroBanner.hidden = true;
      // Demote the banner overlay heading so the page has strictly one <h1>
      const bannerH1 = document.getElementById("heroBannerH1");
      if (bannerH1 && bannerH1.tagName.toLowerCase() === "h1") {
        const div = document.createElement("div");
        div.className = bannerH1.className || "hero-banner__title";
        div.id = "heroBannerH1";
        div.textContent = bannerH1.textContent || "Stitch n Style";
        bannerH1.parentNode.replaceChild(div, bannerH1);
      }
    }

    // Ensure the arch hero has the single visible <h1> ("Stitch n Style")
    const archHeading = document.getElementById("heroArchHeading");
    if (archHeading && archHeading.tagName.toLowerCase() !== "h1") {
      const h1 = document.createElement("h1");
      h1.className = archHeading.className || "hero__title";
      h1.id = "heroArchHeading";
      h1.textContent = archHeading.textContent || "Stitch n Style";
      archHeading.parentNode.replaceChild(h1, archHeading);
    }

    heroArchFallback.hidden = false;
  }

  function ensureHeroBannerH1(heroBanner) {
    if (!heroBanner) return;
    // Demote arch heading if it was previously promoted to h1 so page has strictly one h1
    const archHeading = document.getElementById("heroArchHeading");
    if (archHeading && archHeading.tagName.toLowerCase() === "h1") {
      const div = document.createElement("div");
      div.className = archHeading.className || "hero__title";
      div.id = "heroArchHeading";
      div.textContent = archHeading.textContent || "Stitch n Style";
      archHeading.parentNode.replaceChild(div, archHeading);
    }

    // Ensure the visible banner overlay headline ("Stitch n Style") is an <h1>
    const bannerHeading = document.getElementById("heroBannerH1");
    if (bannerHeading && bannerHeading.tagName.toLowerCase() !== "h1") {
      const h1 = document.createElement("h1");
      h1.className = bannerHeading.className || "hero-banner__title";
      h1.id = "heroBannerH1";
      h1.textContent = bannerHeading.textContent || "Stitch n Style";
      bannerHeading.parentNode.replaceChild(h1, bannerHeading);
    }
  }

  function preloadFirstHeroSlide(slide) {
    if (!slide || !slide.image_url || !document.head) return;
    const existing = document.getElementById("heroFirstSlidePreload");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    const link = document.createElement("link");
    link.id = "heroFirstSlidePreload";
    link.rel = "preload";
    link.as = "image";
    link.href = slide.image_url;
    document.head.appendChild(link);
  }

  function createHeroSlideElement(slide, isEager) {
    const slideEl = document.createElement("div");
    slideEl.className = "hero-banner__slide";

    const altText = String(slide.alt_text || "SNS Official - Stitch n Style").trim();
    const imgUrl = String(slide.image_url || "").trim();
    const mobileUrl = slide.mobile_image_url ? String(slide.mobile_image_url).trim() : "";
    const linkUrl = slide.link_url ? String(slide.link_url).trim() : "";

    const loadingAttr = isEager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    const mediaHTML = mobileUrl
      ? `<picture>
           <source media="(max-width: 767px)" srcset="${escapeHTML(mobileUrl)}">
           <img class="hero-banner__img" src="${escapeHTML(imgUrl)}" alt="${escapeHTML(altText)}" width="1920" height="700" ${loadingAttr} decoding="async">
         </picture>`
      : `<img class="hero-banner__img" src="${escapeHTML(imgUrl)}" alt="${escapeHTML(altText)}" width="1920" height="700" ${loadingAttr} decoding="async">`;

    if (linkUrl) {
      const a = document.createElement("a");
      a.className = "hero-banner__link";
      a.href = linkUrl;
      if (/^https?:\/\//i.test(linkUrl) && linkUrl.indexOf(window.location.host) === -1) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      a.innerHTML = mediaHTML;
      slideEl.appendChild(a);
    } else {
      const div = document.createElement("div");
      div.className = "hero-banner__media";
      div.innerHTML = mediaHTML;
      slideEl.appendChild(div);
    }

    return slideEl;
  }

  function initHeroBannerCarousel(slides) {
    cleanupHeroCarousel();
    const heroSection = document.getElementById("heroSection");
    const heroBanner = document.getElementById("heroBanner");
    const heroBannerTrack = document.getElementById("heroBannerTrack");
    const heroArchFallback = document.getElementById("heroArchFallback");

    if (!heroSection || !heroBanner || !heroBannerTrack) return;

    const validSlides = (Array.isArray(slides) ? slides : []).filter(function (s) {
      return s && s.is_visible !== false && String(s.image_url || "").trim().length > 0;
    });

    if (validSlides.length === 0) {
      showHeroArchFallback();
      return;
    }

    heroSection.classList.remove("is-arch-fallback");
    if (heroArchFallback) heroArchFallback.hidden = true;
    heroBanner.hidden = false;
    ensureHeroBannerH1(heroBanner);

    const hasAnyMobileImage = validSlides.some(function (s) {
      return Boolean(s.mobile_image_url && String(s.mobile_image_url).trim());
    });
    heroBanner.classList.toggle("has-mobile-image", hasAnyMobileImage);

    preloadFirstHeroSlide(validSlides[0]);
    heroBannerTrack.innerHTML = "";

    // Single visible slide: show statically with no sliding
    if (validSlides.length === 1) {
      heroBannerTrack.style.transition = "none";
      heroBannerTrack.style.transform = "translate3d(0%, 0, 0)";
      heroBannerTrack.appendChild(createHeroSlideElement(validSlides[0], true));
      return;
    }

    // Multiple slides: build infinite loop track [cloneLast, slide0, slide1, ..., slideN-1, cloneFirst]
    const total = validSlides.length;
    const firstClone = createHeroSlideElement(validSlides[0], false);
    firstClone.setAttribute("aria-hidden", "true");
    firstClone.querySelectorAll("a").forEach(function (a) { a.setAttribute("tabindex", "-1"); });

    const lastClone = createHeroSlideElement(validSlides[total - 1], false);
    lastClone.setAttribute("aria-hidden", "true");
    lastClone.querySelectorAll("a").forEach(function (a) { a.setAttribute("tabindex", "-1"); });

    heroBannerTrack.appendChild(lastClone);
    validSlides.forEach(function (slide, idx) {
      heroBannerTrack.appendChild(createHeroSlideElement(slide, idx === 0));
    });
    heroBannerTrack.appendChild(firstClone);

    let trackIndex = 1; // 1 corresponds to validSlides[0]
    let isTransitioning = false;
    let autoTimer = null;
    let safetyTimer = null;

    const reducedMotionQuery = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : { matches: false };

    function setTrackPosition(index, animate) {
      const useAnimation = animate && !reducedMotionQuery.matches;
      heroBannerTrack.style.transition = useAnimation ? "transform 0.9s ease" : "none";
      heroBannerTrack.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
    }

    // Start at slide 0 (trackIndex = 1) without transition
    setTrackPosition(trackIndex, false);

    function normalizeInfiniteLoopPosition() {
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      isTransitioning = false;
      if (trackIndex >= total + 1) {
        trackIndex = 1;
        setTrackPosition(trackIndex, false);
        void heroBannerTrack.offsetWidth;
      } else if (trackIndex <= 0) {
        trackIndex = total;
        setTrackPosition(trackIndex, false);
        void heroBannerTrack.offsetWidth;
      }
    }

    function goToOffset(delta) {
      if (isTransitioning) {
        normalizeInfiniteLoopPosition();
      }
      trackIndex += delta;

      if (reducedMotionQuery.matches) {
        if (trackIndex >= total + 1) trackIndex = 1;
        if (trackIndex <= 0) trackIndex = total;
        setTrackPosition(trackIndex, false);
        return;
      }

      isTransitioning = true;
      setTrackPosition(trackIndex, true);
      if (safetyTimer) clearTimeout(safetyTimer);
      safetyTimer = setTimeout(normalizeInfiniteLoopPosition, 960);
    }

    function onTransitionEnd(e) {
      if (e.target !== heroBannerTrack) return;
      normalizeInfiniteLoopPosition();
    }
    heroBannerTrack.addEventListener("transitionend", onTransitionEnd);

    // Only stop auto-advancing when browser tab is hidden or prefers-reduced-motion is enabled (never pause on hover)
    function shouldAutoAdvance() {
      return !document.hidden && !reducedMotionQuery.matches;
    }

    function stopAutoAdvance() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
      }
    }

    function startAutoAdvance() {
      stopAutoAdvance();
      if (!shouldAutoAdvance()) return;
      autoTimer = setInterval(function () {
        if (shouldAutoAdvance()) {
          goToOffset(1);
        }
      }, 5000);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        stopAutoAdvance();
      } else {
        normalizeInfiniteLoopPosition();
        startAutoAdvance();
      }
    }

    function onReducedMotionChange() {
      if (reducedMotionQuery.matches) {
        stopAutoAdvance();
        normalizeInfiniteLoopPosition();
      } else {
        startAutoAdvance();
      }
    }

    // Touch swipe left / right on mobile & tablet: snaps to new slide and restarts the 5s auto-advance timer
    let touchStartX = 0;
    let touchStartY = 0;
    let touchTracking = false;

    function onTouchStart(e) {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
      touchTracking = true;
      stopAutoAdvance();
    }

    function onTouchEnd(e) {
      if (!touchTracking) return;
      touchTracking = false;
      if (e.changedTouches && e.changedTouches[0]) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) {
            goToOffset(1);
          } else {
            goToOffset(-1);
          }
        }
      }
      startAutoAdvance();
    }

    function onTouchCancel() {
      touchTracking = false;
      startAutoAdvance();
    }

    heroBanner.addEventListener("touchstart", onTouchStart, { passive: true });
    heroBanner.addEventListener("touchend", onTouchEnd, { passive: true });
    heroBanner.addEventListener("touchcancel", onTouchCancel, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener("change", onReducedMotionChange);
    }

    startAutoAdvance();

    heroCarouselCleanup = function () {
      stopAutoAdvance();
      if (safetyTimer) clearTimeout(safetyTimer);
      heroBannerTrack.removeEventListener("transitionend", onTransitionEnd);
      heroBanner.removeEventListener("touchstart", onTouchStart);
      heroBanner.removeEventListener("touchend", onTouchEnd);
      heroBanner.removeEventListener("touchcancel", onTouchCancel);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (reducedMotionQuery.removeEventListener) {
        reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
      }
    };
  }

  async function loadHeroSlidesFromSupabase() {
    const heroSection = document.getElementById("heroSection");
    if (!heroSection) return;

    const sb = window.supabaseClient;
    if (!sb) {
      showHeroArchFallback();
      return;
    }

    try {
      const { data, error } = await sb
        .from("hero_slides")
        .select("*")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error || !Array.isArray(data) || data.length === 0) {
        showHeroArchFallback();
        return;
      }

      initHeroBannerCarousel(data);
    } catch (err) {
      console.warn("Could not load hero_slides from Supabase; showing arch hero fallback:", err);
      showHeroArchFallback();
    }
  }

  // --- HOMEPAGE INITIALIZER ---
  function initHomePage() {
    const allProducts = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];

    // 1. Collections tiles (Saree, Dupatta, Short, Maxi):
    //    Show first product image of that category (or cream placeholder with gold SNS monogram),
    //    update dynamic product count, and hide any tile whose category has no products.
    const collectionTiles = document.querySelectorAll("[data-collection-cat]");
    if (collectionTiles.length > 0) {
      let visibleTilesCount = 0;
      collectionTiles.forEach(function (tile) {
        const catName = (tile.getAttribute("data-collection-cat") || "").trim();
        const catProducts = allProducts.filter(function (p) {
          return String(p.section || "women").toLowerCase() !== "brides" && matchesCategory(p.category, catName);
        });

        if (catProducts.length === 0) {
          tile.hidden = true;
          return;
        }

        tile.hidden = false;
        visibleTilesCount++;

        const countEl = tile.querySelector("[data-collection-count]");
        if (countEl) {
          countEl.textContent = `${catProducts.length} ${catProducts.length === 1 ? "Product" : "Products"}`;
        }

        const mediaWrap = tile.querySelector(".cat-tile__media");
        if (mediaWrap) {
          let firstImage = null;
          for (let i = 0; i < catProducts.length; i++) {
            const imgs = catProducts[i].images;
            if (Array.isArray(imgs) && imgs[0]) {
              firstImage = imgs[0];
              break;
            }
          }

          if (firstImage) {
            mediaWrap.innerHTML = `<img src="${escapeHTML(firstImage)}" class="cat-tile__img" alt="${escapeHTML(catName)} Collection" width="600" height="800" loading="lazy" decoding="async">`;
          } else {
            mediaWrap.innerHTML = `
              <div class="cat-tile__placeholder">
                <img src="images/logo-mark.png" alt="" width="90" height="40" loading="lazy" decoding="async">
              </div>
            `;
          }
        }
      });

      const categoriesSection = document.getElementById("categories");
      if (categoriesSection) {
        categoriesSection.hidden = (visibleTilesCount === 0);
      }
    }

    // 2. New Arrivals: 8 newest products (Desktop: 2 rows of 4, Mobile: horizontal swipeable row with no dots)
    const featuredTrack = document.getElementById("featuredTrack");
    if (featuredTrack) {
      const newestItems = allProducts
        .slice()
        .sort(function (a, b) {
          return new Date(b.date || 0) - new Date(a.date || 0);
        })
        .slice(0, 8);

      featuredTrack.innerHTML = "";

      if (newestItems.length === 0) {
        featuredTrack.innerHTML = `<div class="empty-state"><p>New collection pieces arriving soon.</p></div>`;
      } else {
        newestItems.forEach((product, idx) => {
          const delay = Math.min((idx % 4 + 1) * 140, 560);
          const cardHTML = createProductCardHTML(product, delay);
          const temp = document.createElement("div");
          temp.innerHTML = cardHTML;
          const cardEl = temp.firstElementChild;
          featuredTrack.appendChild(cardEl);
          bindProductCardEvents(cardEl, product);
        });
      }
    }

    // 3. Dynamic Category Sections:
    //    Order categories by menu_items (Women top-level items first, then Brides),
    //    then any remaining categories from products alphabetically.
    //    Up to 8 products per category (2 rows of 4 on desktop; horizontal swipeable row on mobile, no dots).
    const categoryRowsContainer = document.getElementById("categoryRowsContainer");
    if (categoryRowsContainer) {
      categoryRowsContainer.innerHTML = "";

      const assignedProductIds = new Set();
      const seenCategoryKeys = new Set();
      const orderedCategoryDefs = [];

      function addCategorySectionDef(secKey, catLabel, customUrl) {
        const cleanLabel = String(catLabel || "").trim();
        if (!cleanLabel) return;
        const lowerLabel = cleanLabel.toLowerCase();
        // Skip "New Arrivals" link item since New Arrivals has its own dedicated section above
        if (lowerLabel === "new arrivals" || (customUrl && String(customUrl).indexOf("sort=newest") !== -1)) {
          return;
        }
        const compositeKey = `${secKey}:${lowerLabel}`;
        if (seenCategoryKeys.has(compositeKey)) return;

        const matchingItems = allProducts.filter(function (p) {
          const pSec = String(p.section || "women").toLowerCase() === "brides" ? "brides" : "women";
          return pSec === secKey && matchesCategory(p.category, cleanLabel);
        });

        seenCategoryKeys.add(compositeKey);
        if (matchingItems.length === 0) return;

        matchingItems.forEach(function (p) { assignedProductIds.add(p.id); });

        const slug = cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cat";
        orderedCategoryDefs.push({
          key: `${secKey}-${slug}`,
          title: cleanLabel,
          link: buildMenuItemUrl(secKey, cleanLabel, customUrl, null),
          items: matchingItems
        });
      }

      // a) Menu order: Women top-level items first, then Brides top-level items
      const womenMenu = (window.MENU_TREE && Array.isArray(window.MENU_TREE.women)) ? window.MENU_TREE.women : [];
      const bridesMenu = (window.MENU_TREE && Array.isArray(window.MENU_TREE.brides)) ? window.MENU_TREE.brides : [];

      womenMenu.forEach(function (mItem) {
        addCategorySectionDef("women", mItem.label, mItem.custom_url);
      });
      bridesMenu.forEach(function (mItem) {
        addCategorySectionDef("brides", mItem.label, mItem.custom_url);
      });

      // b) Any remaining categories present in products that were not matched by menu_items, sorted alphabetically
      const remainingMap = new Map();
      allProducts.forEach(function (p) {
        if (assignedProductIds.has(p.id)) return;
        const pSec = String(p.section || "women").toLowerCase() === "brides" ? "brides" : "women";
        const rawLabel = String(p.categoryLabel || p.category || "Collection").trim();
        const compositeKey = `${pSec}:${rawLabel.toLowerCase()}`;
        if (!remainingMap.has(compositeKey)) {
          remainingMap.set(compositeKey, {
            secKey: pSec,
            title: rawLabel,
            items: []
          });
        }
        remainingMap.get(compositeKey).items.push(p);
      });

      const remainingList = Array.from(remainingMap.values()).sort(function (a, b) {
        if (a.secKey !== b.secKey) return a.secKey === "women" ? -1 : 1;
        return a.title.localeCompare(b.title);
      });

      remainingList.forEach(function (rem) {
        const slug = rem.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cat";
        orderedCategoryDefs.push({
          key: `${rem.secKey}-${slug}`,
          title: rem.title,
          link: buildMenuItemUrl(rem.secKey, rem.title, null, null),
          items: rem.items
        });
      });

      // Render each category section with alternating white (#FFFFFF) and cream (#FAF6EE) backgrounds
      orderedCategoryDefs.forEach(function (row, rowIdx) {
        // #featured (New Arrivals) above is .section--alt (cream), so rowIdx 0 starts with white (.section)
        const isAlt = (rowIdx % 2 === 1);
        const sectionEl = document.createElement("section");
        sectionEl.className = "section" + (isAlt ? " section--alt" : "");
        sectionEl.id = `cat-row-${row.key}`;

        sectionEl.innerHTML = `
          <div class="container">
            <div class="section__head reveal">
              <h2 class="section__title">${escapeHTML(row.title)}</h2>
              <span class="section__ornament" aria-hidden="true">${SECTION_ORNAMENT_SVG}</span>
            </div>
            <div class="product-grid product-grid--row"></div>
            <div class="section__cta reveal">
              <a href="${escapeHTML(row.link)}" class="btn btn--outline">View All</a>
            </div>
          </div>
        `;

        const gridEl = sectionEl.querySelector(".product-grid");
        row.items.slice(0, 8).forEach(function (product, idx) {
          const delay = Math.min((idx % 4 + 1) * 140, 560);
          const cardHTML = createProductCardHTML(product, delay);
          const temp = document.createElement("div");
          temp.innerHTML = cardHTML;
          const cardEl = temp.firstElementChild;
          gridEl.appendChild(cardEl);
          bindProductCardEvents(cardEl, product);
        });

        categoryRowsContainer.appendChild(sectionEl);
      });

      // Keep subsequent sections (#reviews, #about, #contact) alternating cleanly after the last category row
      const reviewsSec = document.getElementById("reviews");
      const aboutSec = document.getElementById("about");
      const contactSec = document.getElementById("contact");
      const nextIsAlt = (orderedCategoryDefs.length % 2 === 1);
      if (reviewsSec) reviewsSec.classList.toggle("section--alt", nextIsAlt);
      if (aboutSec) aboutSec.classList.toggle("section--alt", !nextIsAlt);
      if (contactSec) contactSec.classList.toggle("section--alt", nextIsAlt);
    }

    initScrollReveals();

    // 4. Initialize reviews carousel (placeholder first, then updated if approved reviews exist)
    setupCarousel("#reviewsTrack", "#reviewsDots", "#reviewsPrev", "#reviewsNext");
  }

  // Helper to match free-text categories & homepage category tile slugs
  function matchesCategory(itemCategory, activeCategory) {
    if (!activeCategory || activeCategory === "all") return true;
    const itemCat = String(itemCategory || "").trim().toLowerCase();
    const targetCat = String(activeCategory || "").trim().toLowerCase();
    if (!itemCat) return false;
    if (itemCat === targetCat) return true;
    // Allow homepage tile slugs like "short" to match "short kurti" or "saree" to match "sarees"
    if (itemCat.startsWith(targetCat) || targetCat.startsWith(itemCat)) return true;
    return false;
  }

  function matchesSubcategory(itemSub, activeSub) {
    if (!activeSub || activeSub === "all") return true;
    const subA = String(itemSub || "").trim().toLowerCase();
    const subB = String(activeSub || "").trim().toLowerCase();
    if (!subA) return false;
    return subA === subB;
  }

  // --- SHOP PAGE INITIALIZER ---
  function initShopPage() {
    const shopGrid = document.getElementById("shopGrid");
    if (!shopGrid || !window.PRODUCTS) return;

    const filterDrawer = document.getElementById("filterDrawer");
    const filterToggleBtn = document.querySelector(".filter-toggle");
    const filterCloseBtn = document.querySelector(".filters__close");
    const filterBackdrop = document.querySelector(".filters-backdrop");
    const sectionFilterBtns = document.querySelectorAll("[data-filter-section]");
    const categoryContainer = document.querySelector('.filter-options[aria-label="Filter by Category"]');
    const subcategoryChipsWrap = document.getElementById("subcategoryChipsWrap");
    const sortSelectBtns = document.querySelectorAll("[data-sort-opt]");
    const shopCountEl = document.querySelector(".shop__count");

    // Drawer toggles
    function openFilters() {
      if (!filterDrawer) return;
      filterDrawer.classList.add("is-open");
      filterDrawer.setAttribute("aria-hidden", "false");
      if (filterBackdrop) filterBackdrop.classList.add("is-visible");
      document.body.classList.add("is-locked");
    }
    function closeFilters() {
      if (!filterDrawer) return;
      filterDrawer.classList.remove("is-open");
      filterDrawer.setAttribute("aria-hidden", "true");
      if (filterBackdrop) filterBackdrop.classList.remove("is-visible");
      document.body.classList.remove("is-locked");
    }

    if (filterToggleBtn && !filterToggleBtn.dataset.bound) {
      filterToggleBtn.dataset.bound = "true";
      filterToggleBtn.addEventListener("click", openFilters);
    }
    if (filterCloseBtn && !filterCloseBtn.dataset.bound) {
      filterCloseBtn.dataset.bound = "true";
      filterCloseBtn.addEventListener("click", closeFilters);
    }
    if (filterBackdrop && !filterBackdrop.dataset.bound) {
      filterBackdrop.dataset.bound = "true";
      filterBackdrop.addEventListener("click", closeFilters);
    }

    // Read URL parameters: section, category, sub, sort
    const urlParams = new URLSearchParams(window.location.search);
    const rawSectionParam = (urlParams.get("section") || "all").trim().toLowerCase();
    let activeSection = (rawSectionParam === "women" || rawSectionParam === "brides") ? rawSectionParam : "all";

    let rawParamCat = (urlParams.get("category") || "all").trim();
    let activeCategory = rawParamCat ? rawParamCat.toLowerCase() : "all";

    let rawParamSub = (urlParams.get("sub") || "all").trim();
    let activeSub = rawParamSub ? rawParamSub.toLowerCase() : "all";

    let rawParamSort = (urlParams.get("sort") || "featured").trim().toLowerCase();
    if (rawParamSort === "alpha") rawParamSort = "az";
    const validSorts = ["featured", "newest", "price-asc", "price-desc", "az"];
    let activeSort = validSorts.includes(rawParamSort) ? rawParamSort : "featured";

    // Build dynamic category map from products and menu_items
    function buildCategoryMap() {
      const categoryMap = new Map(); // lowercase key -> display label

      window.PRODUCTS.forEach(function (item) {
        if (activeSection !== "all" && String(item.section || "women").toLowerCase() !== activeSection) {
          return;
        }
        const key = String(item.category || "").trim().toLowerCase();
        const label = String(item.categoryLabel || item.category || "").trim();
        if (key && !categoryMap.has(key)) {
          categoryMap.set(key, label);
        }
      });

      // Also include categories defined in the menu (excluding custom-URL links like "New Arrivals")
      if (window.MENU_TREE) {
        const sectionsToScan = activeSection === "all" ? ["women", "brides"] : [activeSection];
        sectionsToScan.forEach(function (sec) {
          const menuItems = window.MENU_TREE[sec] || [];
          menuItems.forEach(function (mItem) {
            if (mItem.custom_url && !mItem.children?.length) return;
            const key = String(mItem.label || "").trim().toLowerCase();
            const label = String(mItem.label || "").trim();
            if (key && !categoryMap.has(key)) {
              categoryMap.set(key, label);
            }
          });
        });
      }

      // Reconcile activeCategory with categoryMap keys
      if (activeCategory !== "all" && !categoryMap.has(activeCategory)) {
        let matchedKey = null;
        categoryMap.forEach(function (_label, key) {
          if (!matchedKey && matchesCategory(key, activeCategory)) {
            matchedKey = key;
          }
        });
        if (matchedKey) {
          activeCategory = matchedKey;
        } else {
          const fallbackLabel = rawParamCat && rawParamCat.toLowerCase() === activeCategory
            ? rawParamCat.charAt(0).toUpperCase() + rawParamCat.slice(1)
            : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
          categoryMap.set(activeCategory, fallbackLabel);
        }
      }

      return categoryMap;
    }

    // Collect subcategories for the currently selected category
    function getSubcategoriesForActiveCategory() {
      const subMap = new Map(); // lowercase -> display label
      if (activeCategory === "all") return subMap;

      // 1. From products in this category
      window.PRODUCTS.forEach(function (item) {
        if (activeSection !== "all" && String(item.section || "women").toLowerCase() !== activeSection) return;
        if (!matchesCategory(item.category, activeCategory)) return;
        if (item.subcategory) {
          const subLabel = String(item.subcategory).trim();
          const subKey = subLabel.toLowerCase();
          if (subKey && !subMap.has(subKey)) {
            subMap.set(subKey, subLabel);
          }
        }
      });

      // 2. From menu_items sub-options under matching top-level item
      if (window.MENU_TREE) {
        const sectionsToScan = activeSection === "all" ? ["women", "brides"] : [activeSection];
        sectionsToScan.forEach(function (sec) {
          const menuItems = window.MENU_TREE[sec] || [];
          menuItems.forEach(function (mItem) {
            if (matchesCategory(mItem.label, activeCategory) && Array.isArray(mItem.children)) {
              mItem.children.forEach(function (child) {
                const subLabel = String(child.label || "").trim();
                const subKey = subLabel.toLowerCase();
                if (subKey && !subMap.has(subKey)) {
                  subMap.set(subKey, subLabel);
                }
              });
            }
          });
        });
      }

      // If URL specified a sub that isn't in subMap yet, preserve it
      if (activeSub !== "all" && !subMap.has(activeSub)) {
        const fallbackSubLabel = rawParamSub && rawParamSub.toLowerCase() === activeSub
          ? rawParamSub
          : activeSub.charAt(0).toUpperCase() + activeSub.slice(1);
        subMap.set(activeSub, fallbackSubLabel);
      }

      return subMap;
    }

    function syncShopUrlParams() {
      const url = new URL(window.location);
      if (activeSection === "all") {
        url.searchParams.delete("section");
      } else {
        url.searchParams.set("section", activeSection);
      }

      if (activeCategory === "all") {
        url.searchParams.delete("category");
      } else {
        url.searchParams.set("category", activeCategory);
      }

      if (activeSub === "all" || activeCategory === "all") {
        url.searchParams.delete("sub");
      } else {
        url.searchParams.set("sub", activeSub);
      }

      if (activeSort === "featured") {
        url.searchParams.delete("sort");
      } else {
        url.searchParams.set("sort", activeSort);
      }

      window.history.replaceState({}, "", url);
    }

    function updateSectionUI() {
      sectionFilterBtns.forEach(function (btn) {
        const sec = (btn.getAttribute("data-filter-section") || "all").toLowerCase();
        btn.setAttribute("aria-pressed", sec === activeSection ? "true" : "false");
      });
    }

    function renderCategoryButtons() {
      if (!categoryContainer) return;
      const categoryMap = buildCategoryMap();

      let buttonsHTML = `
        <button type="button" class="filter-option" data-filter-cat="all" aria-pressed="${activeCategory === 'all' ? 'true' : 'false'}">
          <span>All Pieces</span>
        </button>
      `;
      categoryMap.forEach(function (label, key) {
        const isPressed = activeCategory === key;
        buttonsHTML += `
          <button type="button" class="filter-option" data-filter-cat="${escapeHTML(key)}" aria-pressed="${isPressed ? 'true' : 'false'}">
            <span>${escapeHTML(label)}</span>
          </button>
        `;
      });
      categoryContainer.innerHTML = buttonsHTML;

      categoryContainer.querySelectorAll("[data-filter-cat]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          activeCategory = (btn.getAttribute("data-filter-cat") || "all").toLowerCase();
          activeSub = "all";
          renderCategoryButtons();
          renderSubcategoryChips();
          renderFilteredProducts();
          syncShopUrlParams();
          closeFilters();
        });
      });
    }

    function renderSubcategoryChips() {
      if (!subcategoryChipsWrap) return;
      const subMap = getSubcategoriesForActiveCategory();

      if (activeCategory === "all" || subMap.size === 0) {
        subcategoryChipsWrap.hidden = true;
        subcategoryChipsWrap.innerHTML = "";
        return;
      }

      subcategoryChipsWrap.hidden = false;
      let chipsHTML = `
        <button type="button" class="sub-chip" data-filter-sub="all" aria-pressed="${activeSub === 'all' ? 'true' : 'false'}">All</button>
      `;
      subMap.forEach(function (label, key) {
        const isPressed = activeSub === key;
        chipsHTML += `
          <button type="button" class="sub-chip" data-filter-sub="${escapeHTML(key)}" aria-pressed="${isPressed ? 'true' : 'false'}">${escapeHTML(label)}</button>
        `;
      });
      subcategoryChipsWrap.innerHTML = chipsHTML;

      subcategoryChipsWrap.querySelectorAll("[data-filter-sub]").forEach(function (chip) {
        chip.addEventListener("click", function () {
          activeSub = (chip.getAttribute("data-filter-sub") || "all").toLowerCase();
          renderSubcategoryChips();
          renderFilteredProducts();
          syncShopUrlParams();
          closeFilters();
        });
      });
    }

    function updateSortUI() {
      sortSelectBtns.forEach(function (btn) {
        const sortVal = btn.getAttribute("data-sort-opt");
        const isSelected = (sortVal === activeSort);
        btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
      });
    }

    function renderFilteredProducts() {
      // 1. Filter by section, category, and subcategory
      let list = window.PRODUCTS.filter(function (item) {
        if (activeSection !== "all") {
          const itemSec = String(item.section || "women").toLowerCase();
          if (itemSec !== activeSection) return false;
        }
        if (activeCategory !== "all" && !matchesCategory(item.category, activeCategory)) {
          return false;
        }
        if (activeCategory !== "all" && activeSub !== "all" && !matchesSubcategory(item.subcategory, activeSub)) {
          return false;
        }
        return true;
      });

      // 2. Sort
      if (activeSort === "price-asc") {
        list.sort((a, b) => a.price - b.price);
      } else if (activeSort === "price-desc") {
        list.sort((a, b) => b.price - a.price);
      } else if (activeSort === "newest") {
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
      } else if (activeSort === "az" || activeSort === "alpha") {
        list.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Update count text
      if (shopCountEl) {
        shopCountEl.textContent = `Showing ${list.length} piece${list.length === 1 ? '' : 's'}`;
      }

      // Render cards with staggered delay
      shopGrid.innerHTML = "";
      if (list.length === 0) {
        shopGrid.innerHTML = `
          <div class="empty-state">
            <p>No products found in this collection.</p>
          </div>
        `;
        return;
      }

      list.forEach((product, idx) => {
        const delay = Math.min((idx % 6) * 150, 750); // Stagger up to 750ms per view row
        const cardHTML = createProductCardHTML(product, delay);
        const temp = document.createElement("div");
        temp.innerHTML = cardHTML;
        const cardEl = temp.firstElementChild;
        shopGrid.appendChild(cardEl);
        bindProductCardEvents(cardEl, product);
      });

      // Re-initialize reveals for freshly inserted DOM
      initScrollReveals();
    }

    // Section filter button events
    sectionFilterBtns.forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", function () {
        activeSection = (btn.getAttribute("data-filter-section") || "all").toLowerCase();
        activeSub = "all";
        updateSectionUI();
        renderCategoryButtons();
        renderSubcategoryChips();
        renderFilteredProducts();
        syncShopUrlParams();
        closeFilters();
      });
    });

    // Sort button events
    sortSelectBtns.forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", () => {
        activeSort = btn.getAttribute("data-sort-opt");
        updateSortUI();
        renderFilteredProducts();
        syncShopUrlParams();
        closeFilters();
      });
    });

    // Set initial active state and render
    updateSectionUI();
    renderCategoryButtons();
    renderSubcategoryChips();
    updateSortUI();
    renderFilteredProducts();
  }

  /* -------------------------------------------------------------------------
   * 11. Floating WhatsApp Contact Button (index.html & shop.html only)
   * ----------------------------------------------------------------------- */
  function initFloatingWhatsAppButton() {
    const pathLower = (window.location.pathname || "").toLowerCase();
    if (pathLower.endsWith("admin.html") || pathLower.endsWith("review.html")) return;
    if (!navbar && !document.querySelector(".footer")) return;

    const prefillMessage = "Hello SNS Official, I would like to know more about your collection.";
    const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(prefillMessage)}`;

    // Reuse existing button in place if present, without creating a duplicate
    let waBtn = document.getElementById("whatsappFloatBtn");
    const isNewBtn = !waBtn;
    if (isNewBtn) {
      waBtn = document.createElement("a");
      waBtn.id = "whatsappFloatBtn";
    }
    waBtn.className = "wa-float";
    waBtn.href = whatsappHref;
    waBtn.target = "_blank";
    waBtn.rel = "noopener noreferrer";
    waBtn.setAttribute("aria-label", "Chat with us on WhatsApp");
    waBtn.innerHTML = `
      <span class="wa-float__label-clip" aria-hidden="true">
        <span class="wa-float__label">Chat with us</span>
      </span>
      <span class="wa-float__btn" aria-hidden="true">
        <span class="wa-float__pulse"></span>
        <svg class="wa-float__icon" viewBox="0 0 24 24" fill="currentColor" focusable="false">
          <path d="M20.52 3.48A11.82 11.82 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.95L0 24l6.33-1.66a11.87 11.87 0 0 0 5.73 1.46h.01c6.55 0 11.89-5.34 11.9-11.9a11.82 11.82 0 0 0-3.45-8.42zM12.07 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.75.98 1-3.66-.24-.37a9.85 9.85 0 0 1-1.52-5.26c0-5.45 4.44-9.89 9.9-9.89a9.83 9.83 0 0 1 7 2.9 9.84 9.84 0 0 1 2.9 7c0 5.46-4.44 9.89-9.89 9.89zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35z"/>
        </svg>
      </span>
    `;

    if (isNewBtn) {
      document.body.appendChild(waBtn);
    }

    if (waBtn.dataset.waBound === "true") return;
    waBtn.dataset.waBound = "true";

    // Hide the floating button while side menu, cart drawer, checkout modal, or lightbox is open.
    // Does not restart or reset the intro label sequence when overlays open/close.
    function syncWhatsAppVisibility() {
      const cartEl = document.getElementById("cartDrawer");
      const checkoutEl = document.getElementById("checkoutModal");
      const lightboxEl = document.getElementById("lightbox");
      const shouldHide = Boolean(
        document.body.classList.contains("menu-open") ||
        (sideMenuDrawer && sideMenuDrawer.classList.contains("is-open")) ||
        (cartEl && cartEl.classList.contains("is-open")) ||
        (checkoutEl && checkoutEl.classList.contains("is-open")) ||
        (lightboxEl && lightboxEl.classList.contains("is-open"))
      );
      waBtn.classList.toggle("is-overlay-hidden", shouldHide);
    }

    syncWhatsAppVisibility();

    if ("MutationObserver" in window) {
      const waObserver = new MutationObserver(syncWhatsAppVisibility);
      waObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      const cartEl = document.getElementById("cartDrawer");
      const checkoutEl = document.getElementById("checkoutModal");
      const lightboxEl = document.getElementById("lightbox");
      if (sideMenuDrawer) waObserver.observe(sideMenuDrawer, { attributes: true, attributeFilter: ["class"] });
      if (cartEl) waObserver.observe(cartEl, { attributes: true, attributeFilter: ["class"] });
      if (checkoutEl) waObserver.observe(checkoutEl, { attributes: true, attributeFilter: ["class"] });
      if (lightboxEl) waObserver.observe(lightboxEl, { attributes: true, attributeFilter: ["class"] });
    }

    // Label visibility state & timers:
    // - On all screen sizes: ~3s after load, slides out (~0.8s), stays ~3s once fully visible, then slides back.
    // - Reappears on mouse hover or keyboard focus, and hides ~1s after mouse leave / blur (never while hovered/focused).
    // - On touch devices, tapping opens WhatsApp directly without triggering hover/focus label reveal.
    let isHovered = false;
    let isFocused = false;
    let isIntroActive = false;
    let recentTouch = false;
    let hideDelayTimer = null;

    function clearHideDelayTimer() {
      if (hideDelayTimer) {
        clearTimeout(hideDelayTimer);
        hideDelayTimer = null;
      }
    }

    function showLabel() {
      clearHideDelayTimer();
      waBtn.classList.add("is-label-visible");
    }

    function scheduleHideLabel(delayMs) {
      clearHideDelayTimer();
      hideDelayTimer = setTimeout(function () {
        hideDelayTimer = null;
        if (!isHovered && !isFocused && !isIntroActive) {
          waBtn.classList.remove("is-label-visible");
        }
      }, delayMs);
    }

    // Track touch interactions so finger taps never trigger hover/focus reveal
    waBtn.addEventListener("touchstart", function () {
      recentTouch = true;
      setTimeout(function () {
        recentTouch = false;
      }, 800);
    }, { passive: true });

    if ("PointerEvent" in window) {
      waBtn.addEventListener("pointerenter", function (e) {
        if (e.pointerType !== "mouse") return;
        isHovered = true;
        showLabel();
      });
      waBtn.addEventListener("pointerleave", function (e) {
        if (e.pointerType !== "mouse") return;
        isHovered = false;
        if (!isFocused && !isIntroActive) {
          scheduleHideLabel(1000);
        }
      });
    } else {
      waBtn.addEventListener("mouseenter", function () {
        if (recentTouch) return;
        isHovered = true;
        showLabel();
      });
      waBtn.addEventListener("mouseleave", function () {
        if (recentTouch) return;
        isHovered = false;
        if (!isFocused && !isIntroActive) {
          scheduleHideLabel(1000);
        }
      });
    }

    waBtn.addEventListener("focus", function () {
      if (recentTouch) return;
      isFocused = true;
      showLabel();
    });

    waBtn.addEventListener("blur", function () {
      isFocused = false;
      if (!isHovered && !isIntroActive) {
        scheduleHideLabel(1000);
      }
    });

    // Intro sequence (runs once per page load on all screen sizes)
    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const slideDurationMs = reducedMotion ? 0 : 800;
    const visibleHoldMs = 3000;

    setTimeout(function () {
      isIntroActive = true;
      showLabel();

      setTimeout(function () {
        isIntroActive = false;
        if (!isHovered && !isFocused) {
          waBtn.classList.remove("is-label-visible");
        }
      }, slideDurationMs + visibleHoldMs);
    }, 3000);
  }

  /* -------------------------------------------------------------------------
   * 12. Global Initialization
   * ----------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", async function () {
    initInstagramLinks();
    initFloatingWhatsAppButton();
    renderSideMenuList(activeDrawerTab, false);
    updateCartUI();
    initHomePage();
    initShopPage();
    initScrollReveals();

    // Load hero slides, menu, and products from Supabase (with automatic fallback)
    await Promise.all([
      loadHeroSlidesFromSupabase(),
      loadMenuFromSupabase(),
      loadProductsFromSupabase()
    ]);

    // Re-sync cart UI with loaded products & initialize storefront views
    updateCartUI();
    initHomePage();
    initShopPage();
    initScrollReveals();

    // Load approved customer reviews on homepage
    await loadApprovedReviews();
  });

  // Expose minimal API for inline calls
  window.SNS = {
    openCart: openCart,
    closeCart: closeCart,
    openCheckout: openCheckout,
    renderHeroSlides: initHeroBannerCarousel,
    showHeroArchFallback: showHeroArchFallback
  };

})();
