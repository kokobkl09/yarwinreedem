/**
 * Yarwin Redeem Pro - Frontend Logic
 * ADDED: Safe Pre‑Login (1 request per 0.8s) to avoid rate limits
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  MAX_ACCOUNTS: 50,
  API_BASE: '',
  PROJECT: 'ar095',
  REDEEM_TIMEOUT: 10000,
  PRELOGIN_DELAY: 800, // milliseconds between login attempts
};

// ============================================
// STATE
// ============================================
const state = {
  accounts: [],
  logs: [],
  isRedeeming: false,
  currentTab: 'dashboard'
};

// ============================================
// DOM ELEMENTS
// ============================================
const $ = (id) => document.getElementById(id);

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  setupNavigation();
  setupEventListeners();
  updateUI();
  log('info', 'Yarwin Redeem Pro initialized');
});

// ============================================
// NAVIGATION
// ============================================
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.dataset.tab;
      switchTab(tab);
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  $(`${tab}Tab`).classList.add('active');

  const titles = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview of your redemption system' },
    accounts: { title: 'Account Manager', subtitle: 'Manage your Yarwin accounts' },
    redeem: { title: 'Bulk Redeem', subtitle: 'Redeem gift codes on all accounts' },
    logs: { title: 'System Logs', subtitle: 'View all activity logs' }
  };

  $('pageTitle').textContent = titles[tab].title;
  $('pageSubtitle').textContent = titles[tab].subtitle;
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Quick Load
  $('quickLoadBtn')?.addEventListener('click', () => {
    const input = $('quickLoadInput').value.trim();
    if (!input) return showToast('Please paste accounts first', 'warning');
    loadAccounts(input);
    $('quickLoadInput').value = '';
  });

  // Account Tab Load
  $('loadAccountsBtn')?.addEventListener('click', () => {
    const input = $('accountInput').value.trim();
    if (!input) return showToast('Please paste accounts first', 'warning');
    loadAccounts(input);
    $('accountInput').value = '';
  });

  // Import Accounts
  $('importAccountsBtn')?.addEventListener('click', () => {
    switchTab('accounts');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('[data-tab="accounts"]').classList.add('active');
    $('accountInput').focus();
  });

  // Export/Download Accounts
  $('exportAccountsBtn')?.addEventListener('click', downloadAccounts);
  $('downloadAccountsBtn')?.addEventListener('click', downloadAccounts);

  // Delete All
  $('deleteAllBtn')?.addEventListener('click', deleteAllAccounts);
  $('clearAllBtn')?.addEventListener('click', deleteAllAccounts);

  // View All Logs
  $('viewAllLogs')?.addEventListener('click', () => {
    switchTab('logs');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('[data-tab="logs"]').classList.add('active');
  });

  // Redeem Buttons
  $('quickRedeemBtn')?.addEventListener('click', () => {
    const code = $('quickRedeemInput').value.trim();
    if (!code) return showToast('Please enter a gift code', 'warning');
    if (state.accounts.length === 0) return showToast('Please load accounts first', 'warning');
    startRedeem(code);
  });

  $('redeemAllBtn')?.addEventListener('click', () => {
    const code = $('giftCodeInput').value.trim();
    if (!code) return showToast('Please enter a gift code', 'warning');
    if (state.accounts.length === 0) return showToast('Please load accounts first', 'warning');
    startRedeem(code);
  });

  // Results Actions
  $('copyResultsBtn')?.addEventListener('click', copyResults);
  $('downloadResultsBtn')?.addEventListener('click', downloadResultsCSV);

  // Logs Actions
  $('copyLogsBtn')?.addEventListener('click', copyLogs);
  $('clearLogsBtn')?.addEventListener('click', clearLogs);

  // ========== PRE-LOGIN BUTTON ==========
  $('preLoginBtn')?.addEventListener('click', preLoginAll);
}

// ============================================
// ACCOUNT MANAGEMENT
// ============================================
function loadAccounts(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const newAccounts = [];

  for (const line of lines) {
    const separator = line.includes('|') ? '|' : ':';
    const parts = line.split(separator);
    if (parts.length >= 2) {
      const phone = parts[0].trim();
      const password = parts[1].trim();
      if (phone && password) {
        const exists = state.accounts.some(a => a.phone === phone);
        if (!exists) {
          newAccounts.push({
            id: Date.now() + Math.random(),
            phone,
            password,
            token: null,          // <-- token storage
            status: 'ready',
            lastMessage: '',
            redeemedAt: null
          });
        }
      }
    }
  }

  if (newAccounts.length === 0) {
    return showToast('No valid accounts found. Format: phone|password', 'error');
  }

  const totalAfterAdd = state.accounts.length + newAccounts.length;
  if (totalAfterAdd > CONFIG.MAX_ACCOUNTS) {
    const canAdd = CONFIG.MAX_ACCOUNTS - state.accounts.length;
    if (canAdd <= 0) {
      return showToast(`Maximum ${CONFIG.MAX_ACCOUNTS} accounts allowed`, 'warning');
    }
    newAccounts.splice(canAdd);
    showToast(`Added ${newAccounts.length} accounts (max ${CONFIG.MAX_ACCOUNTS} reached)`, 'warning');
  } else {
    showToast(`Added ${newAccounts.length} accounts successfully`, 'success');
  }

  state.accounts.push(...newAccounts);
  saveToStorage();
  updateUI();
  log('success', `Loaded ${newAccounts.length} accounts. Total: ${state.accounts.length}`);

  // Optional: Auto-start pre-login? Uncomment the next line if you want it automatic.
  // preLoginAll();
}

function deleteAccount(id) {
  state.accounts = state.accounts.filter(a => a.id !== id);
  saveToStorage();
  updateUI();
  showToast('Account deleted', 'info');
  log('info', 'Account deleted');
}

function deleteAllAccounts() {
  if (state.accounts.length === 0) return showToast('No accounts to delete', 'warning');
  if (!confirm(`Delete all ${state.accounts.length} accounts?`)) return;

  state.accounts = [];
  saveToStorage();
  updateUI();
  showToast('All accounts deleted', 'info');
  log('warn', 'All accounts deleted');
}

function downloadAccounts() {
  if (state.accounts.length === 0) return showToast('No accounts to download', 'warning');

  const content = state.accounts.map(a => `${a.phone}|${a.password}`).join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yaarwin_accounts_${formatDate(new Date())}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Accounts downloaded', 'success');
}

// ============================================
// SAFE PRE-LOGIN (1 request per 0.8 seconds)
// ============================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function preLoginAll() {
  const accountsToLogin = state.accounts.filter(a => !a.token);
  if (accountsToLogin.length === 0) {
    showToast('All accounts already have tokens!', 'info');
    return;
  }

  if (state.isRedeeming) {
    showToast('Redeem in progress, please wait...', 'warning');
    return;
  }

  const btn = $('preLoginBtn');
  if (btn) btn.disabled = true;

  const statusEl = $('preLoginStatus');
  if (statusEl) statusEl.textContent = '⏳ Logging in...';

  log('info', `Starting safe pre-login for ${accountsToLogin.length} accounts (${CONFIG.PRELOGIN_DELAY}ms delay)...`);
  showToast(`Pre-login started for ${accountsToLogin.length} accounts...`, 'info');

  let successCount = 0;
  let failedCount = 0;
  let total = accountsToLogin.length;

  for (let i = 0; i < accountsToLogin.length; i++) {
    const account = accountsToLogin[i];
    try {
      const loginRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: account.phone,
          pwd: account.password
        })
      });
      const data = await loginRes.json();

      if (data.code === 0 && data.data?.token) {
        account.token = data.data.token;
        account.status = 'ready';
        account.lastMessage = 'Token cached';
        successCount++;
        log('success', `[${account.phone}] Token cached (${successCount}/${total})`);
      } else {
        account.status = 'login-failed';
        account.lastMessage = data.msg || 'Login failed';
        failedCount++;
        log('error', `[${account.phone}] Failed: ${account.lastMessage}`);
      }
    } catch (e) {
      account.status = 'login-failed';
      account.lastMessage = `Network error: ${e.message}`;
      failedCount++;
      log('error', `[${account.phone}] Error: ${e.message}`);
    }

    // Update UI
    renderAccountsTable();
    updateStats();
    saveToStorage();

    if (statusEl) {
      statusEl.textContent = `⏳ ${i+1}/${total} done (${successCount} ok, ${failedCount} fail)`;
    }

    // Wait before next attempt (except last)
    if (i < accountsToLogin.length - 1) {
      await sleep(CONFIG.PRELOGIN_DELAY);
    }
  }

  if (btn) btn.disabled = false;
  if (statusEl) {
    statusEl.textContent = `✅ Done: ${successCount} cached, ${failedCount} failed`;
    setTimeout(() => { statusEl.textContent = ''; }, 8000);
  }

  showToast(`Pre-login done! ${successCount} cached, ${failedCount} failed.`, successCount > 0 ? 'success' : 'warning');
  log('info', `Pre-login complete. Success: ${successCount}, Failed: ${failedCount}`);
}

// ============================================
// BULK REDEEM (uses cached tokens)
// ============================================
async function startRedeem(giftCode) {
  if (state.isRedeeming) return;
  if (state.accounts.length === 0) return showToast('No accounts loaded', 'warning');

  // Check if all accounts have tokens
  const missingToken = state.accounts.some(a => !a.token);
  if (missingToken) {
    const confirm = window.confirm('Some accounts are not pre-logged in. Do you want to run safe pre-login now? (May take ~40s for 50 accounts)');
    if (confirm) {
      await preLoginAll();
      // After pre-login, check again
      const stillMissing = state.accounts.some(a => !a.token);
      if (stillMissing) {
        return showToast('Some accounts still missing tokens. Please try again.', 'warning');
      }
    } else {
      return showToast('Please pre-login accounts first (click "Safe Pre-Login")', 'warning');
    }
  }

  state.isRedeeming = true;
  const accounts = [...state.accounts];
  const results = [];

  // Show progress
  $('redeemProgress').style.display = 'block';
  $('redeemResults').style.display = 'none';
  $('progressFill').style.width = '0%';
  $('progressText').textContent = `0 / ${accounts.length}`;

  // Disable buttons
  $('quickRedeemBtn')?.setAttribute('disabled', 'true');
  $('redeemAllBtn')?.setAttribute('disabled', 'true');
  $('preLoginBtn')?.setAttribute('disabled', 'true');

  log('info', `Starting bulk redeem with code: ${giftCode} for ${accounts.length} accounts`);

  const startTime = Date.now();

  // Redeem in parallel using cached tokens
  const redeemPromises = accounts.map((account, index) =>
    redeemWithToken(account, giftCode, index, accounts.length)
  );

  const settledResults = await Promise.allSettled(redeemPromises);
  settledResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({
        phone: accounts[index].phone,
        status: 'failed',
        message: 'Promise rejected',
        time: 0
      });
    }
  });

  const elapsed = Date.now() - startTime;

  // Hide progress
  $('redeemProgress').style.display = 'none';

  // Show results
  displayResults(results, giftCode, elapsed);

  // Re-enable buttons
  $('quickRedeemBtn')?.removeAttribute('disabled');
  $('redeemAllBtn')?.removeAttribute('disabled');
  $('preLoginBtn')?.removeAttribute('disabled');

  state.isRedeeming = false;
  saveToStorage();

  const successCount = results.filter(r => r.status === 'redeemed').length;
  log('success', `Redeem complete: ${successCount}/${accounts.length} successful in ${elapsed}ms`);
  showToast(`Redeem complete! ${successCount}/${accounts.length} successful`, successCount > 0 ? 'success' : 'warning');
}

async function redeemWithToken(account, giftCode, index, total) {
  const startTime = Date.now();
  const token = account.token;
  if (!token) {
    log('warn', `[${account.phone}] No token, skipping`);
    updateProgress(index + 1, total);
    return { phone: account.phone, status: 'login-failed', message: 'No token cached', time: 0 };
  }

  try {
    const redeemRes = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        giftCode: giftCode
      })
    });
    const data = await redeemRes.json();
    const elapsed = Date.now() - startTime;
    let status, message;

    if (data.code === 0) {
      status = 'redeemed';
      message = data.msg || 'Redeemed successfully';
      log('success', `[${account.phone}] ${message}`);
    } else {
      const msg = data.msg || 'Redeem failed';
      message = msg;
      if (msg.toLowerCase().includes('expired')) {
        status = 'expired';
        log('warn', `[${account.phone}] Code expired`);
      } else if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('received')) {
        status = 'failed';
        log('warn', `[${account.phone}] Already used`);
      } else {
        status = 'failed';
        log('error', `[${account.phone}] Redeem failed: ${msg}`);
      }
    }
    updateProgress(index + 1, total);
    // Update account status
    account.status = status;
    account.lastMessage = message;
    if (status === 'redeemed') account.redeemedAt = new Date().toISOString();
    return { phone: account.phone, status, message, time: elapsed };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    log('error', `[${account.phone}] Redeem error: ${error.message}`);
    updateProgress(index + 1, total);
    return { phone: account.phone, status: 'failed', message: `Error: ${error.message}`, time: elapsed };
  }
}

function updateProgress(current, total) {
  const percent = (current / total) * 100;
  $('progressFill').style.width = `${percent}%`;
  $('progressText').textContent = `${current} / ${total} completed`;
}

function updateAccountStatus(id, status, message) {
  const account = state.accounts.find(a => a.id === id);
  if (account) {
    account.status = status;
    account.lastMessage = message;
    if (status === 'redeemed') {
      account.redeemedAt = new Date().toISOString();
    }
  }
}

// ============================================
// DISPLAY RESULTS
// ============================================
function displayResults(results, code, elapsed) {
  const redeemed = results.filter(r => r.status === 'redeemed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const loginFailed = results.filter(r => r.status === 'login-failed').length;
  const expired = results.filter(r => r.status === 'expired').length;

  $('redeemResults').style.display = 'block';

  // Summary pills
  $('resultsSummary').innerHTML = `
    <div class="result-pill success"><i class="fas fa-check-circle"></i> ${redeemed} Redeemed</div>
    <div class="result-pill login-failed"><i class="fas fa-user-times"></i> ${loginFailed} Login Failed</div>
    <div class="result-pill expired"><i class="fas fa-hourglass-end"></i> ${expired} Expired</div>
    <div class="result-pill failed"><i class="fas fa-times-circle"></i> ${failed} Failed</div>
    <div class="result-pill" style="background: var(--info-bg); color: var(--info);">
      <i class="fas fa-clock"></i> ${elapsed}ms
    </div>
  `;

  // Table
  const tbody = $('resultsTableBody');
  tbody.innerHTML = results.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.phone}</td>
      <td><span class="status-badge ${r.status}">${formatStatus(r.status)}</span></td>
      <td>${r.message}</td>
      <td>${r.time}ms</td>
    </tr>
  `).join('');

  // Update stats
  updateUI();
}

function formatStatus(status) {
  const map = {
    'redeemed': 'Redeemed',
    'failed': 'Failed',
    'login-failed': 'Login Failed',
    'expired': 'Expired',
    'ready': 'Ready'
  };
  return map[status] || status;
}

// ============================================
// RESULTS ACTIONS
// ============================================
function copyResults() {
  const rows = document.querySelectorAll('#resultsTableBody tr');
  if (rows.length === 0) return showToast('No results to copy', 'warning');

  let text = 'Yarwin Redeem Results\n';
  text += '====================\n\n';
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    text += `${cells[0].textContent}. ${cells[1].textContent} - ${cells[2].textContent} - ${cells[3].textContent}\n`;
  });

  navigator.clipboard.writeText(text).then(() => {
    showToast('Results copied to clipboard', 'success');
  });
}

function downloadResultsCSV() {
  const rows = document.querySelectorAll('#resultsTableBody tr');
  if (rows.length === 0) return showToast('No results to download', 'warning');

  let csv = 'Index,Phone,Status,Message,Time(ms)\n';
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    csv += `${cells[0].textContent},${cells[1].textContent},"${cells[2].textContent}","${cells[3].textContent}",${cells[4].textContent}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `redeem_results_${formatDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV downloaded', 'success');
}

// ============================================
// LOGS
// ============================================
function log(type, message) {
  const entry = {
    time: new Date().toLocaleTimeString(),
    type,
    message
  };
  state.logs.push(entry);
  if (state.logs.length > 500) state.logs.shift();
  saveToStorage();
  renderLogs();
}

function renderLogs() {
  const container = $('logsContainer');
  const preview = $('recentLogs');

  if (state.logs.length === 0) {
    container.innerHTML = '<p class="empty-state"><i class="fas fa-terminal"></i> No logs yet. Start redeeming to see activity!</p>';
    preview.innerHTML = '<p class="empty-state"><i class="fas fa-inbox"></i> No activity yet. Load accounts and start redeeming!</p>';
    return;
  }

  const logHTML = state.logs.slice().reverse().map(entry => `
    <div class="log-entry">
      <span class="log-time">${entry.time}</span>
      <span class="log-type ${entry.type}">${entry.type.toUpperCase()}</span>
      <span class="log-message">${escapeHtml(entry.message)}</span>
    </div>
  `).join('');

  container.innerHTML = logHTML;

  const recent = state.logs.slice(-5).reverse().map(entry => `
    <div class="log-entry">
      <span class="log-time">${entry.time}</span>
      <span class="log-type ${entry.type}">${entry.type.toUpperCase()}</span>
      <span class="log-message">${escapeHtml(entry.message)}</span>
    </div>
  `).join('');
  preview.innerHTML = recent;
}

function copyLogs() {
  if (state.logs.length === 0) return showToast('No logs to copy', 'warning');
  const text = state.logs.map(l => `[${l.time}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast('Logs copied to clipboard', 'success');
  });
}

function clearLogs() {
  if (state.logs.length === 0) return;
  if (!confirm('Clear all logs?')) return;
  state.logs = [];
  saveToStorage();
  renderLogs();
  showToast('Logs cleared', 'info');
}

// ============================================
// UI UPDATES
// ============================================
function updateUI() {
  updateStats();
  renderAccountsTable();
  renderLogs();
  updateBadge();
}

function updateStats() {
  const total = state.accounts.length;
  const ready = state.accounts.filter(a => a.status === 'ready').length;
  const redeemed = state.accounts.filter(a => a.status === 'redeemed').length;
  const failed = state.accounts.filter(a => ['failed', 'login-failed', 'expired'].includes(a.status)).length;

  $('statTotal').textContent = total;
  $('statReady').textContent = ready;
  $('statRedeemed').textContent = redeemed;
  $('statFailed').textContent = failed;

  $('redeemAccountCount').textContent = total;
  $('accountCount').textContent = `${total} / ${CONFIG.MAX_ACCOUNTS} accounts loaded`;
}

function updateBadge() {
  $('accountBadge').textContent = state.accounts.length;
  $('accountBadge').style.display = state.accounts.length > 0 ? 'block' : 'none';
}

function renderAccountsTable() {
  const tbody = $('accountsTableBody');

  if (state.accounts.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-user-plus"></i>
            <p>No accounts loaded yet</p>
            <span>Paste accounts above to get started</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.accounts.map((acc, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><code>${acc.phone}</code></td>
      <td><span style="font-family: monospace; color: var(--text-muted);">••••••••</span></td>
      <td><span class="status-badge ${acc.status}">${formatStatus(acc.status)}</span></td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${acc.lastMessage || '-'}</td>
      <td>
        <button class="action-btn" onclick="deleteAccount(${acc.id})" title="Delete">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// ============================================
// STORAGE
// ============================================
function saveToStorage() {
  try {
    localStorage.setItem('yaarwin_accounts', JSON.stringify(state.accounts));
    localStorage.setItem('yaarwin_logs', JSON.stringify(state.logs));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

function loadFromStorage() {
  try {
    const accounts = localStorage.getItem('yaarwin_accounts');
    const logs = localStorage.getItem('yaarwin_logs');
    if (accounts) state.accounts = JSON.parse(accounts);
    if (logs) state.logs = JSON.parse(logs);
  } catch (e) {
    console.warn('Storage load failed:', e);
  }
}

// ============================================
// TOAST
// ============================================
function showToast(message, type = 'info') {
  const container = $('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  toast.innerHTML = `<i class="fas ${icons[type]}"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// UTILITIES
// ============================================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '_');
}

// Make deleteAccount globally accessible
window.deleteAccount = deleteAccount;
