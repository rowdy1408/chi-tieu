// =========================
// FIREBASE IMPORTS
// =========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// =========================
// FIREBASE CONFIG
// =========================

const firebaseConfig = {
  apiKey: "AIzaSyDbHjWFLWVNyC20u0qEO_r2gtneBmZyQsW",
  authDomain: "quanlylophoc-5b945.firebaseapp.com",
  databaseURL: "https://quanlylophoc-5b945-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "quanlylophoc-5b945",
  storageBucket: "quanlylophoc-5b945.firebasestorage.app",
  messagingSenderId: "38123679904",
  appId: "1:38123679904:web:2350b1078fc0542543d9c5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// =========================
// PASSWORDS
// =========================

const PASSWORDS = {
  gau: "25121998",
  ca: "16092004",
  summary: "Gauvaca"
};

// =========================
// APP STATE
// =========================

let loggedInUser = null;
let currentUser = null;

let currentDate = new Date();
let selectedDate = formatDate(new Date());

let summaryYear = new Date().getFullYear();
let selectedSummaryMonth = null;

let data = {
  ca: [],
  gau: [],
  shared: []
};

let charts = {
  personalIncome: null,
  personalExpense: null,
  sharedExpense: null,
  summaryIncome: null,
  summaryExpense: null,
  summaryYearlyFlow: null
};

let editingContext = null;

// =========================
// FIRESTORE COLLECTIONS
// =========================

const caCollection = collection(db, "expense_caTransactions");
const gauCollection = collection(db, "expense_gauTransactions");
const sharedCollection = collection(db, "expense_sharedTransactions");

// =========================
// MAKE FUNCTIONS GLOBAL
// =========================

window.login = login;
window.logout = logout;

window.showSharedPage = showSharedPage;
window.showSummaryPage = showSummaryPage;
window.goBackToPersonalPage = goBackToPersonalPage;
window.changeMonth = changeMonth;

window.addIncome = addIncome;
window.addExpense = addExpense;
window.addSharedExpense = addSharedExpense;

window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
window.editSharedExpense = editSharedExpense;
window.deleteSharedExpense = deleteSharedExpense;

window.searchPersonalTransactions = searchPersonalTransactions;
window.clearPersonalSearch = clearPersonalSearch;
window.searchSharedTransactions = searchSharedTransactions;
window.clearSharedSearch = clearSharedSearch;
window.searchSummaryTransactions = searchSummaryTransactions;
window.clearSummarySearch = clearSummarySearch;

window.closeEditModal = closeEditModal;
window.saveEditModal = saveEditModal;

window.changeSummaryYear = changeSummaryYear;
window.applySummaryFilters = applySummaryFilters;
window.clearSummaryFilters = clearSummaryFilters;

// =========================
// BASIC HELPERS
// =========================

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString("vi-VN") + "đ";
}

