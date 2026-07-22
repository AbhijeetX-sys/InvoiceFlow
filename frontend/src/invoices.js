/* ==========================================================================
   INVOICE CREATION REGISTRY & PDF PRINTING
   ========================================================================== */

import { apiFetch, showToast } from './main.js';

let invoicesCache = [];
let customersList = [];
let productsList = [];
let businessProfile = null;

export async function initInvoices() {
  await loadFormMetadata();
  await loadInvoices();
  
  setupTabControls();
  setupFilterControls();
  setupInvoiceCreator();
}

// ==========================================================================
// METADATA PRE-LOADING (Customers, Products, Business details)
// ==========================================================================
async function loadFormMetadata() {
  try {
    const [custs, prods, profile] = await Promise.all([
      apiFetch('/api/customers'),
      apiFetch('/api/products'),
      apiFetch('/api/business-profile').catch(() => null) // Suppress 404 alert
    ]);

    customersList = custs || [];
    productsList = prods || [];
    businessProfile = profile;

    populateCustomerDropdown();
  } catch (err) {
    console.error('Failed to load invoice form metadata:', err);
  }
}

function populateCustomerDropdown() {
  const select = document.getElementById('invoiceCustomerSelect');
  if (!select) return;

  // Clear except first option
  select.innerHTML = '<option value="">-- Choose a Customer --</option>';

  customersList.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.username} (${c.phone})`;
    select.appendChild(opt);
  });
}

// ==========================================================================
// INVOICES REGISTRY & FILTERS
// ==========================================================================
export async function loadInvoices() {
  const tbody = document.getElementById('invoiceTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align: center;">Loading invoices registry...</td></tr>';

  const start = document.getElementById('filterStartDate').value;
  const end = document.getElementById('filterEndDate').value;

  let url = '/api/invoices';
  const params = [];
  if (start) params.push(`start_date=${start}`);
  if (end) params.push(`end_date=${end}`);
  if (params.length > 0) {
    url += '?' + params.join('&');
  }

  try {
    const data = await apiFetch(url);
    tbody.innerHTML = '';

    if (data && data.length > 0) {
      invoicesCache = data;
      data.forEach(inv => {
        const customer = customersList.find(c => c.id === inv.customer_id);
        const customerName = customer ? customer.username : `ID: ${inv.customer_id}`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="badge" style="background-color: #eff6ff; color: #2563eb;">#${inv.id}</span></td>
          <td><strong>${inv.invoice_number}</strong></td>
          <td>${customerName}</td>
          <td>₹${inv.gst_total.toFixed(2)}</td>
          <td><strong class="text-blue">₹${inv.total_amount.toFixed(2)}</strong></td>
          <td class="text-muted">${inv.created_at}</td>
          <td class="actions-cell">
            <button class="btn-action-icon view-inv-btn" data-id="${inv.id}" title="View Details">
              <i data-lucide="eye"></i>
            </button>
            <button class="btn-action-icon download-inv-btn" data-id="${inv.id}" title="Download PDF">
              <i data-lucide="download"></i>
            </button>
            <button class="btn-action-icon danger cancel-inv-btn" data-id="${inv.id}" title="Cancel Invoice">
              <i data-lucide="x-circle"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      lucide.createIcons();
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-muted" style="text-align: center; padding: 2rem 0;">
            <i data-lucide="receipt" style="width: 2.2rem; height: 2.2rem; display: block; margin: 0 auto 0.5rem; color: var(--text-muted);"></i>
            No invoices registered. Create one in the next tab!
          </td>
        </tr>
      `;
      lucide.createIcons();
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-danger" style="text-align: center;">Failed to load invoices.</td></tr>';
  }
}

function setupFilterControls() {
  const applyBtn = document.getElementById('applyFiltersBtn');
  applyBtn.replaceWith(applyBtn.cloneNode(true));
  document.getElementById('applyFiltersBtn').addEventListener('click', loadInvoices);

  const clearBtn = document.getElementById('clearFiltersBtn');
  clearBtn.replaceWith(clearBtn.cloneNode(true));
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    loadInvoices();
  });

  // Table actions delegate
  const tbody = document.getElementById('invoiceTableBody');
  tbody.removeEventListener('click', handleInvoiceAction);
  tbody.addEventListener('click', handleInvoiceAction);
}

