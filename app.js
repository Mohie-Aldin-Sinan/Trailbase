"use strict";

const STORAGE_KEY = "trailbase-workspace-v1";
const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "short" });
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const dateOffset = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `tb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
const money = (amount) => INR.format(Number(amount) || 0);
const formatDate = (date) => date ? shortDate.format(new Date(`${date}T00:00:00`)) : "—";
const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
const titleCase = (value) => String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function seedData() {
  const treks = [
    { id: makeId(), name: "Kedarkantha Winter Trail", location: "Uttarakhand", difficulty: "Moderate", startDate: dateOffset(9), endDate: dateOffset(13), capacity: 18, price: 12900, status: "Open" },
    { id: makeId(), name: "Valley of Flowers", location: "Uttarakhand", difficulty: "Moderate", startDate: dateOffset(22), endDate: dateOffset(26), capacity: 16, price: 14500, status: "Open" },
    { id: makeId(), name: "Hampta Pass Crossing", location: "Himachal Pradesh", difficulty: "Challenging", startDate: dateOffset(35), endDate: dateOffset(40), capacity: 14, price: 16900, status: "Open" },
    { id: makeId(), name: "Dayara Bugyal Meadow", location: "Uttarakhand", difficulty: "Easy", startDate: dateOffset(-12), endDate: dateOffset(-10), capacity: 20, price: 8500, status: "Completed" },
  ];
  const customers = [
    { id: makeId(), name: "Ananya Mehta", email: "ananya.m@example.com", phone: "+91 98765 43210", emergencyContact: "+91 98765 43211" },
    { id: makeId(), name: "Rohan Kapoor", email: "rohan.k@example.com", phone: "+91 98123 45670", emergencyContact: "+91 98123 45671" },
    { id: makeId(), name: "Isha Nair", email: "isha.n@example.com", phone: "+91 99876 54320", emergencyContact: "+91 99876 54321" },
    { id: makeId(), name: "Kabir Shah", email: "kabir.s@example.com", phone: "+91 97654 32109", emergencyContact: "+91 97654 32100" },
  ];
  const guides = [
    { id: makeId(), name: "Tenzin Sherpa", email: "tenzin@example.com", phone: "+91 94123 45678", specialty: "High-altitude treks", status: "Active" },
    { id: makeId(), name: "Meera Rawat", email: "meera@example.com", phone: "+91 94123 45679", specialty: "First aid & navigation", status: "Active" },
  ];
  return {
    treks,
    customers,
    guides,
    bookings: [
      { id: makeId(), trekId: treks[0].id, customerId: customers[0].id, people: 2, status: "Confirmed", paid: 25800, createdAt: dateOffset(-3) },
      { id: makeId(), trekId: treks[0].id, customerId: customers[1].id, people: 1, status: "Pending", paid: 5000, createdAt: dateOffset(-2) },
      { id: makeId(), trekId: treks[1].id, customerId: customers[2].id, people: 2, status: "Confirmed", paid: 29000, createdAt: dateOffset(-1) },
      { id: makeId(), trekId: treks[2].id, customerId: customers[3].id, people: 1, status: "Confirmed", paid: 16900, createdAt: dateOffset(0) },
    ],
    expenses: [
      { id: makeId(), trekId: treks[0].id, title: "Guesthouse deposit", category: "Accommodation", amount: 12500, date: dateOffset(-4) },
      { id: makeId(), trekId: treks[0].id, title: "Trail provisions", category: "Supplies", amount: 6400, date: dateOffset(-1) },
      { id: makeId(), trekId: treks[1].id, title: "Transport advance", category: "Transport", amount: 8200, date: dateOffset(0) },
    ],
  };
}

function validData(data) {
  const collections = ["treks", "customers", "guides", "bookings", "expenses"];
  return data && typeof data === "object" && collections.every((key) => Array.isArray(data[key]));
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seedData();
    const parsed = JSON.parse(saved);
    if (validData(parsed)) return parsed;
    throw new Error("The saved data does not have the expected format.");
  } catch (error) {
    console.error("Could not load Trailbase data:", error);
    setTimeout(() => notify("Saved data could not be read. A fresh workspace was opened.", true), 0);
    return seedData();
  }
}

let data = loadData();
let activeView = "dashboard";
let listSearch = "";
let statusFilter = "all";
let editing = null;
let flashMessage = "";

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Could not save Trailbase data:", error);
    notify("Could not save changes on this device. Export a backup and check your browser storage.", true);
    return false;
  }
}

function notify(message, error = false) {
  const toast = document.createElement("div");
  toast.className = `toast${error ? " error" : ""}`;
  toast.textContent = message;
  $("#toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

const getTrek = (id) => data.treks.find((trek) => trek.id === id);
const getCustomer = (id) => data.customers.find((customer) => customer.id === id);
const getBookingTotal = (booking) => (Number(booking.unitPrice ?? getTrek(booking.trekId)?.price) || 0) * (Number(booking.people) || 0);
const getSeats = (trekId) => data.bookings.filter((booking) => booking.trekId === trekId && booking.status !== "Cancelled")
  .reduce((sum, booking) => sum + (Number(booking.people) || 0), 0);
const displayedValue = (value) => escapeHTML(value || "—");

function pageHeading(title, subtitle, actionLabel, actionType = activeView) {
  const button = actionLabel
    ? `<div class="heading-actions"><button class="button button-primary" data-action="add" data-type="${actionType}"><span>＋</span>${escapeHTML(actionLabel)}</button></div>`
    : "";
  return `<div class="page-heading"><div><div class="eyebrow">TRAILBASE WORKSPACE</div><h1 id="page-title">${escapeHTML(title)}</h1><p>${escapeHTML(subtitle)}</p></div>${button}</div>`;
}

function statusPill(status) {
  const safe = escapeHTML(status || "Open");
  return `<span class="status ${safe.toLowerCase()}">${safe}</span>`;
}

function emptyRow(columns, title, description) {
  return `<tr><td colspan="${columns}"><div class="empty-state"><strong>${escapeHTML(title)}</strong>${escapeHTML(description)}</div></td></tr>`;
}

function renderDashboard() {
  const upcoming = data.treks.filter((trek) => trek.endDate >= dateOffset(0) && trek.status !== "Completed")
    .sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 4);
  const confirmed = data.bookings.filter((booking) => booking.status !== "Cancelled");
  const revenue = confirmed.reduce((sum, booking) => sum + (Number(booking.paid) || 0), 0);
  const outstanding = confirmed.reduce((sum, booking) => sum + Math.max(0, getBookingTotal(booking) - (Number(booking.paid) || 0)), 0);
  const thisMonth = data.bookings.filter((booking) => booking.createdAt?.slice(0, 7) === dateOffset(0).slice(0, 7)).length;
  const recent = [...data.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  $("#view-dashboard").innerHTML = `
    ${pageHeading("Good to see you out here.", "Here’s what’s happening across your treks.", "Plan a trek", "treks")}
    <div class="stats-grid">
      <article class="stat-card"><div class="stat-top"><span class="stat-label">Upcoming treks</span><span class="stat-icon">⌁</span></div><div class="stat-value">${upcoming.length}</div><div class="stat-foot"><span class="positive">On the horizon</span> · all scheduled departures</div></article>
      <article class="stat-card"><div class="stat-top"><span class="stat-label">Active bookings</span><span class="stat-icon">▤</span></div><div class="stat-value">${confirmed.length}</div><div class="stat-foot"><span class="positive">${thisMonth} this month</span> · excluding cancellations</div></article>
      <article class="stat-card"><div class="stat-top"><span class="stat-label">Payments received</span><span class="stat-icon">₹</span></div><div class="stat-value">${money(revenue)}</div><div class="stat-foot">Across all active bookings</div></article>
      <article class="stat-card"><div class="stat-top"><span class="stat-label">Payments outstanding</span><span class="stat-icon">◷</span></div><div class="stat-value">${money(outstanding)}</div><div class="stat-foot">Balance due on active bookings</div></article>
    </div>
    <div class="dashboard-grid">
      <article class="panel">
        <div class="panel-heading"><div><h2>Upcoming departures</h2><p>Your next adventures, at a glance</p></div><button class="text-link" data-navigate="treks">All treks →</button></div>
        <div class="table-wrap"><table><thead><tr><th>Trek</th><th>Departure</th><th>Difficulty</th><th>Spots</th><th>Status</th></tr></thead><tbody>
          ${upcoming.length ? upcoming.map((trek) => {
            const booked = getSeats(trek.id);
            return `<tr><td><div class="cell-primary">${displayedValue(trek.name)}</div><div class="cell-secondary">${displayedValue(trek.location)}</div></td><td>${formatDate(trek.startDate)}</td><td>${displayedValue(trek.difficulty)}</td><td><div class="progress-track"><span style="width:${Math.min(100, trek.capacity ? booked / trek.capacity * 100 : 0)}%"></span></div><div class="progress-copy">${booked} / ${trek.capacity}</div></td><td>${statusPill(trek.status)}</td></tr>`;
          }).join("") : emptyRow(5, "No upcoming departures", "Add a trek to start planning your next adventure.")}</tbody></table></div>
      </article>
      <article class="panel">
        <div class="panel-heading"><div><h2>Recent bookings</h2><p>Latest activity from your customers</p></div><button class="text-link" data-navigate="bookings">View all →</button></div>
        <div class="activity-list">${recent.length ? recent.map((booking) => {
          const customer = getCustomer(booking.customerId);
          const trek = getTrek(booking.trekId);
          return `<div class="activity-item"><div class="activity-avatar">${escapeHTML(initials(customer?.name))}</div><div class="activity-copy"><strong>${displayedValue(customer?.name)}</strong><p>${displayedValue(trek?.name)} · ${booking.people} ${booking.people === 1 ? "person" : "people"}</p></div><span class="activity-amount">${money(booking.paid)}</span></div>`;
        }).join("") : `<div class="empty-state"><strong>No bookings yet</strong>Bookings will show here as you add them.</div>`}</div>
      </article>
    </div>`;
}

function toolbar(filterStatuses = []) {
  return `<div class="toolbar"><label class="search-box"><span>⌕</span><input type="search" id="list-search" placeholder="Search ${escapeHTML(activeView)}..." value="${escapeHTML(listSearch)}" aria-label="Search ${escapeHTML(activeView)}"></label>${filterStatuses.length ? `<select class="filter-select" id="status-filter" aria-label="Filter by status"><option value="all">All statuses</option>${filterStatuses.map((status) => `<option value="${escapeHTML(status)}"${statusFilter === status ? " selected" : ""}>${escapeHTML(status)}</option>`).join("")}</select>` : ""}</div>`;
}

function renderTreks() {
  const rows = data.treks.filter((trek) => {
    const text = `${trek.name} ${trek.location} ${trek.difficulty}`.toLowerCase();
    return text.includes(listSearch.toLowerCase()) && (statusFilter === "all" || trek.status === statusFilter);
  });
  $("#view-treks").innerHTML = `${pageHeading("Your treks", "Plan departures, track capacity, and keep every itinerary moving.", "Add a trek")}
    ${toolbar(["Open", "Planned", "Completed", "Cancelled"])}
    <article class="panel list-panel"><div class="table-wrap"><table><thead><tr><th>Trek</th><th>Dates</th><th>Difficulty</th><th>Price / person</th><th>Occupancy</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${rows.length ? rows.map((trek) => {
        const seats = getSeats(trek.id);
        return `<tr><td><div class="cell-primary">${displayedValue(trek.name)}</div><div class="cell-secondary">${displayedValue(trek.location)}</div></td><td>${formatDate(trek.startDate)}<div class="cell-secondary">to ${formatDate(trek.endDate)}</div></td><td>${displayedValue(trek.difficulty)}</td><td>${money(trek.price)}</td><td><div class="progress-track"><span style="width:${Math.min(100, trek.capacity ? seats / trek.capacity * 100 : 0)}%"></span></div><div class="progress-copy">${seats} / ${trek.capacity} spots</div></td><td>${statusPill(trek.status)}</td><td>${rowActions("treks", trek.id)}</td></tr>`;
      }).join("") : emptyRow(7, "No treks found", "Try another search or add your first trek.")}</tbody></table></div><div class="table-footer">Showing ${rows.length} of ${data.treks.length} treks</div></article>`;
}

function renderBookings() {
  const rows = data.bookings.filter((booking) => {
    const customer = getCustomer(booking.customerId);
    const trek = getTrek(booking.trekId);
    const text = `${customer?.name || ""} ${trek?.name || ""}`.toLowerCase();
    return text.includes(listSearch.toLowerCase()) && (statusFilter === "all" || booking.status === statusFilter);
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $("#view-bookings").innerHTML = `${pageHeading("Bookings", "Reservations, guest counts, and payment status in one place.", "Add a booking")}
    ${toolbar(["Confirmed", "Pending", "Cancelled"])}
    <article class="panel list-panel"><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Trek</th><th>Guests</th><th>Booking total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${rows.length ? rows.map((booking) => {
        const customer = getCustomer(booking.customerId);
        const trek = getTrek(booking.trekId);
        const balance = Math.max(0, getBookingTotal(booking) - (Number(booking.paid) || 0));
        return `<tr><td><div class="cell-primary">${displayedValue(customer?.name || "Customer removed")}</div><div class="cell-secondary">${displayedValue(customer?.email || "")}</div></td><td><div class="cell-primary">${displayedValue(trek?.name || "Trek removed")}</div><div class="cell-secondary">${formatDate(trek?.startDate)}</div></td><td>${booking.people}</td><td>${money(getBookingTotal(booking))}</td><td>${money(booking.paid)}</td><td>${money(balance)}</td><td>${statusPill(booking.status)}</td><td>${rowActions("bookings", booking.id)}</td></tr>`;
      }).join("") : emptyRow(8, "No bookings found", "Try another search or add your first booking.")}</tbody></table></div><div class="table-footer">Showing ${rows.length} of ${data.bookings.length} bookings</div></article>`;
}

function renderCustomers() {
  const rows = data.customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(listSearch.toLowerCase()));
  $("#view-customers").innerHTML = `${pageHeading("Customers", "Get to know your guests and keep their details close.", "Add a customer")}
    ${toolbar()}<article class="panel list-panel"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Emergency contact</th><th>Bookings</th><th>Actions</th></tr></thead><tbody>
      ${rows.length ? rows.map((customer) => {
        const count = data.bookings.filter((booking) => booking.customerId === customer.id).length;
        return `<tr><td><div class="cell-primary">${displayedValue(customer.name)}</div><div class="cell-secondary">Guest profile</div></td><td>${displayedValue(customer.email)}</td><td>${displayedValue(customer.phone)}</td><td>${displayedValue(customer.emergencyContact)}</td><td>${count}</td><td>${rowActions("customers", customer.id)}</td></tr>`;
      }).join("") : emptyRow(6, "No customers found", "Add a guest or try another search.")}</tbody></table></div><div class="table-footer">Showing ${rows.length} of ${data.customers.length} customers</div></article>`;
}

function renderGuides() {
  const rows = data.guides.filter((guide) => {
    const text = `${guide.name} ${guide.email} ${guide.specialty}`.toLowerCase();
    return text.includes(listSearch.toLowerCase()) && (statusFilter === "all" || guide.status === statusFilter);
  });
  $("#view-guides").innerHTML = `${pageHeading("Guide team", "The people who make every trail safer and more memorable.", "Add a guide")}
    ${toolbar(["Active", "Inactive"])}<article class="panel list-panel"><div class="table-wrap"><table><thead><tr><th>Guide</th><th>Email</th><th>Phone</th><th>Specialty</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${rows.length ? rows.map((guide) => `<tr><td><div class="cell-primary">${displayedValue(guide.name)}</div><div class="cell-secondary">Trek guide</div></td><td>${displayedValue(guide.email)}</td><td>${displayedValue(guide.phone)}</td><td>${displayedValue(guide.specialty)}</td><td>${statusPill(guide.status)}</td><td>${rowActions("guides", guide.id)}</td></tr>`).join("") : emptyRow(6, "No guides found", "Add a guide or try another search.")}</tbody></table></div><div class="table-footer">Showing ${rows.length} of ${data.guides.length} guides</div></article>`;
}

function renderExpenses() {
  const rows = data.expenses.filter((expense) => {
    const text = `${expense.title} ${expense.category} ${getTrek(expense.trekId)?.name || ""}`.toLowerCase();
    return text.includes(listSearch.toLowerCase());
  }).sort((a, b) => b.date.localeCompare(a.date));
  const total = rows.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  $("#view-expenses").innerHTML = `${pageHeading("Expenses", "Track the costs that go into a great day on the mountain.", "Add an expense")}
    ${toolbar()}<article class="panel list-panel"><div class="panel-heading"><div><h2>Expense ledger</h2><p>${rows.length} records · ${money(total)} total in view</p></div></div><div class="table-wrap"><table><thead><tr><th>Description</th><th>Trek</th><th>Category</th><th>Date</th><th>Amount</th><th>Actions</th></tr></thead><tbody>
      ${rows.length ? rows.map((expense) => `<tr><td><div class="cell-primary">${displayedValue(expense.title)}</div></td><td>${displayedValue(getTrek(expense.trekId)?.name || "General")}</td><td>${displayedValue(expense.category)}</td><td>${formatDate(expense.date)}</td><td class="cell-primary">${money(expense.amount)}</td><td>${rowActions("expenses", expense.id)}</td></tr>`).join("") : emptyRow(6, "No expenses found", "Add an expense when you have a trek cost to track.")}</tbody></table></div><div class="table-footer">Showing ${rows.length} of ${data.expenses.length} expenses</div></article>`;
}

function renderReports() {
  const paidBookings = data.bookings.filter((booking) => booking.status !== "Cancelled");
  const income = paidBookings.reduce((sum, booking) => sum + (Number(booking.paid) || 0), 0);
  const costs = data.expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const profit = income - costs;
  const balance = paidBookings.reduce((sum, booking) => sum + Math.max(0, getBookingTotal(booking) - (Number(booking.paid) || 0)), 0);
  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
  const monthly = monthKeys.map((key) => ({
    key,
    label: monthFormat.format(new Date(`${key}-01T00:00:00`)),
    income: data.bookings.filter((booking) => booking.status !== "Cancelled" && booking.createdAt?.slice(0, 7) === key)
      .reduce((sum, booking) => sum + (Number(booking.paid) || 0), 0),
    expense: data.expenses.filter((expense) => expense.date?.slice(0, 7) === key)
      .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
  }));
  const max = Math.max(1, ...monthly.flatMap((month) => [month.income, month.expense]));
  $("#view-reports").innerHTML = `${pageHeading("Reports", "A simple read on what’s coming in and going out.", "")}
    <div class="reports-grid"><div>
      <article class="panel"><div class="panel-heading"><div><h2>Cash flow</h2><p>Monthly recorded payments and expenses</p></div><div class="legend"><span><i></i>Income</span><span><i class="legend-expense"></i>Expenses</span></div></div>
        <div class="bar-chart">${monthly.map((month) => `<div class="bar-col"><div class="bar-pair" title="${escapeHTML(month.label)} · Income ${money(month.income)} · Expenses ${money(month.expense)}"><span class="bar" style="height:${Math.max(month.income ? 4 : 0, month.income / max * 100)}%"></span><span class="bar expense" style="height:${Math.max(month.expense ? 4 : 0, month.expense / max * 100)}%"></span></div><span class="bar-label">${escapeHTML(month.label)}</span></div>`).join("")}</div></article>
      <article class="panel" style="margin-top:15px"><div class="panel-heading"><div><h2>Export your data</h2><p>Take your records with you at any time.</p></div></div><div style="display:flex;gap:9px;padding:0 18px 18px"><button class="button button-secondary" data-action="export-json">↓ Download backup</button><button class="button button-secondary" data-action="export-bookings">↓ Bookings CSV</button></div></article>
    </div><div><article class="panel"><div class="panel-heading"><div><h2>All-time summary</h2><p>Based on records in this workspace</p></div></div><div class="report-metrics">
      <div class="report-number"><label>Payments received</label><strong>${money(income)}</strong><span>From active bookings</span></div>
      <div class="report-number"><label>Expenses</label><strong>${money(costs)}</strong><span>${data.expenses.length} cost records</span></div>
      <div class="report-number"><label>Net recorded</label><strong>${money(profit)}</strong><span>Payments less expenses</span></div>
      <div class="report-number"><label>Balance due</label><strong>${money(balance)}</strong><span>Outstanding on active bookings</span></div>
    </div></article><article class="panel" style="margin-top:15px"><div class="panel-heading"><div><h2>Data & privacy</h2><p>Your records stay in this browser.</p></div></div><div style="padding:0 18px 17px"><p style="margin:0 0 13px;color:#859087;font-size:10px;line-height:1.6">Trailbase does not send your data to a server. Download a JSON backup regularly if you use this workspace for important records.</p><button class="button button-secondary" data-action="import-json">↑ Restore a backup</button></div></article></div></div>`;
}

const renderers = {
  dashboard: renderDashboard, treks: renderTreks, bookings: renderBookings,
  customers: renderCustomers, guides: renderGuides, expenses: renderExpenses, reports: renderReports,
};
const viewTitles = { dashboard: "Overview", treks: "Treks", bookings: "Bookings", customers: "Customers", guides: "Guides", expenses: "Expenses", reports: "Reports" };

function render() {
  renderers[activeView]();
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${activeView}`));
  $$(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === activeView));
  $("#breadcrumb-current").textContent = viewTitles[activeView];
  $("#trek-count").textContent = String(data.treks.length);
  if (flashMessage) {
    notify(flashMessage);
    flashMessage = "";
  }
}