function formatInputMoney(value) {
  const numbersOnly = String(value || "").replace(/\D/g, "");

  if (!numbersOnly) return "";

  return numbersOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseInputMoney(value) {
  if (!value) return 0;

  return Number(String(value).replace(/\./g, ""));
}

function setupMoneyInputs() {
  const moneyInputIds = [
    "income-amount",
    "expense-amount",
    "shared-amount",
    "personal-search-amount",
    "shared-search-amount",
    "summary-search-amount"
  ];

  moneyInputIds.forEach(id => {
    const input = document.getElementById(id);

    if (!input) return;

    input.addEventListener("input", function () {
      input.value = formatInputMoney(input.value);
    });
  });
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getVietnameseDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function getCollectionByPerson(person) {
  if (person === "ca") return caCollection;
  if (person === "gau") return gauCollection;

  return null;
}

function getCollectionNameByPerson(person) {
  if (person === "ca") return "expense_caTransactions";
  if (person === "gau") return "expense_gauTransactions";

  return null;
}

function getPersonName(person) {
  return person === "ca" ? "Cá" : "Gấu";
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHTML(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =========================
// REALTIME SYNC
// =========================

function startRealtimeSync() {
  const caQuery = query(caCollection, orderBy("date", "desc"));
  const gauQuery = query(gauCollection, orderBy("date", "desc"));
  const sharedQuery = query(sharedCollection, orderBy("date", "desc"));

  onSnapshot(caQuery, snapshot => {
    data.ca = snapshot.docs.map(docItem => ({
      firestoreId: docItem.id,
      ...docItem.data()
    }));

    refreshCurrentView();
  });

  onSnapshot(gauQuery, snapshot => {
    data.gau = snapshot.docs.map(docItem => ({
      firestoreId: docItem.id,
      ...docItem.data()
    }));

    refreshCurrentView();
  });

  onSnapshot(sharedQuery, snapshot => {
    data.shared = snapshot.docs.map(docItem => ({
      firestoreId: docItem.id,
      ...docItem.data()
    }));

    refreshCurrentView();
  });
}

function refreshCurrentView() {
  if (!loggedInUser) return;

  if (currentUser === "ca" || currentUser === "gau") {
    renderCalendar();
    renderDailyTable();
    renderMonthSummary();
    renderPersonalStats();
  }

  const sharedPage = document.getElementById("shared-page");
  if (sharedPage && !sharedPage.classList.contains("hidden")) {
    renderSharedTable();
    renderSharedStats();
  }

  const summaryPage = document.getElementById("summary-page");
  if (summaryPage && !summaryPage.classList.contains("hidden")) {
    renderSummaryPage();
    renderSummaryStats();
    renderSummaryYearlyFlowChart();

    if (selectedSummaryMonth !== null) {
      renderSummaryMonthDetail(selectedSummaryMonth);
    }
  }
}

// =========================
// LOGIN
// =========================

function login() {
  const password = document.getElementById("password-input").value.trim();
  const error = document.getElementById("login-error");

  if (password === PASSWORDS.gau) {
    loggedInUser = "gau";
    currentUser = "gau";
    showApp();
    showPersonalPage("gau");
  } else if (password === PASSWORDS.ca) {
    loggedInUser = "ca";
    currentUser = "ca";
    showApp();
    showPersonalPage("ca");
  } else if (password === PASSWORDS.summary) {
    loggedInUser = "summary";
    currentUser = "summary";
    showApp();
    showSummaryPage();
  } else {
    error.textContent = "Sai password rồi ạ. Papa/Mama thử lại nha.";
  }
}

function logout() {
  loggedInUser = null;
  currentUser = null;

  document.getElementById("password-input").value = "";
  document.getElementById("login-error").textContent = "";

  document.getElementById("login-page").classList.remove("hidden");
  document.getElementById("app-page").classList.add("hidden");
}

function showApp() {
  document.getElementById("login-page").classList.add("hidden");
  document.getElementById("app-page").classList.remove("hidden");
}

// =========================
// PAGE ROUTING
// =========================

function hideAllMainPages() {
  document.getElementById("personal-page").classList.add("hidden");
  document.getElementById("shared-page").classList.add("hidden");
  document.getElementById("summary-page").classList.add("hidden");
}

function updateNavButtons() {
  const personalBtn = document.getElementById("personal-nav-btn");

  if (!personalBtn) return;

  if (loggedInUser === "ca") {
    personalBtn.textContent = "Trang của Cá";
    personalBtn.classList.remove("hidden");
  } else if (loggedInUser === "gau") {
    personalBtn.textContent = "Trang của Gấu";
    personalBtn.classList.remove("hidden");
  } else {
    personalBtn.classList.add("hidden");
  }
}

function goBackToPersonalPage() {
  if (loggedInUser === "ca") {
    showPersonalPage("ca");
  } else if (loggedInUser === "gau") {
    showPersonalPage("gau");
  } else {
    showSummaryPage();
  }
}

function showPersonalPage(person) {
  currentUser = person;

  hideAllMainPages();
  updateNavButtons();

  document.getElementById("personal-page").classList.remove("hidden");

  const personName = getPersonName(person);

  document.getElementById("page-title").textContent = `Trang chi tiêu của ${personName}`;
  document.getElementById("page-subtitle").textContent = `Nhập tiền vào, tiền ra và xem số dư của ${personName}`;

  renderCalendar();
  renderDailyTable();
  renderMonthSummary();
  renderPersonalStats();
}

function showSharedPage() {
  hideAllMainPages();
  updateNavButtons();

  document.getElementById("shared-page").classList.remove("hidden");

  document.getElementById("page-title").textContent = "Chi tiêu chung";
  document.getElementById("page-subtitle").textContent = "Chi tiêu chung sẽ được chia đôi cho Cá và Gấu";

  document.getElementById("shared-date").value = selectedDate;

  renderSharedTable();
  renderSharedStats();
}

function showSummaryPage() {
  hideAllMainPages();
  updateNavButtons();

  document.getElementById("summary-page").classList.remove("hidden");

  document.getElementById("page-title").textContent = "Tổng chi tiêu của Gấu Cá";
  document.getElementById("page-subtitle").textContent = "Xem tổng tiền vào, tiền ra và số dư của cả hai";

  renderSummaryPage();
  renderSummaryStats();
  renderSummaryYearlyFlowChart();
}

// =========================
// CALENDAR
// =========================

function changeMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);

  renderCalendar();
  renderMonthSummary();

  if (currentUser === "ca" || currentUser === "gau") {
    renderPersonalStats();
  }

  const sharedPage = document.getElementById("shared-page");
  if (sharedPage && !sharedPage.classList.contains("hidden")) {
    renderSharedStats();
  }

  const summaryPage = document.getElementById("summary-page");
  if (summaryPage && !summaryPage.classList.contains("hidden")) {
    renderSummaryStats();
  }
}

function renderCalendar() {
  const calendarGrid = document.getElementById("calendar-grid");
  const monthLabel = document.getElementById("current-month-label");

  if (!calendarGrid || !monthLabel) return;

  calendarGrid.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthLabel.textContent = `Tháng ${month + 1}/${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDay = firstDay.getDay();

  if (startDay === 0) {
    startDay = 7;
  }

  for (let i = 1; i < startDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day empty";
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateString = formatDate(date);

    const dayCell = document.createElement("div");
    dayCell.className = "calendar-day";

    if (dateString === selectedDate) {
      dayCell.classList.add("selected");
    }

    const dailySummary = getDailySummary(currentUser, dateString);

    dayCell.innerHTML = `
      <div class="day-number">${day}</div>
      <div class="day-summary">
        <div class="day-income">+ ${formatMoney(dailySummary.income)}</div>
        <div class="day-expense">- ${formatMoney(dailySummary.expense)}</div>
      </div>
    `;

    dayCell.onclick = function () {
      selectedDate = dateString;

      renderCalendar();
      renderDailyTable();
      renderMonthSummary();
      renderPersonalStats();
    };

    calendarGrid.appendChild(dayCell);
  }
}

function getDailySummary(person, dateString) {
  if (!person || person === "summary") {
    return {
      income: 0,
      expense: 0
    };
  }

  const dailyItems = data[person].filter(item => item.date === dateString);

  const income = dailyItems
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expense = dailyItems
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    income,
    expense
  };
}

// =========================
// ADD PERSONAL INCOME / EXPENSE
// =========================

async function addIncome() {
  if (currentUser !== "ca" && currentUser !== "gau") return;

  const amount = parseInputMoney(document.getElementById("income-amount").value);
  const note = document.getElementById("income-note").value.trim();

  if (!amount || !note) {
    alert("Vui lòng nhập đủ số tiền và nội dung tiền vào.");
    return;
  }

  const personCollection = getCollectionByPerson(currentUser);

  await addDoc(personCollection, {
    type: "income",
    amount,
    note,
    date: selectedDate,
    shared: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  document.getElementById("income-amount").value = "";
  document.getElementById("income-note").value = "";
}

async function addExpense() {
  if (currentUser !== "ca" && currentUser !== "gau") return;

  const amount = parseInputMoney(document.getElementById("expense-amount").value);
  const note = document.getElementById("expense-note").value.trim();

  if (!amount || !note) {
    alert("Vui lòng nhập đủ số tiền và mục chi tiêu.");
    return;
  }

  const personCollection = getCollectionByPerson(currentUser);

  await addDoc(personCollection, {
    type: "expense",
    amount,
    note,
    date: selectedDate,
    shared: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  document.getElementById("expense-amount").value = "";
  document.getElementById("expense-note").value = "";
}

// =========================
// DAILY TABLE
// =========================

function renderDailyTable() {
  if (!currentUser || currentUser === "summary") return;

  const title = document.getElementById("selected-date-title");
  const tableBody = document.getElementById("daily-table-body");
  const balanceCell = document.getElementById("daily-balance");

  if (!title || !tableBody || !balanceCell) return;

  title.textContent = `Chi tiêu ngày ${getVietnameseDate(selectedDate)}`;

  tableBody.innerHTML = "";

  const dailyItems = data[currentUser].filter(item => item.date === selectedDate);

  const incomes = dailyItems.filter(item => item.type === "income");
  const expenses = dailyItems.filter(item => item.type === "expense");

  const maxLength = Math.max(incomes.length, expenses.length);

  for (let i = 0; i < maxLength; i++) {
    const row = document.createElement("tr");

    const incomeCell = document.createElement("td");
    const expenseCell = document.createElement("td");

    if (incomes[i]) {
      incomeCell.innerHTML = createTransactionHTML(incomes[i], currentUser);
    }

    if (expenses[i]) {
      expenseCell.innerHTML = createTransactionHTML(expenses[i], currentUser);
    }

    row.appendChild(incomeCell);
    row.appendChild(expenseCell);

    tableBody.appendChild(row);
  }

  if (dailyItems.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="2">Chưa có giao dịch nào trong ngày này.</td>
      </tr>
    `;
  }

  const incomeTotal = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const balance = incomeTotal - expenseTotal;

  balanceCell.textContent = `Số dư còn lại trong ngày: ${formatMoney(balance)}`;
}

function createTransactionHTML(item, person) {
  return `
    <div class="transaction-item">
      <strong>${escapeHTML(item.note)}</strong>
      <span>${formatMoney(item.amount)}</span>
      <div class="transaction-actions">
        <button class="edit-btn" onclick="editTransaction('${person}', '${item.firestoreId}')">Sửa</button>
        <button class="delete-btn" onclick="deleteTransaction('${person}', '${item.firestoreId}')">Xóa</button>
      </div>
    </div>
  `;
}

// =========================
// EDIT
// =========================

function editTransaction(person, firestoreId) {
  const item = data[person].find(transaction => transaction.firestoreId === firestoreId);

  if (!item) return;

  if (item.shared) {
    alert("Giao dịch chi tiêu chung nên sửa ở trang Chi tiêu chung để không lệch dữ liệu của Cá và Gấu.");
    return;
  }

  openEditModal({
    mode: "personal",
    person,
    firestoreId,
    item
  });
}

function editSharedExpense(sharedFirestoreId) {
  const item = data.shared.find(transaction => transaction.firestoreId === sharedFirestoreId);

  if (!item) return;

  openEditModal({
    mode: "shared",
    sharedFirestoreId,
    item
  });
}

function openEditModal(context) {
  editingContext = context;

  const oldModal = document.getElementById("edit-modal-backdrop");

  if (oldModal) {
    oldModal.remove();
  }

  const modal = document.createElement("div");
  modal.id = "edit-modal-backdrop";
  modal.className = "modal-backdrop";

  const item = context.item;

  modal.innerHTML = `
    <div class="modal-card">
      <h2>Sửa giao dịch</h2>

      <label>Ngày</label>
      <input type="date" id="edit-date" value="${item.date}" />

      <label>Số tiền</label>
      <input type="text" id="edit-amount" value="${formatInputMoney(String(item.amount))}" inputmode="numeric" />

      <label>Nội dung</label>
      <input type="text" id="edit-note" value="${escapeHTML(item.note)}" />

      <div class="modal-actions">
        <button onclick="saveEditModal()">Lưu thay đổi</button>
        <button class="cancel-btn" onclick="closeEditModal()">Hủy</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const editAmountInput = document.getElementById("edit-amount");

  editAmountInput.addEventListener("input", function () {
    editAmountInput.value = formatInputMoney(editAmountInput.value);
  });
}

function closeEditModal() {
  editingContext = null;

  const modal = document.getElementById("edit-modal-backdrop");

  if (modal) {
    modal.remove();
  }
}

async function saveEditModal() {
  if (!editingContext) return;

  const newDate = document.getElementById("edit-date").value;
  const newAmount = parseInputMoney(document.getElementById("edit-amount").value);
  const newNote = document.getElementById("edit-note").value.trim();

  if (!newDate || !newAmount || !newNote) {
    alert("Vui lòng nhập đầy đủ ngày, số tiền và nội dung.");
    return;
  }

  if (editingContext.mode === "personal") {
    const collectionName = getCollectionNameByPerson(editingContext.person);
    const personDoc = doc(db, collectionName, editingContext.firestoreId);

    await updateDoc(personDoc, {
      date: newDate,
      amount: newAmount,
      note: newNote,
      updatedAt: serverTimestamp()
    });
  }

  if (editingContext.mode === "shared") {
    const sharedDoc = doc(db, "expense_sharedTransactions", editingContext.sharedFirestoreId);
    const halfAmount = newAmount / 2;

    await updateDoc(sharedDoc, {
      date: newDate,
      amount: newAmount,
      note: newNote,
      updatedAt: serverTimestamp()
    });

    const caSharedItems = data.ca.filter(item => item.sharedFirestoreId === editingContext.sharedFirestoreId);
    const gauSharedItems = data.gau.filter(item => item.sharedFirestoreId === editingContext.sharedFirestoreId);

    for (const item of caSharedItems) {
      await updateDoc(doc(db, "expense_caTransactions", item.firestoreId), {
        date: newDate,
        amount: halfAmount,
        note: `[Chi chung] ${newNote}`,
        updatedAt: serverTimestamp()
      });
    }

    for (const item of gauSharedItems) {
      await updateDoc(doc(db, "expense_gauTransactions", item.firestoreId), {
        date: newDate,
        amount: halfAmount,
        note: `[Chi chung] ${newNote}`,
        updatedAt: serverTimestamp()
      });
    }
  }

  closeEditModal();
}

// =========================
// DELETE
// =========================

async function deleteTransaction(person, firestoreId) {
  const item = data[person].find(transaction => transaction.firestoreId === firestoreId);

  if (!item) return;

  if (item.shared) {
    alert("Giao dịch chi tiêu chung nên xóa ở trang Chi tiêu chung để không lệch dữ liệu của Cá và Gấu.");
    return;
  }

  const confirmDelete = confirm("Bạn có chắc muốn xóa giao dịch này không?");

  if (!confirmDelete) return;

  const collectionName = getCollectionNameByPerson(person);
  const personDoc = doc(db, collectionName, firestoreId);

  await deleteDoc(personDoc);
}

// =========================
// MONTH SUMMARY
// =========================

function renderMonthSummary() {
  if (!currentUser || currentUser === "summary") return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthItems = data[currentUser].filter(item => {
    const itemDate = new Date(item.date);

    return itemDate.getFullYear() === year && itemDate.getMonth() === month;
  });

  const income = monthItems
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expense = monthItems
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  document.getElementById("month-income").textContent = formatMoney(income);
  document.getElementById("month-expense").textContent = formatMoney(expense);
  document.getElementById("month-balance").textContent = formatMoney(income - expense);
}

// =========================
// SHARED EXPENSE
// =========================

async function addSharedExpense() {
  const date = document.getElementById("shared-date").value;
  const amount = parseInputMoney(document.getElementById("shared-amount").value);
  const note = document.getElementById("shared-note").value.trim();

  if (!date || !amount || !note) {
    alert("Vui lòng nhập đầy đủ thông tin chi tiêu chung.");
    return;
  }

  const halfAmount = amount / 2;

  const sharedDocRef = await addDoc(sharedCollection, {
    date,
    amount,
    note,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await addDoc(caCollection, {
    sharedFirestoreId: sharedDocRef.id,
    type: "expense",
    amount: halfAmount,
    note: `[Chi chung] ${note}`,
    date,
    shared: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await addDoc(gauCollection, {
    sharedFirestoreId: sharedDocRef.id,
    type: "expense",
    amount: halfAmount,
    note: `[Chi chung] ${note}`,
    date,
    shared: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  document.getElementById("shared-amount").value = "";
  document.getElementById("shared-note").value = "";
}

function renderSharedTable() {
  const tableBody = document.getElementById("shared-table-body");

  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (data.shared.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">Chưa có chi tiêu chung nào.</td>
      </tr>
    `;

    return;
  }

  const sortedShared = [...data.shared].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedShared.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.date}</td>
      <td>${escapeHTML(item.note)}</td>
      <td>${formatMoney(item.amount)}</td>
      <td>${formatMoney(Number(item.amount || 0) / 2)}</td>
      <td>${formatMoney(Number(item.amount || 0) / 2)}</td>
      <td>
        <button class="edit-btn" onclick="editSharedExpense('${item.firestoreId}')">Sửa</button>
        <button class="delete-btn" onclick="deleteSharedExpense('${item.firestoreId}')">Xóa</button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

