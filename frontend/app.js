const API_URL = localStorage.getItem("apiUrl") || "http://localhost:5000/api";
const app = document.querySelector("#app");

const state = {
  products: [],
  categories: [],
  suppliers: [],
  reportTab: "sales",
};

const links = [
  ["dashboard", "Dashboard", "▦"],
  ["products", "Products", "▣"],
  ["categories", "Categories", "≡"],
  ["suppliers", "Suppliers", "⌂"],
  ["purchases", "Purchases", "+"],
  ["sales", "Sales", "◷"],
  ["adjustments", "Adjustments", "↕"],
  ["reports", "Reports", "☷"],
  ["users", "Users", "◎"],
];

function user() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function token() {
  return localStorage.getItem("token");
}

function route() {
  return location.hash.replace(/^#\/?/, "") || "dashboard";
}

function money(value) {
  return `KES ${Number(value || 0).toLocaleString()}`;
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

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    render();
  }
  if (!response.ok) throw new Error(data?.message || "Request failed");
  return data;
}

function htmlTable(rows = [], columns = []) {
  const body = rows.length
    ? rows.map((row, index) => `<tr>${columns.map((column) => `<td>${column.render ? column.render(row, index) : escapeHtml(row[column.key])}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${Math.max(columns.length, 1)}" class="empty">No records found</td></tr>`;

  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

function statCard(title, value) {
  return `<article class="stat-card"><small>${escapeHtml(title)}</small><strong>${escapeHtml(value ?? 0)}</strong></article>`;
}

function formValue(form, name) {
  return form.querySelector(`[name="${name}"]`)?.value.trim() || "";
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function loadBaseLists() {
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
  return `<option value="">Select product</option>${state.products.map((product) => `<option value="${product.id}" ${String(selected) === String(product.id) ? "selected" : ""}>${escapeHtml(product.name)} - ${escapeHtml(product.sku || `Stock: ${product.stock_quantity}`)}</option>`).join("")}`;
}

function categoryOptions(selected = "") {
  return `<option value="">Category</option>${state.categories.map((category) => `<option value="${category.id}" ${String(selected) === String(category.id) ? "selected" : ""}>${escapeHtml(category.name)}</option>`).join("")}`;
}

function supplierOptions(selected = "") {
  return `<option value="">Supplier</option>${state.suppliers.map((supplier) => `<option value="${supplier.id}" ${String(selected) === String(supplier.id) ? "selected" : ""}>${escapeHtml(supplier.name)}</option>`).join("")}`;
}

function renderLogin(error = "") {
  app.innerHTML = `
    <div class="login-page">
      <form class="login-card" id="loginForm">
        <div class="login-logo">SF</div>
        <h1>StockFlow</h1>
        <p>Login to manage your inventory</p>
        ${error ? `<div class="alert">${escapeHtml(error)}</div>` : ""}
        <label>Email<input name="email" value="admin@stockflow.com" autocomplete="email"></label>
        <label>Password<input name="password" type="password" value="admin123" autocomplete="current-password"></label>
        <button>Login</button>
        <small>Default: admin@stockflow.com / admin123</small>
      </form>
    </div>`;

  document.querySelector("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: formValue(event.currentTarget, "email"), password: formValue(event.currentTarget, "password") }),
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      location.hash = "#/dashboard";
      render();
    } catch (error) {
      renderLogin(error.message);
    }
  });
}

function shell(content) {
  const currentUser = user();
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">SF</span><div><strong>StockFlow</strong><small>Inventory System</small></div></div>
        <nav>${links.map(([id, label, icon]) => `<a href="#/${id}" class="${route() === id ? "active" : ""}"><span class="nav-icon">${icon}</span>${label}</a>`).join("")}</nav>
        <button class="logout" id="logoutBtn"><span class="nav-icon">↩</span> Logout</button>
      </aside>
      <main class="main">
        <header class="topbar">
          <div><h2>Inventory Management</h2><p>Track products, stock movement, suppliers, sales and reports.</p></div>
          <div class="profile"><span>${escapeHtml(currentUser?.full_name?.[0] || "U")}</span><div><strong>${escapeHtml(currentUser?.full_name || "User")}</strong><small>${escapeHtml(currentUser?.role || "")}</small></div></div>
        </header>
        ${content}
      </main>
    </div>`;
}

async function dashboardPage() {
  const data = await api("/reports/dashboard");
  const cards = data.cards || {};
  const maxSales = Math.max(...(data.salesByDay || []).map((row) => Number(row.sales)), 1);
  return `
    <section class="page">
      <div class="stats-grid">
        ${statCard("Total Products", cards.total_products)}
        ${statCard("Total Stock", cards.total_stock)}
        ${statCard("Low Stock", cards.low_stock)}
        ${statCard("Out of Stock", cards.out_of_stock)}
        ${statCard("Suppliers", cards.total_suppliers)}
        ${statCard("Sales Today", money(cards.total_sales_today))}
        ${statCard("Purchases This Month", money(cards.monthly_purchases))}
        ${statCard("Inventory Value", money(cards.inventory_value))}
      </div>
      <div class="grid-2">
        <div class="panel">
          <h3>Sales Trend</h3>
          <div class="chart">${(data.salesByDay || []).map((row) => `<div class="bar"><span style="height:${Math.max((Number(row.sales) / maxSales) * 220, 6)}px"></span><small>${escapeHtml(row.day)}</small></div>`).join("")}</div>
        </div>
        <div class="panel">
          <h3>Top Selling Products</h3>
          ${htmlTable(data.topProducts, [{ key: "name", label: "Product" }, { key: "quantity", label: "Qty" }, { key: "amount", label: "Amount" }])}
        </div>
      </div>
      <div class="panel">
        <h3>Low Stock Alerts</h3>
        ${htmlTable(data.lowStock, [{ key: "name", label: "Product" }, { key: "sku", label: "SKU" }, { key: "stock_quantity", label: "Stock" }, { key: "minimum_stock", label: "Minimum" }])}
      </div>
    </section>`;
}

async function productsPage() {
  await loadBaseLists();
  return `
    <section class="page">
      <div class="page-title"><h2>Products</h2><p>Add products and monitor stock status.</p></div>
      <div class="panel" id="productEditor">${productForm()}</div>
      ${productsTable()}
    </section>`;
}

function productForm(product = {}) {
  return `
    <form class="form-grid" data-form="product" data-id="${product.id || ""}">
      <input name="name" placeholder="Product name" value="${escapeHtml(product.name)}">
      <input name="sku" placeholder="SKU" value="${escapeHtml(product.sku)}">
      <select name="category_id">${categoryOptions(product.category_id)}</select>
      <select name="supplier_id">${supplierOptions(product.supplier_id)}</select>
      <input name="buying_price" type="number" placeholder="Buying price" value="${escapeHtml(product.buying_price)}">
      <input name="selling_price" type="number" placeholder="Selling price" value="${escapeHtml(product.selling_price)}">
      <input name="stock_quantity" type="number" placeholder="Current stock" value="${escapeHtml(product.stock_quantity)}">
      <input name="minimum_stock" type="number" placeholder="Minimum stock" value="${escapeHtml(product.minimum_stock || 5)}">
      <textarea name="description" placeholder="Description">${escapeHtml(product.description)}</textarea>
      <button>${product.id ? "Update Product" : "Add Product"}</button>
      ${product.id ? '<button type="button" class="secondary" data-action="cancel-product">Cancel</button>' : ""}
    </form>
    <p class="info" id="productMsg" hidden></p>`;
}

function productsTable() {
  return htmlTable(state.products, [
    { key: "name", label: "Name" },
    { key: "sku", label: "SKU" },
    { key: "category_name", label: "Category" },
    { key: "supplier_name", label: "Supplier" },
    { key: "stock_quantity", label: "Stock" },
    { key: "stock_status", label: "Status", render: (row) => `<span class="badge ${row.stock_status === "Low Stock" ? "warn" : row.stock_status === "Out of Stock" ? "danger" : "ok"}">${escapeHtml(row.stock_status)}</span>` },
    { key: "selling_price", label: "Price" },
    { key: "actions", label: "Actions", render: (row) => `<div class="actions"><button data-action="edit-product" data-id="${row.id}">Edit</button><button class="danger-btn" data-action="delete-product" data-id="${row.id}">Delete</button></div>` },
  ]);
}

async function simpleCrudPage(config) {
  const rows = await api(config.path);
  return `
    <section class="page">
      <div class="page-title"><h2>${config.title}</h2><p>${config.subtitle}</p></div>
      <div class="panel" id="${config.name}Editor">${config.form()}</div>
      ${htmlTable(rows, config.columns)}
    </section>`;
}

function entityForm(name, fields, button, item = {}) {
  return `
    <form class="form-grid" data-form="${name}" data-id="${item.id || ""}">
      ${fields.map((field) => field.type === "select"
        ? `<select name="${field.name}">${field.options.map((option) => `<option value="${option.value}" ${String(item[field.name] || field.value || "") === String(option.value) ? "selected" : ""}>${option.label}</option>`).join("")}</select>`
        : `<input name="${field.name}" type="${field.type || "text"}" placeholder="${field.placeholder}" value="${escapeHtml(item[field.name] ?? field.value ?? "")}">`).join("")}
      <button>${item.id ? "Update" : button}</button>
      ${item.id ? `<button type="button" class="secondary" data-action="cancel-${name}">Cancel</button>` : ""}
    </form>
    <p class="info" id="${name}Msg" hidden></p>`;
}

async function purchasesPage() {
  await loadBaseLists();
  const rows = await api("/purchases");
  return `
    <section class="page">
      <div class="page-title"><h2>Purchases / Stock In</h2><p>Record new stock purchases and automatically increase inventory.</p></div>
      <div class="panel">
        <form class="form-grid" data-form="purchase">
          <select name="product_id">${productOptions()}</select>
          <select name="supplier_id">${supplierOptions()}</select>
          <input name="quantity" type="number" placeholder="Quantity">
          <input name="buying_price" type="number" placeholder="Buying price">
          <input name="invoice_number" placeholder="Invoice number">
          <input name="purchase_date" type="date" value="${new Date().toISOString().slice(0, 10)}">
          <button>Add Stock</button>
        </form>
        <p class="info" id="purchaseMsg" hidden></p>
      </div>
      ${htmlTable(rows, [{ key: "product_name", label: "Product" }, { key: "supplier_name", label: "Supplier" }, { key: "quantity", label: "Qty" }, { key: "buying_price", label: "Buying Price" }, { key: "total_cost", label: "Total" }, { key: "invoice_number", label: "Invoice" }, { key: "purchase_date", label: "Date" }])}
    </section>`;
}

async function salesPage() {
  await loadBaseLists();
  const rows = await api("/sales");
  return `
    <section class="page">
      <div class="page-title"><h2>Sales / Stock Out</h2><p>Record sales, reduce stock, and print receipts.</p></div>
      <div class="panel">
        <form class="form-grid" data-form="sale">
          <select name="product_id" id="saleProduct">${productOptions()}</select>
          <input name="quantity" type="number" placeholder="Quantity">
          <input name="selling_price" type="number" placeholder="Selling price">
          <select name="payment_method">${["Cash", "M-Pesa", "Card", "Bank Transfer"].map((method) => `<option>${method}</option>`).join("")}</select>
          <input name="sale_date" type="date" value="${new Date().toISOString().slice(0, 10)}">
          <button>Save Sale</button>
        </form>
        <p class="info" id="saleMsg" hidden></p>
      </div>
      ${htmlTable(rows, [{ key: "product_name", label: "Product" }, { key: "quantity", label: "Qty" }, { key: "selling_price", label: "Price" }, { key: "total_amount", label: "Total" }, { key: "profit", label: "Profit" }, { key: "payment_method", label: "Payment" }, { key: "sale_date", label: "Date" }, { key: "receipt", label: "Receipt", render: (row) => `<button data-action="receipt" data-row="${encodeURIComponent(JSON.stringify(row))}">Print</button>` }])}
    </section>`;
}

async function adjustmentsPage() {
  await loadBaseLists();
  const rows = await api("/stock-adjustments");
  return `
    <section class="page">
      <div class="page-title"><h2>Stock Adjustments</h2><p>Correct stock for damaged, lost, returned or counted goods.</p></div>
      <div class="panel">
        <form class="form-grid" data-form="adjustment">
          <select name="product_id">${productOptions()}</select>
          <select name="adjustment_type"><option value="increase">Increase</option><option value="decrease">Decrease</option></select>
          <input name="quantity" type="number" placeholder="Quantity">
          <input name="reason" placeholder="Reason">
          <button>Save Adjustment</button>
        </form>
        <p class="info" id="adjustmentMsg" hidden></p>
      </div>
      ${htmlTable(rows, [{ key: "product_name", label: "Product" }, { key: "adjustment_type", label: "Type" }, { key: "quantity", label: "Qty" }, { key: "reason", label: "Reason" }, { key: "user_name", label: "User" }, { key: "created_at", label: "Date" }])}
    </section>`;
}

async function reportsPage() {
  const data = await api(`/reports/${state.reportTab}`);
  const columns = data[0] ? Object.keys(data[0]).slice(0, 9).map((key) => ({ key, label: key.replaceAll("_", " ") })) : [];
  return `
    <section class="page">
      <div class="page-title"><h2>Reports</h2><p>View and export sales, purchases, low stock and profit reports.</p></div>
      <div class="panel report-tabs">
        ${["sales", "purchases", "low-stock", "profit"].map((tab) => `<button class="${state.reportTab === tab ? "active" : ""}" data-action="report-tab" data-tab="${tab}">${tab.replace("-", " ")}</button>`).join("")}
        <button data-action="csv" data-rows="${encodeURIComponent(JSON.stringify(data))}">Download CSV</button>
      </div>
      ${htmlTable(data, columns)}
    </section>`;
}

async function usersPage() {
  const rows = await api("/auth/users").catch(() => []);
  return `
    <section class="page">
      <div class="page-title"><h2>Users</h2><p>Create staff or admin users.</p></div>
      <div class="panel">${entityForm("user", [
        { name: "full_name", placeholder: "Full name" },
        { name: "email", placeholder: "Email" },
        { name: "phone", placeholder: "Phone" },
        { name: "password", placeholder: "Password", type: "password" },
        { name: "role", type: "select", value: "staff", options: [{ value: "staff", label: "Staff" }, { value: "admin", label: "Admin" }] },
      ], "Create User")}</div>
      ${htmlTable(rows, [{ key: "full_name", label: "Name" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "role", label: "Role" }, { key: "status", label: "Status" }])}
    </section>`;
}

async function render() {
  if (!token()) {
    renderLogin();
    return;
  }

  app.innerHTML = shell('<section class="page"><div class="panel">Loading...</div></section>');
  try {
    const pages = {
      dashboard: dashboardPage,
      products: productsPage,
      categories: () => simpleCrudPage({
        name: "category",
        path: "/categories",
        title: "Categories",
        subtitle: "Organize products into useful groups.",
        form: (item) => entityForm("category", [{ name: "name", placeholder: "Category name" }, { name: "description", placeholder: "Description" }], "Add Category", item),
        columns: [{ key: "name", label: "Name" }, { key: "description", label: "Description" }, { key: "product_count", label: "Products" }, { key: "actions", label: "Actions", render: (row) => `<div class="actions"><button data-action="edit-category" data-id="${row.id}" data-row="${encodeURIComponent(JSON.stringify(row))}">Edit</button><button class="danger-btn" data-action="delete-category" data-id="${row.id}">Delete</button></div>` }],
      }),
      suppliers: () => simpleCrudPage({
        name: "supplier",
        path: "/suppliers",
        title: "Suppliers",
        subtitle: "Manage supplier records and contacts.",
        form: (item) => entityForm("supplier", [{ name: "name", placeholder: "Supplier name" }, { name: "contact_person", placeholder: "Contact person" }, { name: "phone", placeholder: "Phone" }, { name: "email", placeholder: "Email" }, { name: "address", placeholder: "Address" }], "Add Supplier", item),
        columns: [{ key: "name", label: "Supplier" }, { key: "contact_person", label: "Contact" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "product_count", label: "Products" }, { key: "actions", label: "Actions", render: (row) => `<div class="actions"><button data-action="edit-supplier" data-id="${row.id}" data-row="${encodeURIComponent(JSON.stringify(row))}">Edit</button><button class="danger-btn" data-action="delete-supplier" data-id="${row.id}">Delete</button></div>` }],
      }),
      purchases: purchasesPage,
      sales: salesPage,
      adjustments: adjustmentsPage,
      reports: reportsPage,
      users: usersPage,
    };
    const page = pages[route()] || pages.dashboard;
    app.innerHTML = shell(await page());
    bindEvents();
  } catch (error) {
    app.innerHTML = shell(`<section class="page"><div class="alert">${escapeHtml(error.message)}</div></section>`);
    bindEvents();
  }
}

function showMessage(id, message) {
  const element = document.querySelector(`#${id}`);
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
}

function bindEvents() {
  document.querySelector("#logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    render();
  });
}

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const type = form.dataset.form;
  const id = form.dataset.id;

  try {
    if (type === "product") await api(id ? `/products/${id}` : "/products", { method: id ? "PUT" : "POST", body: JSON.stringify(formData(form)) });
    if (type === "category") await api(id ? `/categories/${id}` : "/categories", { method: id ? "PUT" : "POST", body: JSON.stringify(formData(form)) });
    if (type === "supplier") await api(id ? `/suppliers/${id}` : "/suppliers", { method: id ? "PUT" : "POST", body: JSON.stringify(formData(form)) });
    if (type === "purchase") await api("/purchases", { method: "POST", body: JSON.stringify(formData(form)) });
    if (type === "sale") await api("/sales", { method: "POST", body: JSON.stringify(formData(form)) });
    if (type === "adjustment") await api("/stock-adjustments", { method: "POST", body: JSON.stringify(formData(form)) });
    if (type === "user") await api("/auth/register", { method: "POST", body: JSON.stringify(formData(form)) });
    await render();
    showMessage(`${type}Msg`, "Saved successfully");
  } catch (error) {
    showMessage(`${type}Msg`, error.message);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id !== "saleProduct") return;
  const product = state.products.find((item) => String(item.id) === String(event.target.value));
  const price = document.querySelector('[name="selling_price"]');
  if (price) price.value = product?.selling_price || "";
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "edit-product") {
    await loadBaseLists();
    const item = state.products.find((product) => String(product.id) === String(button.dataset.id));
    document.querySelector("#productEditor").innerHTML = productForm(item);
  }

  if (action === "delete-product" && confirm("Delete product?")) {
    await api(`/products/${button.dataset.id}`, { method: "DELETE" });
    render();
  }

  if (action === "edit-category") {
    const row = JSON.parse(decodeURIComponent(button.dataset.row));
    document.querySelector("#categoryEditor").innerHTML = entityForm("category", [{ name: "name", placeholder: "Category name" }, { name: "description", placeholder: "Description" }], "Add Category", row);
  }

  if (action === "delete-category" && confirm("Delete category?")) {
    await api(`/categories/${button.dataset.id}`, { method: "DELETE" });
    render();
  }

  if (action === "edit-supplier") {
    const row = JSON.parse(decodeURIComponent(button.dataset.row));
    document.querySelector("#supplierEditor").innerHTML = entityForm("supplier", [{ name: "name", placeholder: "Supplier name" }, { name: "contact_person", placeholder: "Contact person" }, { name: "phone", placeholder: "Phone" }, { name: "email", placeholder: "Email" }, { name: "address", placeholder: "Address" }], "Add Supplier", row);
  }

  if (action === "delete-supplier" && confirm("Delete supplier?")) {
    await api(`/suppliers/${button.dataset.id}`, { method: "DELETE" });
    render();
  }

  if (action.startsWith("cancel-")) render();

  if (action === "receipt") {
    const row = JSON.parse(decodeURIComponent(button.dataset.row));
    const receipt = window.open("", "_blank");
    receipt.document.write(`<h2>StockFlow Receipt</h2><p>Product: ${escapeHtml(row.product_name)}</p><p>Qty: ${escapeHtml(row.quantity)}</p><p>Total: KES ${escapeHtml(row.total_amount)}</p><p>Payment: ${escapeHtml(row.payment_method)}</p><p>Date: ${escapeHtml(row.sale_date)}</p>`);
    receipt.print();
  }

  if (action === "report-tab") {
    state.reportTab = button.dataset.tab;
    render();
  }

  if (action === "csv") {
    const rows = JSON.parse(decodeURIComponent(button.dataset.rows));
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.reportTab}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
});

window.addEventListener("hashchange", render);
render();
