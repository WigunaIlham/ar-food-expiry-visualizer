/**
 * marker.js
 * Generates visual markers using Canvas API.
 * Uses a unique QR-code-like pattern based on markerId.
 */

const Marker = {
  SIZE: 300, // Canvas size in px

  /**
   * Generate a unique deterministic marker pattern for a given markerId.
   * Pattern uses a 6x6 data grid encoded from the markerId hash,
   * surrounded by AR.js-compatible border frame.
   *
   * @param {string} markerId  e.g. "M001"
   * @param {HTMLCanvasElement} canvas
   */
  generate(markerId, canvas) {
    const SIZE = this.SIZE;
    const ctx = canvas.getContext("2d");

    canvas.width = SIZE;
    canvas.height = SIZE;

    // 1. White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SIZE, SIZE);

    // 2. Black outer border (AR.js requires black border)
    const BORDER = 30;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(BORDER, BORDER, SIZE - BORDER * 2, SIZE - BORDER * 2);

    // 3. Inner black area
    const INNER = BORDER + 20;
    ctx.fillStyle = "#000000";
    ctx.fillRect(INNER, INNER, SIZE - INNER * 2, SIZE - INNER * 2);

    // 4. Data grid — 6x6 cells
    const GRID_COLS = 6;
    const GRID_ROWS = 6;
    const INNER_SIZE = SIZE - INNER * 2;
    const PADDING = 16;
    const cellW = (INNER_SIZE - PADDING * 2) / GRID_COLS;
    const cellH = (INNER_SIZE - PADDING * 2) / GRID_ROWS;

    // Hash markerId to bit array
    const bits = this._idToBits(markerId, GRID_COLS * GRID_ROWS);

    ctx.fillStyle = "#ffffff";
    let bitIdx = 0;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (bits[bitIdx]) {
          const x = INNER + PADDING + col * cellW + 2;
          const y = INNER + PADDING + row * cellH + 2;
          ctx.fillRect(x, y, cellW - 4, cellH - 4);
        }
        bitIdx++;
      }
    }

    // 5. Marker ID text label (small, below inner frame)
    ctx.fillStyle = "#000000";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText(markerId, SIZE / 2, SIZE - 8);
  },

  /**
   * Convert markerId string to array of bits deterministically.
   * @private
   * @param {string} id
   * @param {number} length  Total bits needed
   * @returns {Array<boolean>}
   */
  _idToBits(id, length) {
    // Simple deterministic hash from string
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
    }

    const bits = [];
    let seed = Math.abs(hash) || 42;

    // LCG random number generator seeded from hash
    function lcgNext() {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0xffffffff;
    }

    // Force corners and ensure minimum pattern density
    for (let i = 0; i < length; i++) {
      bits.push(lcgNext() > 0.45);
    }

    // Force specific corners on for better AR detection
    bits[0] = true; // top-left
    bits[5] = true; // top-right
    bits[30] = true; // bottom-left
    bits[length - 1] = true; // bottom-right

    return bits;
  },

  /**
   * Trigger download of the marker canvas as PNG.
   * @param {HTMLCanvasElement} canvas
   * @param {string} markerId
   */
  download(canvas, markerId) {
    const link = document.createElement("a");
    link.download = `marker-${markerId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  },

  /**
   * Return canvas data URL for embedding.
   * @param {string} markerId
   * @returns {string} Base64 PNG data URL.
   */
  getDataUrl(markerId) {
    const canvas = document.createElement("canvas");
    this.generate(markerId, canvas);
    return canvas.toDataURL("image/png");
  },
};