async function deleteSharedExpense(sharedFirestoreId) {
  const confirmDelete = confirm("Bạn có chắc muốn xóa chi tiêu chung này không?");

  if (!confirmDelete) return;

  const sharedDoc = doc(db, "expense_sharedTransactions", sharedFirestoreId);

  const caSharedItems = data.ca.filter(item => item.sharedFirestoreId === sharedFirestoreId);
  const gauSharedItems = data.gau.filter(item => item.sharedFirestoreId === sharedFirestoreId);

  await deleteDoc(sharedDoc);

  for (const item of caSharedItems) {
    await deleteDoc(doc(db, "expense_caTransactions", item.firestoreId));
  }

  for (const item of gauSharedItems) {
    await deleteDoc(doc(db, "expense_gauTransactions", item.firestoreId));
  }
}

// =========================
// SEARCH
// =========================

function transactionMatchesSearch(item, filters) {
  const hasDate = Boolean(filters.date);
  const hasAmount = Boolean(filters.amount);
  const hasNote = Boolean(filters.note);

  const dateMatch = !hasDate || item.date === filters.date;
  const amountMatch = !hasAmount || Number(item.amount || 0) === filters.amount;
  const noteMatch = !hasNote || normalizeText(item.note).includes(normalizeText(filters.note));

  return dateMatch && amountMatch && noteMatch;
}

