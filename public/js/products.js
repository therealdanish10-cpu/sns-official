/**
 * SNS Official — Stitch n Style
 * Products Data Catalog
 *
 * All products can be managed and edited here.
 * Real product photography can be added in the `images` array.
 * If an image path is null or omitted, the card automatically renders
 * an elegant dark placeholder (#1C1A17) with the subtle gold SNS monogram.
 */

const PRODUCTS = [
  // --- SAREE (no sizes) ---
  {
    id: "sns-sar-01",
    name: "Zari Tissue Organza Saree",
    section: "women",
    category: "saree",
    categoryLabel: "Saree",
    subcategory: null,
    price: 18500,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: 21000,
    badge: "Sale",
    inStock: true,
    hasSizes: false,
    sizes: [],
    images: [null, null, null], // Multi-image gallery demo
    date: "2026-09-15",
    description: "Hand-embellished zari border on shimmering tissue organza, complete with matching unstitched blouse piece."
  },
  {
    id: "sns-sar-02",
    name: "Midnight Velvet Royal Saree",
    section: "women",
    category: "saree",
    categoryLabel: "Saree",
    subcategory: null,
    price: 24500,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: null,
    badge: "New",
    inStock: true,
    hasSizes: false,
    sizes: [],
    images: [null, null],
    date: "2026-10-02",
    description: "Deep noir micro-velvet draped with gold kora dabka embellishments along the pallu."
  },
  {
    id: "sns-sar-03",
    name: "Kundan Banarasi Silk Saree",
    section: "women",
    category: "saree",
    categoryLabel: "Saree",
    subcategory: null,
    price: 19800,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: null,
    badge: null,
    inStock: false, // Out of stock demo
    hasSizes: false,
    sizes: [],
    images: [null],
    date: "2026-08-20",
    description: "Classic woven Banarasi silk in antique champagne tones with rich gold floral jaal."
  },

  // --- DUPATTA (no sizes) ---
  {
    id: "sns-dup-01",
    name: "Marori Embroidered Organza Dupatta",
    section: "women",
    category: "dupatta",
    categoryLabel: "Dupatta",
    subcategory: null,
    price: 7500,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: null,
    badge: "New",
    inStock: true,
    hasSizes: false,
    sizes: [],
    images: [null, null],
    date: "2026-10-05",
    description: "Exquisite marori needlework on pure ivory organza with delicate scalloped gold borders."
  },
  {
    id: "sns-dup-02",
    name: "Mirror-Work Chiffon Dupatta",
    section: "women",
    category: "dupatta",
    categoryLabel: "Dupatta",
    subcategory: null,
    price: 6200,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: 7000,
    badge: "Sale",
    inStock: true,
    hasSizes: false,
    sizes: [],
    images: [null],
    date: "2026-09-10",
    description: "Flowing pure chiffon detailed with authentic hand-set mirror accents and golden sitara work."
  },
  {
    id: "sns-dup-03",
    name: "Net Cutwork Zari Dupatta",
    section: "women",
    category: "dupatta",
    categoryLabel: "Dupatta",
    subcategory: null,
    price: 8900,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: null,
    badge: null,
    inStock: true,
    hasSizes: false,
    sizes: [],
    images: [null, null, null],
    date: "2026-08-14",
    description: "Intricate cutwork scalloped borders on soft French net with gilded floral motifs throughout."
  },

  // --- SHORT (has sizes) ---
  {
    id: "sns-sht-01",
    name: "Embellished Velvet Short Kurti",
    section: "women",
    category: "short",
    categoryLabel: "Short",
    subcategory: null,
    price: 12500,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: null,
    badge: "New",
    inStock: true,
    hasSizes: true,
    sizes: ["S", "M", "L", "XL"],
    images: [null, null],
    date: "2026-10-08",
    description: "Rich velvet silhouette with gold tilla embroidery along the neckline, cuffs, and hemline."
  },
  {
    id: "sns-sht-02",
    name: "Raw Silk Angrakha Short",
    section: "women",
    category: "short",
    categoryLabel: "Short",
    subcategory: null,
    price: 11000,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: 13500,
    badge: "Sale",
    inStock: true,
    hasSizes: true,
    sizes: ["S", "M", "L", "XL"],
    images: [null],
    date: "2026-09-01",
    description: "Contemporary cross-over Angrakha cut in pure raw silk with handmade metallic tassels."
  },
  {
    id: "sns-sht-03",
    name: "Handcrafted Zardozi Short Frock",
    section: "women",
    category: "short",
    categoryLabel: "Short",
    subcategory: null,
    price: 14800,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: null,
    badge: null,
    inStock: false, // Out of stock demo
    hasSizes: true,
    sizes: ["S", "M", "L", "XL"],
    images: [null, null],
    date: "2026-07-28",
    description: "Flared short peplum frock accentuated with antique zardozi work and champagne sequins."
  },

  // --- MAXI (has sizes) ---
  {
    id: "sns-max-01",
    name: "Royal Gold Embroidered Maxi",
    section: "women",
    category: "maxi",
    categoryLabel: "Maxi",
    subcategory: null,
    price: 28500,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: null,
    badge: "New",
    inStock: true,
    hasSizes: true,
    sizes: ["S", "M", "L", "XL"],
    images: [null, null, null],
    date: "2026-10-09",
    description: "Grand floor-length kalidaar maxi crafted in opulent chiffon with dense hand-worked gold bodice."
  },
  {
    id: "sns-max-02",
    name: "Midnight Velvet Anarkali Maxi",
    section: "women",
    category: "maxi",
    categoryLabel: "Maxi",
    subcategory: null,
    price: 32000,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: null,
    badge: null,
    inStock: true,
    hasSizes: true,
    sizes: ["S", "M", "L", "XL"],
    images: [null, null],
    date: "2026-09-18",
    description: "32-kali flared velvet Anarkali gown highlighted with royal gold tilla work and hand-crafted cancan skirt."
  },
  {
    id: "sns-max-03",
    name: "Festive Tiered Chiffon Maxi",
    section: "women",
    category: "maxi",
    categoryLabel: "Maxi",
    subcategory: null,
    price: 22500,
    unstitchedPrice: null,
    availableTypes: ["stitched", "unstitched"],
    originalPrice: 25000,
    badge: "Sale",
    inStock: true,
    hasSizes: true,
    sizes: ["S", "M", "L", "XL"],
    images: [null],
    date: "2026-08-30",
    description: "Breezy tiered luxury maxi finished with delicate gota patti borders and shimmering mukesh work."
  }
];

if (typeof window !== "undefined") {
  window.FALLBACK_PRODUCTS = PRODUCTS;
  window.PRODUCTS = PRODUCTS;
}
