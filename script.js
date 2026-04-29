// =========================
// FIREBASE IMPORTS
// =========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

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
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

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

let data = {
  ca: [],
  gau: [],
  shared: []
};

// =========================
// FIRESTORE COLLECTIONS
// =========================

const caCollection = collection(db, "expense_caTransactions");
const gauCollection = collection(db, "expense_gauTransactions");
const sharedCollection = collection(db, "expense_sharedTransactions");

// =========================
// MAKE FUNCTIONS GLOBAL
// Vì HTML đang gọi onclick="..."
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
window.deleteSharedExpense = deleteSharedExpense;

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
    "shared-amount"
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
  }

  const sharedPage = document.getElementById("shared-page");
  if (sharedPage && !sharedPage.classList.contains("hidden")) {
    renderSharedTable();
  }

  const summaryPage = document.getElementById("summary-page");
  if (summaryPage && !summaryPage.classList.contains("hidden")) {
    renderSummaryPage();
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
}

function showSharedPage() {
  hideAllMainPages();
  updateNavButtons();

  document.getElementById("shared-page").classList.remove("hidden");

  document.getElementById("page-title").textContent = "Chi tiêu chung";
  document.getElementById("page-subtitle").textContent = "Chi tiêu chung sẽ được chia đôi cho Cá và Gấu";

  document.getElementById("shared-date").value = selectedDate;

  renderSharedTable();
}

function showSummaryPage() {
  hideAllMainPages();
  updateNavButtons();

  document.getElementById("summary-page").classList.remove("hidden");

  document.getElementById("page-title").textContent = "Tổng chi tiêu của Gấu Cá";
  document.getElementById("page-subtitle").textContent = "Xem tổng tiền vào, tiền ra và số dư của cả hai";

  renderSummaryPage();
}

// =========================
// CALENDAR
// =========================

function changeMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);

  renderCalendar();
  renderMonthSummary();
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
      <strong>${item.note}</strong>
      <span>${formatMoney(item.amount)}</span>
      <div class="transaction-actions">
        <button class="edit-btn" onclick="editTransaction('${person}', '${item.firestoreId}')">Sửa</button>
        <button class="delete-btn" onclick="deleteTransaction('${person}', '${item.firestoreId}')">Xóa</button>
      </div>
    </div>
  `;
}

async function editTransaction(person, firestoreId) {
  const item = data[person].find(transaction => transaction.firestoreId === firestoreId);

  if (!item) return;

  if (item.shared) {
    alert("Giao dịch chi tiêu chung nên sửa/xóa ở trang Chi tiêu chung để không lệch dữ liệu của Cá và Gấu.");
    return;
  }

  const newAmountInput = prompt(
    "Nhập số tiền mới:",
    formatInputMoney(String(item.amount))
  );

  if (newAmountInput === null) return;

  const newNote = prompt("Nhập nội dung mới:", item.note);

  if (newNote === null) return;

  const newAmount = parseInputMoney(newAmountInput);

  if (!newAmount || !newNote.trim()) {
    alert("Thông tin không hợp lệ.");
    return;
  }

  const collectionName = getCollectionNameByPerson(person);
  const personDoc = doc(db, collectionName, firestoreId);

  await updateDoc(personDoc, {
    amount: newAmount,
    note: newNote.trim(),
    updatedAt: serverTimestamp()
  });
}

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
      <td>${item.note}</td>
      <td>${formatMoney(item.amount)}</td>
      <td>${formatMoney(Number(item.amount || 0) / 2)}</td>
      <td>${formatMoney(Number(item.amount || 0) / 2)}</td>
      <td>
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
// SUMMARY PAGE
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

function renderAllTransactions() {
  const tableBody = document.getElementById("all-transaction-body");

  if (!tableBody) return;

  tableBody.innerHTML = "";

  const allTransactions = [
    ...data.ca.map(item => ({
      ...item,
      person: "Cá"
    })),
    ...data.gau.map(item => ({
      ...item,
      person: "Gấu"
    }))
  ];

  const sortedTransactions = allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sortedTransactions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">Chưa có giao dịch nào.</td>
      </tr>
    `;

    return;
  }

  sortedTransactions.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.person}</td>
      <td>${item.date}</td>
      <td>${item.type === "income" ? "Tiền vào" : "Tiền ra"}</td>
      <td>${item.note}</td>
      <td>${formatMoney(item.amount)}</td>
    `;

    tableBody.appendChild(row);
  });
}

// =========================
// INITIAL SETUP
// =========================

setupMoneyInputs();
startRealtimeSync();
