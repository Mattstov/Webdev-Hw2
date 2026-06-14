// Storage
const STORAGE_KEY = 'expense-tracker-v1';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  container.replaceChildren();

  if (visible.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = filterCategory === 'All'
      ? 'No expenses yet — add one above!'
      : `No expenses in "${filterCategory}".`;
    container.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  visible.forEach(e => {
    const row = document.createElement('div');
    row.className = 'expense-row';

    const desc = document.createElement('span');
    desc.className = 'expense-desc';
    desc.textContent = e.description;

    const meta = document.createElement('div');
    meta.className = 'expense-meta';

    const amount = document.createElement('span');
    amount.className = 'expense-amount';
    amount.textContent = formatCurrency(e.amount);

    const cat = document.createElement('span');
    cat.className = 'expense-cat';
    cat.textContent = e.category;

    const date = document.createElement('span');
    date.className = 'expense-date';
    date.textContent = e.date;

    meta.append(amount, cat, date);

    const btn = document.createElement('button');
    btn.className = 'btn btn-danger delete-btn';
    btn.dataset.id = e.id;
    btn.setAttribute('aria-label', `Delete ${e.description}`);
    btn.textContent = '✕';

    row.append(desc, meta, btn);
    fragment.appendChild(row);
  });

  container.appendChild(fragment);
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

  const catContainer = document.getElementById('category-totals');
  catContainer.replaceChildren();

  const catFragment = document.createDocumentFragment();
  Object.entries(catMap).forEach(([cat, amt]) => {
    const pill = document.createElement('span');
    pill.className = 'cat-pill';

    const strong = document.createElement('strong');
    strong.textContent = cat;

    pill.append(strong, ` ${formatCurrency(amt)}`);
    catFragment.appendChild(pill);
  });

  catContainer.appendChild(catFragment);
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

// Conversion
document.getElementById('convert-btn').addEventListener('click', async () => {
  const btn     = document.getElementById('convert-btn');
  const result  = document.getElementById('eur-result');
  const errEl   = document.getElementById('eur-error');

  const total = getVisible().reduce((sum, e) => sum + e.amount, 0);

  btn.disabled = true;
  btn.textContent = 'Converting…';
  result.hidden = true;
  errEl.textContent = '';

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const rate = data.rates?.EUR;
    if (!rate) throw new Error('EUR rate not found in response.');

    result.textContent = `≈ €${(total * rate).toFixed(2)} EUR (rate: ${rate.toFixed(4)})`;
    result.hidden = false;
  } catch (err) {
    errEl.textContent = `Conversion failed: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Convert to EUR';
  }
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
