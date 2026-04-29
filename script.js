const PASSWORDS = {
  gau: "25121998",
  ca: "16092004",
  summary: "Gauvaca"
};

let loggedInUser = null;
let currentUser = null;

let currentDate = new Date();
let selectedDate = formatDate(new Date());

let data = JSON.parse(localStorage.getItem("gauCaExpenseData")) || {
  ca: [],
  gau: [],
  shared: []
};

function saveData() {
  localStorage.setItem("gauCaExpenseData", JSON.stringify(data));
}

function formatMoney(amount) {
  return Number(amount).toLocaleString("vi-VN") + "đ";
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

/* LOGIN */

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

function logout() {
  loggedInUser = null;
  currentUser = null;

  document.getElementById("password-input").value = "";
  document.getElementById("login-error").textContent = "";

  document.getElementById("login-page").classList.remove("hidden");
  document.getElementById("app-page").classList.add("hidden");
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

function showApp() {
  document.getElementById("login-page").classList.add("hidden");
  document.getElementById("app-page").classList.remove("hidden");
}

/* PAGE ROUTING */

function hideAllMainPages() {
  document.getElementById("personal-page").classList.add("hidden");
  document.getElementById("shared-page").classList.add("hidden");
  document.getElementById("summary-page").classList.add("hidden");
}

function showPersonalPage(person) {
  currentUser = person;

  hideAllMainPages();

  document.getElementById("personal-page").classList.remove("hidden");

  const personName = person === "ca" ? "Cá" : "Gấu";

  document.getElementById("page-title").textContent = `Trang chi tiêu của ${personName}`;
  document.getElementById("page-subtitle").textContent = `Nhập tiền vào, tiền ra và xem số dư của ${personName}`;

  renderCalendar();
  renderDailyTable();
  renderMonthSummary();
  updateNavButtons();
}

function showSharedPage() {
  hideAllMainPages();

  document.getElementById("shared-page").classList.remove("hidden");

  document.getElementById("page-title").textContent = "Chi tiêu chung";
  document.getElementById("page-subtitle").textContent = "Chi tiêu chung sẽ được chia đôi cho Cá và Gấu";

  document.getElementById("shared-date").value = selectedDate;

  renderSharedTable();
  updateNavButtons();
}

function showSummaryPage() {
  hideAllMainPages();

  document.getElementById("summary-page").classList.remove("hidden");

  document.getElementById("page-title").textContent = "Tổng chi tiêu của Gấu Cá";
  document.getElementById("page-subtitle").textContent = "Xem tổng tiền vào, tiền ra và số dư của cả hai";

  renderSummaryPage();
  updateNavButtons();
}

/* CALENDAR */

function changeMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);

  renderCalendar();
  renderMonthSummary();
}

function renderCalendar() {
  const calendarGrid = document.getElementById("calendar-grid");
  const monthLabel = document.getElementById("current-month-label");

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
    .reduce((sum, item) => sum + item.amount, 0);

  const expense = dailyItems
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    income,
    expense
  };
}

/* ADD PERSONAL INCOME / EXPENSE */

function addIncome() {
  const amount = Number(document.getElementById("income-amount").value);
  const note = document.getElementById("income-note").value.trim();

  if (!amount || !note) {
    alert("Vui lòng nhập đủ số tiền và nội dung tiền vào.");
    return;
  }

  data[currentUser].push({
    id: Date.now(),
    type: "income",
    amount,
    note,
    date: selectedDate,
    shared: false
  });

  saveData();

  document.getElementById("income-amount").value = "";
  document.getElementById("income-note").value = "";

  renderCalendar();
  renderDailyTable();
  renderMonthSummary();
}

function addExpense() {
  const amount = Number(document.getElementById("expense-amount").value);
  const note = document.getElementById("expense-note").value.trim();

  if (!amount || !note) {
    alert("Vui lòng nhập đủ số tiền và mục chi tiêu.");
    return;
  }

  data[currentUser].push({
    id: Date.now(),
    type: "expense",
    amount,
    note,
    date: selectedDate,
    shared: false
  });

  saveData();

  document.getElementById("expense-amount").value = "";
  document.getElementById("expense-note").value = "";

  renderCalendar();
  renderDailyTable();
  renderMonthSummary();
}

/* DAILY TABLE */