// ==========================================================================
// TABS NAVIGATION CONTROLLER
// ==========================================================================
function setupTabControls() {
  document.querySelectorAll('.tab-controls .tab-btn').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });

  document.querySelectorAll('.tab-controls .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = btn.getAttribute('data-tab');
      
      // Toggle tab buttons active
      document.querySelectorAll('.tab-controls .tab-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });

      // Toggle panels active
      document.querySelectorAll('#view-invoices .tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === `tab-${targetTab}`);
      });
      
      lucide.createIcons();
    });
  });
}

// ==========================================================================
// DYNAMIC INVOICE CREATION SHEETS
// ==========================================================================
function setupInvoiceCreator() {
  const addRowBtn = document.getElementById('addInvoiceRowBtn');
  addRowBtn.replaceWith(addRowBtn.cloneNode(true));
  document.getElementById('addInvoiceRowBtn').addEventListener('click', () => addInvoiceRow());

  const form = document.getElementById('createInvoiceForm');
  form.replaceWith(form.cloneNode(true));
  document.getElementById('createInvoiceForm').addEventListener('submit', handleCreateInvoiceSubmit);

  // Add initial row automatically
  const itemsContainer = document.getElementById('invoiceItemsTableBody');
  itemsContainer.innerHTML = '';
  addInvoiceRow();
}

function addInvoiceRow() {
  const container = document.getElementById('invoiceItemsTableBody');
  const tr = document.createElement('tr');

  // Generate options
  let productOpts = '<option value="">-- Choose a Product --</option>';
  productsList.forEach(p => {
    productOpts += `<option value="${p.id}">${p.name} (₹${p.price.toFixed(2)})</option>`;
  });

  tr.innerHTML = `
    <td>
      <div class="select-wrapper">
        <select class="row-product-select" required>
          ${productOpts}
        </select>
      </div>
    </td>
    <td>
      <span class="row-stock-display text-muted">-</span>
    </td>
    <td>
      <input type="number" class="row-qty-input" min="1" value="1" disabled required>
    </td>
    <td>
      <input type="number" class="row-rate-input" step="0.01" value="0.00" disabled required>
    </td>
    <td>
      <span class="row-gst-display">-</span>
    </td>
    <td>
      <strong class="row-total-display">₹0.00</strong>
    </td>
    <td>
      <button type="button" class="btn-action-icon danger delete-row-btn" title="Remove Line">
        <i data-lucide="trash-2"></i>
      </button>
    </td>
  `;

  container.appendChild(tr);
  lucide.createIcons();

  // Setup row change triggers
  const prodSelect = tr.querySelector('.row-product-select');
  const qtyInput = tr.querySelector('.row-qty-input');
  const rateInput = tr.querySelector('.row-rate-input');
  const delBtn = tr.querySelector('.delete-row-btn');

  prodSelect.addEventListener('change', () => handleRowProductChange(tr));
  qtyInput.addEventListener('input', () => recalculateRowAndTotals(tr));
  rateInput.addEventListener('input', () => recalculateRowAndTotals(tr));
  delBtn.addEventListener('click', () => {
    tr.remove();
    recalculateGlobalTotals();
  });
}

function handleRowProductChange(tr) {
  const select = tr.querySelector('.row-product-select');
  const qtyInput = tr.querySelector('.row-qty-input');
  const rateInput = tr.querySelector('.row-rate-input');
  const stockSpan = tr.querySelector('.row-stock-display');
  const gstSpan = tr.querySelector('.row-gst-display');
  
  const val = select.value;
  if (!val) {
    qtyInput.disabled = true;
    rateInput.disabled = true;
    stockSpan.textContent = '-';
    gstSpan.textContent = '-';
    recalculateRowAndTotals(tr);
    return;
  }

  const prod = productsList.find(p => p.id === parseInt(val));
  if (prod) {
    qtyInput.disabled = false;
    // Allow modifying unit rate if desired, but defaults to catalog rate
    rateInput.disabled = false;
    rateInput.value = prod.price.toFixed(2);
    
    // Show available stock
    stockSpan.textContent = prod.stock;
    if (prod.stock === 0) {
      stockSpan.className = 'row-stock-display text-danger bold-text';
      qtyInput.max = 0;
      qtyInput.value = 0;
      showToast(`Product "${prod.name}" is completely out of stock!`, 'warning');
    } else {
      stockSpan.className = 'row-stock-display text-green bold-text';
      qtyInput.max = prod.stock;
      qtyInput.value = 1;
    }

    gstSpan.textContent = `${prod.gst_percentage}%`;
    recalculateRowAndTotals(tr);
  }
}

