const STORAGE_KEY = "arfood_products_v1";

function getProducts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Storage corrupt, resetting.", e);
    return [];
  }
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function addProduct(product) {
  const products = getProducts();
  product.id = "P" + Date.now().toString(36).toUpperCase();
  product.markerId = "";
  products.push(product);
  saveProducts(products);
  return product;
}

function updateProduct(id, updates) {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  products[idx] = {...products[idx], ...updates};
  saveProducts(products);
  return products[idx];
}

function deleteProduct(id) {
  const products = getProducts().filter((p) => p.id !== id);
  saveProducts(products);
}

function getProductById(id) {
  return getProducts().find((p) => p.id === id) || null;
}

window.ProductStorage = {
  getProducts,
  saveProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductById,
};