function navigate(view) {
  if (!renderers[view]) return;
  activeView = view;
  listSearch = "";
  statusFilter = "all";
  $("#sidebar").classList.remove("open");
  render();
}

function rowActions(type, id) {
  return `<button class="table-action" data-action="edit" data-type="${type}" data-id="${escapeHTML(id)}" aria-label="Edit record" title="Edit">✎</button><button class="table-action delete" data-action="delete" data-type="${type}" data-id="${escapeHTML(id)}" aria-label="Delete record" title="Delete">×</button>`;
}

const optionList = (items, selected, label, value = "id") => `<option value="">${escapeHTML(label)}</option>${items.map((item) => `<option value="${escapeHTML(item[value])}"${item[value] === selected ? " selected" : ""}>${escapeHTML(item.name)}</option>`).join("")}`;
const field = (label, name, value, options = {}) => {
  const full = options.full ? " full" : "";
  const required = options.required === false ? "" : " required";
  let control;
  if (options.choices) {
    control = `<select id="field-${name}" name="${name}"${required}>${options.choices.map((choice) => `<option value="${escapeHTML(choice)}"${String(value ?? "") === choice ? " selected" : ""}>${escapeHTML(choice)}</option>`).join("")}</select>`;
  } else if (options.select) {
    control = `<select id="field-${name}" name="${name}"${required}>${optionList(options.select.items, value, options.select.placeholder, options.select.value || "id")}</select>`;
  } else if (options.textarea) {
    control = `<textarea id="field-${name}" name="${name}" rows="3"${required}>${escapeHTML(value ?? "")}</textarea>`;
  } else {
    const type = options.type || "text";
    const attrs = `${options.min !== undefined ? ` min="${options.min}"` : ""}${options.step ? ` step="${options.step}"` : ""}${options.maxlength ? ` maxlength="${options.maxlength}"` : ""}`;
    control = `<input id="field-${name}" name="${name}" type="${type}" value="${escapeHTML(value ?? "")}"${required}${attrs}>`;
  }
  return `<div class="field${full}"><label for="field-${name}">${escapeHTML(label)}${options.suffix ? ` (${escapeHTML(options.suffix)})` : ""}</label>${control}</div>`;
};

