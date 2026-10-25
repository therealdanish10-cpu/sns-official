/**
 * SNS Official — Stitch n Style
 * Admin Portal Controller (Products, Menu Navigation, Approved Reviews & Pending Reviews)
 */

(function () {
  "use strict";

  const sb = window.supabaseClient;
  const BUCKETS = (window.SNS_SUPABASE && window.SNS_SUPABASE.buckets) || {
    products: "product-images",
    reviews: "review-photos"
  };

  /* -------------------------------------------------------------------------
   * DOM Elements
   * ----------------------------------------------------------------------- */
  const authView = document.getElementById("authView");
  const dashboardView = document.getElementById("dashboardView");
  const authAlert = document.getElementById("authAlert");
  const dashboardAlert = document.getElementById("dashboardAlert");
  const adminUserEmail = document.getElementById("adminUserEmail");

  const loginForm = document.getElementById("loginForm");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginSubmitBtn = document.getElementById("loginSubmitBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  // Tabs
  const tabBtns = document.querySelectorAll(".admin-tab[data-tab]");
  const tabPanels = {
    products: document.getElementById("tab-products"),
    menu: document.getElementById("tab-menu"),
    reviews: document.getElementById("tab-reviews"),
    pending: document.getElementById("tab-pending")
  };
  const productsCountBadge = document.getElementById("productsCountBadge");
  const menuCountBadge = document.getElementById("menuCountBadge");
  const approvedCountBadge = document.getElementById("approvedCountBadge");
  const pendingCountBadge = document.getElementById("pendingCountBadge");

  // Products Tab DOM
  const productForm = document.getElementById("productForm");
  const productFormTitle = document.getElementById("productFormTitle");
  const cancelProductEditBtn = document.getElementById("cancelProductEditBtn");
  const productIdInput = document.getElementById("productId");
  const prodNameInput = document.getElementById("prodName");
  const prodPriceInput = document.getElementById("prodPrice");
  const prodTypeStitchedInput = document.getElementById("prodTypeStitched");
  const prodTypeUnstitchedInput = document.getElementById("prodTypeUnstitched");
  const unstitchedPriceField = document.getElementById("unstitchedPriceField");
  const prodUnstitchedPriceInput = document.getElementById("prodUnstitchedPrice");
  const prodSectionInput = document.getElementById("prodSection");
  const prodCategoryInput = document.getElementById("prodCategory");
  const prodSubcategoryInput = document.getElementById("prodSubcategory");
  const subcategoryDatalist = document.getElementById("subcategorySuggestions");
  const prodBadgeInput = document.getElementById("prodBadge");
  const prodInStockInput = document.getElementById("prodInStock");
  const prodInStockLabel = document.getElementById("prodInStockLabel");
  const prodSizeInput = document.getElementById("prodSizeInput");
  const addSizeTagBtn = document.getElementById("addSizeTagBtn");
  const quickSizesBtn = document.getElementById("quickSizesBtn");
  const sizeTagsList = document.getElementById("sizeTagsList");
  const prodImagesInput = document.getElementById("prodImagesInput");
  const prodImagePreviews = document.getElementById("prodImagePreviews");
  const productSubmitBtn = document.getElementById("productSubmitBtn");
  const refreshProductsBtn = document.getElementById("refreshProductsBtn");
  const productsListEl = document.getElementById("productsList");

  // Menu Tab DOM
  const refreshMenuBtn = document.getElementById("refreshMenuBtn");
  const menuSectionBtns = document.querySelectorAll(".menu-section-btn[data-menu-section]");
  const toggleAddMenuFormBtn = document.getElementById("toggleAddMenuFormBtn");
  const addTopMenuForm = document.getElementById("addTopMenuForm");
  const addTopMenuSectionLabel = document.getElementById("addTopMenuSectionLabel");
  const newMenuLabelInput = document.getElementById("newMenuLabel");
  const newMenuUrlInput = document.getElementById("newMenuUrl");
  const newMenuVisibleInput = document.getElementById("newMenuVisible");
  const newMenuVisibleLabel = document.getElementById("newMenuVisibleLabel");
  const newMenuSubmitBtn = document.getElementById("newMenuSubmitBtn");
  const cancelNewMenuBtn = document.getElementById("cancelNewMenuBtn");
  const menuItemsListEl = document.getElementById("menuItemsList");

  // Reviews Tab DOM
  const reviewForm = document.getElementById("reviewForm");
  const reviewFormTitle = document.getElementById("reviewFormTitle");
  const cancelReviewEditBtn = document.getElementById("cancelReviewEditBtn");
  const reviewIdInput = document.getElementById("reviewId");
  const revNameInput = document.getElementById("revName");
  const revRatingInput = document.getElementById("revRating");
  const revProductInput = document.getElementById("revProduct");
  const revTextInput = document.getElementById("revText");
  const revPhotoInput = document.getElementById("revPhotoInput");
  const revPhotoPreviewWrap = document.getElementById("revPhotoPreviewWrap");
  const revPhotoPreviewImg = document.getElementById("revPhotoPreviewImg");
  const removeRevPhotoBtn = document.getElementById("removeRevPhotoBtn");
  const adminStarPicker = document.getElementById("adminStarPicker");
  const reviewSubmitBtn = document.getElementById("reviewSubmitBtn");
  const refreshReviewsBtn = document.getElementById("refreshReviewsBtn");
  const approvedReviewsListEl = document.getElementById("approvedReviewsList");

  // Pending Tab DOM
  const refreshPendingBtn = document.getElementById("refreshPendingBtn");
  const pendingReviewsListEl = document.getElementById("pendingReviewsList");

  /* -------------------------------------------------------------------------
   * Local State
   * ----------------------------------------------------------------------- */
  let allProducts = [];
  let allMenuItems = [];
  let allReviews = [];

  // Menu tab state
  let activeMenuSection = "women";
  const expandedMenuParents = new Set();

  // Product form state
  let currentProductSizes = [];
  let currentProductImages = [];

  // Review form state
  let currentReviewPhotoUrl = null;
  let currentReviewPhotoFile = null;

  /* -------------------------------------------------------------------------
   * Helpers
   * ----------------------------------------------------------------------- */
  function escapeHTML(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPKR(num) {
    return "Rs. " + Number(num || 0).toLocaleString("en-PK");
  }

  function formatDate(isoStr) {
    if (!isoStr) return "";
    try {
      return new Date(isoStr).toLocaleDateString("en-PK", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (e) {
      return "";
    }
  }

  function formatSectionLabel(sec) {
    return String(sec || "women").toLowerCase() === "brides" ? "Brides" : "Women";
  }

  let alertTimer = null;
  function showAlert(targetEl, message, type = "info", autoHideMs = 4500) {
    if (!targetEl) return;
    targetEl.textContent = message;
    targetEl.className = "admin-alert" + (type === "error" ? " is-error" : type === "success" ? " is-success" : "");
    targetEl.hidden = false;

    if (targetEl === dashboardAlert) {
      clearTimeout(alertTimer);
      if (autoHideMs > 0) {
        alertTimer = setTimeout(() => {
          targetEl.hidden = true;
        }, autoHideMs);
      }
    }
  }

  function hideAlert(targetEl) {
    if (targetEl) targetEl.hidden = true;
  }

  async function uploadImageToBucket(bucketName, file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error: uploadErr } = await sb.storage.from(bucketName).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg"
    });

    if (uploadErr) {
      throw new Error(uploadErr.message || "Failed to upload image.");
    }

    const { data } = sb.storage.from(bucketName).getPublicUrl(filePath);
    if (!data || !data.publicUrl) {
      throw new Error("Could not retrieve public URL for uploaded image.");
    }
    return data.publicUrl;
  }

  // Update the <datalist id="subcategorySuggestions"> from menu sub-options & existing products
  function refreshSubcategorySuggestions() {
    if (!subcategoryDatalist) return;
    const suggestions = new Set();

    // Add all sub-option labels from menu_items
    allMenuItems.forEach(item => {
      if (item.parent_id && item.label) {
        suggestions.add(String(item.label).trim());
      }
    });

    // Also include existing subcategories from products
    allProducts.forEach(prod => {
      if (prod.subcategory) {
        suggestions.add(String(prod.subcategory).trim());
      }
    });

    subcategoryDatalist.innerHTML = Array.from(suggestions)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map(label => `<option value="${escapeHTML(label)}"></option>`)
      .join("");
  }

  /* -------------------------------------------------------------------------
   * 1. Authentication & Session Handling
   * ----------------------------------------------------------------------- */
  function setAuthenticatedUI(session) {
    if (session && session.user) {
      authView.hidden = true;
      dashboardView.hidden = false;
      if (adminUserEmail) adminUserEmail.textContent = session.user.email || "";
      hideAlert(authAlert);
      loadAllAdminData();
    } else {
      authView.hidden = false;
      dashboardView.hidden = true;
      if (adminUserEmail) adminUserEmail.textContent = "";
    }
  }

  async function initAuth() {
    if (!sb) {
      showAlert(authAlert, "Supabase client failed to load. Please check your internet connection.", "error", 0);
      return;
    }

    const { data, error } = await sb.auth.getSession();
    if (error) {
      showAlert(authAlert, error.message, "error", 0);
    }
    setAuthenticatedUI(data ? data.session : null);

    sb.auth.onAuthStateChange((_event, session) => {
      setAuthenticatedUI(session);
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!sb) return;

      const email = (loginEmail.value || "").trim();
      const password = loginPassword.value || "";

      if (!email || !password) {
        showAlert(authAlert, "Please enter both your email address and password.", "error", 0);
        return;
      }

      loginSubmitBtn.disabled = true;
      loginSubmitBtn.textContent = "Signing In…";
      hideAlert(authAlert);

      try {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        loginForm.reset();
      } catch (err) {
        showAlert(authAlert, err.message || "Invalid login credentials.", "error", 0);
      } finally {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = "Sign In";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      if (!sb) return;
      await sb.auth.signOut();
    });
  }

  /* -------------------------------------------------------------------------
   * 2. Tabs Navigation
   * ----------------------------------------------------------------------- */
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      tabBtns.forEach(b => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });

      Object.keys(tabPanels).forEach(key => {
        const panel = tabPanels[key];
        if (!panel) return;
        const isMatch = key === target;
        panel.hidden = !isMatch;
        panel.classList.toggle("is-active", isMatch);
      });
    });
  });

  function loadAllAdminData() {
    fetchProducts();
    fetchMenuItems();
    fetchReviews();
  }

  /* -------------------------------------------------------------------------
   * 3. Products Management (CRUD, Section, Subcategory, Sizes, Images)
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

  function updateUnstitchedPriceVisibility() {
    if (!unstitchedPriceField || !prodTypeUnstitchedInput) return;
    unstitchedPriceField.hidden = !prodTypeUnstitchedInput.checked;
  }

  if (prodTypeUnstitchedInput) {
    prodTypeUnstitchedInput.addEventListener("change", updateUnstitchedPriceVisibility);
  }

  function updateInStockSwitchLabel() {
    if (!prodInStockInput || !prodInStockLabel) return;
    prodInStockLabel.textContent = prodInStockInput.checked ? "In Stock" : "Out of Stock";
  }

  if (prodInStockInput) {
    prodInStockInput.addEventListener("change", updateInStockSwitchLabel);
  }

  // ---- Sizes Tag Input ----
  function renderSizeTags() {
    if (!sizeTagsList) return;
    sizeTagsList.innerHTML = "";
    currentProductSizes.forEach((size, index) => {
      const tag = document.createElement("span");
      tag.className = "size-tag";
      tag.innerHTML = `
        <span>${escapeHTML(size)}</span>
        <button type="button" aria-label="Remove size ${escapeHTML(size)}">&times;</button>
      `;
      tag.querySelector("button").addEventListener("click", () => {
        currentProductSizes.splice(index, 1);
        renderSizeTags();
      });
      sizeTagsList.appendChild(tag);
    });
  }

  function addSizesFromString(rawStr) {
    if (!rawStr) return;
    const parts = rawStr.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    parts.forEach(part => {
      if (!currentProductSizes.includes(part)) {
        currentProductSizes.push(part);
      }
    });
    renderSizeTags();
  }

  if (addSizeTagBtn && prodSizeInput) {
    addSizeTagBtn.addEventListener("click", () => {
      addSizesFromString(prodSizeInput.value);
      prodSizeInput.value = "";
      prodSizeInput.focus();
    });

    prodSizeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addSizesFromString(prodSizeInput.value);
        prodSizeInput.value = "";
      }
    });
  }

  if (quickSizesBtn) {
    quickSizesBtn.addEventListener("click", () => {
      addSizesFromString("S, M, L, XL");
    });
  }

  // ---- Multi-Image Preview, Remove & Reorder ----
  function renderProductImages() {
    if (!prodImagePreviews) return;
    prodImagePreviews.innerHTML = "";

    currentProductImages.forEach((item, idx) => {
      const src = item.type === "url" ? item.url : item.previewUrl;
      const isMain = idx === 0;

      const tile = document.createElement("div");
      tile.className = "img-tile" + (isMain ? " is-main" : "");
      tile.innerHTML = `
        <div class="img-tile__preview">
          <img src="${escapeHTML(src)}" alt="Product image ${idx + 1}">
          ${isMain ? '<span class="img-tile__badge">Main</span>' : ""}
        </div>
        <div class="img-tile__actions">
          <button type="button" class="img-tile__btn move-left" title="Move left" ${idx === 0 ? "disabled" : ""}>&larr;</button>
          <button type="button" class="img-tile__btn move-right" title="Move right" ${idx === currentProductImages.length - 1 ? "disabled" : ""}>&rarr;</button>
          <button type="button" class="img-tile__btn img-tile__btn--del remove-img" title="Remove image">&times;</button>
        </div>
      `;

      tile.querySelector(".move-left").addEventListener("click", () => {
        if (idx > 0) {
          const temp = currentProductImages[idx - 1];
          currentProductImages[idx - 1] = currentProductImages[idx];
          currentProductImages[idx] = temp;
          renderProductImages();
        }
      });

      tile.querySelector(".move-right").addEventListener("click", () => {
        if (idx < currentProductImages.length - 1) {
          const temp = currentProductImages[idx + 1];
          currentProductImages[idx + 1] = currentProductImages[idx];
          currentProductImages[idx] = temp;
          renderProductImages();
        }
      });

      tile.querySelector(".remove-img").addEventListener("click", () => {
        if (item.type === "file" && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
        currentProductImages.splice(idx, 1);
        renderProductImages();
      });

      prodImagePreviews.appendChild(tile);
    });
  }

  if (prodImagesInput) {
    prodImagesInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach(file => {
        if (!file.type.startsWith("image/")) {
          showAlert(dashboardAlert, `Skipped "${file.name}": only image files are allowed.`, "error");
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          showAlert(dashboardAlert, `Skipped "${file.name}": image exceeds 10 MB limit.`, "error");
          return;
        }
        const previewUrl = URL.createObjectURL(file);
        currentProductImages.push({ type: "file", file, previewUrl });
      });
      prodImagesInput.value = "";
      renderProductImages();
    });
  }

  function resetProductForm() {
    if (!productForm) return;
    productForm.reset();
    productIdInput.value = "";
    if (prodSectionInput) prodSectionInput.value = "women";
    if (prodSubcategoryInput) prodSubcategoryInput.value = "";
    if (prodTypeStitchedInput) prodTypeStitchedInput.checked = true;
    if (prodTypeUnstitchedInput) prodTypeUnstitchedInput.checked = true;
    if (prodUnstitchedPriceInput) prodUnstitchedPriceInput.value = "";
    updateUnstitchedPriceVisibility();
    prodInStockInput.checked = true;
    updateInStockSwitchLabel();

    currentProductSizes = [];
    renderSizeTags();

    currentProductImages.forEach(item => {
      if (item.type === "file" && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    currentProductImages = [];
    renderProductImages();

    productFormTitle.textContent = "Add New Product";
    productSubmitBtn.textContent = "Save Product";
    cancelProductEditBtn.hidden = true;
  }

  if (cancelProductEditBtn) {
    cancelProductEditBtn.addEventListener("click", resetProductForm);
  }

  function startEditProduct(product) {
    resetProductForm();
    productIdInput.value = product.id;
    prodNameInput.value = product.name || "";
    prodPriceInput.value = product.price ?? "";
    if (prodSectionInput) {
      prodSectionInput.value = (product.section && product.section.toLowerCase() === "brides") ? "brides" : "women";
    }
    const availTypes = normalizeAvailableTypes(product.available_types);
    if (prodTypeStitchedInput) prodTypeStitchedInput.checked = availTypes.includes("stitched");
    if (prodTypeUnstitchedInput) prodTypeUnstitchedInput.checked = availTypes.includes("unstitched");
    if (prodUnstitchedPriceInput) {
      prodUnstitchedPriceInput.value = (product.unstitched_price !== null && product.unstitched_price !== undefined)
        ? product.unstitched_price
        : "";
    }
    updateUnstitchedPriceVisibility();
    prodCategoryInput.value = product.category || "";
    if (prodSubcategoryInput) {
      prodSubcategoryInput.value = product.subcategory || "";
    }
    prodBadgeInput.value = product.badge || "";
    prodInStockInput.checked = product.in_stock !== false;
    updateInStockSwitchLabel();

    currentProductSizes = Array.isArray(product.sizes) ? [...product.sizes] : [];
    renderSizeTags();

    const imgs = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    currentProductImages = imgs.map(url => ({ type: "url", url }));
    renderProductImages();

    productFormTitle.textContent = "Edit Product";
    productSubmitBtn.textContent = "Update Product";
    cancelProductEditBtn.hidden = false;

    productForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function fetchProducts() {
    if (!sb || !productsListEl) return;
    productsListEl.innerHTML = `<div class="admin-loading">Loading products…</div>`;

    const { data, error } = await sb
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      productsListEl.innerHTML = `<div class="admin-empty">Error loading products: ${escapeHTML(error.message)}</div>`;
      return;
    }

    allProducts = data || [];
    if (productsCountBadge) productsCountBadge.textContent = allProducts.length;
    refreshSubcategorySuggestions();
    renderProductsList();
  }

  function renderProductsList() {
    if (!productsListEl) return;
    if (allProducts.length === 0) {
      productsListEl.innerHTML = `<div class="admin-empty">No products in catalog yet. Use the form to add your first piece.</div>`;
      return;
    }

    productsListEl.innerHTML = "";
    allProducts.forEach(product => {
      const imgs = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
      const mainImg = imgs[0] || null;
      const sizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [];
      const inStock = product.in_stock !== false;
      const sectionLabel = formatSectionLabel(product.section);
      const availTypes = normalizeAvailableTypes(product.available_types);
      const hasUnstitchedPrice = availTypes.includes("unstitched")
        && product.unstitched_price !== null
        && product.unstitched_price !== undefined
        && !isNaN(Number(product.unstitched_price));
      const typeBadgesHTML = availTypes
        .map(t => `<span class="admin-pill admin-pill--type">${t === "stitched" ? "Stitched" : "Unstitched"}</span>`)
        .join(" ");

      const row = document.createElement("div");
      row.className = "admin-item";
      row.innerHTML = `
        <div class="admin-item__thumb">
          ${mainImg
            ? `<img src="${escapeHTML(mainImg)}" class="is-photo" alt="${escapeHTML(product.name)}">`
            : `<img src="images/logo-mark.png" class="is-placeholder" alt="SNS Official">`
          }
        </div>
        <div class="admin-item__body">
          <div class="admin-item__top">
            <strong class="admin-item__title">${escapeHTML(product.name)}</strong>
            <span class="admin-item__price">${formatPKR(product.price)}</span>
          </div>
          <div class="admin-item__meta">
            ${typeBadgesHTML}
            ${hasUnstitchedPrice ? `<span>Unstitched: <strong>${formatPKR(product.unstitched_price)}</strong></span>` : ""}
            <span>Section: <strong>${escapeHTML(sectionLabel)}</strong></span>
            <span>Category: <strong>${escapeHTML(product.category)}</strong></span>
            ${product.subcategory ? `<span>Subcategory: <strong>${escapeHTML(product.subcategory)}</strong></span>` : ""}
            <span>Sizes: ${sizes.length ? escapeHTML(sizes.join(", ")) : "None"}</span>
            <span>Photos: ${imgs.length}</span>
            ${product.badge ? `<span class="admin-pill">${escapeHTML(product.badge)}</span>` : ""}
            <span class="admin-pill ${inStock ? "" : "admin-pill--out"}">${inStock ? "In Stock" : "Out of Stock"}</span>
          </div>
        </div>
        <div class="admin-item__actions">
          <button type="button" class="admin-action-btn edit-prod-btn">Edit</button>
          <button type="button" class="admin-action-btn admin-action-btn--danger del-prod-btn">Delete</button>
        </div>
      `;

      row.querySelector(".edit-prod-btn").addEventListener("click", () => startEditProduct(product));
      row.querySelector(".del-prod-btn").addEventListener("click", () => handleDeleteProduct(product));
      productsListEl.appendChild(row);
    });
  }

  async function handleDeleteProduct(product) {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"? This cannot be undone.`)) {
      return;
    }

    const { error } = await sb.from("products").delete().eq("id", product.id);
    if (error) {
      showAlert(dashboardAlert, `Failed to delete product: ${error.message}`, "error");
      return;
    }

    if (productIdInput.value === product.id) {
      resetProductForm();
    }
    showAlert(dashboardAlert, `Deleted "${product.name}".`, "success");
    fetchProducts();
  }

  if (productForm) {
    productForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!sb) return;

      if (prodSizeInput && prodSizeInput.value.trim()) {
        addSizesFromString(prodSizeInput.value);
        prodSizeInput.value = "";
      }

      const name = (prodNameInput.value || "").trim();
      const priceVal = parseInt(prodPriceInput.value, 10);
      const section = prodSectionInput && prodSectionInput.value === "brides" ? "brides" : "women";
      const category = (prodCategoryInput.value || "").trim();
      const subcategory = prodSubcategoryInput ? ((prodSubcategoryInput.value || "").trim() || null) : null;
      const badge = (prodBadgeInput.value || "").trim() || null;
      const in_stock = Boolean(prodInStockInput.checked);
      const editingId = productIdInput.value || null;

      const available_types = [];
      if (!prodTypeStitchedInput || prodTypeStitchedInput.checked) {
        available_types.push("stitched");
      }
      if (!prodTypeUnstitchedInput || prodTypeUnstitchedInput.checked) {
        available_types.push("unstitched");
      }

      let unstitched_price = null;
      const rawUnstitchedPrice = prodUnstitchedPriceInput ? (prodUnstitchedPriceInput.value || "").trim() : "";

      if (!name) {
        showAlert(dashboardAlert, "Please enter a product name.", "error");
        prodNameInput.focus();
        return;
      }
      if (isNaN(priceVal) || priceVal < 0) {
        showAlert(dashboardAlert, "Please enter a valid price in PKR.", "error");
        prodPriceInput.focus();
        return;
      }
      if (available_types.length === 0) {
        showAlert(dashboardAlert, "Please select at least one option under 'Available as' (Stitched or Unstitched).", "error");
        if (prodTypeStitchedInput) prodTypeStitchedInput.focus();
        return;
      }
      if (available_types.includes("unstitched") && rawUnstitchedPrice !== "") {
        const parsedUnstitched = parseInt(rawUnstitchedPrice, 10);
        if (isNaN(parsedUnstitched) || parsedUnstitched < 0) {
          showAlert(dashboardAlert, "Please enter a valid Unstitched price in PKR (or leave it empty).", "error");
          if (prodUnstitchedPriceInput) prodUnstitchedPriceInput.focus();
          return;
        }
        unstitched_price = parsedUnstitched;
      }
      if (!category) {
        showAlert(dashboardAlert, "Please enter a category (e.g. Saree, Dupatta, Short, Maxi).", "error");
        prodCategoryInput.focus();
        return;
      }

      productSubmitBtn.disabled = true;
      productSubmitBtn.textContent = "Uploading & Saving…";

      try {
        const finalImageUrls = [];
        for (const item of currentProductImages) {
          if (item.type === "url") {
            finalImageUrls.push(item.url);
          } else if (item.type === "file" && item.file) {
            const uploadedUrl = await uploadImageToBucket(BUCKETS.products, item.file);
            finalImageUrls.push(uploadedUrl);
          }
        }

        const payload = {
          name,
          price: priceVal,
          available_types,
          unstitched_price,
          section,
          category,
          subcategory,
          images: finalImageUrls,
          sizes: currentProductSizes,
          badge,
          in_stock
        };

        if (editingId) {
          const { error } = await sb.from("products").update(payload).eq("id", editingId);
          if (error) throw error;
          showAlert(dashboardAlert, `Updated "${name}" successfully.`, "success");
        } else {
          const { error } = await sb.from("products").insert([payload]);
          if (error) throw error;
          showAlert(dashboardAlert, `Added "${name}" to the catalog.`, "success");
        }

        resetProductForm();
        fetchProducts();
      } catch (err) {
        showAlert(dashboardAlert, err.message || "Failed to save product.", "error");
      } finally {
        productSubmitBtn.disabled = false;
        productSubmitBtn.textContent = productIdInput.value ? "Update Product" : "Save Product";
      }
    });
  }

  if (refreshProductsBtn) {
    refreshProductsBtn.addEventListener("click", fetchProducts);
  }

  /* -------------------------------------------------------------------------
   * 4. Menu Navigation Management (Women & Brides, Top-level & Sub-options)
   * ----------------------------------------------------------------------- */
  if (newMenuVisibleInput && newMenuVisibleLabel) {
    newMenuVisibleInput.addEventListener("change", () => {
      newMenuVisibleLabel.textContent = newMenuVisibleInput.checked ? "Visible" : "Hidden";
    });
  }

  menuSectionBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const sec = btn.getAttribute("data-menu-section");
      if (!sec || sec === activeMenuSection) return;
      activeMenuSection = sec;

      menuSectionBtns.forEach(b => {
        const active = b.getAttribute("data-menu-section") === activeMenuSection;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });

      if (addTopMenuSectionLabel) {
        addTopMenuSectionLabel.textContent = formatSectionLabel(activeMenuSection);
      }

      renderMenuAdminList();
    });
  });

  if (toggleAddMenuFormBtn && addTopMenuForm) {
    toggleAddMenuFormBtn.addEventListener("click", () => {
      const isHidden = addTopMenuForm.hidden;
      addTopMenuForm.hidden = !isHidden;
      if (!addTopMenuForm.hidden && newMenuLabelInput) {
        newMenuLabelInput.focus();
      }
    });
  }

  if (cancelNewMenuBtn && addTopMenuForm) {
    cancelNewMenuBtn.addEventListener("click", () => {
      addTopMenuForm.reset();
      if (newMenuVisibleInput) newMenuVisibleInput.checked = true;
      if (newMenuVisibleLabel) newMenuVisibleLabel.textContent = "Visible";
      addTopMenuForm.hidden = true;
    });
  }

  async function fetchMenuItems() {
    if (!sb || !menuItemsListEl) return;
    menuItemsListEl.innerHTML = `<div class="admin-loading">Loading menu items…</div>`;

    const { data, error } = await sb
      .from("menu_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      menuItemsListEl.innerHTML = `<div class="admin-empty">Could not load menu_items (${escapeHTML(error.message)}). Please run <code>supabase/menu-migration.sql</code> in the Supabase SQL Editor.</div>`;
      return;
    }

    allMenuItems = data || [];
    if (menuCountBadge) {
      menuCountBadge.textContent = allMenuItems.filter(i => !i.parent_id).length;
    }
    refreshSubcategorySuggestions();
    renderMenuAdminList();
  }

  function getMenuSiblings(section, parentId = null) {
    return allMenuItems
      .filter(i => i.section === section && (parentId ? i.parent_id === parentId : !i.parent_id))
      .sort((a, b) => (a.sort_order - b.sort_order) || (new Date(a.created_at) - new Date(b.created_at)));
  }

  async function handleReorderMenuItem(item, direction) {
    const siblings = getMenuSiblings(item.section, item.parent_id || null);
    const idx = siblings.findIndex(s => s.id === item.id);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= siblings.length) return;

    // Normalize sort_order across siblings and swap idx with targetIdx
    const reordered = [...siblings];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    try {
      await Promise.all(
        reordered.map((node, index) =>
          sb.from("menu_items").update({ sort_order: index + 1 }).eq("id", node.id)
        )
      );
      showAlert(dashboardAlert, `Updated order for "${item.label}".`, "success", 2500);
      fetchMenuItems();
    } catch (err) {
      showAlert(dashboardAlert, err.message || "Failed to reorder menu items.", "error");
    }
  }

  async function handleSaveMenuItem(item, newLabel, newCustomUrl) {
    const cleanLabel = (newLabel || "").trim();
    const cleanUrl = (newCustomUrl || "").trim() || null;

    if (!cleanLabel) {
      showAlert(dashboardAlert, "Menu item label cannot be empty.", "error");
      return;
    }

    const { error } = await sb
      .from("menu_items")
      .update({ label: cleanLabel, custom_url: cleanUrl })
      .eq("id", item.id);

    if (error) {
      showAlert(dashboardAlert, `Failed to update "${item.label}": ${error.message}`, "error");
      return;
    }

    showAlert(dashboardAlert, `Saved "${cleanLabel}".`, "success");
    fetchMenuItems();
  }

  async function handleToggleMenuItemVisibility(item, isVisible) {
    const { error } = await sb
      .from("menu_items")
      .update({ is_visible: isVisible })
      .eq("id", item.id);

    if (error) {
      showAlert(dashboardAlert, `Failed to update visibility: ${error.message}`, "error");
      fetchMenuItems();
      return;
    }

    item.is_visible = isVisible;
    showAlert(
      dashboardAlert,
      `"${item.label}" is now ${isVisible ? "visible" : "hidden"} on the storefront.`,
      "success",
      2500
    );
  }

  async function handleDeleteMenuItem(item) {
    const isTopLevel = !item.parent_id;
    const subCount = isTopLevel ? allMenuItems.filter(i => i.parent_id === item.id).length : 0;
    const msg = isTopLevel && subCount > 0
      ? `Delete "${item.label}" and its ${subCount} sub-option(s)? This cannot be undone.`
      : `Delete "${item.label}" from the menu?`;

    if (!window.confirm(msg)) return;

    const { error } = await sb.from("menu_items").delete().eq("id", item.id);
    if (error) {
      showAlert(dashboardAlert, `Failed to delete "${item.label}": ${error.message}`, "error");
      return;
    }

    expandedMenuParents.delete(item.id);
    showAlert(dashboardAlert, `Deleted "${item.label}".`, "success");
    fetchMenuItems();
  }

  async function handleCreateMenuItem({ section, parent_id = null, label, custom_url = null, is_visible = true }) {
    const cleanLabel = (label || "").trim();
    const cleanUrl = (custom_url || "").trim() || null;

    if (!cleanLabel) {
      showAlert(dashboardAlert, "Please enter a menu label.", "error");
      return false;
    }

    const siblings = getMenuSiblings(section, parent_id);
    const maxSort = siblings.reduce((max, s) => Math.max(max, Number(s.sort_order) || 0), 0);

    const { error } = await sb.from("menu_items").insert([
      {
        section,
        parent_id,
        label: cleanLabel,
        custom_url: cleanUrl,
        sort_order: maxSort + 1,
        is_visible: Boolean(is_visible)
      }
    ]);

    if (error) {
      showAlert(dashboardAlert, `Failed to create menu item: ${error.message}`, "error");
      return false;
    }

    showAlert(dashboardAlert, `Added "${cleanLabel}" to ${formatSectionLabel(section)} menu.`, "success");
    fetchMenuItems();
    return true;
  }

  if (addTopMenuForm) {
    addTopMenuForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!sb) return;

      newMenuSubmitBtn.disabled = true;
      newMenuSubmitBtn.textContent = "Creating…";

      try {
        const ok = await handleCreateMenuItem({
          section: activeMenuSection,
          parent_id: null,
          label: newMenuLabelInput.value,
          custom_url: newMenuUrlInput.value,
          is_visible: newMenuVisibleInput.checked
        });

        if (ok) {
          addTopMenuForm.reset();
          if (newMenuVisibleInput) newMenuVisibleInput.checked = true;
          if (newMenuVisibleLabel) newMenuVisibleLabel.textContent = "Visible";
          addTopMenuForm.hidden = true;
        }
      } finally {
        newMenuSubmitBtn.disabled = false;
        newMenuSubmitBtn.textContent = "Create Menu Item";
      }
    });
  }

  function renderMenuAdminList() {
    if (!menuItemsListEl) return;

    const topItems = getMenuSiblings(activeMenuSection, null);
    if (topItems.length === 0) {
      menuItemsListEl.innerHTML = `
        <div class="admin-empty">
          No top-level menu items in <strong>${formatSectionLabel(activeMenuSection)}</strong> yet.
          Click <strong>+ Add Menu Item</strong> above to create one.
        </div>
      `;
      return;
    }

    menuItemsListEl.innerHTML = "";

    topItems.forEach((item, idx) => {
      const subItems = getMenuSiblings(activeMenuSection, item.id);
      const isExpanded = expandedMenuParents.has(item.id);
      const switchId = `menu-vis-${item.id}`;

      const card = document.createElement("div");
      card.className = "menu-node";
      card.innerHTML = `
        <div class="menu-node__main">
          <div class="menu-node__inputs">
            <input type="text" class="menu-inline-input item-label-input" value="${escapeHTML(item.label)}" aria-label="Menu item label" placeholder="Label (e.g. Saree)">
            <input type="text" class="menu-inline-input item-url-input" value="${escapeHTML(item.custom_url || "")}" aria-label="Optional custom URL" placeholder="Optional custom URL (e.g. shop.html?sort=newest)">
          </div>

          <div class="menu-node__controls">
            <label class="admin-switch" for="${switchId}">
              <input type="checkbox" id="${switchId}" class="admin-switch__input item-vis-input" ${item.is_visible !== false ? "checked" : ""}>
              <span class="admin-switch__track" aria-hidden="true">
                <span class="admin-switch__knob"></span>
              </span>
              <span class="admin-switch__text item-vis-label">${item.is_visible !== false ? "Visible" : "Hidden"}</span>
            </label>

            <div class="menu-node__btns">
              <button type="button" class="admin-action-btn item-save-btn">Save</button>
              <button type="button" class="admin-action-btn item-up-btn" title="Move up" ${idx === 0 ? "disabled" : ""}>&uarr;</button>
              <button type="button" class="admin-action-btn item-down-btn" title="Move down" ${idx === topItems.length - 1 ? "disabled" : ""}>&darr;</button>
              <button type="button" class="admin-action-btn admin-action-btn--danger item-del-btn">Delete</button>
            </div>
          </div>
        </div>

        <div class="menu-node__sub-bar">
          <button type="button" class="menu-sub-toggle" aria-expanded="${isExpanded ? "true" : "false"}">
            <span>${isExpanded ? "▾" : "▸"} Sub-options (${subItems.length})</span>
          </button>
          <button type="button" class="admin-link-btn add-sub-trigger-btn">+ Add Sub-option</button>
        </div>

        <div class="menu-subitems" ${isExpanded ? "" : "hidden"}>
          <form class="menu-subnode add-sub-form" hidden novalidate>
            <div class="menu-node__inputs">
              <input type="text" class="menu-inline-input sub-new-label" required placeholder="Sub-option label (e.g. Banarasi, Organza)">
              <input type="text" class="menu-inline-input sub-new-url" placeholder="Optional custom URL override">
            </div>
            <div class="menu-node__btns">
              <button type="submit" class="btn btn--primary admin-btn--sm">Add Sub-option</button>
              <button type="button" class="btn btn--outline admin-btn--sm cancel-sub-btn">Cancel</button>
            </div>
          </form>
          <div class="subitems-container"></div>
        </div>
      `;

      // Bind top-level controls
      const labelInput = card.querySelector(".item-label-input");
      const urlInput = card.querySelector(".item-url-input");
      const visInput = card.querySelector(".item-vis-input");
      const visLabel = card.querySelector(".item-vis-label");

      card.querySelector(".item-save-btn").addEventListener("click", () => {
        handleSaveMenuItem(item, labelInput.value, urlInput.value);
      });

      visInput.addEventListener("change", () => {
        visLabel.textContent = visInput.checked ? "Visible" : "Hidden";
        handleToggleMenuItemVisibility(item, visInput.checked);
      });

      card.querySelector(".item-up-btn").addEventListener("click", () => handleReorderMenuItem(item, -1));
      card.querySelector(".item-down-btn").addEventListener("click", () => handleReorderMenuItem(item, 1));
      card.querySelector(".item-del-btn").addEventListener("click", () => handleDeleteMenuItem(item));

      // Expand/collapse sub-options
      const subToggleBtn = card.querySelector(".menu-sub-toggle");
      const subItemsWrap = card.querySelector(".menu-subitems");
      const addSubForm = card.querySelector(".add-sub-form");
      const addSubTriggerBtn = card.querySelector(".add-sub-trigger-btn");
      const cancelSubBtn = card.querySelector(".cancel-sub-btn");
      const subContainer = card.querySelector(".subitems-container");

      subToggleBtn.addEventListener("click", () => {
        const nowOpen = subItemsWrap.hidden;
        subItemsWrap.hidden = !nowOpen;
        subToggleBtn.setAttribute("aria-expanded", nowOpen ? "true" : "false");
        subToggleBtn.querySelector("span").textContent = `${nowOpen ? "▾" : "▸"} Sub-options (${subItems.length})`;
        if (nowOpen) {
          expandedMenuParents.add(item.id);
        } else {
          expandedMenuParents.delete(item.id);
        }
      });

      addSubTriggerBtn.addEventListener("click", () => {
        subItemsWrap.hidden = false;
        expandedMenuParents.add(item.id);
        subToggleBtn.setAttribute("aria-expanded", "true");
        subToggleBtn.querySelector("span").textContent = `▾ Sub-options (${subItems.length})`;
        addSubForm.hidden = false;
        addSubForm.querySelector(".sub-new-label").focus();
      });

      cancelSubBtn.addEventListener("click", () => {
        addSubForm.reset();
        addSubForm.hidden = true;
      });

      addSubForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const subLabel = addSubForm.querySelector(".sub-new-label").value;
        const subUrl = addSubForm.querySelector(".sub-new-url").value;
        expandedMenuParents.add(item.id);
        const ok = await handleCreateMenuItem({
          section: activeMenuSection,
          parent_id: item.id,
          label: subLabel,
          custom_url: subUrl,
          is_visible: true
        });
        if (ok) {
          addSubForm.reset();
          addSubForm.hidden = true;
        }
      });

      // Render existing sub-options
      if (subItems.length === 0) {
        subContainer.innerHTML = `<div class="muted" style="font-size:0.8rem;padding:0.25rem 0;">No sub-options yet. This item links directly to the shop.</div>`;
      } else {
        subItems.forEach((sub, sIdx) => {
          const subSwitchId = `menu-vis-${sub.id}`;
          const subEl = document.createElement("div");
          subEl.className = "menu-subnode";
          subEl.innerHTML = `
            <div class="menu-node__inputs">
              <input type="text" class="menu-inline-input sub-label-input" value="${escapeHTML(sub.label)}" aria-label="Sub-option label" placeholder="Sub-option label">
              <input type="text" class="menu-inline-input sub-url-input" value="${escapeHTML(sub.custom_url || "")}" aria-label="Optional custom URL" placeholder="Optional custom URL">
            </div>
            <div class="menu-node__controls">
              <label class="admin-switch" for="${subSwitchId}">
                <input type="checkbox" id="${subSwitchId}" class="admin-switch__input sub-vis-input" ${sub.is_visible !== false ? "checked" : ""}>
                <span class="admin-switch__track" aria-hidden="true">
                  <span class="admin-switch__knob"></span>
                </span>
                <span class="admin-switch__text sub-vis-label">${sub.is_visible !== false ? "Visible" : "Hidden"}</span>
              </label>
              <div class="menu-node__btns">
                <button type="button" class="admin-action-btn sub-save-btn">Save</button>
                <button type="button" class="admin-action-btn sub-up-btn" title="Move up" ${sIdx === 0 ? "disabled" : ""}>&uarr;</button>
                <button type="button" class="admin-action-btn sub-down-btn" title="Move down" ${sIdx === subItems.length - 1 ? "disabled" : ""}>&darr;</button>
                <button type="button" class="admin-action-btn admin-action-btn--danger sub-del-btn">Delete</button>
              </div>
            </div>
          `;

          const sLabelInput = subEl.querySelector(".sub-label-input");
          const sUrlInput = subEl.querySelector(".sub-url-input");
          const sVisInput = subEl.querySelector(".sub-vis-input");
          const sVisLabel = subEl.querySelector(".sub-vis-label");

          subEl.querySelector(".sub-save-btn").addEventListener("click", () => {
            expandedMenuParents.add(item.id);
            handleSaveMenuItem(sub, sLabelInput.value, sUrlInput.value);
          });

          sVisInput.addEventListener("change", () => {
            sVisLabel.textContent = sVisInput.checked ? "Visible" : "Hidden";
            handleToggleMenuItemVisibility(sub, sVisInput.checked);
          });

          subEl.querySelector(".sub-up-btn").addEventListener("click", () => {
            expandedMenuParents.add(item.id);
            handleReorderMenuItem(sub, -1);
          });
          subEl.querySelector(".sub-down-btn").addEventListener("click", () => {
            expandedMenuParents.add(item.id);
            handleReorderMenuItem(sub, 1);
          });
          subEl.querySelector(".sub-del-btn").addEventListener("click", () => {
            expandedMenuParents.add(item.id);
            handleDeleteMenuItem(sub);
          });

          subContainer.appendChild(subEl);
        });
      }

      menuItemsListEl.appendChild(card);
    });
  }

  if (refreshMenuBtn) {
    refreshMenuBtn.addEventListener("click", fetchMenuItems);
  }

  /* -------------------------------------------------------------------------
   * 5. Reviews & Pending Reviews Management
   * ----------------------------------------------------------------------- */
  function setAdminStarRating(rating) {
    const num = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
    if (revRatingInput) revRatingInput.value = String(num);
    if (adminStarPicker) {
      adminStarPicker.querySelectorAll(".star-picker__btn").forEach(btn => {
        const val = parseInt(btn.getAttribute("data-rating"), 10);
        btn.classList.toggle("is-active", val <= num);
      });
    }
  }

  if (adminStarPicker) {
    adminStarPicker.querySelectorAll(".star-picker__btn").forEach(btn => {
      btn.addEventListener("click", () => {
        setAdminStarRating(btn.getAttribute("data-rating"));
      });
    });
  }

  function updateRevPhotoPreview() {
    if (!revPhotoPreviewWrap || !revPhotoPreviewImg) return;
    if (currentReviewPhotoFile) {
      revPhotoPreviewImg.src = URL.createObjectURL(currentReviewPhotoFile);
      revPhotoPreviewWrap.hidden = false;
    } else if (currentReviewPhotoUrl) {
      revPhotoPreviewImg.src = currentReviewPhotoUrl;
      revPhotoPreviewWrap.hidden = false;
    } else {
      revPhotoPreviewImg.src = "";
      revPhotoPreviewWrap.hidden = true;
    }
  }

  if (revPhotoInput) {
    revPhotoInput.addEventListener("change", (e) => {
      const file = (e.target.files || [])[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showAlert(dashboardAlert, "Please select a valid image file.", "error");
        revPhotoInput.value = "";
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        showAlert(dashboardAlert, "Review photo must be under 3 MB.", "error");
        revPhotoInput.value = "";
        return;
      }
      currentReviewPhotoFile = file;
      updateRevPhotoPreview();
    });
  }

  if (removeRevPhotoBtn) {
    removeRevPhotoBtn.addEventListener("click", () => {
      currentReviewPhotoFile = null;
      currentReviewPhotoUrl = null;
      if (revPhotoInput) revPhotoInput.value = "";
      updateRevPhotoPreview();
    });
  }

  function resetReviewForm() {
    if (!reviewForm) return;
    reviewForm.reset();
    reviewIdInput.value = "";
    setAdminStarRating(5);
    currentReviewPhotoFile = null;
    currentReviewPhotoUrl = null;
    if (revPhotoInput) revPhotoInput.value = "";
    updateRevPhotoPreview();

    reviewFormTitle.textContent = "Add Approved Review";
    reviewSubmitBtn.textContent = "Save Review";
    cancelReviewEditBtn.hidden = true;
  }

  if (cancelReviewEditBtn) {
    cancelReviewEditBtn.addEventListener("click", resetReviewForm);
  }

  function startEditReview(review) {
    resetReviewForm();
    reviewIdInput.value = review.id;
    revNameInput.value = review.name || "";
    setAdminStarRating(review.rating || 5);
    revProductInput.value = review.product_name || "";
    revTextInput.value = review.text || "";
    currentReviewPhotoUrl = review.photo_url || null;
    updateRevPhotoPreview();

    reviewFormTitle.textContent = "Edit Approved Review";
    reviewSubmitBtn.textContent = "Update Review";
    cancelReviewEditBtn.hidden = false;

    reviewForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function fetchReviews() {
    if (!sb) return;
    if (approvedReviewsListEl) approvedReviewsListEl.innerHTML = `<div class="admin-loading">Loading approved reviews…</div>`;
    if (pendingReviewsListEl) pendingReviewsListEl.innerHTML = `<div class="admin-loading">Loading pending reviews…</div>`;

    const { data, error } = await sb
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      const msg = `<div class="admin-empty">Error loading reviews: ${escapeHTML(error.message)}</div>`;
      if (approvedReviewsListEl) approvedReviewsListEl.innerHTML = msg;
      if (pendingReviewsListEl) pendingReviewsListEl.innerHTML = msg;
      return;
    }

    allReviews = data || [];
    const approved = allReviews.filter(r => r.status === "approved");
    const pending = allReviews.filter(r => r.status === "pending");

    if (approvedCountBadge) approvedCountBadge.textContent = approved.length;
    if (pendingCountBadge) pendingCountBadge.textContent = pending.length;

    renderApprovedReviews(approved);
    renderPendingReviews(pending);
  }

  function renderStarsText(rating) {
    const n = Math.min(5, Math.max(1, Number(rating) || 5));
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  function renderApprovedReviews(list) {
    if (!approvedReviewsListEl) return;
    if (list.length === 0) {
      approvedReviewsListEl.innerHTML = `<div class="admin-empty">No approved reviews yet. Add one manually or approve a pending customer review.</div>`;
      return;
    }

    approvedReviewsListEl.innerHTML = "";
    list.forEach(review => {
      const card = document.createElement("div");
      card.className = "admin-review";
      card.innerHTML = `
        <div class="admin-review__head">
          <div>
            <strong class="admin-review__author">${escapeHTML(review.name)}</strong>
            ${review.product_name ? `<span class="admin-pill" style="margin-left:0.5rem;">${escapeHTML(review.product_name)}</span>` : ""}
          </div>
          <span class="admin-review__stars" aria-label="${review.rating} out of 5 stars">${renderStarsText(review.rating)}</span>
        </div>
        <p class="admin-review__text">&ldquo;${escapeHTML(review.text)}&rdquo;</p>
        ${review.photo_url ? `
          <div>
            <a href="${escapeHTML(review.photo_url)}" target="_blank" rel="noopener" title="Open full photo">
              <img src="${escapeHTML(review.photo_url)}" class="admin-review__photo" alt="Photo by ${escapeHTML(review.name)}">
            </a>
          </div>
        ` : ""}
        <div class="admin-review__foot">
          <span class="admin-review__date">${formatDate(review.created_at)}</span>
          <div style="display:flex;gap:0.5rem;">
            <button type="button" class="admin-action-btn edit-rev-btn">Edit</button>
            <button type="button" class="admin-action-btn admin-action-btn--danger del-rev-btn">Delete</button>
          </div>
        </div>
      `;

      card.querySelector(".edit-rev-btn").addEventListener("click", () => startEditReview(review));
      card.querySelector(".del-rev-btn").addEventListener("click", () => handleDeleteReview(review));
      approvedReviewsListEl.appendChild(card);
    });
  }

  function renderPendingReviews(list) {
    if (!pendingReviewsListEl) return;
    if (list.length === 0) {
      pendingReviewsListEl.innerHTML = `<div class="admin-empty">No pending reviews waiting for approval.</div>`;
      return;
    }

    pendingReviewsListEl.innerHTML = "";
    list.forEach(review => {
      const card = document.createElement("div");
      card.className = "admin-review";
      card.innerHTML = `
        <div class="admin-review__head">
          <div>
            <strong class="admin-review__author">${escapeHTML(review.name)}</strong>
            ${review.product_name ? `<span class="admin-pill" style="margin-left:0.5rem;">${escapeHTML(review.product_name)}</span>` : ""}
          </div>
          <span class="admin-review__stars" aria-label="${review.rating} out of 5 stars">${renderStarsText(review.rating)}</span>
        </div>
        <p class="admin-review__text">&ldquo;${escapeHTML(review.text)}&rdquo;</p>
        ${review.photo_url ? `
          <div>
            <a href="${escapeHTML(review.photo_url)}" target="_blank" rel="noopener" title="Open full photo">
              <img src="${escapeHTML(review.photo_url)}" class="admin-review__photo" alt="Photo by ${escapeHTML(review.name)}">
            </a>
          </div>
        ` : ""}
        <div class="admin-review__foot">
          <span class="admin-review__date">Submitted ${formatDate(review.created_at)}</span>
          <div style="display:flex;gap:0.5rem;">
            <button type="button" class="admin-action-btn admin-action-btn--approve approve-rev-btn">Approve</button>
            <button type="button" class="admin-action-btn admin-action-btn--danger del-rev-btn">Delete</button>
          </div>
        </div>
      `;

      card.querySelector(".approve-rev-btn").addEventListener("click", () => handleApproveReview(review));
      card.querySelector(".del-rev-btn").addEventListener("click", () => handleDeleteReview(review));
      pendingReviewsListEl.appendChild(card);
    });
  }

  async function handleApproveReview(review) {
    const { error } = await sb
      .from("reviews")
      .update({ status: "approved" })
      .eq("id", review.id);

    if (error) {
      showAlert(dashboardAlert, `Failed to approve review: ${error.message}`, "error");
      return;
    }

    showAlert(dashboardAlert, `Approved review from ${review.name}.`, "success");
    fetchReviews();
  }

  async function handleDeleteReview(review) {
    if (!window.confirm(`Delete review from "${review.name}"? This cannot be undone.`)) {
      return;
    }

    const { error } = await sb.from("reviews").delete().eq("id", review.id);
    if (error) {
      showAlert(dashboardAlert, `Failed to delete review: ${error.message}`, "error");
      return;
    }

    if (reviewIdInput && reviewIdInput.value === review.id) {
      resetReviewForm();
    }
    showAlert(dashboardAlert, `Deleted review from ${review.name}.`, "success");
    fetchReviews();
  }

  if (reviewForm) {
    reviewForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!sb) return;

      const name = (revNameInput.value || "").trim();
      const rating = Math.min(5, Math.max(1, parseInt(revRatingInput.value, 10) || 5));
      const product_name = (revProductInput.value || "").trim() || null;
      const text = (revTextInput.value || "").trim();
      const editingId = reviewIdInput.value || null;

      if (!name) {
        showAlert(dashboardAlert, "Please enter the customer's name.", "error");
        revNameInput.focus();
        return;
      }
      if (!text) {
        showAlert(dashboardAlert, "Please enter the review text.", "error");
        revTextInput.focus();
        return;
      }

      reviewSubmitBtn.disabled = true;
      reviewSubmitBtn.textContent = "Saving…";

      try {
        let photo_url = currentReviewPhotoUrl;
        if (currentReviewPhotoFile) {
          photo_url = await uploadImageToBucket(BUCKETS.reviews, currentReviewPhotoFile);
        }

        const payload = {
          name,
          rating,
          text,
          product_name,
          photo_url,
          status: "approved"
        };

        if (editingId) {
          const { error } = await sb.from("reviews").update(payload).eq("id", editingId);
          if (error) throw error;
          showAlert(dashboardAlert, `Updated review from ${name}.`, "success");
        } else {
          const { error } = await sb.from("reviews").insert([payload]);
          if (error) throw error;
          showAlert(dashboardAlert, `Added approved review from ${name}.`, "success");
        }

        resetReviewForm();
        fetchReviews();
      } catch (err) {
        showAlert(dashboardAlert, err.message || "Failed to save review.", "error");
      } finally {
        reviewSubmitBtn.disabled = false;
        reviewSubmitBtn.textContent = reviewIdInput.value ? "Update Review" : "Save Review";
      }
    });
  }

  if (refreshReviewsBtn) refreshReviewsBtn.addEventListener("click", fetchReviews);
  if (refreshPendingBtn) refreshPendingBtn.addEventListener("click", fetchReviews);

  /* -------------------------------------------------------------------------
   * Initialize Admin Portal
   * ----------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", initAuth);
})();