function recalculateRowAndTotals(tr) {
  const select = tr.querySelector('.row-product-select');
  const qtyInput = tr.querySelector('.row-qty-input');
  const rateInput = tr.querySelector('.row-rate-input');
  const totalDisplay = tr.querySelector('.row-total-display');
  const stockSpan = tr.querySelector('.row-stock-display');

  const val = select.value;
  if (!val) {
    totalDisplay.textContent = '₹0.00';
    recalculateGlobalTotals();
    return;
  }

  const prod = productsList.find(p => p.id === parseInt(val));
  if (!prod) return;

  const qty = parseInt(qtyInput.value) || 0;
  const rate = parseFloat(rateInput.value) || 0;
  
  // Stock Validation
  if (qty > prod.stock) {
    qtyInput.value = prod.stock;
    showToast(`Requested quantity exceeds available stock (${prod.stock})`, 'warning');
  }

  const subtotal = rate * (parseInt(qtyInput.value) || 0);
  const gstAmount = (subtotal * prod.gst_percentage) / 100;
  const lineTotal = subtotal + gstAmount;

  totalDisplay.textContent = `₹${lineTotal.toFixed(2)}`;
  totalDisplay.setAttribute('data-subtotal', subtotal.toFixed(2));
  totalDisplay.setAttribute('data-gst', gstAmount.toFixed(2));
  totalDisplay.setAttribute('data-total', lineTotal.toFixed(2));

  recalculateGlobalTotals();
}

function recalculateGlobalTotals() {
  let subtotalSum = 0;
  let gstSum = 0;
  let grandTotalSum = 0;

  document.querySelectorAll('#invoiceItemsTableBody tr').forEach(tr => {
    const totalDisplay = tr.querySelector('.row-total-display');
    if (totalDisplay) {
      subtotalSum += parseFloat(totalDisplay.getAttribute('data-subtotal') || 0);
      gstSum += parseFloat(totalDisplay.getAttribute('data-gst') || 0);
      grandTotalSum += parseFloat(totalDisplay.getAttribute('data-total') || 0);
    }
  });

  document.getElementById('invoiceSubtotal').textContent = `₹${subtotalSum.toFixed(2)}`;
  document.getElementById('invoiceGstTotal').textContent = `₹${gstSum.toFixed(2)}`;
  document.getElementById('invoiceGrandTotal').textContent = `₹${grandTotalSum.toFixed(2)}`;
}

async function handleCreateInvoiceSubmit(e) {
  e.preventDefault();

  const customerId = parseInt(document.getElementById('invoiceCustomerSelect').value);
  if (!customerId) {
    showToast('Please select a customer', 'warning');
    return;
  }

  const productsPayload = [];
  let itemsCount = 0;

  document.querySelectorAll('#invoiceItemsTableBody tr').forEach(tr => {
    const pSelect = tr.querySelector('.row-product-select');
    const qInput = tr.querySelector('.row-qty-input');
    
    if (pSelect && pSelect.value) {
      productsPayload.push({
        product_id: parseInt(pSelect.value),
        quantity: parseInt(qInput.value)
      });
      itemsCount++;
    }
  });

  if (itemsCount === 0) {
    showToast('Add at least one product line item to generate invoice.', 'warning');
    return;
  }

  const payload = {
    customer_id: customerId,
    products: productsPayload
  };

  try {
    const data = await apiFetch('/api/invoices', {
      method: 'POST',
      body: payload
    });

    if (data) {
      showToast(`Invoice ${data.invoice_number} created successfully!`, 'success');
      
      // Reset form
      document.getElementById('invoiceCustomerSelect').value = '';
      const tbody = document.getElementById('invoiceItemsTableBody');
      tbody.innerHTML = '';
      addInvoiceRow();
      recalculateGlobalTotals();

      // Refresh listings
      await loadInvoices();
      
      // Redirect to registry tab
      document.querySelector('.tab-btn[data-tab="invoice-list"]').click();
    }
  } catch (err) {
    // Handled by apiFetch
  }
}

// ==========================================================================
// ACTIONS DELEGATION & DETAILS POPUP
// ==========================================================================
async function handleInvoiceAction(e) {
  const viewBtn = e.target.closest('.view-inv-btn');
  const dlBtn = e.target.closest('.download-inv-btn');
  const cancelBtn = e.target.closest('.cancel-inv-btn');

  if (viewBtn) {
    const id = parseInt(viewBtn.getAttribute('data-id'));
    await openInvoiceDetailModal(id);
  }

  if (dlBtn) {
    const id = parseInt(dlBtn.getAttribute('data-id'));
    await downloadInvoicePdf(id);
  }

  if (cancelBtn) {
    const id = parseInt(cancelBtn.getAttribute('data-id'));
    const inv = invoicesCache.find(i => i.id === id);
    if (!inv) return;

    if (confirm(`WARNING: Cancel invoice "${inv.invoice_number}"? This will void the invoice and return items back to your inventory stock.`)) {
      try {
        const data = await apiFetch(`/api/invoices/${id}`, { method: 'DELETE' });
        if (data) {
          showToast('Invoice cancelled and inventory restored.', 'success');
          await loadInvoices();
        }
      } catch (err) {
        // Handled by apiFetch
      }
    }
  }
}

