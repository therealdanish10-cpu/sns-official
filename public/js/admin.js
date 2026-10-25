/**
 * SNS Official — Stitch n Style
 * Admin Portal Controller (Products, Approved Reviews & Pending Reviews)
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
    reviews: document.getElementById("tab-reviews"),
    pending: document.getElementById("tab-pending")
  };
  const productsCountBadge = document.getElementById("productsCountBadge");
  const approvedCountBadge = document.getElementById("approvedCountBadge");
  const pendingCountBadge = document.getElementById("pendingCountBadge");

  // Products Tab DOM
  const productForm = document.getElementById("productForm");
  const productFormTitle = document.getElementById("productFormTitle");
  const cancelProductEditBtn = document.getElementById("cancelProductEditBtn");
  const productIdInput = document.getElementById("productId");
  const prodNameInput = document.getElementById("prodName");
  const prodPriceInput = document.getElementById("prodPrice");
  const prodCategoryInput = document.getElementById("prodCategory");
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
  let allReviews = [];

  // Product form state
  let currentProductSizes = [];
  // Each item: { type: 'url', url: string } OR { type: 'file', file: File, previewUrl: string }
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
    fetchReviews();
  }

  /* -------------------------------------------------------------------------
   * 3. Products Management (CRUD, Sizes Tags, Multi-Image Upload & Reorder)
   * ----------------------------------------------------------------------- */
  if (prodInStockInput && prodInStockLabel) {
    prodInStockInput.addEventListener("change", () => {
      prodInStockLabel.textContent = prodInStockInput.checked ? "In Stock" : "Out of Stock (Sold Out)";
    });
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
    prodInStockInput.checked = true;
    if (prodInStockLabel) prodInStockLabel.textContent = "In Stock";

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
    prodCategoryInput.value = product.category || "";
    prodBadgeInput.value = product.badge || "";
    prodInStockInput.checked = product.in_stock !== false;
    if (prodInStockLabel) {
      prodInStockLabel.textContent = prodInStockInput.checked ? "In Stock" : "Out of Stock (Sold Out)";
    }

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
            <span>Category: <strong>${escapeHTML(product.category)}</strong></span>
            <span>Sizes: ${sizes.length ? escapeHTML(sizes.join(", ")) : "None"}</span>
            <span>Photos: ${imgs.length}</span>
            ${product.badge ? `<span class="admin-pill">${escapeHTML(product.badge)}</span>` : ""}
            <span class="admin-pill ${inStock ? "" : "admin-pill--out"}">${inStock ? "In Stock" : "Sold Out"}</span>
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

      // Capture any uncommitted size text still in the input box
      if (prodSizeInput && prodSizeInput.value.trim()) {
        addSizesFromString(prodSizeInput.value);
        prodSizeInput.value = "";
      }

      const name = (prodNameInput.value || "").trim();
      const priceVal = parseInt(prodPriceInput.value, 10);
      const category = (prodCategoryInput.value || "").trim();
      const badge = (prodBadgeInput.value || "").trim() || null;
      const in_stock = Boolean(prodInStockInput.checked);
      const editingId = productIdInput.value || null;

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
      if (!category) {
        showAlert(dashboardAlert, "Please enter a category (e.g. Saree, Dupatta, Short, Maxi).", "error");
        prodCategoryInput.focus();
        return;
      }

      productSubmitBtn.disabled = true;
      productSubmitBtn.textContent = "Uploading & Saving…";

      try {
        // Upload any newly selected image files while preserving exact order
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
          category,
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
   * 4. Reviews & Pending Reviews Management
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