const fieldsByType = {
  treks: {
    title: "trek",
    fields: (record = {}) => field("Trek name", "name", record.name, { full: true })
      + field("Location", "location", record.location)
      + field("Difficulty", "difficulty", record.difficulty || "Moderate", { choices: ["Easy", "Moderate", "Challenging", "Expert"] })
      + field("Start date", "startDate", record.startDate, { type: "date" })
      + field("End date", "endDate", record.endDate, { type: "date" })
      + field("Group capacity", "capacity", record.capacity, { type: "number", min: 1 })
      + field("Price per person", "price", record.price, { type: "number", min: 0, step: "0.01", suffix: "INR" })
      + field("Status", "status", record.status || "Open", { choices: ["Open", "Planned", "Completed", "Cancelled"] }),
  },
  customers: {
    title: "customer",
    fields: (record = {}) => field("Full name", "name", record.name)
      + field("Email address", "email", record.email, { type: "email" })
      + field("Phone", "phone", record.phone, { type: "tel" })
      + field("Emergency contact", "emergencyContact", record.emergencyContact, { type: "tel", required: false }),
  },
  guides: {
    title: "guide",
    fields: (record = {}) => field("Full name", "name", record.name)
      + field("Email address", "email", record.email, { type: "email" })
      + field("Phone", "phone", record.phone, { type: "tel" })
      + field("Specialty", "specialty", record.specialty, { full: true })
      + field("Status", "status", record.status || "Active", { choices: ["Active", "Inactive"] }),
  },
  bookings: {
    title: "booking",
    fields: (record = {}) => field("Customer", "customerId", record.customerId, { full: true, select: { items: data.customers, placeholder: "Choose a customer" } })
      + field("Trek", "trekId", record.trekId, { full: true, select: { items: data.treks, placeholder: "Choose a trek" } })
      + field("Number of guests", "people", record.people || 1, { type: "number", min: 1 })
      + field("Amount paid", "paid", record.paid ?? 0, { type: "number", min: 0, step: "0.01", suffix: "INR" })
      + field("Status", "status", record.status || "Confirmed", { choices: ["Confirmed", "Pending", "Cancelled"] })
      + field("Booking date", "createdAt", record.createdAt || dateOffset(0), { type: "date" }),
  },
  expenses: {
    title: "expense",
    fields: (record = {}) => field("Description", "title", record.title, { full: true })
      + field("Category", "category", record.category || "Transport", { choices: ["Transport", "Accommodation", "Supplies", "Permits", "Staff", "Food", "Other"] })
      + field("Amount", "amount", record.amount, { type: "number", min: 0, step: "0.01", suffix: "INR" })
      + field("Trek", "trekId", record.trekId || "", { required: false, select: { items: [{ id: "", name: "General / not assigned" }, ...data.treks], placeholder: "Choose a trek (optional)" } })
      + field("Expense date", "date", record.date || dateOffset(0), { type: "date" }),
  },
};