function renderSearchResults(containerId, results, options = {}) {
  const container = document.getElementById(containerId);

  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `<p>Không tìm thấy giao dịch phù hợp.</p>`;
    return;
  }

  container.innerHTML = results.map(item => {
    const typeClass = item.shared ? "shared-result" : item.type === "income" ? "income-result" : "expense-result";
    const typeLabel = item.type === "income" ? "Tiền vào" : "Tiền ra";

    return `
      <div class="search-result-item ${typeClass}">
        ${item.person ? `<strong>Người: ${item.person}</strong><br>` : ""}
        <strong>${typeLabel}</strong><br>
        Ngày: ${item.date}<br>
        Nội dung: ${escapeHTML(item.note)}<br>
        Số tiền: ${formatMoney(item.amount)}
        ${
          options.allowEdit && !item.shared
            ? `<div class="transaction-actions">
                <button class="edit-btn" onclick="editTransaction('${item.personKey}', '${item.firestoreId}')">Sửa</button>
                <button class="delete-btn" onclick="deleteTransaction('${item.personKey}', '${item.firestoreId}')">Xóa</button>
              </div>`
            : ""
        }
      </div>
    `;
  }).join("");
}

function searchPersonalTransactions() {
  if (currentUser !== "ca" && currentUser !== "gau") return;

  const filters = {
    date: document.getElementById("personal-search-date").value,
    amount: parseInputMoney(document.getElementById("personal-search-amount").value),
    note: document.getElementById("personal-search-note").value.trim()
  };

  if (!filters.date && !filters.amount && !filters.note) {
    alert("Nhập ít nhất 1 thông tin để tìm.");
    return;
  }

  const results = data[currentUser]
    .filter(item => transactionMatchesSearch(item, filters))
    .map(item => ({
      ...item,
      person: getPersonName(currentUser),
      personKey: currentUser
    }));

  renderSearchResults("personal-search-results", results, {
    allowEdit: true
  });
}

