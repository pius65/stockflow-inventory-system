const DATA_VERSION = "supermarket-v1";
const SETTINGS_KEY = "marketflowSettings";
const LOW_STOCK_THRESHOLD = 15;
const BARCODE_VERSION = 1;
const app = document.querySelector("#app");

const defaultSettings = {
  storeName: "MarketFlow",
  currency: "KES",
  font: "Inter",
  primaryColor: "#1f6feb",
  sidebarColor: "#111827",
  compactMode: false,
  lowStockLimit: 5,
};

const state = {
  route: "dashboard",
  user: readJson("marketflowUser"),
  reportTab: "sales",
  products: [],
  categories: [],
  suppliers: [],
  settings: readSettings(),
  toast: "",
};

const pages = [
  { id: "dashboard", label: "Dashboard", icon: "DB" },
  { id: "products", label: "Inventory", icon: "IN" },
  { id: "categories", label: "Categories", icon: "CA" },
  { id: "suppliers", label: "Vendors", icon: "VD" },
  { id: "purchases", label: "Stock In", icon: "SI" },
  { id: "sales", label: "Checkout", icon: "CO" },
  { id: "adjustments", label: "Stock Count", icon: "SC" },
  { id: "reports", label: "Reports", icon: "RP" },
  { id: "users", label: "Users", icon: "US" },
  { id: "settings", label: "Settings", icon: "ST" },
];

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function token() {
  return localStorage.getItem("marketflowToken") || localStorage.getItem("token");
}

function readSettings() {
  return { ...defaultSettings, ...(readJson(SETTINGS_KEY) || {}) };
}

function hexToRgb(hex) {
  const clean = String(hex || "").replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  const number = Number.parseInt(value, 16);
  if (Number.isNaN(number)) return "31, 111, 235";
  return `${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}`;
}

function applySettings() {
  const settings = state.settings;
  document.documentElement.style.setProperty("--primary", settings.primaryColor);
  document.documentElement.style.setProperty("--primary-rgb", hexToRgb(settings.primaryColor));
  document.documentElement.style.setProperty("--sidebar", settings.sidebarColor);
  document.documentElement.style.setProperty("--app-font", fontStack(settings.font));
  document.body.classList.toggle("compact-mode", Boolean(settings.compactMode));
}

function fontStack(font) {
  const stacks = {
    Inter: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
    "Segoe UI": '"Segoe UI", Inter, system-ui, -apple-system, sans-serif',
    Roboto: 'Roboto, "Segoe UI", Arial, sans-serif',
    Arial: 'Arial, "Segoe UI", sans-serif',
    Georgia: 'Georgia, "Times New Roman", serif',
  };
  return stacks[font] || stacks.Inter;
}