function openForm(type, id = null) {
  if (!fieldsByType[type]) return;
  if (type === "bookings" && (!data.customers.length || !data.treks.length)) {
    notify("Add at least one customer and one trek before creating a booking.", true);
    return;
  }
  const record = id ? data[type].find((item) => item.id === id) : null;
  if (id && !record) {
    notify("That record could not be found.", true);
    return;
  }
  editing = { type, id };
  const config = fieldsByType[type];
  $("#modal-eyebrow").textContent = id ? "EDIT RECORD" : "NEW RECORD";
  $("#modal-title").textContent = `${id ? "Edit" : "Add"} ${config.title}`;
  $("#form-fields").innerHTML = config.fields(record || {});
  const submit = $("#record-form button[type=submit]");
  submit.innerHTML = `Save ${config.title} <span>→</span>`;
  $("#record-modal").showModal();
  $("#form-fields input, #form-fields select")?.focus();
}

function deleteRecord(type, id) {
  const record = data[type]?.find((item) => item.id === id);
  if (!record) return;
  const label = record.name || record.title || fieldsByType[type]?.title || "record";
  if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return;
  const previous = JSON.stringify(data);
  if (type === "treks") {
    data.bookings = data.bookings.filter((booking) => booking.trekId !== id);
    data.expenses = data.expenses.map((expense) => expense.trekId === id ? { ...expense, trekId: "" } : expense);
  }
  if (type === "customers") data.bookings = data.bookings.filter((booking) => booking.customerId !== id);
  data[type] = data[type].filter((item) => item.id !== id);
  if (persist()) {
    flashMessage = `${titleCase(type).replace(/s$/, "")} deleted.`;
    render();
  } else {
    data = JSON.parse(previous);
  }
}

