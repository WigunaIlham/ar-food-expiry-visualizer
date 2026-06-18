const EXPIRY_RULES = {
  FRESH: {key: "FRESH", label: "FRESH"},
  CONSUME_SOON: {key: "CONSUME_SOON", label: "CONSUME SOON"},
  CRITICAL: {key: "CRITICAL", label: "CRITICAL"},
  EXPIRED: {key: "EXPIRED", label: "EXPIRED"},
};

function daysBetween(dateStr, refDate = new Date()) {
  const start = new Date(dateStr);
  const ref = new Date(
    refDate.getFullYear(),
    refDate.getMonth(),
    refDate.getDate(),
  );
  const startNorm = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  return Math.floor((ref - startNorm) / (1000 * 60 * 60 * 24));
}

function calculateStatus(product) {
  const umurProduk = daysBetween(product.tanggalPembelian);
  const masaSimpan = Number(product.masaSimpan) || 1;
  const percentage = Math.max(0, umurProduk / masaSimpan);
  const sisaHari = Math.max(0, masaSimpan - umurProduk);

  let status;
  if (percentage < 0.5) status = EXPIRY_RULES.FRESH;
  else if (percentage < 0.75) status = EXPIRY_RULES.CONSUME_SOON;
  else if (percentage < 0.95) status = EXPIRY_RULES.CRITICAL;
  else status = EXPIRY_RULES.EXPIRED;

  return {
    umurProduk,
    percentage: Math.min(percentage, 1.5),
    sisaHari,
    status: status.key,
    label: status.label,
  };
}

window.ExpiryEngine = {calculateStatus, daysBetween, EXPIRY_RULES};
