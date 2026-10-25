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
   * 2. Navigation & Mobile Menu
   * ----------------------------------------------------------------------- */
  const navbar = document.querySelector(".nav");
  const heroSection = document.querySelector(".hero");
  const navToggle = document.querySelector(".nav__toggle");
  const navLogo = document.querySelector(".nav__logo");
  const mobileMenu = document.querySelector(".mobile-menu");

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
  // - Always visible & transparent near top (< 80px)
  // - Slides up (-100%) on scroll down, slides back in on scroll up
  // - Uses dark blurred background (.is-scrolled) once past hero (or >= 80px on shop page)
  // - Auto-hides after 1.5s of scroll inactivity when visible away from top
  // - Never hides while mobile menu, cart drawer, or checkout modal is open
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

    // Blur background threshold: past hero on index.html, or past top 80px on shop.html
    const blurThreshold = heroSection
      ? Math.max(TOP_THRESHOLD, heroSection.offsetHeight - TOP_THRESHOLD)
      : TOP_THRESHOLD;

    if (currentScrollY >= TOP_THRESHOLD && currentScrollY >= blurThreshold) {
      navbar.classList.add("is-scrolled");
    } else {
      navbar.classList.remove("is-scrolled");
    }

    // Never hide while mobile menu, cart drawer, or checkout form is open
    if (isNavLockedOpen()) {
      navbar.classList.remove("is-hidden");
      clearNavIdleTimer();
      lastScrollY = currentScrollY;
      return;
    }

    // Always visible & transparent at the very top of the page (< 80px)
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

  // Keep navbar visible whenever mobile menu, cart drawer, or checkout modal is open
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
    if (cartEl) overlayObserver.observe(cartEl, { attributes: true, attributeFilter: ["class"] });
    if (checkoutEl) overlayObserver.observe(checkoutEl, { attributes: true, attributeFilter: ["class"] });
  }

  // Mobile menu toggle
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      const isOpen = document.body.classList.toggle("menu-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        document.body.classList.add("is-locked");
      } else {
        document.body.classList.remove("is-locked");
      }
    });
  }

  // Close mobile menu on internal navigation links
  if (mobileMenu) {
    mobileMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        document.body.classList.remove("menu-open", "is-locked");
        if (navToggle) navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

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

    // Desktop arrow buttons
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        const itemWidth = items[0].getBoundingClientRect().width + 20;
        track.scrollBy({ left: -itemWidth, behavior: "smooth" });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
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

    activeLightboxGallery.forEach((imgSrc) => {
      const slide = document.createElement("div");
      slide.className = "lightbox__slide";
      if (imgSrc) {
        slide.innerHTML = `<img src="${imgSrc}" class="product-photo" alt="${product.name}">`;
      } else {
        slide.innerHTML = `
          <div class="placeholder">
            <img src="images/logo-mark.png" alt="SNS Official">
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
   * 6. Product Card Component & Size Selector
   * ----------------------------------------------------------------------- */
  function createProductCardHTML(product, staggerDelay = 0) {
    const isMultiImage = product.images && product.images.length > 1;
    const isSoldOut = !product.inStock;

    // Badges
    let badgeHTML = "";
    if (isSoldOut) {
      badgeHTML = `<span class="badge badge--soldout">Sold Out</span>`;
    } else if (product.badge) {
      const isSale = product.badge.toLowerCase() === "sale";
      badgeHTML = `<span class="badge ${isSale ? 'badge--sale' : ''}">${product.badge}</span>`;
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

    // Image/Placeholder
    const primaryImg = (product.images && product.images[0]) ? product.images[0] : null;
    const mediaInner = primaryImg
      ? `<img src="${primaryImg}" class="product-photo" alt="${product.name}" loading="lazy">`
      : `<div class="placeholder"><img src="images/logo-mark.png" alt="SNS Official"></div>`;

    // Sizes
    let sizesHTML = "";
    if (product.hasSizes && product.sizes && product.sizes.length > 0) {
      const sizeBtns = product.sizes.map(size => `
        <button type="button" class="size-btn" data-size="${size}" aria-pressed="false" ${isSoldOut ? 'disabled' : ''}>${size}</button>
      `).join("");
      sizesHTML = `
        <div class="sizes" role="group" aria-label="Select Size">
          ${sizeBtns}
        </div>
        <div class="size-hint" aria-live="polite">Please select a size</div>
      `;
    }

    // Action button
    const actionBtn = isSoldOut
      ? `<button type="button" class="btn btn--outline" disabled>Sold Out</button>`
      : `<button type="button" class="btn btn--primary add-to-cart-btn">Add to Cart</button>`;

    // Stagger delay style
    const delayStyle = staggerDelay > 0 ? `style="transition-delay: ${staggerDelay}ms;"` : "";

    return `
      <article class="product-card reveal ${isSoldOut ? 'is-soldout' : ''}" data-product-id="${product.id}" ${delayStyle}>
        <div class="product-card__inner">
          <div class="product-card__media ${isMultiImage ? 'is-gallery' : ''}" role="${isMultiImage ? 'button' : 'region'}" aria-label="${product.name}">
            ${badgeHTML}
            ${galleryHintHTML}
            ${mediaInner}
          </div>
          <div class="product-card__body">
            <span class="product-card__cat">${product.categoryLabel}</span>
            <h3 class="product-card__name">${product.name}</h3>
            <div class="product-card__price">
              <span>${formatPKR(product.price)}</span>
              ${product.originalPrice ? `<s>${formatPKR(product.originalPrice)}</s>` : ""}
            </div>
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

    // Size selection
    let selectedSize = null;
    const sizeBtns = cardEl.querySelectorAll(".size-btn");
    const sizeHint = cardEl.querySelector(".size-hint");

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
        if (product.hasSizes && !selectedSize) {
          if (sizeHint) {
            sizeHint.classList.add("is-shown");
            setTimeout(() => sizeHint.classList.remove("is-shown"), 2800);
          }
          return;
        }

        addToCart(product.id, selectedSize);
        showToast(`Added to cart: ${product.name}${selectedSize ? ` (${selectedSize})` : ""}`);
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

  function addToCart(productId, size = null, qty = 1) {
    const existing = cart.find(item => item.id === productId && item.size === size);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ id: productId, size: size, quantity: qty });
    }
    saveCart();

    // Bump animation on cart badge
    cartCountBadges.forEach(badge => {
      badge.classList.remove("is-bump");
      void badge.offsetWidth; // trigger reflow
      badge.classList.add("is-bump");
    });
  }

  function updateItemQty(productId, size, delta) {
    const item = cart.find(i => i.id === productId && i.size === size);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter(i => !(i.id === productId && i.size === size));
    }
    saveCart();
  }

  function removeItem(productId, size) {
    cart = cart.filter(i => !(i.id === productId && i.size === size));
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
          <img src="images/logo-mark.png" alt="SNS Official">
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

      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;

      const itemEl = document.createElement("div");
      itemEl.className = "cart-item";

      const thumbHTML = (product.images && product.images[0])
        ? `<img src="${product.images[0]}" class="product-photo" alt="${product.name}">`
        : `<div class="placeholder"><img src="images/logo-mark.png" alt="SNS Official"></div>`;

      itemEl.innerHTML = `
        <div class="cart-item__thumb">${thumbHTML}</div>
        <div class="cart-item__info">
          <h4 class="cart-item__name">${product.name}</h4>
          <div class="cart-item__meta">${product.categoryLabel}${item.size ? ` • Size: ${item.size}` : ""}</div>
          <div class="cart-item__price">${formatPKR(product.price)}</div>
          <div class="qty" role="group" aria-label="Quantity">
            <button type="button" class="qty-minus" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" class="qty-plus" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button type="button" class="cart-item__remove" aria-label="Remove ${product.name}">Remove</button>
      `;

      itemEl.querySelector(".qty-minus").addEventListener("click", () => updateItemQty(item.id, item.size, -1));
      itemEl.querySelector(".qty-plus").addEventListener("click", () => updateItemQty(item.id, item.size, 1));
      itemEl.querySelector(".cart-item__remove").addEventListener("click", () => removeItem(item.id, item.size));

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
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      rowsHTML += `
        <div class="order-summary__row">
          <span>${product.name} ${item.size ? `(${item.size})` : ""} × ${item.quantity}</span>
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

      cart.forEach((item, index) => {
        const product = window.PRODUCTS ? window.PRODUCTS.find(p => p.id === item.id) : null;
        if (!product) return;
        const lineTotal = product.price * item.quantity;
        totalAmount += lineTotal;
        orderItemsText += `${index + 1}. *${product.name}*\n` +
          `   • Category: ${product.categoryLabel}\n` +
          (item.size ? `   • Size: ${item.size}\n` : "") +
          `   • Quantity: ${item.quantity}\n` +
          `   • Price: ${formatPKR(lineTotal)}\n\n`;
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
${orderItemsText}💰 *TOTAL AMOUNT:* ${formatPKR(totalAmount)}

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
        <a href="${whatsappURL}" target="_blank" class="btn btn--primary btn--block">Continue on WhatsApp</a>
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

  function normalizeDbProduct(row) {
    const rawCat = String(row.category || "Collection").trim() || "Collection";
    const cleanImages = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
    const cleanSizes = Array.isArray(row.sizes)
      ? row.sizes.map(s => String(s).trim()).filter(Boolean)
      : [];

    return {
      id: String(row.id),
      name: row.name || "Untitled Piece",
      category: rawCat.toLowerCase(),
      categoryLabel: rawCat,
      price: Number(row.price) || 0,
      originalPrice: null,
      badge: row.badge ? String(row.badge).trim() : null,
      inStock: row.in_stock !== false,
      hasSizes: cleanSizes.length > 0,
      sizes: cleanSizes,
      images: cleanImages.length > 0 ? cleanImages : [null],
      date: row.created_at || new Date().toISOString()
    };
  }

  // Load products from Supabase; fall back to /public/js/products.js if Supabase fails
  async function loadProductsFromSupabase() {
    const sb = window.supabaseClient;
    if (!sb) {
      window.PRODUCTS = window.FALLBACK_PRODUCTS || window.PRODUCTS || [];
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
                <img src="${escapeHTML(rev.photo_url)}" alt="Photo shared by ${escapeHTML(authorName)}" loading="lazy">
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

  // Apply single INSTAGRAM_URL constant to Instagram button(s)
  function initInstagramLinks() {
    const igLinks = document.querySelectorAll('#instagramLink, a[aria-label="Follow us on Instagram"]');
    igLinks.forEach(link => {
      link.setAttribute("href", INSTAGRAM_URL);
      if (INSTAGRAM_URL && INSTAGRAM_URL !== "#") {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener");
      }
    });
  }

  // --- HOMEPAGE INITIALIZER ---
  function initHomePage() {
    const featuredTrack = document.getElementById("featuredTrack");
    if (featuredTrack && window.PRODUCTS) {
      // Pick up to 4 items from products data
      const featuredItems = window.PRODUCTS.slice(0, 4);
      featuredTrack.innerHTML = "";

      if (featuredItems.length === 0) {
        featuredTrack.innerHTML = `<div class="empty-state"><p>New collection pieces arriving soon.</p></div>`;
      } else {
        featuredItems.forEach((product, idx) => {
          const delay = (idx + 1) * 160; // 160ms staggered delay
          const cardHTML = createProductCardHTML(product, delay);
          const temp = document.createElement("div");
          temp.innerHTML = cardHTML;
          const cardEl = temp.firstElementChild;
          featuredTrack.appendChild(cardEl);
          bindProductCardEvents(cardEl, product);
        });
      }

      // Mobile carousel dots for featured
      setupCarousel("#featuredTrack", "#featuredDots");
      initScrollReveals();
    }

    // Initialize reviews carousel (placeholder first, then updated if approved reviews exist)
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

  // --- SHOP PAGE INITIALIZER ---
  function initShopPage() {
    const shopGrid = document.getElementById("shopGrid");
    if (!shopGrid || !window.PRODUCTS) return;

    const filterDrawer = document.getElementById("filterDrawer");
    const filterToggleBtn = document.querySelector(".filter-toggle");
    const filterCloseBtn = document.querySelector(".filters__close");
    const filterBackdrop = document.querySelector(".filters-backdrop");
    const categoryContainer = document.querySelector('.filter-options[aria-label="Filter by Category"]');
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

    // Build dynamic category list from database products
    const categoryMap = new Map(); // lowercase key -> display label
    window.PRODUCTS.forEach(item => {
      const key = String(item.category || "").trim().toLowerCase();
      const label = String(item.categoryLabel || item.category || "").trim();
      if (key && !categoryMap.has(key)) {
        categoryMap.set(key, label);
      }
    });

    // Initial state from URL param
    const urlParams = new URLSearchParams(window.location.search);
    let rawParamCat = (urlParams.get("category") || "all").trim().toLowerCase();
    let activeCategory = "all";

    if (rawParamCat !== "all") {
      if (categoryMap.has(rawParamCat)) {
        activeCategory = rawParamCat;
      } else {
        // Check if URL slug matches a free-text category (e.g. "short" -> "short kurti")
        let matchedKey = null;
        categoryMap.forEach((_label, key) => {
          if (!matchedKey && matchesCategory(key, rawParamCat)) {
            matchedKey = key;
          }
        });
        if (matchedKey) {
          activeCategory = matchedKey;
        } else {
          // Preserve requested category in filter list even if 0 products currently exist in it
          activeCategory = rawParamCat;
          const fallbackLabel = rawParamCat.charAt(0).toUpperCase() + rawParamCat.slice(1);
          categoryMap.set(rawParamCat, fallbackLabel);
        }
      }
    }

    let activeSort = "featured";

    // Render dynamic category filter buttons
    if (categoryContainer) {
      let buttonsHTML = `
        <button type="button" class="filter-option" data-filter-cat="all" aria-pressed="${activeCategory === 'all' ? 'true' : 'false'}">
          <span>All Pieces</span>
        </button>
      `;
      categoryMap.forEach((label, key) => {
        const isPressed = activeCategory === key;
        buttonsHTML += `
          <button type="button" class="filter-option" data-filter-cat="${escapeHTML(key)}" aria-pressed="${isPressed ? 'true' : 'false'}">
            <span>${escapeHTML(label)}</span>
          </button>
        `;
      });
      categoryContainer.innerHTML = buttonsHTML;
    }

    const categoryFilterBtns = document.querySelectorAll("[data-filter-cat]");

    function updateCategoryUI() {
      categoryFilterBtns.forEach(btn => {
        const cat = (btn.getAttribute("data-filter-cat") || "").toLowerCase();
        const isSelected = (cat === activeCategory);
        btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
      });
    }

    function updateSortUI() {
      sortSelectBtns.forEach(btn => {
        const sortVal = btn.getAttribute("data-sort-opt");
        const isSelected = (sortVal === activeSort);
        btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
      });
    }

    function renderFilteredProducts() {
      // 1. Filter
      let list = window.PRODUCTS.filter(item => {
        if (activeCategory === "all") return true;
        return matchesCategory(item.category, activeCategory);
      });

      // 2. Sort
      if (activeSort === "price-asc") {
        list.sort((a, b) => a.price - b.price);
      } else if (activeSort === "price-desc") {
        list.sort((a, b) => b.price - a.price);
      } else if (activeSort === "newest") {
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
      } else if (activeSort === "alpha") {
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
            <p>No products found in this category.</p>
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

    // Category button events
    categoryFilterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        activeCategory = (btn.getAttribute("data-filter-cat") || "all").toLowerCase();
        updateCategoryUI();
        renderFilteredProducts();
        closeFilters();

        // Update URL query string without reloading
        const url = new URL(window.location);
        if (activeCategory === "all") {
          url.searchParams.delete("category");
        } else {
          url.searchParams.set("category", activeCategory);
        }
        window.history.replaceState({}, "", url);
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
        closeFilters();
      });
    });

    // Set initial active state and render
    updateCategoryUI();
    updateSortUI();
    renderFilteredProducts();
  }

  /* -------------------------------------------------------------------------
   * 11. Global Initialization
   * ----------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", async function () {
    initInstagramLinks();
    updateCartUI();
    initScrollReveals();

    // Load products from Supabase (with automatic fallback to products.js)
    await loadProductsFromSupabase();

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
    openCheckout: openCheckout
  };

})();