function normalizeForm(type, values) {
  const numberFields = {
    treks: ["capacity", "price"],
    bookings: ["people", "paid"],
    expenses: ["amount"],
  }[type] || [];
  for (const key of numberFields) values[key] = Number(values[key]);
  if (type === "treks" && values.endDate < values.startDate) {
    throw new Error("The end date must be on or after the start date.");
  }
  if (type === "treks" && editing.id && getSeats(editing.id) > values.capacity) {
    throw new Error(`Capacity cannot be lower than the ${getSeats(editing.id)} guests already booked.`);
  }
  if (type === "bookings") {
    const trek = getTrek(values.trekId);
    if (!trek || !getCustomer(values.customerId)) throw new Error("Choose a valid trek and customer.");
    if (!editing.id) values.unitPrice = Number(trek.price);
    if (values.status !== "Cancelled") {
      const alreadyBooked = data.bookings.filter((booking) => booking.trekId === values.trekId && booking.status !== "Cancelled" && booking.id !== editing.id)
        .reduce((sum, booking) => sum + booking.people, 0);
      if (alreadyBooked + values.people > trek.capacity) throw new Error(`This booking exceeds the trek capacity of ${trek.capacity} guests.`);
      if (values.paid > values.people * (Number(values.unitPrice ?? trek.price) || 0)) throw new Error("The amount paid cannot exceed the booking total.");
    }
  }
  return values;
}

