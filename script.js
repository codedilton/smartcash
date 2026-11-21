"use strict";

const STORAGE_KEY = "smartcash.transactions";
const THEME_KEY = "smartcash.theme";

const form = document.querySelector("#transaction-form");
const descriptionInput = document.querySelector("#description");
const amountInput = document.querySelector("#amount");
const formError = document.querySelector("#form-error");
const statementList = document.querySelector("#statement-list");
const incomeTotal = document.querySelector("#income-total");
const expenseTotal = document.querySelector("#expense-total");
const balanceTotal = document.querySelector("#balance-total");
const balanceStatus = document.querySelector("#balance-status");
const transactionCount = document.querySelector("#transaction-count");
const emptyTemplate = document.querySelector("#empty-template");
const themeToggle = document.querySelector("#theme-toggle");

let transactions = loadTransactions();

function loadTransactions() {
  try {
    const savedTransactions = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(savedTransactions)) return [];

    return savedTransactions.filter((transaction) =>
      typeof transaction.id === "string" &&
      typeof transaction.description === "string" &&
      Number.isInteger(transaction.amountInCents) &&
      typeof transaction.createdAt === "string"
    );
  } catch (error) {
    console.error("Não foi possível carregar as transações:", error);
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error("Não foi possível salvar as transações:", error);
    formError.textContent = "Não foi possível salvar no navegador.";
  }
}

function createTransactionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseAmountToCents(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return Math.round(numericValue * 100);
}

function formatCurrency(amountInCents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(amountInCents / 100);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function calculateTotals() {
  return transactions.reduce((totals, transaction) => {
    if (transaction.amountInCents > 0) {
      totals.income += transaction.amountInCents;
    } else {
      totals.expenses += Math.abs(transaction.amountInCents);
    }
    totals.balance = totals.income - totals.expenses;
    return totals;
  }, { income: 0, expenses: 0, balance: 0 });
}

function renderSummary() {
  const totals = calculateTotals();
  incomeTotal.textContent = formatCurrency(totals.income);
  expenseTotal.textContent = formatCurrency(totals.expenses);
  balanceTotal.textContent = formatCurrency(totals.balance);

  if (totals.balance > 0) {
    balanceStatus.textContent = "Saldo positivo";
  } else if (totals.balance < 0) {
    balanceStatus.textContent = "Saldo negativo";
  } else {
    balanceStatus.textContent = "Em equilíbrio";
  }
}

function renderTransactions() {
  statementList.replaceChildren();

  if (transactions.length === 0) {
    statementList.append(emptyTemplate.content.cloneNode(true));
  } else {
    transactions.forEach((transaction) => {
      const isIncome = transaction.amountInCents > 0;
      const row = document.createElement("article");
      row.className = `transaction-row ${isIncome ? "income" : "expense"}`;

      const symbol = document.createElement("span");
      symbol.className = "transaction-symbol";
      symbol.setAttribute("aria-hidden", "true");
      symbol.textContent = isIncome ? "↗" : "↘";

      const details = document.createElement("div");
      details.className = "transaction-details";

      const name = document.createElement("strong");
      name.textContent = transaction.description;

      const date = document.createElement("time");
      date.dateTime = transaction.createdAt;
      date.textContent = formatDate(transaction.createdAt);

      details.append(name, date);

      const amount = document.createElement("strong");
      amount.className = "transaction-amount";
      amount.textContent = `${isIncome ? "+" : "−"} ${formatCurrency(Math.abs(transaction.amountInCents))}`;

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-button";
      deleteButton.type = "button";
      deleteButton.dataset.transactionId = transaction.id;
      deleteButton.setAttribute("aria-label", `Excluir ${transaction.description}`);
      deleteButton.title = "Excluir transação";
      deleteButton.textContent = "×";

      row.append(symbol, details, amount, deleteButton);
      statementList.append(row);
    });
  }

  transactionCount.textContent = `${transactions.length} ${transactions.length === 1 ? "item" : "itens"}`;
}

function render() {
  renderSummary();
  renderTransactions();
}

function validateTransaction(description, amountInCents) {
  if (!description) return "Informe uma descrição.";
  if (amountInCents === null) return "Informe um valor numérico válido.";
  if (amountInCents === 0) return "O valor não pode ser zero.";
  return "";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amountInCents = parseAmountToCents(amountInput.value);
  const errorMessage = validateTransaction(description, amountInCents);

  if (errorMessage) {
    formError.textContent = errorMessage;
    (!description ? descriptionInput : amountInput).focus();
    return;
  }

  transactions.unshift({
    id: createTransactionId(),
    description,
    amountInCents,
    createdAt: new Date().toISOString()
  });

  saveTransactions();
  form.reset();
  formError.textContent = "";
  descriptionInput.focus();
  render();
});

statementList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete-button");
  if (!deleteButton) return;

  const transactionId = deleteButton.dataset.transactionId;
  transactions = transactions.filter((transaction) => transaction.id !== transactionId);
  saveTransactions();
  render();
});

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "☀" : "◐";
  themeToggle.setAttribute("aria-label", isDark ? "Usar tema claro" : "Usar tema escuro");
}

const savedTheme = localStorage.getItem(THEME_KEY);
applyTheme(savedTheme === "dark" ? "dark" : "light");

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
});

render();
