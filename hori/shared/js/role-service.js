/**
 * RoleService
 * Role-based access control for the PHO-QATD LIMS admin portal.
 * Defines the permission matrix and provides menu rendering + page guards.
 */

// ─── Permission matrix ────────────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  admin: [
    'chain-of-custody-details',
    'billing-confirm-pay',
    'testing-information',
    'approve-results',
    'history-information',
    'certificate',
    'summary-report',
  ],
  cashier: [
    'billing-confirm-pay',
  ],
  lab_technician: [
    'chain-of-custody-details',
    'testing-information',
    'certificate',
    'history-information',
    'summary-report',
  ],
};

// ─── Menu definitions (label + page id + icon) ───────────────────────────────
const MENU_ITEMS = [
  { id: 'chain-of-custody-details', label: 'Chain of Custody',   icon: 'fa-link',          file: 'chain-of-custody-details.html' },
  { id: 'billing-confirm-pay',      label: 'Billing / Payment',  icon: 'fa-file-invoice-dollar', file: 'billing-confirm-pay.html' },
  { id: 'testing-information',      label: 'Testing Information',icon: 'fa-flask',          file: 'testing-information.html' },
  { id: 'approve-results',          label: 'Approve Results',    icon: 'fa-check-circle',   file: 'approve-results.html' },
  { id: 'history-information',      label: 'History Information',icon: 'fa-check-circle',   file: 'history-information.html' },
  { id: 'certificate',              label: 'Certificate',        icon: 'fa-certificate',    file: 'certificate.html' },
  { id: 'summary-report',           label: 'Summary Report',     icon: 'fa-chart-bar',      file: 'summary-report.html' },
];

// ─── Role labels ─────────────────────────────────────────────────────────────
const ROLE_LABELS = {
  admin:          'Administrator',
  cashier:        'Cashier',
  lab_technician: 'Lab Technician',
};

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Returns true if the given role is allowed to access the given page id.
 * @param {string} role - 'admin' | 'cashier' | 'lab_technician'
 * @param {string} pageId - e.g. 'billing-confirm-pay'
 * @returns {boolean}
 */
function checkPermission(role, pageId) {
  if (!role || !pageId) return false;
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.indexOf(pageId) !== -1;
}

/**
 * Renders the sidebar navigation for the given role.
 * Only menu items the role is permitted to see are rendered.
 * @param {string} role
 * @param {HTMLElement} navElement - the <nav> container to populate
 * @param {function} onSelect - callback(menuItem) called on item click
 */
function renderMenu(role, navElement, onSelect) {
  if (!navElement) return;
  navElement.innerHTML = '';

  const allowed = ROLE_PERMISSIONS[role] || [];

  MENU_ITEMS.forEach(function(item) {
    if (allowed.indexOf(item.id) === -1) return;

    const btn = document.createElement('button');
    btn.setAttribute('data-page', item.id);
    btn.className =
      'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-300 ' +
      'hover:bg-slate-700 hover:text-white transition-colors text-sm font-medium ' +
      'nav-item';

    const icon = document.createElement('i');
    icon.className = 'fa-solid ' + item.icon + ' w-5 text-center';

    const span = document.createElement('span');
    span.textContent = item.label;

    btn.appendChild(icon);
    btn.appendChild(span);

    btn.addEventListener('click', function() {
      // Highlight active item
      navElement.querySelectorAll('.nav-item').forEach(function(el) {
        el.classList.remove('bg-sky-600', 'text-white');
        el.classList.add('text-slate-300');
      });
      btn.classList.add('bg-sky-600', 'text-white');
      btn.classList.remove('text-slate-300');

      if (typeof onSelect === 'function') {
        onSelect(item);
      }
    });

    navElement.appendChild(btn);
  });
}

// ─── Error handler ────────────────────────────────────────────────────────────
const ErrorHandler = {
  handle: function(error) {
    console.error('[LIMS Error]', error);
    switch (error.type) {
      case 'VALIDATION_ERROR':
        this.showValidationError(error);
        break;
      case 'PERMISSION_ERROR':
        this.showPermissionError(error);
        break;
      case 'DATA_ERROR':
        this.showDataError(error);
        break;
      default:
        alert('An unexpected error occurred. Please refresh the page.');
    }
  },

  showValidationError: function(error) {
    if (error.field) {
      const field = document.querySelector('[name="' + error.field + '"]');
      if (field) {
        field.classList.add('border-rose-500', 'ring-1', 'ring-rose-500');
        field.focus();
      }
    }
    alert('Validation Error: ' + (error.message || 'Please check the form.'));
  },

  showPermissionError: function(error) {
    alert('Access Denied: ' + (error.message || 'You do not have permission to access this page.'));
    if (typeof StorageService !== 'undefined') {
      // Navigate back to login
      const depth = window.location.pathname.split('/').length - 2;
      const prefix = depth > 1 ? '../'.repeat(depth - 1) : './';
      window.location.href = prefix + 'admin-portal/login.html';
    }
  },

  showDataError: function(error) {
    alert('Data Error: ' + (error.message || 'Session data is invalid.') + '\nSession will be reset.');
    if (typeof StorageService !== 'undefined') {
      StorageService.clearSession();
    }
  },
};

// ─── Page guard (auto-runs on DOMContentLoaded for admin pages) ───────────────
/**
 * Call this on each admin page to enforce role-based access.
 * @param {string} pageId  - the page id matching ROLE_PERMISSIONS keys
 */
function initPageGuard(pageId) {
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof StorageService === 'undefined') {
      console.error('[LIMS] StorageService not loaded.');
      return;
    }

    const role = StorageService.getUserRole();

    if (!role) {
      alert('Please log in first.');
      window.location.href = '../login.html';
      return;
    }

    if (pageId && !checkPermission(role, pageId)) {
      ErrorHandler.handle({
        type:    'PERMISSION_ERROR',
        message: 'Role "' + (ROLE_LABELS[role] || role) + '" cannot access this page.',
      });
    }
  });
}
