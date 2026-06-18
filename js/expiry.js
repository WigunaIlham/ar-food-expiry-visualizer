/**
 * expiry.js
 * Freshness calculation and status logic.
 */

const Expiry = {
  STATUS: {
    FRESH: "fresh",
    CONSUME_SOON: "consume-soon",
    CRITICAL: "critical",
    EXPIRED: "expired",
  },

  STATUS_LABEL: {
    fresh: "Fresh",
    "consume-soon": "Consume Soon",
    critical: "Critical",
    expired: "Expired",
  },

  STATUS_ICON: {
    fresh: "🟢",
    "consume-soon": "🟡",
    critical: "🟠",
    expired: "🔴",
  },

  STATUS_EMOJI: {
    fresh: "✅",
    "consume-soon": "⚠️",
    critical: "🚨",
    expired: "💀",
  },

  /**
   * Calculate days elapsed since purchase date.
   * @param {string} tanggalPembelian - ISO date string "YYYY-MM-DD"
   * @returns {number} Days elapsed (floor).
   */
  getUmurProduk(tanggalPembelian) {
    const beli = new Date(tanggalPembelian);
    const today = new Date();
    // Normalize to midnight for accurate day diff
    beli.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffMs = today - beli;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  },

  /**
   * Calculate freshness percentage.
   * @param {number} umurProduk
   * @param {number} masaSimpan
   * @returns {number} 0–100+ percentage.
   */
  getPersentase(umurProduk, masaSimpan) {
    if (masaSimpan <= 0) return 100;
    return (umurProduk / masaSimpan) * 100;
  },

  /**
   * Determine status from percentage.
   * @param {number} persen
   * @returns {string} One of STATUS constants.
   */
  getStatusFromPersen(persen) {
    if (persen < 50) return this.STATUS.FRESH;
    if (persen < 75) return this.STATUS.CONSUME_SOON;
    if (persen < 95) return this.STATUS.CRITICAL;
    return this.STATUS.EXPIRED;
  },

  /**
   * Full calculation for a product.
   * @param {Object} product - { tanggalPembelian, masaSimpan, statusManual }
   * @returns {Object} { umurProduk, masaSimpan, persentase, status, label, sisaHari, barWidth }
   */
  calculate(product) {
    const umurProduk = this.getUmurProduk(product.tanggalPembelian);
    const persentase = this.getPersentase(umurProduk, product.masaSimpan);
    const status = product.statusManual || this.getStatusFromPersen(persentase);
    const sisaHari = Math.max(0, product.masaSimpan - umurProduk);
    const barWidth = Math.min(100, Math.max(0, persentase));

    return {
      umurProduk,
      masaSimpan: product.masaSimpan,
      persentase: Math.round(persentase),
      status,
      label: this.STATUS_LABEL[status] || status,
      icon: this.STATUS_ICON[status] || "⬜",
      emoji: this.STATUS_EMOJI[status] || "❓",
      sisaHari,
      barWidth,
    };
  },
};
