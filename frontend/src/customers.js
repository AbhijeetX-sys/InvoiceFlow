/* ==========================================================================
   CUSTOMERS REGISTRY MODULE (CRUD)
   ========================================================================== */

import { apiFetch, showToast } from './main.js';

let customersCache = [];

export async function initCustomers() {
  await loadCustomers();
  setupEventListeners();
}

// Fetch and render customer list
export async function loadCustomers() {
  try {
    const data = await apiFetch('/api/customers');
    if (data) {
      customersCache = data;
      renderCustomersTable(data);
    }
  } catch (err) {
    console.error('Failed to load customers:', err);
  }
}

function renderCustomersTable(customers) {
  const tbody = document.getElementById('customerTableBody');
  tbody.innerHTML = '';

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-muted" style="text-align: center; padding: 2rem 0;">
          <i data-lucide="users-2" style="width: 2rem; height: 2rem; display: block; margin: 0 auto 0.5rem; color: var(--text-muted);"></i>
          No customers registered yet. Click "Add Customer" to start.
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  customers.forEach(cust => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${cust.username}</strong></td>
      <td>${cust.email || '<span class="text-muted">N/A</span>'}</td>
      <td>${cust.phone}</td>
      <td>${cust.address}</td>
      <td class="actions-cell">
        <button class="btn-action-icon edit-cust-btn" data-id="${cust.id}" title="Edit Customer">
          <i data-lucide="pencil"></i>
        </button>
        <button class="btn-action-icon danger delete-cust-btn" data-id="${cust.id}" title="Delete Customer">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  lucide.createIcons();
}

function setupEventListeners() {
  // Add Customer button opens modal
  const openAddBtn = document.getElementById('openAddCustomerModalBtn');
  openAddBtn.replaceWith(openAddBtn.cloneNode(true));
  document.getElementById('openAddCustomerModalBtn').addEventListener('click', () => {
    openCustomerFormModal();
  });

  // Handle Form Submit
  const form = document.getElementById('customerForm');
  form.replaceWith(form.cloneNode(true));
  document.getElementById('customerForm').addEventListener('submit', handleCustomerSubmit);

  // Table actions (edit/delete)
  const tbody = document.getElementById('customerTableBody');
  tbody.removeEventListener('click', handleTableAction);
  tbody.addEventListener('click', handleTableAction);
}

function openCustomerFormModal(customerId = null) {
  const modal = document.getElementById('customerModal');
  const title = document.getElementById('customerModalTitle');
  const idInput = document.getElementById('customerFormId');
  
  // Clear inputs
  document.getElementById('customerUsername').value = '';
  document.getElementById('customerEmail').value = '';
  document.getElementById('customerPhone').value = '';
  document.getElementById('customerAddress').value = '';

  if (customerId) {
    title.textContent = 'Edit Customer';
    idInput.value = customerId;
    
    // Find customer in cache
    const cust = customersCache.find(c => c.id === customerId);
    if (cust) {
      document.getElementById('customerUsername').value = cust.username;
      document.getElementById('customerEmail').value = cust.email || '';
      document.getElementById('customerPhone').value = cust.phone;
      document.getElementById('customerAddress').value = cust.address;
    }
  } else {
    title.textContent = 'Add Customer';
    idInput.value = '';
  }

  modal.classList.remove('hidden');
  lucide.createIcons();
}

async function handleCustomerSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('customerFormId').value;
  const username = document.getElementById('customerUsername').value.trim();
  const email = document.getElementById('customerEmail').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const address = document.getElementById('customerAddress').value.trim();

  const payload = {
    username,
    email: email || null,
    phone,
    address
  };

  const isEdit = id !== '';
  const url = isEdit ? `/api/customers/${id}` : '/api/customers';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const data = await apiFetch(url, { method, body: payload });
    if (data) {
      showToast(
        isEdit ? 'Customer updated successfully!' : 'Customer added successfully!',
        'success'
      );
      document.getElementById('customerModal').classList.add('hidden');
      await loadCustomers();
    }
  } catch (err) {
    // Handled by apiFetch
  }
}

async function handleTableAction(e) {
  const editBtn = e.target.closest('.edit-cust-btn');
  const deleteBtn = e.target.closest('.delete-cust-btn');

  if (editBtn) {
    const id = parseInt(editBtn.getAttribute('data-id'));
    openCustomerFormModal(id);
  }

  if (deleteBtn) {
    const id = parseInt(deleteBtn.getAttribute('data-id'));
    const cust = customersCache.find(c => c.id === id);
    if (!cust) return;

    if (confirm(`Are you sure you want to delete customer "${cust.username}"?`)) {
      try {
        const data = await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (data) {
          showToast('Customer deleted successfully.', 'success');
          await loadCustomers();
        }
      } catch (err) {
        // Handled by apiFetch (e.g. if customer is used in an invoice, it will display a warning toast)
      }
    }
  }
}
