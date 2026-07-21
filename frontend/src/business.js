/* ==========================================================================
   BUSINESS PROFILE PROFILE CONTROLLER
   ========================================================================== */

import { apiFetch, showToast } from './main.js';

let profileExists = false;

export async function initBusinessProfile() {
  await loadBusinessProfile();
  
  // Set up save listener once
  const form = document.getElementById('businessProfileForm');
  form.removeEventListener('submit', handleProfileSave);
  form.addEventListener('submit', handleProfileSave);
}

// Fetch current business profile from backend
async function loadBusinessProfile() {
  const alertBanner = document.getElementById('noBusinessProfileAlert');
  
  try {
    const data = await apiFetch('/api/business-profile');
    
    if (data) {
      profileExists = true;
      alertBanner.classList.add('hidden');
      
      // Populate fields
      document.getElementById('businessName').value = data.business_name || '';
      document.getElementById('businessOwner').value = data.owner_name || '';
      document.getElementById('businessEmail').value = data.email || '';
      document.getElementById('businessPhone').value = data.phone || '';
      document.getElementById('businessAddress').value = data.address || '';
      document.getElementById('businessGst').value = data.gst_number || '';
    }
  } catch (err) {
    // If it's a 404, it means profile hasn't been created yet
    if (err.message.includes('404')) {
      profileExists = false;
      alertBanner.classList.remove('hidden');
      clearFormFields();
    } else {
      console.error('Failed to load profile:', err);
    }
  }
}

// Clear input forms
function clearFormFields() {
  document.getElementById('businessName').value = '';
  document.getElementById('businessOwner').value = '';
  document.getElementById('businessEmail').value = '';
  document.getElementById('businessPhone').value = '';
  document.getElementById('businessAddress').value = '';
  document.getElementById('businessGst').value = '';
}

// Handle create/update profile submit
async function handleProfileSave(e) {
  e.preventDefault();

  const business_name = document.getElementById('businessName').value;
  const owner_name = document.getElementById('businessOwner').value;
  const email = document.getElementById('businessEmail').value;
  const phone = document.getElementById('businessPhone').value;
  const address = document.getElementById('businessAddress').value;
  const gst_number = document.getElementById('businessGst').value;

  const profileData = {
    business_name,
    owner_name,
    email,
    phone,
    address,
    gst_number
  };

  const method = profileExists ? 'PUT' : 'POST';
  const url = '/api/business-profile';

  try {
    const response = await apiFetch(url, {
      method: method,
      body: profileData
    });

    if (response) {
      showToast('Business profile saved successfully!', 'success');
      profileExists = true;
      document.getElementById('noBusinessProfileAlert').classList.add('hidden');
      await loadBusinessProfile();
    }
  } catch (err) {
    // Error notification handled by apiFetch
  }
}