function clearPersonalSearch() {
  document.getElementById("personal-search-date").value = "";
  document.getElementById("personal-search-amount").value = "";
  document.getElementById("personal-search-note").value = "";
  document.getElementById("personal-search-results").innerHTML = "";
}

function searchSharedTransactions() {
  const filters = {
    date: document.getElementById("shared-search-date").value,
    amount: parseInputMoney(document.getElementById("shared-search-amount").value),
    note: document.getElementById("shared-search-note").value.trim()
  };

  if (!filters.date && !filters.amount && !filters.note) {
    alert("Nhập ít nhất 1 thông tin để tìm.");
    return;
  }

  const results = data.shared
    .filter(item => {
      const dateMatch = !filters.date || item.date === filters.date;
      const amountMatch = !filters.amount || Number(item.amount || 0) === filters.amount;
      const noteMatch = !filters.note || normalizeText(item.note).includes(normalizeText(filters.note));

      return dateMatch && amountMatch && noteMatch;
    })
    .map(item => ({
      ...item,
      type: "expense",
      shared: true,
      person: "Chi tiêu chung"
    }));

  renderSharedSearchResults(results);
}

function renderSharedSearchResults(results) {
  const container = document.getElementById("shared-search-results");

  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `<p>Không tìm thấy chi tiêu chung phù hợp.</p>`;
    return;
  }

  container.innerHTML = results.map(item => `
    <div class="search-result-item shared-result">
      <strong>Chi tiêu chung</strong><br>
      Ngày: ${item.date}<br>
      Nội dung: ${escapeHTML(item.note)}<br>
      Tổng tiền: ${formatMoney(item.amount)}<br>
      Cá chịu: ${formatMoney(Number(item.amount || 0) / 2)}<br>
      Gấu chịu: ${formatMoney(Number(item.amount || 0) / 2)}
      <div class="transaction-actions">
        <button class="edit-btn" onclick="editSharedExpense('${item.firestoreId}')">Sửa</button>
        <button class="delete-btn" onclick="deleteSharedExpense('${item.firestoreId}')">Xóa</button>
      </div>
    </div>
  `).join("");
}