function renderDailyTable() {
  if (!currentUser || currentUser === "summary") return;

  const title = document.getElementById("selected-date-title");
  const tableBody = document.getElementById("daily-table-body");
  const balanceCell = document.getElementById("daily-balance");

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

  const incomeTotal = incomes.reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const balance = incomeTotal - expenseTotal;

  balanceCell.textContent = `Số dư còn lại trong ngày: ${formatMoney(balance)}`;
}

function createTransactionHTML(item, person) {
  return `
    <div class="transaction-item">
      <strong>${item.note}</strong>
      <span>${formatMoney(item.amount)}</span>
      <div class="transaction-actions">
        <button class="edit-btn" onclick="editTransaction('${person}', ${item.id})">Sửa</button>
        <button class="delete-btn" onclick="deleteTransaction('${person}', ${item.id})">Xóa</button>
      </div>
    </div>
  `;
}

function editTransaction(person, id) {
  const item = data[person].find(transaction => transaction.id === id);

  if (!item) return;

  const newAmount = Number(prompt("Nhập số tiền mới:", item.amount));
  const newNote = prompt("Nhập nội dung mới:", item.note);

  if (!newAmount || !newNote) {
    alert("Thông tin không hợp lệ.");
    return;
  }

  item.amount = newAmount;
  item.note = newNote.trim();

  saveData();

  renderCalendar();
  renderDailyTable();
  renderMonthSummary();
  renderSummaryPage();
}

function deleteTransaction(person, id) {
  const confirmDelete = confirm("Bạn có chắc muốn xóa giao dịch này không?");

  if (!confirmDelete) return;

  data[person] = data[person].filter(item => item.id !== id);

  saveData();

  renderCalendar();
  renderDailyTable();
  renderMonthSummary();
  renderSummaryPage();
}

/* MONTH SUMMARY */

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
    .reduce((sum, item) => sum + item.amount, 0);

  const expense = monthItems
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  document.getElementById("month-income").textContent = formatMoney(income);
  document.getElementById("month-expense").textContent = formatMoney(expense);
  document.getElementById("month-balance").textContent = formatMoney(income - expense);
}

/* SHARED EXPENSE */

function addSharedExpense() {
  const date = document.getElementById("shared-date").value;
  const amount = Number(document.getElementById("shared-amount").value);
  const note = document.getElementById("shared-note").value.trim();

  if (!date || !amount || !note) {
    alert("Vui lòng nhập đầy đủ thông tin chi tiêu chung.");
    return;
  }

  const sharedId = Date.now();
  const halfAmount = amount / 2;

  data.shared.push({
    id: sharedId,
    date,
    amount,
    note
  });

  data.ca.push({
    id: sharedId + 1,
    sharedId,
    type: "expense",
    amount: halfAmount,
    note: `[Chi chung] ${note}`,
    date,
    shared: true
  });

  data.gau.push({
    id: sharedId + 2,
    sharedId,
    type: "expense",
    amount: halfAmount,
    note: `[Chi chung] ${note}`,
    date,
    shared: true
  });

  saveData();

  document.getElementById("shared-amount").value = "";
  document.getElementById("shared-note").value = "";

  renderSharedTable();

  if (currentUser === "ca" || currentUser === "gau") {
    renderCalendar();
    renderDailyTable();
    renderMonthSummary();
  }
}

function renderSharedTable() {
  const tableBody = document.getElementById("shared-table-body");

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
      <td>${formatMoney(item.amount / 2)}</td>
      <td>${formatMoney(item.amount / 2)}</td>
      <td>
        <button class="delete-btn" onclick="deleteSharedExpense(${item.id})">Xóa</button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function deleteSharedExpense(sharedId) {
  const confirmDelete = confirm("Bạn có chắc muốn xóa chi tiêu chung này không?");

  if (!confirmDelete) return;

  data.shared = data.shared.filter(item => item.id !== sharedId);
  data.ca = data.ca.filter(item => item.sharedId !== sharedId);
  data.gau = data.gau.filter(item => item.sharedId !== sharedId);

  saveData();

  renderSharedTable();
  renderSummaryPage();

  if (currentUser === "ca" || currentUser === "gau") {
    renderCalendar();
    renderDailyTable();
    renderMonthSummary();
  }
}

/* SUMMARY PAGE */

function calculatePersonTotal(person) {
  const income = data[person]
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const expense = data[person]
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

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