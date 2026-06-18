/**
 * storage.js
 * Handles all LocalStorage operations for product data.
 */

const STORAGE_KEY = "ar_food_products";

const Storage = {
  /**
   * Retrieve all products from LocalStorage.
   * @returns {Array} Array of product objects.
   */
  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Save entire products array to LocalStorage.
   * @param {Array} products
   */
  saveAll(products) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  },

  /**
   * Get a single product by markerId.
   * @param {string} markerId
   * @returns {Object|null}
   */
  getById(markerId) {
    return this.getAll().find((p) => p.markerId === markerId) || null;
  },

  /**
   * Add a new product. Auto-generates markerId.
   * @param {Object} productData - { namaProduk, tanggalPembelian, masaSimpan, statusManual }
   * @returns {Object} The saved product with markerId.
   */
  add(productData) {
    const products = this.getAll();
    const markerId = this._generateMarkerId(products);
    const product = {
      markerId,
      namaProduk: productData.namaProduk.trim(),
      tanggalPembelian: productData.tanggalPembelian,
      masaSimpan: parseInt(productData.masaSimpan, 10),
      statusManual: productData.statusManual || "",
      createdAt: new Date().toISOString(),
    };
    products.push(product);
    this.saveAll(products);
    return product;
  },

  /**
   * Update an existing product by markerId.
   * @param {string} markerId
   * @param {Object} updates
   * @returns {Object|null} Updated product or null if not found.
   */
  update(markerId, updates) {
    const products = this.getAll();
    const idx = products.findIndex((p) => p.markerId === markerId);
    if (idx === -1) return null;
    products[idx] = {
      ...products[idx],
      namaProduk: updates.namaProduk?.trim() ?? products[idx].namaProduk,
      tanggalPembelian:
        updates.tanggalPembelian ?? products[idx].tanggalPembelian,
      masaSimpan: parseInt(updates.masaSimpan, 10) ?? products[idx].masaSimpan,
      statusManual: updates.statusManual ?? products[idx].statusManual,
      updatedAt: new Date().toISOString(),
    };
    this.saveAll(products);
    return products[idx];
  },

  /**
   * Delete a product by markerId.
   * @param {string} markerId
   * @returns {boolean} True if deleted.
   */
  delete(markerId) {
    const products = this.getAll();
    const filtered = products.filter((p) => p.markerId !== markerId);
    if (filtered.length === products.length) return false;
    this.saveAll(filtered);
    return true;
  },

  /**
   * Generate next sequential markerId like M001, M002, ...
   * @private
   */
  _generateMarkerId(products) {
    if (products.length === 0) return "M001";
    const nums = products
      .map((p) => parseInt(p.markerId.replace("M", ""), 10))
      .filter((n) => !isNaN(n));
    const max = Math.max(...nums);
    return "M" + String(max + 1).padStart(3, "0");
  },
};
