/* ==========================================================================
   GLOBAL APP STATE, AUTHENTICATION, SPA ROUTER & API CLIENT
   ========================================================================== */

// Global state
export const state = {
  token: localStorage.getItem('token') || null,
  user: null,
  activeView: 'dashboard'
};

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-octagon';
  if (type === 'warning') icon = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <div class="toast-text">${message}</div>
  `;
  
  container.appendChild(toast);
  lucide.createIcons(); // Re-render icon

  // Auto-dismiss
  setTimeout(() => {
    toast.style.animation = 'fade-in var(--transition-fast) reverse';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

// ==========================================================================
// SECURE API CLIENT
// ==========================================================================
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '' 
  : 'https://invoiceflow-production-2c53.up.railway.app';

export async function apiFetch(url, options = {}) {
  // Set default headers
  const headers = new Headers(options.headers || {});
  
  if (state.token) {
    headers.set('Authorization', `Bearer ${state.token}`);
  }
  
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
    if (typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const fetchOptions = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${BASE_URL}${url}`, fetchOptions);
    
    // Handle unauthorized sessions
    if (response.status === 401 && state.token) {
      showToast('Your session has expired. Please log in again.', 'warning');
      logout();
      return null;
    }

    // Handle JSON responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `API error (status ${response.status})`);
      }
      return data;
    }
    
    // For blob responses (like PDF files)
    if (response.ok) {
      return response;
    }

    throw new Error(`API error (status ${response.status})`);
  } catch (error) {
    showToast(error.message || 'Network connection failed', 'error');
    throw error;
  }
}

// ==========================================================================
// AUTHENTICATION LOGIC
// ==========================================================================
export function setToken(token) {
  if (token) {
    state.token = token;
    localStorage.setItem('token', token);
  } else {
    state.token = null;
    localStorage.removeItem('token');
  }
  updateAuthUI();
}

export function logout() {
  setToken(null);
  state.user = null;
  window.location.hash = '';
  updateAuthUI();
  showToast('You have signed out successfully.', 'success');
}

export async function loadUserProfile() {
  if (!state.token) return;
  try {
    const user = await apiFetch('/api/profile');
    if (user) {
      state.user = user;
      document.getElementById('profileUsername').textContent = user.username;
      document.getElementById('profileEmail').textContent = user.email;
      document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
    }
  } catch (err) {
    console.error('Failed to load user profile:', err);
  }
}

function updateAuthUI() {
  const authView = document.getElementById('authView');
  const appLayout = document.getElementById('appLayout');
  
  if (state.token) {
    authView.classList.add('hidden');
    appLayout.classList.remove('hidden');
    loadUserProfile();
    // Load initial view
    navigate(window.location.hash || '#dashboard');
  } else {
    authView.classList.remove('hidden');
    appLayout.classList.add('hidden');
  }
  lucide.createIcons();
}

// ==========================================================================
// SPA ROUTER
// ==========================================================================
import { initDashboard } from './dashboard.js';
import { initBusinessProfile } from './business.js';
import { initCustomers } from './customers.js';
import { initProducts } from './products.js';
import { initInvoices } from './invoices.js';
import { initStockHistory } from './products.js'; // stock history is standard in products module

async function navigate(hash) {
  if (!state.token) return;
  
  const view = hash.replace('#', '') || 'dashboard';
  state.activeView = view;

  // Toggle active class on sidebar items
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
    if (item.getAttribute('data-view') === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Toggle active class on panels
  document.querySelectorAll('.app-main .view-panel').forEach(panel => {
    if (panel.id === `view-${view}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Initialize specific view modules
  try {
    if (view === 'dashboard') await initDashboard();
    else if (view === 'business-profile') await initBusinessProfile();
    else if (view === 'customers') await initCustomers();
    else if (view === 'products') await initProducts();
    else if (view === 'invoices') await initInvoices();
    else if (view === 'stock-history') await initStockHistory();
  } catch (error) {
    console.error(`Error loading view ${view}:`, error);
  }
  
  // Refresh icons
  lucide.createIcons();
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Update icons initially
  lucide.createIcons();
  
  // Form submission: Login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const data = await apiFetch('/api/login', {
        method: 'POST',
        body: { email, password }
      });

      if (data && data.token) {
        showToast('Login successful! Welcome back.', 'success');
        setToken(data.token);
      }
    } catch (err) {
      // Errors handled by apiFetch
    }
  });

  // Form submission: Register
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
      const data = await apiFetch('/api/register', {
        method: 'POST',
        body: { username, email, password }
      });

      if (data) {
        showToast('Account created successfully! Please sign in.', 'success');
        // Switch to login form
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('loginEmail').value = email;
      }
    } catch (err) {
      // Errors handled by apiFetch
    }
  });

  // Switch form links
  document.getElementById('switchToRegister').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
  });

  document.getElementById('switchToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
  });

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Hash navigation
  window.addEventListener('hashchange', () => {
    navigate(window.location.hash);
  });

  // Set up auth state UI
  updateAuthUI();
});
