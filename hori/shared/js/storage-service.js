/**
 * StorageService
 * Centralized sessionStorage interface for the PHO-QATD LIMS application.
 * All page-to-page data passing is handled through this service.
 */
const StorageService = {

  // ─── Keys ───────────────────────────────────────────────────────────────────
  KEYS: {
    USER_ROLE:      'lims_user_role',
    RFA_DATA:       'lims_rfa_data',
    SAMPLES:        'lims_samples',
    PAYMENTS:       'lims_payments',
    TESTS:          'lims_tests',
    STATUS_HISTORY: 'lims_status_history',
  },

  // ─── Valid status transitions ────────────────────────────────────────────────
  VALID_TRANSITIONS: {
    'Apply':           'customer confirm',
    'customer confirm': 'Pending Payment',
    'Pending Payment': 'Pending Testing',
    'Pending Testing': 'GENERATE REPORT',
    'GENERATE REPORT': 'Approved',
  },

  // ─── User role ───────────────────────────────────────────────────────────────
  setUserRole(role) {
    sessionStorage.setItem(this.KEYS.USER_ROLE, role);
  },

  getUserRole() {
    return sessionStorage.getItem(this.KEYS.USER_ROLE);
  },

  // ─── RFA data ────────────────────────────────────────────────────────────────
  saveRFAData(data) {
    data.status    = 'Apply';
    data.createdAt = new Date().toISOString();
    if (!data.id) {
      data.id = 'RFA-' + Date.now();
    }
    sessionStorage.setItem(this.KEYS.RFA_DATA, JSON.stringify(data));
    this.addStatusHistory(data.id, 'Apply', 'RFA submitted');
  },

  getRFAData() {
    const raw = sessionStorage.getItem(this.KEYS.RFA_DATA);
    return raw ? JSON.parse(raw) : null;
  },

  updateRFAData(updates) {
    const data = this.getRFAData();
    if (!data) return false;
    const merged = Object.assign({}, data, updates);
    sessionStorage.setItem(this.KEYS.RFA_DATA, JSON.stringify(merged));
    return true;
  },

  // ─── Sample status ───────────────────────────────────────────────────────────
  updateSampleStatus(sampleId, newStatus, remark) {
    remark = remark || '';
    const data = this.getRFAData();
    if (!data) return false;

    // Enforce valid state-machine transitions
    const expected = this.VALID_TRANSITIONS[data.status];
    if (expected && expected !== newStatus) {
      console.warn(
        '[LIMS] Invalid transition: ' + data.status + ' → ' + newStatus +
        '. Expected: ' + expected
      );
      return false;
    }

    data.status    = newStatus;
    data.updatedAt = new Date().toISOString();
    sessionStorage.setItem(this.KEYS.RFA_DATA, JSON.stringify(data));
    this.addStatusHistory(sampleId, newStatus, remark);
    return true;
  },

  // ─── Status history ──────────────────────────────────────────────────────────
  addStatusHistory(sampleId, status, remark) {
    const history = JSON.parse(
      sessionStorage.getItem(this.KEYS.STATUS_HISTORY) || '[]'
    );
    history.push({
      sampleId:  sampleId,
      status:    status,
      remark:    remark || '',
      timestamp: new Date().toISOString(),
    });
    sessionStorage.setItem(this.KEYS.STATUS_HISTORY, JSON.stringify(history));
  },

  getStatusHistory() {
    return JSON.parse(
      sessionStorage.getItem(this.KEYS.STATUS_HISTORY) || '[]'
    );
  },

  // ─── Payments ────────────────────────────────────────────────────────────────
  savePayment(paymentData) {
    const payments = this.getPayments();

    // Idempotency: do not duplicate the same OR number
    const duplicate = payments.some(function(p) {
      return p.orNumber && p.orNumber === paymentData.orNumber;
    });
    if (duplicate) {
      console.warn('[LIMS] Payment with OR number ' + paymentData.orNumber + ' already recorded.');
      return false;
    }

    paymentData.paidAt = new Date().toISOString();
    payments.push(paymentData);
    sessionStorage.setItem(this.KEYS.PAYMENTS, JSON.stringify(payments));
    return true;
  },

  getPayments() {
    return JSON.parse(sessionStorage.getItem(this.KEYS.PAYMENTS) || '[]');
  },

  // ─── Test data ───────────────────────────────────────────────────────────────
  saveTestData(testData) {
    testData.recordedAt = new Date().toISOString();
    const tests = this.getTestData();
    tests.push(testData);
    sessionStorage.setItem(this.KEYS.TESTS, JSON.stringify(tests));
  },

  getTestData() {
    return JSON.parse(sessionStorage.getItem(this.KEYS.TESTS) || '[]');
  },

  // ─── Session cleanup ─────────────────────────────────────────────────────────
  clearSession() {
    const keys = Object.values(this.KEYS);
    keys.forEach(function(key) {
      sessionStorage.removeItem(key);
    });
  },

  // ─── Utility ─────────────────────────────────────────────────────────────────
  /**
   * Safely render text into an element using textContent (XSS-safe).
   */
  safeSetText(element, text) {
    if (element) {
      element.textContent = text;
    }
  },

  /**
   * Escape a string for safe HTML insertion.
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  },
};