function clearSharedSearch() {
  document.getElementById("shared-search-date").value = "";
  document.getElementById("shared-search-amount").value = "";
  document.getElementById("shared-search-note").value = "";
  document.getElementById("shared-search-results").innerHTML = "";
}

function searchSummaryTransactions() {
  const filters = {
    date: document.getElementById("summary-search-date").value,
    amount: parseInputMoney(document.getElementById("summary-search-amount").value),
    note: document.getElementById("summary-search-note").value.trim()
  };

  if (!filters.date && !filters.amount && !filters.note) {
    alert("Nhập ít nhất 1 thông tin để tìm.");
    return;
  }

  const results = getAllSummaryTransactions().filter(item => transactionMatchesSearch(item, filters));

  renderSearchResults("summary-search-results", results, {
    allowEdit: false
  });
}

function clearSummarySearch() {
  document.getElementById("summary-search-date").value = "";
  document.getElementById("summary-search-amount").value = "";
  document.getElementById("summary-search-note").value = "";
  document.getElementById("summary-search-results").innerHTML = "";
}

// =========================
// STATS + PIE CHARTS
// =========================

function getCurrentMonthItems(items) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  return items.filter(item => {
    const itemDate = new Date(item.date);

    return itemDate.getFullYear() === year && itemDate.getMonth() === month;
  });
}

function groupByNote(items) {
  const grouped = {};

  items.forEach(item => {
    const key = cleanCategoryName(item.note);

    if (!grouped[key]) {
      grouped[key] = 0;
    }

    grouped[key] += Number(item.amount || 0);
  });

  return grouped;
}

function cleanCategoryName(note) {
  return String(note || "Không rõ")
    .replace("[Chi chung]", "")
    .trim()
    .toLowerCase();
}

function getMaxMinFromGrouped(grouped) {
  const entries = Object.entries(grouped);

  if (entries.length === 0) {
    return {
      max: null,
      min: null
    };
  }

  const sorted = entries.sort((a, b) => b[1] - a[1]);

  return {
    max: sorted[0],
    min: sorted[sorted.length - 1]
  };
}

function updateMaxMinText(maxId, minId, grouped, maxPrefix, minPrefix) {
  const maxEl = document.getElementById(maxId);
  const minEl = document.getElementById(minId);

  if (!maxEl || !minEl) return;

  const result = getMaxMinFromGrouped(grouped);

  if (!result.max || !result.min) {
    maxEl.textContent = `${maxPrefix}: Chưa có dữ liệu`;
    minEl.textContent = `${minPrefix}: Chưa có dữ liệu`;
    return;
  }

  maxEl.textContent = `${maxPrefix}: ${result.max[0]} (${formatMoney(result.max[1])})`;
  minEl.textContent = `${minPrefix}: ${result.min[0]} (${formatMoney(result.min[1])})`;
}

function renderPieChart(chartKey, canvasId, grouped, label) {
  const canvas = document.getElementById(canvasId);

  if (!canvas) return;

  const labels = Object.keys(grouped);
  const values = Object.values(grouped);

  if (charts[chartKey]) {
    charts[chartKey].destroy();
    charts[chartKey] = null;
  }

  if (labels.length === 0) {
    return;
  }

  charts[chartKey] = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.raw;
              return `${context.label}: ${formatMoney(value)}`;
            }
          }
        }
      }
    }
  });
}

function renderPersonalStats() {
  if (currentUser !== "ca" && currentUser !== "gau") return;

  const monthItems = getCurrentMonthItems(data[currentUser]);

  const incomes = monthItems.filter(item => item.type === "income");
  const expenses = monthItems.filter(item => item.type === "expense");

  const incomeGrouped = groupByNote(incomes);
  const expenseGrouped = groupByNote(expenses);

  updateMaxMinText(
    "personal-income-max",
    "personal-income-min",
    incomeGrouped,
    "Nguồn thu nhiều nhất",
    "Nguồn thu ít nhất"
  );

  updateMaxMinText(
    "personal-expense-max",
    "personal-expense-min",
    expenseGrouped,
    "Chi nhiều nhất cho",
    "Chi ít nhất cho"
  );

  renderPieChart("personalIncome", "personal-income-chart", incomeGrouped, "Nguồn thu");
  renderPieChart("personalExpense", "personal-expense-chart", expenseGrouped, "Khoản chi");
}

