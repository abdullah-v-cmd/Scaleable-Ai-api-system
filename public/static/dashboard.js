// Dashboard frontend JavaScript

// API base URL
const API_BASE = window.location.origin;

// State management
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let apiKey = localStorage.getItem('apiKey');

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  setupEventListeners();
  
  if (authToken) {
    loadUserDashboard();
  }
});

// Setup event listeners
function setupEventListeners() {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', showLoginModal);
  }
}

// Authentication initialization
function initAuth() {
  if (authToken) {
    fetchCurrentUser();
  }
}

// Fetch current user
async function fetchCurrentUser() {
  try {
    const response = await axios.get(`${API_BASE}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    currentUser = response.data.user;
    updateUIForAuthenticatedUser();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    localStorage.removeItem('authToken');
    authToken = null;
  }
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser() {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn && currentUser) {
    loginBtn.innerHTML = `<i class="fas fa-user mr-2"></i>${currentUser.username}`;
    loginBtn.onclick = showDashboard;
  }
}

// Show login modal
function showLoginModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
      <h2 class="text-2xl font-bold mb-6">Login</h2>
      <form id="loginForm">
        <div class="mb-4">
          <label class="block text-gray-700 mb-2">Email</label>
          <input type="email" id="loginEmail" required 
                 class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <div class="mb-6">
          <label class="block text-gray-700 mb-2">Password</label>
          <input type="password" id="loginPassword" required 
                 class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <div class="flex justify-between items-center">
          <button type="button" onclick="this.closest('.fixed').remove()" 
                  class="text-gray-600 hover:text-gray-800">Cancel</button>
          <button type="submit" 
                  class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
            Login
          </button>
        </div>
      </form>
      <div class="mt-4 text-center">
        <a href="#" onclick="showRegisterModal()" class="text-indigo-600 hover:text-indigo-700">
          Don't have an account? Register
        </a>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email,
      password
    });
    
    authToken = response.data.token;
    apiKey = response.data.user.apiKey;
    currentUser = response.data.user;
    
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('apiKey', apiKey);
    
    document.querySelector('.fixed').remove();
    updateUIForAuthenticatedUser();
    showNotification('Login successful!', 'success');
    loadUserDashboard();
  } catch (error) {
    showNotification(error.response?.data?.error || 'Login failed', 'error');
  }
}

// Show register modal
function showRegisterModal() {
  document.querySelector('.fixed')?.remove();
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
      <h2 class="text-2xl font-bold mb-6">Register</h2>
      <form id="registerForm">
        <div class="mb-4">
          <label class="block text-gray-700 mb-2">Email</label>
          <input type="email" id="regEmail" required 
                 class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 mb-2">Username</label>
          <input type="text" id="regUsername" required 
                 class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <div class="mb-6">
          <label class="block text-gray-700 mb-2">Password (min 8 characters)</label>
          <input type="password" id="regPassword" required minlength="8"
                 class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <div class="flex justify-between items-center">
          <button type="button" onclick="this.closest('.fixed').remove()" 
                  class="text-gray-600 hover:text-gray-800">Cancel</button>
          <button type="submit" 
                  class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
            Register
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

// Handle registration
async function handleRegister(e) {
  e.preventDefault();
  
  const email = document.getElementById('regEmail').value;
  const username = document.getElementById('regUsername').value;
  const password = document.getElementById('regPassword').value;
  
  try {
    const response = await axios.post(`${API_BASE}/api/auth/register`, {
      email,
      username,
      password
    });
    
    authToken = response.data.token;
    apiKey = response.data.user.apiKey;
    currentUser = response.data.user;
    
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('apiKey', apiKey);
    
    document.querySelector('.fixed').remove();
    updateUIForAuthenticatedUser();
    showNotification('Registration successful!', 'success');
    loadUserDashboard();
  } catch (error) {
    showNotification(error.response?.data?.error || 'Registration failed', 'error');
  }
}

// Load user dashboard
async function loadUserDashboard() {
  try {
    const [statsRes, logsRes] = await Promise.all([
      axios.get(`${API_BASE}/api/analytics/stats`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }),
      axios.get(`${API_BASE}/api/analytics/logs?limit=10`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
    ]);
    
    console.log('Dashboard data loaded:', statsRes.data, logsRes.data);
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// Show dashboard
function showDashboard() {
  window.location.href = '/dashboard.html';
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  } text-white`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
