const root = document.querySelector('#app');
const mealNames = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
const state = {
  page: 'home',
  token: sessionStorage.getItem('meal_planner_access_token'),
  selectedDate: todayKey(),
  planAnchor: addDays(todayKey(), 1),
  historyAnchor: addDays(todayKey(), -1),
  historySelectedDate: addDays(todayKey(), -1),
  notice: ''
};
let planSaveTimer;
let planSaveInProgress = false;
let pendingPlanSave = null;

function todayKey() { return new Date().toLocaleDateString('en-CA'); }
function dateKey(offset) { const date = new Date(); date.setDate(date.getDate() + offset); return date.toLocaleDateString('en-CA'); }
function addDays(value, amount) { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + amount); return date.toLocaleDateString('en-CA'); }
function dateLabel(value) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function shell(content) { return `<div class="shell"><header class="topbar"><button class="brand" data-action="home">Meal <span>Planner</span></button><div class="topbar-actions">${state.token ? '<button class="button-secondary" data-action="logout">Log out</button>' : '<button class="button-secondary" data-action="login">Log in</button>'}</div></header>${content}</div>`; }
function notice() { return state.notice ? `<p class="notice" role="status">${escapeHtml(state.notice)}</p>` : ''; }

async function request(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (options.auth !== false && state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`/api${path}`, { ...options, headers });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && options.auth !== false) { clearSession(); state.page = 'login'; render(); }
    throw new Error(body.error || 'The request could not be completed.');
  }
  return body;
}

function clearSession() { sessionStorage.removeItem('meal_planner_access_token'); state.token = null; }
function requireSignIn() { if (!state.token) { state.notice = 'Log in or create an account to use your private planner.'; state.page = 'login'; render(); return false; } return true; }

function renderHome() {
  const cards = [
    ['today', 'Today’s meals', 'Add breakfast, lunch, dinner, and snacks for today.'],
    ['history', 'Meal history', 'Browse any past or future day in your meal calendar.'],
    ['plan', 'Plan ahead', 'Choose any day and build a meal plan.'],
    ['shopping', 'Shopping list', 'Keep a small, personal list of ingredients.']
  ];
  root.innerHTML = shell(`<section class="page"><p class="eyebrow">MEAL PLANNER</p><h1>Make room for the meals that help your day.</h1><p class="intro">A calm, private space for planning meals and keeping a shopping list.</p>${notice()}<div class="card-grid">${cards.map(([page, title, description]) => `<button class="feature-card" data-action="go" data-page="${page}"><span><h2>${title}</h2><p>${description}</p></span><strong>Open →</strong></button>`).join('')}</div></section>`);
}

function renderLogin() {
  root.innerHTML = shell(`<section class="page auth-wrap"><div class="auth-card"><p class="eyebrow">PRIVATE PLANNER</p><h1 id="auth-title">Log in</h1><p>Use your account to keep your meals and shopping list private.</p>${notice()}<form id="auth-form"><label class="field-label" for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="254" /><label class="field-label" for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="72" /><button class="button" type="submit">Log in</button></form><p><button class="text-button" data-action="signup">Need an account? Create one</button></p></div></section>`);
}

function historyDates(anchor) { return Array.from({ length: 7 }, (_, index) => addDays(anchor, index - 6)); }
function planDates(anchor) { return Array.from({ length: 7 }, (_, index) => addDays(anchor, index)); }
function mealSummary(plan) { return plan && Object.keys(mealNames).some((field) => plan[field]); }
function dateCarousel(kind, dates, plans, selectedDate) {
  const byDate = Object.fromEntries(plans.map((plan) => [plan.meal_date, plan]));
  const cards = dates.map((date) => {
    const plan = byDate[date];
    const selected = date === selectedDate;
    const content = `<span>${dateLabel(date)}</span><strong>${mealSummary(plan) ? 'Meals planned' : 'No meals saved'}</strong><small>${mealSummary(plan) ? 'View day' : 'Blank day'}</small>`;
    return `<button class="day-card ${selected ? 'is-selected' : ''}" data-action="choose-${kind}-date" data-date="${date}">${content}</button>`;
  }).join('');
  return `<div class="date-carousel-wrap"><div class="carousel-controls"><button class="carousel-button" data-action="shift-${kind}" data-direction="-1" aria-label="Show earlier days">← Earlier</button><p class="carousel-label">${kind === 'history' ? 'Past days only' : 'Future days only'}</p><button class="carousel-button" data-action="shift-${kind}" data-direction="1" aria-label="Show later days">Later →</button></div><div class="date-carousel">${cards}</div></div>`;
}
function mealEditor(plan, heading, detail) {
  return `<section class="page"><button class="text-button back" data-action="home">← Back to overview</button><div class="section-head"><div><p class="eyebrow">${heading}</p><h1>${detail}</h1></div></div>${notice()}<form id="plan-form" data-date="${plan.meal_date}"><div class="meal-grid">${Object.entries(mealNames).map(([field, label]) => `<article class="meal-card"><label for="${field}">${label}</label><textarea id="${field}" name="${field}" maxlength="500" placeholder="What are you having?">${escapeHtml(plan[field] || '')}</textarea></article>`).join('')}</div><div class="form-actions"><p class="save-status" role="status">Changes save automatically.</p></div></form></section>`; }