function renderSharedStats() {
  const monthItems = getCurrentMonthItems(data.shared);
  const expenseGrouped = groupByNote(monthItems);

  updateMaxMinText(
    "shared-expense-max",
    "shared-expense-min",
    expenseGrouped,
    "Chi chung nhiều nhất cho",
    "Chi chung ít nhất cho"
  );

  renderPieChart("sharedExpense", "shared-expense-chart", expenseGrouped, "Chi tiêu chung");
}

function renderSummaryStats() {
  const monthItems = getCurrentMonthItems([...data.ca, ...data.gau]);

  const incomes = monthItems.filter(item => item.type === "income");
  const expenses = monthItems.filter(item => item.type === "expense");

  const incomeGrouped = groupByNote(incomes);
  const expenseGrouped = groupByNote(expenses);

  updateMaxMinText(
    "summary-income-max",
    "summary-income-min",
    incomeGrouped,
    "Nguồn thu nhiều nhất",
    "Nguồn thu ít nhất"
  );

  updateMaxMinText(
    "summary-expense-max",
    "summary-expense-min",
    expenseGrouped,
    "Chi nhiều nhất cho",
    "Chi ít nhất cho"
  );

  renderPieChart("summaryIncome", "summary-income-chart", incomeGrouped, "Nguồn thu cả hai");
  renderPieChart("summaryExpense", "summary-expense-chart", expenseGrouped, "Khoản chi cả hai");
}

// =========================
// SUMMARY YEARLY LINE CHART
// =========================

function changeSummaryYear(direction) {
  summaryYear += direction;
  selectedSummaryMonth = null;

  const detailSection = document.getElementById("summary-month-detail-section");
  if (detailSection) {
    detailSection.classList.add("hidden");
  }

  renderSummaryYearlyFlowChart();
}

function renderSummaryYearlyFlowChart() {
  const canvas = document.getElementById("summary-yearly-flow-chart");
  const yearLabel = document.getElementById("summary-year-label");

  if (!canvas) return;

  if (yearLabel) {
    yearLabel.textContent = summaryYear;
  }

  const monthlyIncome = Array(12).fill(0);
  const monthlyExpense = Array(12).fill(0);

  const allTransactions = [...data.ca, ...data.gau];

  allTransactions.forEach(item => {
    if (!item.date) return;

    const itemDate = new Date(item.date);
    const itemYear = itemDate.getFullYear();
    const itemMonth = itemDate.getMonth();

    if (itemYear !== summaryYear) return;

    if (item.type === "income") {
      monthlyIncome[itemMonth] += Number(item.amount || 0);
    }

    if (item.type === "expense") {
      monthlyExpense[itemMonth] += Number(item.amount || 0);
    }
  });

  if (charts.summaryYearlyFlow) {
    charts.summaryYearlyFlow.destroy();
    charts.summaryYearlyFlow = null;
  }

  charts.summaryYearlyFlow = new Chart(canvas, {
    type: "line",
    data: {
      labels: [
        "Tháng 1",
        "Tháng 2",
        "Tháng 3",
        "Tháng 4",
        "Tháng 5",
        "Tháng 6",
        "Tháng 7",
        "Tháng 8",
        "Tháng 9",
        "Tháng 10",
        "Tháng 11",
        "Tháng 12"
      ],
      datasets: [
        {
          label: "Tổng thu",
          data: monthlyIncome,
          tension: 0.3
        },
        {
          label: "Tổng chi",
          data: monthlyExpense,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false
      },
      onClick: function (event) {
        const points = charts.summaryYearlyFlow.getElementsAtEventForMode(
          event,
          "index",
          {
            intersect: false
          },
          true
        );

        if (!points.length) return;

        const monthIndex = points[0].index;

        selectedSummaryMonth = monthIndex;
        renderSummaryMonthDetail(monthIndex);
      },
      plugins: {
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatMoney(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function (value) {
              return Number(value).toLocaleString("vi-VN") + "đ";
            }
          }
        }
      }
    }
  });
}

