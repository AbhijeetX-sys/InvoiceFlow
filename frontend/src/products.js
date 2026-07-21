/* ==========================================================================
   PRODUCTS CATALOG & STOCK LOG AUDIT (CRUD)
   ========================================================================== */

import { apiFetch, showToast } from './main.js';

let productsCache = [];

export async function initProducts() {
  await loadProducts();
  setupEventListeners();
}

// Fetch and render products list
export async function loadProducts() {
  try {
    const data = await apiFetch('/api/products');
    if (data) {
      productsCache = data;
      renderProductsTable(data);
    }
  } catch (err) {
    console.error('Failed to load products:', err);
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('productTableBody');
  tbody.innerHTML = '';

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-muted" style="text-align: center; padding: 2rem 0;">
          <i data-lucide="package" style="width: 2rem; height: 2rem; display: block; margin: 0 auto 0.5rem; color: var(--text-muted);"></i>
          No products added to catalog yet. Click "Add Product" to start.
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  products.forEach(prod => {
    const tr = document.createElement('tr');
    
    // Check stock thresholds
    let badgeClass = 'badge-success';
    let badgeText = `In Stock (${prod.stock})`;
    
    if (prod.stock === 0) {
      badgeClass = 'badge-danger';
      badgeText = 'Out of Stock';
    } else if (prod.stock <= 10) {
      badgeClass = 'badge-warning';
      badgeText = `Low Stock (${prod.stock})`;
    }

    tr.innerHTML = `
      <td>${prod.id}</td>
      <td><strong>${prod.name}</strong></td>
      <td><span class="badge" style="background-color: #f1f5f9; color: var(--text-main); font-weight: 500;">${prod.category}</span></td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${prod.description || '<span class="text-muted">No description</span>'}
      </td>
      <td><strong>₹${prod.price.toFixed(2)}</strong></td>
      <td>${prod.gst_percentage}%</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      <td class="actions-cell">
        <button class="btn-action-icon restock-prod-btn" data-id="${prod.id}" title="Restock Inventory">
          <i data-lucide="plus-circle"></i>
        </button>
        <button class="btn-action-icon edit-prod-btn" data-id="${prod.id}" title="Edit Product">
          <i data-lucide="pencil"></i>
        </button>
        <button class="btn-action-icon danger delete-prod-btn" data-id="${prod.id}" title="Delete Product">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  lucide.createIcons();
}

function setupEventListeners() {
  // Add Product button opens modal
  const openAddBtn = document.getElementById('openAddProductModalBtn');
  openAddBtn.replaceWith(openAddBtn.cloneNode(true));
  document.getElementById('openAddProductModalBtn').addEventListener('click', () => {
    openProductFormModal();
  });

  // Handle Product Form Submit
  const form = document.getElementById('productForm');
  form.replaceWith(form.cloneNode(true));
  document.getElementById('productForm').addEventListener('submit', handleProductSubmit);

  // Handle Restock Form Submit
  const restockForm = document.getElementById('restockForm');
  restockForm.replaceWith(restockForm.cloneNode(true));
  document.getElementById('restockForm').addEventListener('submit', handleRestockSubmit);

  // Table actions (edit/delete/restock)
  const tbody = document.getElementById('productTableBody');
  tbody.removeEventListener('click', handleTableAction);
  tbody.addEventListener('click', handleTableAction);
}

function openProductFormModal(productId = null) {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const idInput = document.getElementById('productFormId');
  const stockWrapper = document.getElementById('productStockWrapper');
  const stockLabel = stockWrapper.querySelector('label');
  const stockInput = document.getElementById('productStock');
  
  // Clear inputs
  document.getElementById('productName').value = '';
  document.getElementById('productCategory').value = '';
  document.getElementById('productDescription').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productGst').value = '';
  stockInput.value = '';

  if (productId) {
    title.textContent = 'Edit Product';
    idInput.value = productId;
    stockLabel.innerHTML = 'Modify Quantity in Stock <span class="required">*</span>';
    
    // Find product in cache
    const prod = productsCache.find(p => p.id === productId);
    if (prod) {
      document.getElementById('productName').value = prod.name;
      document.getElementById('productCategory').value = prod.category;
      document.getElementById('productDescription').value = prod.description || '';
      document.getElementById('productPrice').value = prod.price;
      document.getElementById('productGst').value = prod.gst_percentage;
      stockInput.value = prod.stock;
    }
  } else {
    title.textContent = 'Add Product';
    idInput.value = '';
    stockLabel.innerHTML = 'Initial Quantity in Stock <span class="required">*</span>';
  }

  modal.classList.remove('hidden');
  lucide.createIcons();
}

function openRestockModal(productId) {
  const modal = document.getElementById('restockModal');
  const prod = productsCache.find(p => p.id === productId);
  if (!prod) return;

  document.getElementById('restockProductId').value = productId;
  document.getElementById('restockProductMeta').textContent = `Product: ${prod.name} (Current Stock: ${prod.stock})`;
  document.getElementById('restockQuantity').value = '';

  modal.classList.remove('hidden');
  lucide.createIcons();
}

async function handleProductSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('productFormId').value;
  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategory').value.trim();
  const description = document.getElementById('productDescription').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const gst_percentage = parseFloat(document.getElementById('productGst').value);
  const stock = parseInt(document.getElementById('productStock').value);

  const payload = {
    name,
    category,
    description: description || null,
    price,
    gst_percentage,
    stock
  };

  const isEdit = id !== '';
  const url = isEdit ? `/api/products/${id}` : '/api/products';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const data = await apiFetch(url, { method, body: payload });
    if (data) {
      showToast(
        isEdit ? 'Product updated successfully!' : 'Product added successfully!',
        'success'
      );
      document.getElementById('productModal').classList.add('hidden');
      await loadProducts();
    }
  } catch (err) {
    // Handled by apiFetch
  }
}

async function handleRestockSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('restockProductId').value;
  const quantity = parseInt(document.getElementById('restockQuantity').value);

  try {
    const data = await apiFetch(`/api/products/${id}/restock`, {
      method: 'POST',
      body: { quantity }
    });

    if (data) {
      showToast('Inventory restocked successfully!', 'success');
      document.getElementById('restockModal').classList.add('hidden');
      await loadProducts();
    }
  } catch (err) {
    // Handled by apiFetch
  }
}

async function handleTableAction(e) {
  const editBtn = e.target.closest('.edit-prod-btn');
  const deleteBtn = e.target.closest('.delete-prod-btn');
  const restockBtn = e.target.closest('.restock-prod-btn');

  if (editBtn) {
    const id = parseInt(editBtn.getAttribute('data-id'));
    openProductFormModal(id);
  }

  if (restockBtn) {
    const id = parseInt(restockBtn.getAttribute('data-id'));
    openRestockModal(id);
  }

  if (deleteBtn) {
    const id = parseInt(deleteBtn.getAttribute('data-id'));
    const prod = productsCache.find(p => p.id === id);
    if (!prod) return;

    if (confirm(`Are you sure you want to delete product "${prod.name}" from catalog?`)) {
      try {
        const data = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
        if (data) {
          showToast('Product removed successfully.', 'success');
          await loadProducts();
        }
      } catch (err) {
        // Handled by apiFetch (fails if product is linked to an existing invoice item)
      }
    }
  }
}

// ==========================================================================
// STOCK HISTORIC LOG AUDIT
// ==========================================================================
export async function initStockHistory() {
  const tbody = document.getElementById('stockLogTableBody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-muted" style="text-align: center; padding: 2rem 0;">
        Loading transaction audit logs...
      </td>
    </tr>
  `;

  try {
    const data = await apiFetch('/api/stock-history');
    tbody.innerHTML = '';

    if (data && data.length > 0) {
      data.forEach(item => {
        const tr = document.createElement('tr');
        
        let actionBadgeClass = 'badge-success';
        if (item.action === 'SALE') actionBadgeClass = 'badge-danger';
        if (item.action === 'SALE_CANCELLED') actionBadgeClass = 'badge-warning';

        // Formatting shift quantity
        const sign = item.changed_quantity > 0 ? '+' : '';

        tr.innerHTML = `
          <td><strong>${item.product_name}</strong></td>
          <td><span class="badge ${actionBadgeClass}">${item.action}</span></td>
          <td>${item.previous_stock} items</td>
          <td class="bold-text">${sign}${item.changed_quantity}</td>
          <td><strong>${item.current_stock} items</strong></td>
          <td>${item.invoice_id ? `<span class="badge" style="background-color: #eff6ff; color: #2563eb;">INV-#${item.invoice_id}</span>` : '<span class="text-muted">N/A</span>'}</td>
          <td class="text-muted">${item.created_at}</td>
        `;
        tbody.appendChild(tr);
      });
      lucide.createIcons();
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-muted" style="text-align: center; padding: 2rem 0;">
            No stock events have been logged yet.
          </td>
        </tr>
      `;
      lucide.createIcons();
    }
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-danger" style="text-align: center; padding: 2rem 0;">
          Failed to load stock history logs.
        </td>
      </tr>
    `;
    console.error('Failed to load stock history:', err);
  }
}