async function renderToday() {
  if (!requireSignIn()) return;
  root.innerHTML = shell('<section class="page"><p class="loading">Loading today’s meals…</p></section>');
  try { const { plan } = await request(`/daily-meals?date=${encodeURIComponent(todayKey())}`); root.innerHTML = shell(mealEditor(plan, 'TODAY', 'Today’s meals')); } catch (error) { showError(error); }
}

async function renderPlan() {
  if (!requireSignIn()) return;
  const firstPlanDate = addDays(todayKey(), 1);
  if (state.selectedDate < firstPlanDate) state.selectedDate = firstPlanDate;
  if (state.planAnchor < firstPlanDate) state.planAnchor = firstPlanDate;
  root.innerHTML = shell('<section class="page"><p class="loading">Loading your plan…</p></section>');
  try {
    const dates = planDates(state.planAnchor);
    const [{ plan }, { plans }] = await Promise.all([
      request(`/daily-meals?date=${encodeURIComponent(state.selectedDate)}`),
      request(`/daily-meals/history?start=${dates[0]}&end=${dates[dates.length - 1]}`)
    ]);
    const controls = dateCarousel('plan', dates, plans, state.selectedDate);
    root.innerHTML = shell(`<section class="page"><button class="text-button back" data-action="home">← Back to overview</button><p class="eyebrow">PLAN AHEAD</p><h1>Plan future meals.</h1><p class="intro">Scroll forward as far as you like. Each future day is ready for a new meal plan.</p>${controls}${notice()}<form id="plan-form" data-date="${plan.meal_date}"><div class="meal-grid">${Object.entries(mealNames).map(([field, label]) => `<article class="meal-card"><label for="${field}">${label}</label><textarea id="${field}" name="${field}" maxlength="500" placeholder="What are you planning?">${escapeHtml(plan[field] || '')}</textarea></article>`).join('')}</div><div class="form-actions"><p class="save-status" role="status">Changes save automatically.</p></div></form></section>`);
  } catch (error) { showError(error); }
}

async function renderHistory() {
  if (!requireSignIn()) return;
  const lastHistoryDate = addDays(todayKey(), -1);
  if (state.historySelectedDate >= todayKey()) state.historySelectedDate = lastHistoryDate;
  if (state.historyAnchor >= todayKey()) state.historyAnchor = lastHistoryDate;
  root.innerHTML = shell('<section class="page"><p class="loading">Loading meal history…</p></section>');
  try {
    const days = historyDates(state.historyAnchor);
    const [{ plan }, { plans }] = await Promise.all([
      request(`/daily-meals?date=${encodeURIComponent(state.historySelectedDate)}`),
      request(`/daily-meals/history?start=${days[0]}&end=${days[days.length - 1]}`)
    ]);
    const controls = dateCarousel('history', days, plans, state.historySelectedDate);
    root.innerHTML = shell(`<section class="page"><button class="text-button back" data-action="home">← Back to overview</button><p class="eyebrow">MEAL HISTORY</p><h1>Your past meals.</h1><p class="intro">Choose a past day to edit its meals. Today and future dates stay in the planner.</p>${controls}${notice()}<form id="plan-form" data-date="${plan.meal_date}"><div class="meal-grid">${Object.entries(mealNames).map(([field, label]) => `<article class="meal-card"><label for="${field}">${label}</label><textarea id="${field}" name="${field}" maxlength="500" placeholder="What did you have?">${escapeHtml(plan[field] || '')}</textarea></article>`).join('')}</div><div class="form-actions"><p class="save-status" role="status">Changes save automatically.</p></div></form></section>`);
  } catch (error) { showError(error); }
}

async function renderShopping() {
  if (!requireSignIn()) return;
  root.innerHTML = shell('<section class="page"><p class="loading">Loading shopping list…</p></section>');
  try {
    const { items } = await request('/shopping-items');
    root.innerHTML = shell(`<section class="page"><button class="text-button back" data-action="home">← Back to overview</button><p class="eyebrow">SHOPPING LIST</p><h1>Keep ingredients together.</h1><p class="intro">Add what you need and check it off as you shop.</p>${notice()}<div class="shopping-layout"><section class="list-card"><form class="add-form" id="shopping-form"><input name="item_name" maxlength="120" required placeholder="Add an ingredient" aria-label="New shopping item" /><button class="button" type="submit">Add item</button></form><div>${items.length ? items.map((item) => `<div class="item"><input type="checkbox" data-action="toggle-item" data-id="${item.id}" ${item.is_checked ? 'checked' : ''} aria-label="Mark ${escapeHtml(item.item_name)} as purchased" /><span class="item-name ${item.is_checked ? 'is-checked' : ''}">${escapeHtml(item.item_name)}</span><button class="delete" data-action="delete-item" data-id="${item.id}">Remove</button></div>`).join('') : '<p class="empty">Your list is empty.</p>'}</div></section><aside class="list-card"><h2>Private by design</h2><p class="empty">Only an authenticated user can access their own shopping items. The browser talks to the Express API, and Supabase row-level security adds another ownership check.</p></aside></div></section>`);
  } catch (error) { showError(error); }
}