function renderSummaryMonthDetail(monthIndex) {
  const section = document.getElementById("summary-month-detail-section");
  const title = document.getElementById("summary-month-detail-title");
  const body = document.getElementById("summary-month-detail-body");

  if (!section || !title || !body) return;

  section.classList.remove("hidden");

  title.textContent = `Chi tiết giao dịch tháng ${monthIndex + 1}/${summaryYear}`;

  const monthTransactions = getAllSummaryTransactions()
    .filter(item => {
      if (!item.date) return false;

      const itemDate = new Date(item.date);

      return itemDate.getFullYear() === summaryYear && itemDate.getMonth() === monthIndex;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const income = monthTransactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expense = monthTransactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  document.getElementById("summary-month-income").textContent = formatMoney(income);
  document.getElementById("summary-month-expense").textContent = formatMoney(expense);
  document.getElementById("summary-month-balance").textContent = formatMoney(income - expense);

  body.innerHTML = "";

  if (monthTransactions.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="5">Tháng này chưa có giao dịch nào.</td>
      </tr>
    `;

    return;
  }

  monthTransactions.forEach(item => {
    const row = document.createElement("tr");
    const kindLabel = item.shared ? "Chi chung" : "Chi riêng";

    row.innerHTML = `
      <td>${item.person}</td>
      <td>${item.date}</td>
      <td>${item.type === "income" ? "Tiền vào" : "Tiền ra"} / ${kindLabel}</td>
      <td>${escapeHTML(item.note)}</td>
      <td>${formatMoney(item.amount)}</td>
    `;

    body.appendChild(row);
  });
}

// =========================
// SUMMARY PAGE + FILTERS
// =========================

function calculatePersonTotal(person) {
  const income = data[person]
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expense = data[person]
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    income,
    expense,
    balance: income - expense
  };
}

function renderSummaryPage() {
  const ca = calculatePersonTotal("ca");
  const gau = calculatePersonTotal("gau");

  document.getElementById("ca-total-income").textContent = formatMoney(ca.income);
  document.getElementById("ca-total-expense").textContent = formatMoney(ca.expense);
  document.getElementById("ca-total-balance").textContent = formatMoney(ca.balance);

  document.getElementById("gau-total-income").textContent = formatMoney(gau.income);
  document.getElementById("gau-total-expense").textContent = formatMoney(gau.expense);
  document.getElementById("gau-total-balance").textContent = formatMoney(gau.balance);

  document.getElementById("both-total-income").textContent = formatMoney(ca.income + gau.income);
  document.getElementById("both-total-expense").textContent = formatMoney(ca.expense + gau.expense);
  document.getElementById("both-total-balance").textContent = formatMoney(ca.balance + gau.balance);

  renderAllTransactions();
}

function getAllSummaryTransactions() {
  const allTransactions = [
    ...data.ca.map(item => ({
      ...item,
      person: "Cá",
      personKey: "ca"
    })),
    ...data.gau.map(item => ({
      ...item,
      person: "Gấu",
      personKey: "gau"
    }))
  ];

  return allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderAllTransactions(customTransactions = null) {
  const tableBody = document.getElementById("all-transaction-body");

  if (!tableBody) return;

  tableBody.innerHTML = "";

  const allTransactions = customTransactions || getAllSummaryTransactions();

  if (allTransactions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">Chưa có giao dịch nào.</td>
      </tr>
    `;

    return;
  }

  allTransactions.forEach(item => {
    const row = document.createElement("tr");
    const kindLabel = item.shared ? "Chi chung" : "Chi riêng";

    row.innerHTML = `
      <td>${item.person}</td>
      <td>${item.date}</td>
      <td>${item.type === "income" ? "Tiền vào" : "Tiền ra"} / ${kindLabel}</td>
      <td>${escapeHTML(item.note)}</td>
      <td>${formatMoney(item.amount)}</td>
    `;

    tableBody.appendChild(row);
  });
}

function applySummaryFilters() {
  const personFilter = document.getElementById("summary-filter-person")?.value || "all";
  const kindFilter = document.getElementById("summary-filter-kind")?.value || "all";
  const typeFilter = document.getElementById("summary-filter-type")?.value || "all";
  const sortMode = document.getElementById("summary-sort-mode")?.value || "newest";

  let transactions = getAllSummaryTransactions();

  if (personFilter !== "all") {
    transactions = transactions.filter(item => item.personKey === personFilter);
  }

  if (kindFilter === "shared") {
    transactions = transactions.filter(item => item.shared === true);
  }

  if (kindFilter === "personal") {
    transactions = transactions.filter(item => item.shared !== true);
  }

  if (typeFilter !== "all") {
    transactions = transactions.filter(item => item.type === typeFilter);
  }

  transactions = sortSummaryTransactions(transactions, sortMode);

  renderAllTransactions(transactions);
}

function clearSummaryFilters() {
  const personSelect = document.getElementById("summary-filter-person");
  const kindSelect = document.getElementById("summary-filter-kind");
  const typeSelect = document.getElementById("summary-filter-type");
  const sortSelect = document.getElementById("summary-sort-mode");

  if (personSelect) personSelect.value = "all";
  if (kindSelect) kindSelect.value = "all";
  if (typeSelect) typeSelect.value = "all";
  if (sortSelect) sortSelect.value = "newest";

  renderAllTransactions();
}

function sortSummaryTransactions(transactions, sortMode) {
  const copied = [...transactions];

  if (sortMode === "newest") {
    return copied.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  if (sortMode === "oldest") {
    return copied.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  if (sortMode === "amount-desc") {
    return copied.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
  }

  if (sortMode === "amount-asc") {
    return copied.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
  }

  return copied;
}

// =========================
// INITIAL SETUP
// =========================

setupMoneyInputs();
startRealtimeSync();
