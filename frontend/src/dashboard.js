/* ==========================================================================
   DASHBOARD VISUALIZATIONS & METRICS SUMMARY
   ========================================================================== */

import { apiFetch } from './main.js';

// Retain chart references to destroy them on reload (prevents hover overlap glitches)
let salesChartInstance = null;
let productsChartInstance = null;

export async function initDashboard() {
  await Promise.all([
    loadMetrics(),
    loadMonthlySalesChart(),
    loadTopProductsChart(),
    loadLowStockAlerts()
  ]);
}

// 1. Fetch metrics summary counts
async function loadMetrics() {
  try {
    const data = await apiFetch('/api/dashboard');
    if (data && data.Dashboard) {
      const stats = data.Dashboard;
      document.getElementById('totalSales').textContent = `₹${stats.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      document.getElementById('totalInvoices').textContent = stats.total_invoices;
      document.getElementById('totalCustomers').textContent = stats.total_customers;
      document.getElementById('totalProducts').textContent = stats.total_product;
    }
  } catch (err) {
    console.error('Failed to load metrics:', err);
  }
}

// 2. Fetch monthly sales data and render line chart
async function loadMonthlySalesChart() {
  try {
    const data = await apiFetch('/api/monthly-sales');
    if (!data) return;

    const ctx = document.getElementById('monthlySalesChart').getContext('2d');
    
    if (salesChartInstance) {
      salesChartInstance.destroy();
    }

    salesChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels.length > 0 ? data.labels : ['No Data'],
        datasets: [{
          label: 'Monthly Sales',
          data: data.sales.length > 0 ? data.sales : [0],
          backgroundColor: 'rgba(37, 99, 235, 0.75)',
          borderColor: '#2563eb',
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: function(value) {
                return '₹' + value.toLocaleString('en-IN');
              }
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  } catch (err) {
    console.error('Failed to render sales chart:', err);
  }
}

// 3. Fetch top products and render doughnut chart
async function loadTopProductsChart() {
  try {
    const data = await apiFetch('/api/top-products');
    if (!data) return;

    const ctx = document.getElementById('topProductsChart').getContext('2d');
    
    if (productsChartInstance) {
      productsChartInstance.destroy();
    }

    const hasData = data.products && data.products.length > 0;

    productsChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: hasData ? data.products : ['No Sales Recorded'],
        datasets: [{
          data: hasData ? data.quantity : [1],
          backgroundColor: hasData ? [
            '#2563eb', // primary blue
            '#10b981', // green
            '#f59e0b', // amber
            '#8b5cf6', // purple
            '#ec4899'  // pink
          ] : ['#cbd5e1'],
          borderWidth: 1,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { family: 'Outfit' } }
          }
        },
        cutout: '65%'
      }
    });
  } catch (err) {
    console.error('Failed to render top products chart:', err);
  }
}

// 4. Fetch low stock items and render warning alerts table
async function loadLowStockAlerts() {
  try {
    const data = await apiFetch('/api/low-stock');
    const tbody = document.getElementById('lowStockList');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data && data.low_stock && data.low_stock.length > 0) {
      data.low_stock.forEach(item => {
        const tr = document.createElement('tr');
        
        let badgeClass = 'badge-danger';
        if (item.stock > 0) badgeClass = 'badge-warning';

        tr.innerHTML = `
          <td><strong>${item.name}</strong></td>
          <td><span class="badge ${badgeClass}">${item.stock} items left</span></td>
          <td>
            <a href="#products" class="btn btn-secondary btn-sm">
              <i data-lucide="plus"></i> Restock
            </a>
          </td>
        `;
        tbody.appendChild(tr);
      });
      lucide.createIcons();
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-muted" style="text-align: center; padding: 1.5rem 0;">
            <i data-lucide="shield-check" style="width: 1.5rem; height: 1.5rem; display: inline-block; color: #10b981; vertical-align: middle; margin-right: 0.5rem;"></i>
            All inventory levels are healthy!
          </td>
        </tr>
      `;
      lucide.createIcons();
    }
  } catch (err) {
    console.error('Failed to load low stock log:', err);
  }
}