async function openInvoiceDetailModal(invoiceId) {
  try {
    const data = await apiFetch(`/api/invoices/${invoiceId}`);
    if (!data) return;

    // Fetch latest profile again in case updated
    if (!businessProfile) {
      businessProfile = await apiFetch('/api/business-profile').catch(() => null);
    }

    document.getElementById('invoiceDetailNumber').textContent = data.invoice_number;
    document.getElementById('invoiceDetailDate').textContent = `Generated: ${data.created_at}`;

    // 1. Seller Info
    const sellerName = document.getElementById('invPrevSellerName');
    const sellerOwner = document.getElementById('invPrevSellerOwner');
    const sellerPhone = document.getElementById('invPrevSellerPhone');
    const sellerEmail = document.getElementById('invPrevSellerEmail');
    const sellerGst = document.getElementById('invPrevSellerGst');

    if (businessProfile) {
      sellerName.textContent = businessProfile.business_name;
      sellerOwner.textContent = `Proprietor: ${businessProfile.owner_name}`;
      sellerPhone.textContent = `Ph: ${businessProfile.phone}`;
      sellerEmail.textContent = `Email: ${businessProfile.email}`;
      sellerGst.innerHTML = `<strong>GSTIN:</strong> ${businessProfile.gst_number}`;
    } else {
      sellerName.innerHTML = '<span class="text-danger">Profile Missing! Setup in profile tab.</span>';
      sellerOwner.textContent = '';
      sellerPhone.textContent = '';
      sellerEmail.textContent = '';
      sellerGst.textContent = '';
    }

    // 2. Customer Info
    document.getElementById('invPrevCustName').textContent = data.customer.name;
    document.getElementById('invPrevCustPhone').textContent = `Ph: ${data.customer.phone}`;
    document.getElementById('invPrevCustEmail').textContent = `Email: ${data.customer.email || 'N/A'}`;
    document.getElementById('invPrevCustAddress').innerHTML = `<strong>Billing Address:</strong><br>${data.customer.address}`;

    // 3. Line Items
    const itemsTbody = document.getElementById('invPrevItemsBody');
    itemsTbody.innerHTML = '';

    data.items.forEach(item => {
      const lineGst = (item.price * item.quantity * item.gst_percentage) / 100;
      const lineTotal = (item.price * item.quantity) + lineGst;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.product_name}</strong></td>
        <td class="text-right">₹${item.price.toFixed(2)}</td>
        <td class="text-right">${item.quantity}</td>
        <td class="text-right">${item.gst_percentage}%</td>
        <td class="text-right">₹${lineGst.toFixed(2)}</td>
        <td class="text-right"><strong>₹${lineTotal.toFixed(2)}</strong></td>
      `;
      itemsTbody.appendChild(tr);
    });

    // 4. Summary Totals
    const subtotal = data.total_amount - data.gst_total;
    document.getElementById('invPrevSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('invPrevGst').textContent = `₹${data.gst_total.toFixed(2)}`;
    document.getElementById('invPrevGrandTotal').textContent = `₹${data.total_amount.toFixed(2)}`;

    // Set download action target id
    const dlBtn = document.getElementById('downloadInvoicePdfBtn');
    dlBtn.onclick = () => downloadInvoicePdf(invoiceId);

    // Show modal
    window.openModal('invoiceDetailModal');
  } catch (err) {
    console.error('Failed to render invoice details preview:', err);
  }
}

// Download PDF document as blob attachment
async function downloadInvoicePdf(invoiceId) {
  try {
    showToast('Compiling PDF file... please wait.', 'info');
    
    const response = await apiFetch(`/api/invoices/${invoiceId}/pdf`);

    if (!response) {
      throw new Error('Failed to retrieve PDF data');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_INV-${invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    
    showToast('ReportLab PDF compiled and downloaded!', 'success');
  } catch (err) {
    showToast(err.message || 'PDF print compilation failed', 'error');
  }
}