function showError(error) { state.notice = error.message; root.innerHTML = shell(`<section class="page"><button class="text-button back" data-action="home">← Back to overview</button><p class="notice" role="alert">${escapeHtml(error.message)}</p></section>`); }
function render() { if (state.page === 'login') renderLogin(); else if (state.page === 'today') renderToday(); else if (state.page === 'history') renderHistory(); else if (state.page === 'plan') renderPlan(); else if (state.page === 'shopping') renderShopping(); else renderHome(); }

function schedulePlanSave(form) {
  clearTimeout(planSaveTimer);
  const status = form.querySelector('.save-status');
  if (status) status.textContent = 'Saving…';
  planSaveTimer = setTimeout(() => savePlan(form), 600);
}

async function savePlan(form) {
  if (planSaveInProgress) {
    pendingPlanSave = form;
    return;
  }

  planSaveInProgress = true;
  try {
    do {
      pendingPlanSave = null;
      const values = Object.fromEntries(new FormData(form));
      await request(`/daily-meals/${form.dataset.date}`, { method: 'PATCH', body: JSON.stringify(values) });
    } while (pendingPlanSave === form);

    const status = form.querySelector('.save-status');
    if (status) status.textContent = 'Saved.';
  } catch (error) {
    const status = form.querySelector('.save-status');
    if (status) status.textContent = error.message;
  } finally {
    planSaveInProgress = false;
  }
}

root.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const { action, page, date, id, direction } = button.dataset;
  if (action === 'home') { state.notice = ''; state.page = 'home'; render(); }
  if (action === 'go') { state.notice = ''; state.page = page; render(); }
  if (action === 'login') { state.notice = ''; state.page = 'login'; render(); }
  if (action === 'signup') { document.querySelector('#auth-title').textContent = 'Create an account'; document.querySelector('#auth-form button').textContent = 'Create account'; button.textContent = 'Already have an account? Log in'; button.dataset.action = 'login'; document.querySelector('#password').autocomplete = 'new-password'; }
  if (action === 'logout') { clearSession(); state.notice = 'You have been logged out.'; state.page = 'home'; render(); }
  if (action === 'shift-plan') { state.planAnchor = addDays(state.planAnchor, Number(direction) * 7); if (state.planAnchor < addDays(todayKey(), 1)) state.planAnchor = addDays(todayKey(), 1); state.selectedDate = state.planAnchor; state.notice = ''; renderPlan(); }
  if (action === 'shift-history') { state.historyAnchor = addDays(state.historyAnchor, Number(direction) * 7); if (state.historyAnchor >= todayKey()) state.historyAnchor = addDays(todayKey(), -1); state.historySelectedDate = state.historyAnchor; state.notice = ''; renderHistory(); }
  if (action === 'choose-plan-date') { state.selectedDate = date; state.notice = ''; renderPlan(); }
  if (action === 'choose-history-date') { state.historySelectedDate = date; state.notice = ''; renderHistory(); }
  if (action === 'delete-item') { if (window.confirm('Remove this shopping item?')) { try { await request(`/shopping-items/${id}`, { method: 'DELETE' }); state.notice = 'Shopping item removed.'; renderShopping(); } catch (error) { showError(error); } } }
});

root.addEventListener('change', async (event) => {
  const planForm = event.target.closest('#plan-form');
  if (planForm) schedulePlanSave(planForm);
  if (event.target.dataset.action === 'toggle-item') { try { await request(`/shopping-items/${event.target.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ is_checked: event.target.checked }) }); state.notice = 'Shopping item updated.'; renderShopping(); } catch (error) { showError(error); } }
});

root.addEventListener('input', (event) => {
  const planForm = event.target.closest('#plan-form');
  if (planForm) schedulePlanSave(planForm);
});

root.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  try {
    if (form.id === 'auth-form') {
      const values = Object.fromEntries(new FormData(form)); const creating = form.querySelector('button').textContent.includes('Create');
      const data = await request(`/auth/${creating ? 'signup' : 'login'}`, { method: 'POST', body: JSON.stringify(values), auth: false });
      if (!data.session) { state.notice = data.message; renderLogin(); return; }
      state.token = data.session.access_token; sessionStorage.setItem('meal_planner_access_token', state.token); state.notice = 'Signed in successfully.'; state.page = 'home'; render();
    }
    if (form.id === 'plan-form') await savePlan(form);
    if (form.id === 'shopping-form') { const values = Object.fromEntries(new FormData(form)); await request('/shopping-items', { method: 'POST', body: JSON.stringify(values) }); state.notice = 'Shopping item added.'; renderShopping(); }
  } catch (error) { state.notice = error.message; render(); }
});

render();
