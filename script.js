// Storage
const STORAGE_KEY = 'expense-tracker-v1';

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

// State
let expenses = loadFromStorage();
let filterCategory = 'All';
let sortKey = 'date-desc';

// Helpers
function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getVisible() {
  const filtered = filterCategory === 'All'
    ? [...expenses]
    : expenses.filter(e => e.category === filterCategory);

  return filtered.sort((a, b) => {
    switch (sortKey) {
      case 'date-desc':   return b.date.localeCompare(a.date);
      case 'date-asc':    return a.date.localeCompare(b.date);
      case 'amount-desc': return b.amount - a.amount;
      case 'amount-asc':  return a.amount - b.amount;
      default:            return 0;
    }
  });
}

// Render
function render() {
  renderList();
  renderTotals();
}

function renderList() {
  const container = document.getElementById('expense-list');
  const visible = getVisible();

  if (visible.length === 0) {
    const msg = filterCategory === 'All'
      ? 'No expenses yet — add one above!'
      : `No expenses in "${filterCategory}".`;
    container.innerHTML = `<div class="empty-state">${msg}</div>`;
    return;
  }

  container.innerHTML = visible.map(e => `
    <div class="expense-row">
      <span class="expense-desc">${escapeHtml(e.description)}</span>
      <div class="expense-meta">
        <span class="expense-amount">${formatCurrency(e.amount)}</span>
        <span class="expense-cat">${e.category}</span>
        <span class="expense-date">${e.date}</span>
      </div>
      <button class="btn btn-danger delete-btn" data-id="${e.id}" aria-label="Delete ${escapeHtml(e.description)}">✕</button>
    </div>
  `).join('');
}

function renderTotals() {
  const visible = getVisible();

  const total = visible.reduce((sum, e) => sum + e.amount, 0);
  document.getElementById('total-all').textContent = formatCurrency(total);

  const countEl = document.getElementById('expense-count');
  countEl.textContent = visible.length > 0
    ? `${visible.length} expense${visible.length !== 1 ? 's' : ''} shown`
    : '';

  const catMap = visible.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  document.getElementById('category-totals').innerHTML = Object.entries(catMap)
    .map(([cat, amt]) => `<span class="cat-pill"><strong>${cat}</strong> ${formatCurrency(amt)}</span>`)
    .join('');
}

// Form
const form        = document.getElementById('expense-form');
const errorEl     = document.getElementById('form-error');
const descInput   = document.getElementById('description');
const amountInput = document.getElementById('amount');
const dateInput   = document.getElementById('date');

dateInput.value = todayISO();

form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm()) return;

  const expense = {
    id:          crypto.randomUUID(),
    description: descInput.value.trim(),
    amount:      parseFloat(amountInput.value),
    category:    document.getElementById('category').value,
    date:        dateInput.value,
  };

  expenses.push(expense);
  saveToStorage();
  render();

  descInput.value   = '';
  amountInput.value = '';
  descInput.focus();
});

function validateForm() {
  const desc   = descInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const date   = dateInput.value;

  [descInput, amountInput, dateInput].forEach(el => el.classList.remove('invalid'));
  errorEl.textContent = '';

  if (!desc) {
    errorEl.textContent = 'Description is required.';
    descInput.classList.add('invalid');
    descInput.focus();
    return false;
  }
  if (!amount || amount <= 0) {
    errorEl.textContent = 'Amount must be greater than 0.';
    amountInput.classList.add('invalid');
    amountInput.focus();
    return false;
  }
  if (!date) {
    errorEl.textContent = 'Date is required.';
    dateInput.classList.add('invalid');
    dateInput.focus();
    return false;
  }
  return true;
}

[descInput, amountInput, dateInput].forEach(el => {
  el.addEventListener('input', () => {
    el.classList.remove('invalid');
    errorEl.textContent = '';
  });
});

// Delete
document.getElementById('expense-list').addEventListener('click', e => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;
  expenses = expenses.filter(ex => ex.id !== btn.dataset.id);
  saveToStorage();
  render();
});

// Filter & sort
document.getElementById('filter-category').addEventListener('change', e => {
  filterCategory = e.target.value;
  render();
});

document.getElementById('sort-by').addEventListener('change', e => {
  sortKey = e.target.value;
  render();
});

// Init
render();