$("#record-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!editing) return;
  const formValues = Object.fromEntries(new FormData(event.currentTarget).entries());
  const previous = JSON.stringify(data);
  const wasEditing = Boolean(editing.id);
  try {
    const values = normalizeForm(editing.type, formValues);
    const collection = data[editing.type];
    if (editing.id) {
      const index = collection.findIndex((item) => item.id === editing.id);
      if (index < 0) throw new Error("This record no longer exists. Close the form and try again.");
      collection[index] = { ...collection[index], ...values };
    } else {
      collection.push({ id: makeId(), ...values });
    }
    if (persist()) {
      const noun = fieldsByType[editing.type].title;
      $("#record-modal").close();
      editing = null;
      flashMessage = `${titleCase(noun)} ${wasEditing ? "updated" : "saved"}.`;
      render();
    } else {
      data = JSON.parse(previous);
    }
  } catch (error) {
    notify(error.message || "The record could not be saved.", true);
  }
});

$$(".close-modal").forEach((button) => button.addEventListener("click", () => $("#record-modal").close()));
$("#record-modal").addEventListener("close", () => { editing = null; });

function downloadFile(filename, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBackup() {
  downloadFile(`trailbase-backup-${dateOffset(0)}.json`, JSON.stringify(data, null, 2), "application/json");
  notify("Your Trailbase backup is ready to download.");
}

function exportBookings() {
  const headers = ["Booking date", "Customer", "Email", "Trek", "Departure", "Guests", "Total INR", "Paid INR", "Balance INR", "Status"];
  const rows = data.bookings.map((booking) => {
    const customer = getCustomer(booking.customerId);
    const trek = getTrek(booking.trekId);
    return [booking.createdAt, customer?.name, customer?.email, trek?.name, trek?.startDate, booking.people, getBookingTotal(booking), booking.paid, Math.max(0, getBookingTotal(booking) - booking.paid), booking.status];
  });
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  downloadFile(`trailbase-bookings-${dateOffset(0)}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  notify("Bookings CSV exported.");
}

$("#import-file").addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!validData(imported)) throw new Error("This file is not a valid Trailbase backup.");
    const expected = ["treks", "customers", "guides", "bookings", "expenses"];
    if (!expected.every((key) => imported[key].every((item) => item && typeof item.id === "string"))) {
      throw new Error("Backup records must have IDs. Your workspace was not changed.");
    }
    if (!window.confirm("Restore this backup? It will replace the data in this browser.")) return;
    const previous = JSON.stringify(data);
    data = imported;
    if (persist()) {
      listSearch = "";
      statusFilter = "all";
      flashMessage = "Backup restored.";
      render();
    } else {
      data = JSON.parse(previous);
    }
  } catch (error) {
    console.error("Could not restore Trailbase backup:", error);
    notify(error.message || "Could not read this backup file.", true);
  } finally {
    event.target.value = "";
  }
});

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view], [data-view-link], [data-navigate]");
  if (nav) {
    event.preventDefault();
    navigate(nav.dataset.view || nav.dataset.viewLink || nav.dataset.navigate);
    return;
  }
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const { action: name, type, id } = action.dataset;
  if (name === "add") openForm(type);
  else if (name === "edit") openForm(type, id);
  else if (name === "delete") deleteRecord(type, id);
  else if (name === "export-json") exportBackup();
  else if (name === "export-bookings") exportBookings();
  else if (name === "import-json") $("#import-file").click();
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "list-search") return;
  const position = event.target.selectionStart;
  listSearch = event.target.value;
  renderers[activeView]();
  const next = $("#list-search");
  next.focus();
  next.setSelectionRange(position, position);
});
document.addEventListener("change", (event) => {
  if (event.target.id !== "status-filter") return;
  statusFilter = event.target.value;
  renderers[activeView]();
});

$("#backup-button").addEventListener("click", exportBackup);
$("#menu-button").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") $("#sidebar").classList.remove("open");
});

render();