function saveSettings(settings) {
  state.settings = { ...defaultSettings, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  localStorage.removeItem("marketflowApiUrl");
  localStorage.removeItem("marketflowUseApi");
  applySettings();
}

function setAuth(data) {
  localStorage.setItem("marketflowToken", data.token);
  localStorage.setItem("marketflowUser", JSON.stringify(data.user));
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  state.user = data.user;
}

function clearAuth() {
  localStorage.removeItem("marketflowToken");
  localStorage.removeItem("marketflowUser");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  state.user = null;
}

function syncRoute() {
  state.route = location.hash.replace(/^#\/?/, "") || "dashboard";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function money(value) {
  return `${state.settings.currency || "KES"} ${Number(value || 0).toLocaleString()}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function api(path, options = {}) {
  return localApi(path, options);
}

function ean13CheckDigit(value) {
  const sum = String(value).split("").reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

function generatedBarcode(productId) {
  const base = `620${String(productId).padStart(9, "0")}`.slice(0, 12);
  return `${base}${ean13CheckDigit(base)}`;
}

function ensureProductBarcodes(data) {
  if (data.barcodeVersion === BARCODE_VERSION) return data;
  const used = new Set();

  data.products = data.products.map((product) => {
    let barcode = generatedBarcode(product.id);
    while (used.has(barcode)) {
      barcode = generatedBarcode(Number(product.id) + used.size + 1);
    }
    used.add(barcode);
    return { ...product, sku: barcode };
  });

  data.barcodeVersion = BARCODE_VERSION;
  saveLocalState(data);
  return data;
}

function localState() {
  const saved = readJson("marketflowLocalData");
  if (saved?.version === DATA_VERSION) return ensureProductBarcodes(saved);

  const seed = {
    version: DATA_VERSION,
    barcodeVersion: BARCODE_VERSION,
    users: [{ id: 1, full_name: "Store Manager", email: "admin@stockflow.com", phone: "0700000000", role: "admin", status: "active" }],
    categories: [
      { id: 1, name: "Fresh Produce", description: "Fruits, vegetables and herbs" },
      { id: 2, name: "Dairy & Eggs", description: "Milk, yoghurt, cheese and eggs" },
      { id: 3, name: "Bakery", description: "Bread, cakes and baked goods" },
      { id: 4, name: "Pantry Staples", description: "Rice, flour, sugar, oil and dry foods" },
      { id: 5, name: "Beverages", description: "Water, juice, soda and tea" },
      { id: 6, name: "Household", description: "Cleaning and home essentials" },
    ],
    suppliers: [
      { id: 1, name: "Nairobi Fresh Farms", contact_person: "Jane Mwangi", phone: "0712345678", email: "orders@freshfarms.test", address: "Marikiti Market" },
      { id: 2, name: "Metro Dairy Supplies", contact_person: "David Otieno", phone: "0798765432", email: "sales@metrodairy.test", address: "Industrial Area" },
      { id: 3, name: "Daily Bake Wholesale", contact_person: "Amina Yusuf", phone: "0722457788", email: "dispatch@dailybake.test", address: "Ngara" },
      { id: 4, name: "Household Depot", contact_person: "Peter Kimani", phone: "0709123456", email: "orders@householddepot.test", address: "Mombasa Road" },
    ],
    products: [
      { id: 1, name: "UHT Milk 500ml", sku: generatedBarcode(1), category_id: 2, supplier_id: 2, buying_price: 55, selling_price: 75, stock_quantity: 96, minimum_stock: 24, description: "Aisle 2 dairy shelf", status: "active" },
      { id: 2, name: "White Bread 400g", sku: generatedBarcode(2), category_id: 3, supplier_id: 3, buying_price: 48, selling_price: 65, stock_quantity: 38, minimum_stock: 20, description: "Morning delivery item", status: "active" },
      { id: 3, name: "Cooking Oil 1L", sku: generatedBarcode(3), category_id: 4, supplier_id: 1, buying_price: 245, selling_price: 315, stock_quantity: 42, minimum_stock: 15, description: "Fast moving pantry item", status: "active" },
      { id: 4, name: "Bananas 1kg", sku: generatedBarcode(4), category_id: 1, supplier_id: 1, buying_price: 85, selling_price: 130, stock_quantity: 18, minimum_stock: 25, description: "Weighed produce", status: "active" },
      { id: 5, name: "Bottled Water 1L", sku: generatedBarcode(5), category_id: 5, supplier_id: 1, buying_price: 32, selling_price: 50, stock_quantity: 120, minimum_stock: 36, description: "Cold room and aisle stock", status: "active" },
      { id: 6, name: "Dish Soap 750ml", sku: generatedBarcode(6), category_id: 6, supplier_id: 4, buying_price: 140, selling_price: 210, stock_quantity: 22, minimum_stock: 12, description: "Household aisle", status: "active" },
      { id: 7, name: "Sugar 2kg", sku: generatedBarcode(7), category_id: 4, supplier_id: 1, buying_price: 250, selling_price: 320, stock_quantity: 30, minimum_stock: 18, description: "Pantry staples", status: "active" },
      { id: 8, name: "Eggs Tray 30pc", sku: generatedBarcode(8), category_id: 2, supplier_id: 2, buying_price: 390, selling_price: 520, stock_quantity: 10, minimum_stock: 14, description: "Fragile stock", status: "active" },
    ],
    purchases: [
      { id: 1, product_id: 1, supplier_id: 2, quantity: 48, buying_price: 55, total_cost: 2640, invoice_number: "INV-DAIRY-042", purchase_date: today(), created_at: new Date().toISOString() },
      { id: 2, product_id: 2, supplier_id: 3, quantity: 40, buying_price: 48, total_cost: 1920, invoice_number: "INV-BAKE-118", purchase_date: today(), created_at: new Date().toISOString() },
    ],
    sales: [
      { id: 1, product_id: 1, quantity: 8, buying_price_at_sale: 55, selling_price: 75, total_amount: 600, profit: 160, payment_method: "Cash", sale_date: today(), created_at: new Date().toISOString() },
      { id: 2, product_id: 5, quantity: 12, buying_price_at_sale: 32, selling_price: 50, total_amount: 600, profit: 216, payment_method: "M-Pesa", sale_date: today(), created_at: new Date().toISOString() },
    ],
    adjustments: [],
    nextId: { users: 2, categories: 7, suppliers: 5, products: 9, purchases: 3, sales: 3, adjustments: 1 },
  };
  saveLocalState(seed);
  return seed;
}

function saveLocalState(data) {
  localStorage.setItem("marketflowLocalData", JSON.stringify(data));
}

function nextIdAfter(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id || 0)), 0) + 1;
}

function resetLocalSystemData() {
  const data = localState();
  const resetData = {
    ...data,
    purchases: [],
    sales: [],
    adjustments: [],
    nextId: {
      users: nextIdAfter(data.users),
      categories: nextIdAfter(data.categories),
      suppliers: nextIdAfter(data.suppliers),
      products: nextIdAfter(data.products),
      purchases: 1,
      sales: 1,
      adjustments: 1,
    },
  };

  saveLocalState(resetData);
  state.products = [];
  state.categories = [];
  state.suppliers = [];
  return resetData;
}

async function resetSystem() {
  resetLocalSystemData();
  saveSettings(defaultSettings);
  state.reportTab = "sales";
}

function localDate(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

function localProductRows(data) {
  return data.products.map((product) => {
    const category = data.categories.find((item) => String(item.id) === String(product.category_id));
    const supplier = data.suppliers.find((item) => String(item.id) === String(product.supplier_id));
    const stock = Number(product.stock_quantity || 0);
    return {
      ...product,
      category_name: category?.name || "",
      supplier_name: supplier?.name || "",
      stock_status: stock === 0 ? "Out of Stock" : stock < LOW_STOCK_THRESHOLD ? "Low Stock" : "In Stock",
    };
  }).sort((a, b) => b.id - a.id);
}

function localCategoryRows(data) {
  return data.categories.map((category) => ({
    ...category,
    product_count: data.products.filter((product) => String(product.category_id) === String(category.id)).length,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

function localSupplierRows(data) {
  return data.suppliers.map((supplier) => ({
    ...supplier,
    product_count: data.products.filter((product) => String(product.supplier_id) === String(supplier.id)).length,
  })).sort((a, b) => b.id - a.id);
}

function nextLocalId(data, key) {
  const id = data.nextId[key] || 1;
  data.nextId[key] = id + 1;
  return id;
}

function localDashboard(data) {
  const products = localProductRows(data);
  const todayValue = localDate();
  const totalSalesToday = data.sales.filter((sale) => sale.sale_date === todayValue).reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
  const month = todayValue.slice(0, 7);
  const monthlyPurchases = data.purchases.filter((purchase) => String(purchase.purchase_date || "").startsWith(month)).reduce((sum, purchase) => sum + Number(purchase.total_cost || 0), 0);
  const salesByDay = Object.values(data.sales.reduce((days, sale) => {
    const day = sale.sale_date || localDate(sale.created_at);
    days[day] ||= { day, sales: 0 };
    days[day].sales += Number(sale.total_amount || 0);
    return days;
  }, {})).sort((a, b) => a.day.localeCompare(b.day)).slice(-7);
  const topProducts = data.products.map((product) => {
    const productSales = data.sales.filter((sale) => String(sale.product_id) === String(product.id));
    return {
      name: product.name,
      quantity: productSales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0),
      amount: productSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0),
    };
  }).filter((row) => row.quantity > 0).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  return {
    cards: {
      total_products: data.products.length,
      total_stock: data.products.reduce((sum, product) => sum + Number(product.stock_quantity || 0), 0),
      low_stock: products.filter((product) => product.stock_status === "Low Stock").length,
      out_of_stock: products.filter((product) => product.stock_status === "Out of Stock").length,
      total_suppliers: data.suppliers.length,
      total_sales_today: totalSalesToday,
      monthly_purchases: monthlyPurchases,
      inventory_value: data.products.reduce((sum, product) => sum + Number(product.stock_quantity || 0) * Number(product.buying_price || 0), 0),
    },
    salesByDay,
    topProducts,
    lowStock: products.filter((product) => Number(product.stock_quantity) > 0 && Number(product.stock_quantity) < LOW_STOCK_THRESHOLD).slice(0, 10),
  };
}

async function localApi(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const data = localState();
  const parts = path.split("?")[0].split("/").filter(Boolean);
  const resource = parts[0];
  const id = parts[1];

  if (path === "/auth/login" && method === "POST") {
    if (body.email !== "admin@stockflow.com" || body.password !== "admin123") throw new Error("Invalid offline credentials.");
    return { token: "offline-token", user: data.users[0], offline: true };
  }

  if (path === "/auth/users" && method === "GET") return data.users;
  if (path === "/auth/register" && method === "POST") {
    const user = { id: nextLocalId(data, "users"), full_name: body.full_name, email: body.email, phone: body.phone || "", role: body.role || "staff", status: "active" };
    data.users.unshift(user);
    saveLocalState(data);
    return user;
  }

  if (resource === "products") return localProductCrud(data, id, method, body);
  if (resource === "categories") return localCrud(data, "categories", id, method, body, localCategoryRows);
  if (resource === "suppliers") return localCrud(data, "suppliers", id, method, body, localSupplierRows);

  if (resource === "purchases") {
    if (method === "GET") return data.purchases.map((purchase) => withProductSupplier(data, purchase)).sort((a, b) => b.id - a.id);
    if (method === "POST") {
      const product = data.products.find((item) => String(item.id) === String(body.product_id));
      if (!product) throw new Error("Select a valid item.");
      const purchase = { id: nextLocalId(data, "purchases"), ...body, quantity: Number(body.quantity), buying_price: Number(body.buying_price), total_cost: Number(body.quantity) * Number(body.buying_price), purchase_date: body.purchase_date || today(), created_at: new Date().toISOString() };
      product.stock_quantity = Number(product.stock_quantity || 0) + Number(purchase.quantity);
      product.buying_price = Number(purchase.buying_price);
      data.purchases.unshift(purchase);
      saveLocalState(data);
      return purchase;
    }
  }

  if (resource === "sales") {
    if (method === "GET") return data.sales.map((sale) => withProductSupplier(data, sale)).sort((a, b) => b.id - a.id);
    if (method === "POST") {
      const product = data.products.find((item) => String(item.id) === String(body.product_id));
      if (!product) throw new Error("Select a valid item.");
      if (Number(product.stock_quantity) < Number(body.quantity)) throw new Error("Not enough stock available.");
      const total = Number(body.quantity) * Number(body.selling_price);
      const sale = { id: nextLocalId(data, "sales"), ...body, quantity: Number(body.quantity), selling_price: Number(body.selling_price), buying_price_at_sale: Number(product.buying_price), total_amount: total, profit: (Number(body.selling_price) - Number(product.buying_price)) * Number(body.quantity), sale_date: body.sale_date || today(), created_at: new Date().toISOString() };
      product.stock_quantity = Number(product.stock_quantity) - Number(sale.quantity);
      data.sales.unshift(sale);
      saveLocalState(data);
      return sale;
    }
  }

  if (resource === "stock-adjustments") {
    if (method === "GET") return data.adjustments.map((adjustment) => withProductSupplier(data, adjustment)).sort((a, b) => b.id - a.id);
    if (method === "POST") {
      const product = data.products.find((item) => String(item.id) === String(body.product_id));
      if (!product) throw new Error("Select a valid item.");
      const qty = Number(body.quantity);
      if (body.adjustment_type === "decrease" && Number(product.stock_quantity) < qty) throw new Error("Cannot reduce more than available stock.");
      product.stock_quantity = Number(product.stock_quantity) + (body.adjustment_type === "increase" ? qty : -qty);
      const adjustment = { id: nextLocalId(data, "adjustments"), ...body, quantity: qty, created_at: new Date().toISOString(), user_name: "System Admin" };
      data.adjustments.unshift(adjustment);
      saveLocalState(data);
      return adjustment;
    }
  }

  if (path === "/reports/dashboard") return localDashboard(data);
  if (path === "/reports/sales") return data.sales.map((sale) => withProductSupplier(data, sale));
  if (path === "/reports/purchases") return data.purchases.map((purchase) => withProductSupplier(data, purchase));
  if (path === "/reports/low-stock") return localProductRows(data).filter((product) => Number(product.stock_quantity) > 0 && Number(product.stock_quantity) < LOW_STOCK_THRESHOLD);
  if (path === "/reports/profit") return Object.values(data.sales.reduce((days, sale) => {
    const day = sale.sale_date || today();
    days[day] ||= { day, revenue: 0, profit: 0 };
    days[day].revenue += Number(sale.total_amount || 0);
    days[day].profit += Number(sale.profit || 0);
    return days;
  }, {}));

  throw new Error("Offline mode does not support this action.");
}

function localCrud(data, key, id, method, body, rowsFn) {
  if (method === "GET") return rowsFn(data);
  if (method === "POST") {
    const item = { id: nextLocalId(data, key), ...body };
    data[key].unshift(item);
    saveLocalState(data);
    return item;
  }
  const index = data[key].findIndex((item) => String(item.id) === String(id));
  if (index < 0) throw new Error("Record not found.");
  if (method === "PUT") {
    data[key][index] = { ...data[key][index], ...body, id: data[key][index].id };
    saveLocalState(data);
    return data[key][index];
  }
  if (method === "DELETE") {
    data[key].splice(index, 1);
    saveLocalState(data);
    return { message: "Deleted." };
  }
  throw new Error("Unsupported offline action.");
}

function localProductPayload(body, existing = {}) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("Item name is required.");
  const sku = existing.sku || generatedBarcode(existing.id);

  return {
    id: existing.id,
    name,
    sku,
    category_id: body.category_id || null,
    supplier_id: body.supplier_id || null,
    buying_price: Number(body.buying_price || 0),
    selling_price: Number(body.selling_price || 0),
    stock_quantity: Number(body.stock_quantity || 0),
    minimum_stock: Number(body.minimum_stock || state.settings.lowStockLimit || 5),
    description: body.description || "",
    status: body.status || existing.status || "active",
    created_at: existing.created_at || new Date().toISOString(),
  };
}

function localProductCrud(data, id, method, body) {
  if (method === "GET") return localProductRows(data);

  if (method === "POST") {
    const product = localProductPayload(body, { id: nextLocalId(data, "products") });
    data.products.unshift(product);
    saveLocalState(data);
    return product;
  }

  const index = data.products.findIndex((item) => String(item.id) === String(id));
  if (index < 0) throw new Error("Item not found.");

  if (method === "PUT") {
    const product = localProductPayload(body, data.products[index]);
    data.products[index] = product;
    saveLocalState(data);
    return product;
  }

  if (method === "DELETE") {
    data.products.splice(index, 1);
    data.purchases = data.purchases.filter((row) => String(row.product_id) !== String(id));
    data.sales = data.sales.filter((row) => String(row.product_id) !== String(id));
    data.adjustments = data.adjustments.filter((row) => String(row.product_id) !== String(id));
    saveLocalState(data);
    return { message: "Deleted." };
  }

  throw new Error("Unsupported offline action.");
}

function withProductSupplier(data, row) {
  const product = data.products.find((item) => String(item.id) === String(row.product_id));
  const supplier = data.suppliers.find((item) => String(item.id) === String(row.supplier_id));
  return { ...row, product_name: product?.name || "", supplier_name: supplier?.name || "", user_name: row.user_name || "System Admin" };
}

function notify(message) {
  state.toast = message;
  setTimeout(() => {
    state.toast = "";
    document.querySelector(".toast")?.remove();
  }, 3000);
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function input(name, placeholder, value = "", type = "text", extra = "") {
  return `<input name="${name}" type="${type}" placeholder="${placeholder}" value="${escapeHtml(value)}" ${extra}>`;
}

function select(name, options, selected = "", placeholder = "") {
  const first = placeholder ? `<option value="">${placeholder}</option>` : "";
  return `<select name="${name}">${first}${options.map((item) => {
    const value = typeof item === "object" ? item.value : item;
    const label = typeof item === "object" ? item.label : item;
    return `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("")}</select>`;
}

function table(rows, columns) {
  return `
    <div class="table-card">
      <table>
        <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows?.length
            ? rows.map((row) => `<tr>${columns.map((column) => `<td>${column.render ? column.render(row) : escapeHtml(row[column.key])}</td>`).join("")}</tr>`).join("")
            : `<tr><td class="empty" colspan="${columns.length || 1}">No records found</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function pageHeader(title, subtitle, action = "") {
  return `
    <div class="page-header">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      ${action}
    </div>`;
}

function visiblePages() {
  return pages.filter((page) => state.user?.role === "admin" || page.id !== "settings");
}

function shell(content) {
  const currentPage = visiblePages().find((page) => page.id === state.route) || pages[0];
  return `
    <div class="layout">
      <aside class="sidebar">
        <a href="#/dashboard" class="brand">
          <span>MF</span>
          <div><strong>${escapeHtml(state.settings.storeName || "MarketFlow")}</strong><small>Supermarket inventory</small></div>
        </a>
        <nav class="nav">
          ${visiblePages().map((page) => `
            <a href="#/${page.id}" class="${state.route === page.id ? "active" : ""}">
              <span>${page.icon}</span>${page.label}
            </a>`).join("")}
        </nav>
        <button class="ghost-button" data-action="logout">Sign out</button>
      </aside>
      <main class="main">
        <header class="topbar">
          <button class="menu-button" data-action="toggle-menu">Menu</button>
          <div>
            <strong>${currentPage.label}</strong>
            <small>${new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</small>
          </div>
          <div class="profile">
            ${state.user?.role === "admin" ? '<a class="icon-button" href="#/settings" title="System settings" aria-label="System settings">ST</a>' : ""}
            <span>${escapeHtml(state.user?.full_name?.charAt(0) || "U")}</span>
            <div><strong>${escapeHtml(state.user?.full_name || "User")}</strong><small>${escapeHtml(state.user?.role || "")}</small></div>
          </div>
        </header>
        ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
        ${content}
      </main>
    </div>`;
}

function loginView(error = "") {
  app.innerHTML = `
    <main class="login-page">
      <section class="login-panel">
        <div class="login-copy">
          <span class="brand-chip">${escapeHtml(state.settings.storeName || "MarketFlow")}</span>
          <h1>Inventory control for a busy store floor.</h1>
          <p>Track stock, suppliers, checkout sales and low-stock pressure from one calm workspace.</p>
          <div class="login-highlights" aria-hidden="true">
            <span>Stock</span>
            <span>Sales</span>
            <span>Reports</span>
          </div>
        </div>
        <form class="login-card" data-form="login">
          <div class="login-card-head">
            <div class="logo">MF</div>
            <div>
              <h2>Welcome back</h2>
              <p>Sign in to continue.</p>
            </div>
          </div>
          ${error ? `<div class="alert">${escapeHtml(error)}</div>` : ""}
          <label>Email${input("email", "Email address", "", "email", "required autocomplete=\"email\"")}</label>
          <label>Password${input("password", "Password", "", "password", "required autocomplete=\"current-password\"")}</label>
          <button class="primary-button">Sign In</button>
        </form>
      </section>
    </main>`;
}

async function loadLookups() {
  const [products, categories, suppliers] = await Promise.all([
    api("/products"),
    api("/categories"),
    api("/suppliers"),
  ]);
  state.products = products;
  state.categories = categories;
  state.suppliers = suppliers;
}

function productOptions(selected = "") {
  return state.products.map((product) => ({
    value: product.id,
    label: `${product.name} (${product.sku || `Stock ${product.stock_quantity}`})`,
    selected,
  }));
}

function dashboardCard(label, value, tone = "") {
  return `<article class="metric ${tone}"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value ?? 0)}</strong></article>`;
}

async function dashboardView() {
  const data = await api("/reports/dashboard");
  const cards = data.cards || {};
  const sales = data.salesByDay || [];
  const max = Math.max(...sales.map((row) => Number(row.sales)), 1);

  return `
    ${pageHeader("Dashboard", "Live supermarket overview of shelf stock, sales and reorder pressure.", state.user?.role === "admin" ? '<a class="primary-button link-button" href="#/settings">System Settings</a>' : "")}
    <section class="metrics-grid">
      ${dashboardCard("Items", cards.total_products)}
      ${dashboardCard("Units On Hand", cards.total_stock)}
      ${dashboardCard("Low Stock", cards.low_stock, "warning")}
      ${dashboardCard("Out of Stock", cards.out_of_stock, "danger")}
      ${dashboardCard("Vendors", cards.total_suppliers)}
      ${dashboardCard("Sales Today", money(cards.total_sales_today), "success")}
      ${dashboardCard("Stock In This Month", money(cards.monthly_purchases))}
      ${dashboardCard("Inventory Value", money(cards.inventory_value))}
    </section>
    <section class="content-grid">
      <article class="panel wide">
        <h2>Sales Trend</h2>
        <div class="bar-chart">
          ${sales.length ? sales.map((row) => `
            <div class="bar-item">
              <span title="${money(row.sales)}" style="height:${Math.max((Number(row.sales) / max) * 220, 8)}px"></span>
              <small>${escapeHtml(row.day)}</small>
            </div>`).join("") : '<p class="muted">No sales yet.</p>'}
        </div>
      </article>
      <article class="panel">
        <h2>Top Selling Items</h2>
        ${table(data.topProducts || [], [
          { key: "name", label: "Item" },
          { key: "quantity", label: "Qty" },
          { key: "amount", label: "Amount", render: (row) => money(row.amount) },
        ])}
      </article>
    </section>
    <section class="panel">
      <h2>Low Stock Alerts</h2>
      ${table(data.lowStock || [], [
        { key: "name", label: "Item" },
        { key: "sku", label: "SKU" },
        { key: "stock_quantity", label: "Stock" },
        { key: "minimum_stock", label: "Minimum" },
      ])}
    </section>`;
}

function productForm(product = {}) {
  return `
    <form class="form-grid" data-form="product" data-id="${product.id || ""}">
      ${input("name", "Item name", product.name, "text", "required")}
      ${input("sku", "Generated after save", product.sku || "Generated automatically", "text", "readonly")}
      ${select("category_id", state.categories.map((item) => ({ value: item.id, label: item.name })), product.category_id, "Category")}
      ${select("supplier_id", state.suppliers.map((item) => ({ value: item.id, label: item.name })), product.supplier_id, "Vendor")}
      ${input("buying_price", "Buying price", product.buying_price, "number", 'min="0" step="0.01"')}
      ${input("selling_price", "Selling price", product.selling_price, "number", 'min="0" step="0.01"')}
      ${input("stock_quantity", "Units on hand", product.stock_quantity, "number", 'min="0"')}
      ${input("minimum_stock", "Reorder level", product.minimum_stock || state.settings.lowStockLimit || 5, "number", 'min="0"')}
      <textarea name="description" placeholder="Shelf notes">${escapeHtml(product.description)}</textarea>
      <div class="form-actions">
        <button class="primary-button">${product.id ? "Update Item" : "Add Item"}</button>
        ${product.id ? '<button type="button" class="secondary-button" data-action="cancel-edit">Cancel</button>' : ""}
      </div>
    </form>`;
}

async function productsView() {
  await loadLookups();
  return `
    ${pageHeader("Inventory", "Create supermarket items, set shelf pricing and watch reorder levels.")}
    <section class="panel" id="editor">${productForm()}</section>
    ${table(state.products, [
      { key: "name", label: "Name" },
      { key: "sku", label: "Barcode" },
      { key: "category_name", label: "Category" },
      { key: "supplier_name", label: "Vendor" },
      { key: "stock_quantity", label: "Stock" },
      { key: "stock_status", label: "Status", render: (row) => stockBadge(row.stock_status) },
      { key: "selling_price", label: "Price", render: (row) => money(row.selling_price) },
      { key: "actions", label: "", render: (row) => rowActions("product", row) },
    ])}`;
}

function stockBadge(status) {
  const tone = status === "Out of Stock" ? "danger" : status === "Low Stock" ? "warning" : "success";
  return `<span class="status ${tone}">${escapeHtml(status || "In Stock")}</span>`;
}

function rowActions(type, row) {
  return `<div class="row-actions">
    <button class="small-button" data-action="edit-${type}" data-row="${encodeURIComponent(JSON.stringify(row))}">Edit</button>
    <button class="small-button danger" data-action="delete-${type}" data-id="${row.id}">Delete</button>
  </div>`;
}

function entityForm(type, fields, buttonText, item = {}) {
  return `
    <form class="form-grid" data-form="${type}" data-id="${item.id || ""}">
      ${fields.map((field) => {
        if (field.kind === "select") return select(field.name, field.options, item[field.name] || field.value);
        return input(field.name, field.placeholder, item[field.name] ?? field.value ?? "", field.type || "text", field.required ? "required" : "");
      }).join("")}
      <div class="form-actions">
        <button class="primary-button">${item.id ? "Update" : buttonText}</button>
        ${item.id ? '<button type="button" class="secondary-button" data-action="cancel-edit">Cancel</button>' : ""}
      </div>
    </form>`;
}

async function categoriesView() {
  const rows = await api("/categories");
  return `
    ${pageHeader("Categories", "Group supermarket items by department for faster shelf checks.")}
    <section class="panel" id="editor">${entityForm("category", [
      { name: "name", placeholder: "Department name", required: true },
      { name: "description", placeholder: "Description" },
    ], "Add Category")}</section>
    ${table(rows, [
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
      { key: "product_count", label: "Items" },
      { key: "actions", label: "", render: (row) => rowActions("category", row) },
    ])}`;
}

async function suppliersView() {
  const rows = await api("/suppliers");
  return `
    ${pageHeader("Vendors", "Keep vendor contacts and delivery relationships in one place.")}
    <section class="panel" id="editor">${entityForm("supplier", [
      { name: "name", placeholder: "Vendor name", required: true },
      { name: "contact_person", placeholder: "Contact person" },
      { name: "phone", placeholder: "Phone" },
      { name: "email", placeholder: "Email", type: "email" },
      { name: "address", placeholder: "Address" },
    ], "Add Vendor")}</section>
    ${table(rows, [
      { key: "name", label: "Vendor" },
      { key: "contact_person", label: "Contact" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "product_count", label: "Items" },
      { key: "actions", label: "", render: (row) => rowActions("supplier", row) },
    ])}`;
}

async function purchasesView() {
  await loadLookups();
  const rows = await api("/purchases");
  return `
    ${pageHeader("Stock In", "Record vendor deliveries and update supermarket shelf stock automatically.")}
    <section class="panel">
      <form class="form-grid" data-form="purchase">
        ${select("product_id", productOptions(), "", "Select item")}
        ${select("supplier_id", state.suppliers.map((s) => ({ value: s.id, label: s.name })), "", "Select vendor")}
        ${input("quantity", "Quantity", "", "number", 'min="1" required')}
        ${input("buying_price", "Buying price", "", "number", 'min="0" step="0.01" required')}
        ${input("invoice_number", "Invoice number")}
        ${input("purchase_date", "Purchase date", today(), "date")}
        <button class="primary-button">Add Stock</button>
      </form>
    </section>
    ${table(rows, [
      { key: "product_name", label: "Item" },
      { key: "supplier_name", label: "Vendor" },
      { key: "quantity", label: "Qty" },
      { key: "buying_price", label: "Unit Cost", render: (row) => money(row.buying_price) },
      { key: "total_cost", label: "Total", render: (row) => money(row.total_cost) },
      { key: "purchase_date", label: "Date" },
    ])}`;
}

async function salesView() {
  await loadLookups();
  const rows = await api("/sales");
  return `
    ${pageHeader("Checkout", "Record supermarket sales, reduce stock and print customer receipts.")}
    <section class="panel">
      <form class="form-grid" data-form="sale">
        ${select("product_id", productOptions(), "", "Select item")}
        ${input("quantity", "Quantity", "", "number", 'min="1" required')}
        ${input("selling_price", "Selling price", "", "number", 'min="0" step="0.01" required')}
        ${select("payment_method", ["Cash", "M-Pesa", "Card", "Bank Transfer"], "Cash")}
        ${input("sale_date", "Sale date", today(), "date")}
        <button class="primary-button">Save Sale</button>
      </form>
    </section>
    ${table(rows, [
      { key: "product_name", label: "Item" },
      { key: "quantity", label: "Qty" },
      { key: "selling_price", label: "Price", render: (row) => money(row.selling_price) },
      { key: "total_amount", label: "Total", render: (row) => money(row.total_amount) },
      { key: "profit", label: "Profit", render: (row) => money(row.profit) },
      { key: "payment_method", label: "Payment" },
      { key: "sale_date", label: "Date" },
      { key: "receipt", label: "", render: (row) => `<button class="small-button" data-action="receipt" data-row="${encodeURIComponent(JSON.stringify(row))}">Receipt</button>` },
    ])}`;
}

async function adjustmentsView() {
  await loadLookups();
  const rows = await api("/stock-adjustments");
  return `
    ${pageHeader("Stock Count", "Correct shelf counts after audits, returns, loss or damage.")}
    <section class="panel">
      <form class="form-grid" data-form="adjustment">
        ${select("product_id", productOptions(), "", "Select item")}
        ${select("adjustment_type", [{ value: "increase", label: "Increase" }, { value: "decrease", label: "Decrease" }], "increase")}
        ${input("quantity", "Quantity", "", "number", 'min="1" required')}
        ${input("reason", "Reason", "", "text", "required")}
        <button class="primary-button">Save Adjustment</button>
      </form>
    </section>
    ${table(rows, [
      { key: "product_name", label: "Item" },
      { key: "adjustment_type", label: "Type" },
      { key: "quantity", label: "Qty" },
      { key: "reason", label: "Reason" },
      { key: "user_name", label: "User" },
      { key: "created_at", label: "Date" },
    ])}`;
}

async function reportsView() {
  const rows = await api(`/reports/${state.reportTab}`);
  const columns = rows[0] ? Object.keys(rows[0]).slice(0, 9).map((key) => ({
    key,
    label: key.replaceAll("_", " "),
    render: (row) => /amount|price|cost|profit|revenue|total/.test(key) ? money(row[key]) : escapeHtml(row[key]),
  })) : [];

  return `
    ${pageHeader("Reports", "Review supermarket sales, stock-in, low-stock and profit reports.", `<button class="primary-button" data-action="csv" data-rows="${encodeURIComponent(JSON.stringify(rows))}">Export CSV</button>`)}
    <section class="tabs">
      ${["sales", "purchases", "low-stock", "profit"].map((tab) => `<button class="${state.reportTab === tab ? "active" : ""}" data-action="report-tab" data-tab="${tab}">${tab.replace("-", " ")}</button>`).join("")}
    </section>
    ${table(rows, columns)}`;
}

async function usersView() {
  const rows = await api("/auth/users").catch(() => []);
  return `
    ${pageHeader("Users", "Create cashier, stock clerk and manager accounts.")}
    <section class="panel">${entityForm("user", [
      { name: "full_name", placeholder: "Full name", required: true },
      { name: "email", placeholder: "Email", type: "email", required: true },
      { name: "phone", placeholder: "Phone" },
      { name: "password", placeholder: "Password", type: "password", required: true },
      { name: "role", kind: "select", value: "staff", options: [{ value: "staff", label: "Staff" }, { value: "admin", label: "Admin" }] },
    ], "Create User")}</section>
    ${table(rows, [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status" },
    ])}`;
}

async function settingsView() {
  const settings = state.settings;
  return `
    ${pageHeader("Settings", "Control system appearance, business defaults and local data maintenance.")}
    <section class="settings-grid">
      <article class="panel">
        <h2>Brand & Display</h2>
        <form class="form-grid settings-form" data-form="settings">
          ${input("storeName", "Store name", settings.storeName, "text", "required")}
          ${select("currency", ["KES", "USD", "EUR", "GBP", "TZS", "UGX"], settings.currency)}
          ${select("font", ["Inter", "Segoe UI", "Roboto", "Arial", "Georgia"], settings.font)}
          <label class="field-with-color">System color<input name="primaryColor" type="color" value="${escapeHtml(settings.primaryColor)}"></label>
          <label class="field-with-color">Sidebar color<input name="sidebarColor" type="color" value="${escapeHtml(settings.sidebarColor)}"></label>
          ${input("lowStockLimit", "Default low-stock limit", settings.lowStockLimit, "number", 'min="0"')}
          <label class="toggle-field">
            <input name="compactMode" type="checkbox" ${settings.compactMode ? "checked" : ""}>
            Compact workspace
          </label>
          <div class="form-actions">
            <button class="primary-button">Save Settings</button>
          </div>
        </form>
      </article>
      <article class="panel danger-zone">
        <h2>System Maintenance</h2>
        <p class="muted">Reset clears dashboard activity, sales, purchases and stock counts. Products, categories, vendors and users remain on this local machine.</p>
        <button class="secondary-button danger" data-action="reset-system">Reset System</button>
      </article>
    </section>`;
}

async function render() {
  syncRoute();
  if (!token()) {
    loginView();
    return;
  }

  app.innerHTML = shell('<section class="loading">Loading workspace...</section>');
  if (state.route === "settings" && state.user?.role !== "admin") {
    location.hash = "#/dashboard";
    return;
  }

  const views = {
    dashboard: dashboardView,
    products: productsView,
    categories: categoriesView,
    suppliers: suppliersView,
    purchases: purchasesView,
    sales: salesView,
    adjustments: adjustmentsView,
    reports: reportsView,
    users: usersView,
    settings: settingsView,
  };

  try {
    const view = views[state.route] || dashboardView;
    app.innerHTML = shell(await view());
  } catch (error) {
    app.innerHTML = shell(`<section class="alert large">${escapeHtml(error.message)}</section>`);
  }
}

async function saveForm(form) {
  const type = form.dataset.form;
  const id = form.dataset.id;
  const data = formData(form);

  const requests = {
    product: () => api(id ? `/products/${id}` : "/products", { method: id ? "PUT" : "POST", body: JSON.stringify(data) }),
    category: () => api(id ? `/categories/${id}` : "/categories", { method: id ? "PUT" : "POST", body: JSON.stringify(data) }),
    supplier: () => api(id ? `/suppliers/${id}` : "/suppliers", { method: id ? "PUT" : "POST", body: JSON.stringify(data) }),
    purchase: () => api("/purchases", { method: "POST", body: JSON.stringify(data) }),
    sale: () => api("/sales", { method: "POST", body: JSON.stringify(data) }),
    adjustment: () => api("/stock-adjustments", { method: "POST", body: JSON.stringify(data) }),
    user: () => api("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    settings: () => saveSettings({
      ...state.settings,
      storeName: data.storeName || defaultSettings.storeName,
      currency: data.currency || defaultSettings.currency,
      font: data.font || defaultSettings.font,
      primaryColor: data.primaryColor || defaultSettings.primaryColor,
      sidebarColor: data.sidebarColor || defaultSettings.sidebarColor,
      lowStockLimit: Number(data.lowStockLimit || 0),
      compactMode: form.elements.compactMode?.checked || false,
    }),
  };

  await requests[type]?.();
}

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form");
  if (!form) return;
  event.preventDefault();

  if (form.dataset.form === "login") {
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify(formData(form)) });
      setAuth(data);
      location.hash = "#/dashboard";
      await render();
    } catch (error) {
      loginView(error.message);
    }
    return;
  }

  try {
    await saveForm(form);
    notify("Saved successfully.");
    await render();
  } catch (error) {
    notify(error.message);
    app.insertAdjacentHTML("afterbegin", `<div class="toast danger">${escapeHtml(error.message)}</div>`);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.name !== "product_id" || state.route !== "sales") return;
  const product = state.products.find((item) => String(item.id) === String(event.target.value));
  const price = document.querySelector('[name="selling_price"]');
  if (price) price.value = product?.selling_price || "";
});

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "logout") {
    clearAuth();
    location.hash = "#/dashboard";
    render();
  }

  if (action === "toggle-menu") document.body.classList.toggle("nav-open");
  if (action === "cancel-edit") render();

  if (action === "reset-system" && confirm("Clear activity, sales, purchases and stock counts while keeping products, categories, vendors and users?")) {
    try {
      await resetSystem();
      notify("System activity has been reset.");
      location.hash = "#/dashboard";
      await render();
    } catch (error) {
      notify(error.message);
      app.insertAdjacentHTML("afterbegin", `<div class="toast danger">${escapeHtml(error.message)}</div>`);
    }
  }

  if (action === "edit-product") {
    await loadLookups();
    document.querySelector("#editor").innerHTML = productForm(JSON.parse(decodeURIComponent(target.dataset.row)));
  }

  if (action === "edit-category") {
    document.querySelector("#editor").innerHTML = entityForm("category", [
      { name: "name", placeholder: "Department name", required: true },
      { name: "description", placeholder: "Description" },
    ], "Add Category", JSON.parse(decodeURIComponent(target.dataset.row)));
  }

  if (action === "edit-supplier") {
    document.querySelector("#editor").innerHTML = entityForm("supplier", [
      { name: "name", placeholder: "Vendor name", required: true },
      { name: "contact_person", placeholder: "Contact person" },
      { name: "phone", placeholder: "Phone" },
      { name: "email", placeholder: "Email", type: "email" },
      { name: "address", placeholder: "Address" },
    ], "Add Vendor", JSON.parse(decodeURIComponent(target.dataset.row)));
  }

  for (const type of ["product", "category", "supplier"]) {
    if (action === `delete-${type}` && confirm(`Delete this ${type}?`)) {
      const endpoint = { product: "products", category: "categories", supplier: "suppliers" }[type];
      await api(`/${endpoint}/${target.dataset.id}`, { method: "DELETE" });
      notify("Deleted successfully.");
      await render();
    }
  }

  if (action === "report-tab") {
    state.reportTab = target.dataset.tab;
    render();
  }

  if (action === "csv") {
    const rows = JSON.parse(decodeURIComponent(target.dataset.rows));
    if (!rows.length) return notify("There is no report data to export.");
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.reportTab}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (action === "receipt") {
    const row = JSON.parse(decodeURIComponent(target.dataset.row));
    const receipt = window.open("", "_blank");
    receipt.document.write(`
      <title>MarketFlow Receipt</title>
      <body style="font-family:Arial;padding:24px">
        <h2>MarketFlow Receipt</h2>
        <p><strong>Item:</strong> ${escapeHtml(row.product_name)}</p>
        <p><strong>Quantity:</strong> ${escapeHtml(row.quantity)}</p>
        <p><strong>Total:</strong> ${money(row.total_amount)}</p>
        <p><strong>Payment:</strong> ${escapeHtml(row.payment_method)}</p>
        <p><strong>Date:</strong> ${escapeHtml(row.sale_date)}</p>
      </body>`);
    receipt.document.close();
    receipt.print();
  }
});

window.addEventListener("hashchange", render);
applySettings();
render();
