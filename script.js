/* =========================================================================
   SAFE SOLUTIONS - SMART ATTENDANCE SYSTEM
   script.js  (Full Frontend Logic - matched to provided index.html/style.css)
   ========================================================================= */

/* =========================================================================
   1. CONFIGURATION
   ========================================================================= */
const getBaseUrl = () => {
  if (window.ENV_API_BASE) return window.ENV_API_BASE.replace(/\/api\/?$/, "");
  const origin = window.location.origin;
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    if (window.location.port === "5000") return origin;
    return "http://localhost:5000";
  }
  return origin;
};

const CONFIG = {
  APP_NAME: "SAFE SOLUTIONS SMART ATTENDANCE SYSTEM",
  DEFAULT_PASSWORD: "Safe@123",
  ROLES: { EMPLOYEE: "Employee", MANAGER: "Manager", CONTROLLER: "Controller", BOSS: "Boss" },
  OFFICE_LOCATION: { lat: 31.5497, lng: 74.3436, radiusMeters: 500 },
  OFFICE_QR_CODE: "SAFE-SOLUTIONS-HQ-001",
  get API_BASE() { return getBaseUrl() + "/api"; },
  get UPLOADS_BASE() { return getBaseUrl() + "/uploads"; },
  get EMPLOYEES_UPLOADS_PATH() { return getBaseUrl() + "/uploads/employees/"; },
  get SELFIES_UPLOADS_PATH() { return getBaseUrl() + "/uploads/selfies/"; },
  get SITE_UPLOADS_PATH() { return getBaseUrl() + "/uploads/site/"; },
  DB_NAME: "SafeSolutionsDB",
  DB_VERSION: 1,
  STORE_ATTENDANCE: "attendance",
  IMAGES_PATH: "assets/images/",
  LOGO: "logo.jpeg",
  DEFAULT_AVATAR: "logo.jpeg",
  HERO_IMAGES: ["hero-1.jpeg", "hero-2.jpeg", "hero-3.jpeg", "hero-4.jpeg", "hero-5.jpeg"],
  PAGE_SIZE: 8
};

/* =========================================================================
   2. UTILITY FUNCTIONS
   ========================================================================= */
const Utils = {
  uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
  nowISO() { return new Date().toISOString(); },
  todayStr(d = new Date()) { return d.toISOString().split("T")[0]; },
  timeStr(d = new Date()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  },
  dateTimeStr(iso) { return iso ? new Date(iso).toLocaleString() : "-"; },
  hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return h.toString(36) + str.length.toString(36);
  },
  resolveUrl(fileName, defaultSubfolder = "employees") {
    if (!fileName) return "assets/images/logo.jpeg";
    if (fileName.startsWith("data:image/") || /^https?:\/\//i.test(fileName)) return fileName;
    if (fileName.startsWith("assets/")) return fileName;
    if (fileName === "logo.jpeg" || fileName === "default-avatar.jpeg") return "assets/images/logo.jpeg";
    if (fileName.startsWith("uploads/")) return getBaseUrl() + "/" + fileName;
    if (fileName.startsWith("employees/") || fileName.startsWith("selfies/") || fileName.startsWith("site/")) {
      return CONFIG.UPLOADS_BASE + "/" + fileName;
    }
    return getBaseUrl() + "/uploads/" + defaultSubfolder + "/" + fileName;
  },
  imgPath(fileName) {
    return this.resolveUrl(fileName, "employees");
  },
  selfiePath(fileName) {
    return this.resolveUrl(fileName, "selfies");
  },
  sitePhotoPath(fileName) {
    return this.resolveUrl(fileName, "site");
  },
  onImgError(imgEl) {
    imgEl.onerror = null; // prevent infinite loop
    imgEl.src = "assets/images/logo.jpeg";
  },
  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },
  debounce(fn, delay = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  },
  distanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },
  toast(icon, title) {
    const container = document.getElementById("toastContainer");
    if (typeof Swal !== "undefined") {
      Swal.fire({
        toast: true, position: "top-end", icon, title,
        showConfirmButton: false, timer: 2500, timerProgressBar: true,
        background: "#021C4F", color: "#FFE5F1"
      });
      return;
    }
    if (!container) { alert(title); return; }
    const el = document.createElement("div");
    el.className = "toast align-items-center text-white border-0 show mb-2";
    el.style.background = "#021C4F";
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${Utils.escapeHtml(title)}</div></div>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },
  confirm(title, text, icon = "warning") {
    if (typeof Swal === "undefined") return Promise.resolve(confirm(title + "\n" + text));
    return Swal.fire({
      title, text, icon, showCancelButton: true,
      confirmButtonColor: "#C50337", cancelButtonColor: "#E31A4F",
      background: "#021C4F", color: "#FFE5F1",
      confirmButtonText: "Yes", cancelButtonText: "Cancel"
    }).then((r) => r.isConfirmed);
  },
  alertMsg(title, text, icon = "info") {
    if (typeof Swal === "undefined") { alert(title + "\n" + text); return Promise.resolve(); }
    return Swal.fire({
      title, text, icon, background: "#021C4F", color: "#FFE5F1", confirmButtonColor: "#C50337"
    });
  }
};

/* =========================================================================
   3. STORAGE LAYER
   ========================================================================= */
const Storage = {
  keys: {
    TOKEN: "ss_token",
    REFRESH_TOKEN: "ss_refresh_token",
    SESSION: "ss_session",
    SETTINGS: "ss_settings"
  },
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { console.error("Storage.get error", key, e); return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error("Storage.set error", key, e); return false; }
  },
  remove(key) { localStorage.removeItem(key); },

  getToken() { return localStorage.getItem(this.keys.TOKEN); },
  setToken(token) { if (token) localStorage.setItem(this.keys.TOKEN, token); },
  removeToken() { localStorage.removeItem(this.keys.TOKEN); }
};

/* =========================================================================
   4. SEED (no-op; backend seed is already complete)
   ========================================================================= */
const Seed = {
  needsSeed() { return false; },
  init() { /* backend seed already complete */ }
};

/* =========================================================================
   5. API SERVICE LAYER (backend fetch calls)
   ========================================================================= */
const API = {
  async request(path, options = {}) {
    const headers = Object.assign({}, options.headers || {});
    const token = Storage.getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    let body = options.body;
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(CONFIG.API_BASE + path, { ...options, headers, body });
    } catch (e) {
      console.error("API request failed", path, e);
      return { success: false, message: "Unable to reach server." };
    }

    if (res.status === 401 && !options._retry && path !== "/auth/login" && path !== "/auth/refresh") {
      options._retry = true;
      const refreshToken = Storage.get(Storage.keys.REFRESH_TOKEN);
      if (refreshToken) {
        try {
          const refreshRes = await fetch(CONFIG.API_BASE + "/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newAccessToken = refreshData.accessToken || (refreshData.data && refreshData.data.accessToken);
            if (newAccessToken) {
              Storage.setToken(newAccessToken);
              headers["Authorization"] = "Bearer " + newAccessToken;
              res = await fetch(CONFIG.API_BASE + path, { ...options, headers, body });
            }
          } else {
            Storage.removeToken();
            Storage.remove(Storage.keys.SESSION);
            Storage.remove(Storage.keys.REFRESH_TOKEN);
            window.location.reload();
          }
        } catch (err) {
          console.error("Error refreshing token", err);
        }
      }
    }

    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      return { success: false, message: (data && (data.message || data.error)) || ("Request failed (" + res.status + ")"), status: res.status };
    }
    if (data && typeof data === "object" && "success" in data) return data;
    return { success: true, ...(data && typeof data === "object" ? data : { data }) };
  },

  async login(username, password) {
    const result = await this.request("/auth/login", {
      method: "POST",
      body: { username, password }
    });
    if (!result.success) {
      return { success: false, message: result.message || "Login failed." };
    }

    const token =
      result.accessToken ||
      result.token ||
      (result.data && (result.data.accessToken || result.data.token));

    if (token) {
      Storage.setToken(token);
    }

    const refreshToken =
      result.refreshToken ||
      (result.data && result.data.refreshToken);

    if (refreshToken) {
      Storage.set(Storage.keys.REFRESH_TOKEN, refreshToken);
    }

    const session = result.session || result.user || (result.data && result.data.session) || null;
    if (session) {
      Storage.set(Storage.keys.SESSION, session);
    }

    return { success: true, session, token };
  },

  async logout() {
    try { await this.request("/auth/logout", { method: "POST" }); } catch (e) {}
    Storage.removeToken();
    Storage.remove(Storage.keys.SESSION);
    Storage.remove(Storage.keys.REFRESH_TOKEN);
    return { success: true };
  },

  getSession() { return Storage.get(Storage.keys.SESSION, null); },

  async fetchMe() {
    const result = await this.request("/auth/me", { method: "GET" });
    if (result.success) {
      const session = result.session || result.user || result.data || result;
      Storage.set(Storage.keys.SESSION, session);
      return session;
    }
    return null;
  },

  async changePassword(username, currentPassword, newPassword) {
    return this.request("/auth/change-password", {
      method: "POST",
      body: { username, currentPassword, newPassword }
    });
  },

  async getEmployees() {
    const result = await this.request("/employees", { method: "GET" });
    if (Array.isArray(result)) return result;
    return result.employees || result.data || [];
  },
  async getEmployeeById(id) {
    const result = await this.request("/employees/" + id, { method: "GET" });
    return result.employee || result.data || result;
  },
  async saveEmployee(data) {
    const result = await this.request("/employees", { method: "POST", body: data });
    return { success: result.success !== false, employee: result.employee || result.data, message: result.message };
  },
  async updateEmployee(id, data) {
    const result = await this.request("/employees/" + id, { method: "PUT", body: data });
    return { success: result.success !== false, employee: result.employee || result.data, message: result.message };
  },
  async deleteEmployee(id) {
    const result = await this.request("/employees/" + id, { method: "DELETE" });
    return { success: result.success !== false, message: result.message };
  },

  async saveAttendance(record) {
    const path = "/attendance/check-in";
    const result = await this.request(path, { method: "POST", body: record });
    return { success: result.success !== false, record: result.record || result.data, message: result.message };
  },
  async updateAttendance(id, data) {
    if ("checkOut" in data) {
      const result = await this.request("/attendance/check-out", {
        method: "POST",
        body: { id, ...data }
      });
      return { success: result.success !== false, record: result.record || result.data, message: result.message };
    }
    const result = await this.request("/attendance/" + id, { method: "PUT", body: data });
    return { success: result.success !== false, record: result.record || result.data, message: result.message };
  },
  async getAttendance(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((k) => { if (filters[k] !== undefined && filters[k] !== null && filters[k] !== "") params.append(k, filters[k]); });
    const qs = params.toString();
    const result = await this.request("/attendance" + (qs ? "?" + qs : ""), { method: "GET" });
    const records = Array.isArray(result) ? result : (result.records || result.data || []);
    return records.slice().sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));
  },
  async approveAttendance(id) {
    const result = await this.request("/attendance/" + id + "/approve", { method: "PUT" });
    return { success: result.success !== false, record: result.record || result.data, message: result.message };
  },
  async rejectAttendance(id, reason = "") {
    const result = await this.request("/attendance/" + id + "/reject", { method: "PUT", body: { reason } });
    return { success: result.success !== false, record: result.record || result.data, message: result.message };
  },
  async deleteAttendance(id) {
    const result = await this.request("/attendance/" + id, { method: "DELETE" });
    return { success: result.success !== false, message: result.message };
  },

  async getReports(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((k) => { if (filters[k] !== undefined && filters[k] !== null && filters[k] !== "") params.append(k, filters[k]); });
    const qs = params.toString();
    const result = await this.request("/reports" + (qs ? "?" + qs : ""), { method: "GET" });
    if (result.summary || result.byEmployee || result.byDate) return result;
    return result.data || { summary: {}, byEmployee: {}, byDate: {}, records: [] };
  },

  async getDashboardStats() {
    const result = await this.request("/dashboard/stats", { method: "GET" });
    return result.stats || result.data || result;
  },
  async getWeeklyAttendance() {
    const result = await this.request("/dashboard/weekly-attendance", { method: "GET" });
    return result.weekly || result.data || result;
  },

  async getNotifications() {
    const result = await this.request("/notifications", { method: "GET" });
    return Array.isArray(result) ? result : (result.notifications || result.data || []);
  },

  async getSites() {
    const result = await this.request("/sites", { method: "GET" });
    return Array.isArray(result) ? result : (result.sites || result.data || []);
  },

  async getSettings() {
    const result = await this.request("/settings", { method: "GET" });
    return result.settings || result.data || result;
  },
  async saveSettings(data) {
    const result = await this.request("/settings", { method: "PUT", body: data });
    return { success: result.success !== false, settings: result.settings || result.data, message: result.message };
  },

  async getOfficeQr() {
    const result = await this.request("/qr/office", { method: "GET" });
    return result.qr || result.data || result;
  },
  async verifyQr(payload) {
    return this.request("/qr/verify", { method: "POST", body: payload });
  }
};

/* =========================================================================
   6. NOTIFICATIONS MODULE
   ========================================================================= */
const Notifications = {
  cache: [],
  async push(message) {
    // Notifications are created server-side as a result of backend actions;
    // this simply triggers a re-fetch/re-render of the bell.
    await this.refresh();
  },
  async refresh() {
    this.cache = await API.getNotifications();
    return this.cache;
  },
  async getAll() {
    this.cache = await API.getNotifications();
    return this.cache;
  },
  async markAllRead() {
    try {
      await API.request("/notifications/mark-all-read", { method: "PUT" });
    } catch (e) {}
    await this.refresh();
    UI.renderNotificationBell();
  },
  unreadCount() {
    return (this.cache || []).filter((n) => !n.read).length;
  }
};


/* =========================================================================
   7. AUTH MODULE
   ========================================================================= */
const Auth = {
  currentSession() { return API.getSession(); },
  isLoggedIn() { return !!this.currentSession(); },
  hasRole(...roles) {
    const s = this.currentSession();
    return !!s && roles.includes(s.role);
  },
  can(action) {
    const s = this.currentSession();
    if (!s) return false;
    const perms = {
      [CONFIG.ROLES.BOSS]: ["*"],
      [CONFIG.ROLES.CONTROLLER]: ["manageEmployees", "approve", "reports", "attendance", "dashboard", "settings"],
      [CONFIG.ROLES.MANAGER]: ["approve", "reports", "attendance", "dashboard"],
      [CONFIG.ROLES.EMPLOYEE]: ["attendance", "dashboard"]
    };
    const allowed = perms[s.role] || [];
    return allowed.includes("*") || allowed.includes(action);
  },
  async login(username, password) {
    const result = await API.login(username, password);
    if (!result.success) {
      const errBox = document.getElementById("loginError");
      const errText = document.getElementById("loginErrorText");
      if (errText) errText.textContent = result.message;
      if (errBox) errBox.classList.remove("d-none");
      Utils.toast("error", result.message);
      return false;
    }
    const errBox = document.getElementById("loginError");
    if (errBox) errBox.classList.add("d-none");
    Utils.toast("success", `Welcome, ${result.session ? result.session.name : ""}`);
    App.postLoginSetup();
    return true;
  },
  async logout() {
    await API.logout();
    Utils.toast("info", "Logged out successfully.");
    App.showLoginScreen();
  }
};

/* =========================================================================
   8. EMPLOYEE MODULE
   ========================================================================= */
const EmployeeModule = {
  searchTerm: "",
  deptFilter: "",
  cache: [],
  photoDataUrl: null,

  async init() {
    this.cache = await API.getEmployees();
    this.populateDeptFilter();
    this.renderCards();
    this.renderTable();
    this.bindEvents();
  },

  bindEvents() {
    const search = document.getElementById("searchEmployee");
    if (search && !search.dataset.bound) {
      search.dataset.bound = "true";
      search.addEventListener("input", Utils.debounce((e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.renderCards();
        this.renderTable();
      }, 250));
    }

    const deptFilter = document.getElementById("employeeFilterDept");
    if (deptFilter && !deptFilter.dataset.bound) {
      deptFilter.dataset.bound = "true";
      deptFilter.addEventListener("change", (e) => {
        this.deptFilter = e.target.value;
        this.renderCards();
        this.renderTable();
      });
    }

    const addBtn = document.getElementById("addEmployeeBtn");
    if (addBtn && !addBtn.dataset.bound) {
      addBtn.dataset.bound = "true";
      addBtn.addEventListener("click", () => this.openModal());
    }

    const saveBtn = document.getElementById("saveEmployeeBtn");
    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = "true";
      saveBtn.addEventListener("click", () => this.handleSave());
    }

    const cancelBtn = document.getElementById("employeeModalCancelBtn");
    if (cancelBtn && !cancelBtn.dataset.bound) {
      cancelBtn.dataset.bound = "true";
      cancelBtn.addEventListener("click", () => Modals.close("employeeModalBackdrop"));
    }

    const closeBtn = document.getElementById("employeeModalCloseBtn");
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = "true";
      closeBtn.addEventListener("click", () => Modals.close("employeeModalBackdrop"));
    }

    const photoInput = document.getElementById("employeePhotoInput");
    if (photoInput && !photoInput.dataset.bound) {
      photoInput.dataset.bound = "true";
      photoInput.addEventListener("change", (e) => this.handlePhotoSelect(e));
    }
  },

  populateDeptFilter() {
    const sel = document.getElementById("employeeFilterDept");
    if (!sel) return;
    const depts = [...new Set(this.cache.map((e) => e.department).filter(Boolean))];
    const current = sel.value;
    sel.innerHTML = '<option value="">All Departments</option>' +
      depts.map((d) => `<option value="${Utils.escapeHtml(d)}">${Utils.escapeHtml(d)}</option>`).join("");
    sel.value = current;
  },

  getFiltered() {
    let list = this.cache;
    if (this.searchTerm) {
      list = list.filter((e) =>
        e.name.toLowerCase().includes(this.searchTerm) ||
        (e.department || "").toLowerCase().includes(this.searchTerm) ||
        (e.designation || "").toLowerCase().includes(this.searchTerm) ||
        (e.email || "").toLowerCase().includes(this.searchTerm) ||
        (e.phone || "").toLowerCase().includes(this.searchTerm)
      );
    }
    if (this.deptFilter) list = list.filter((e) => e.department === this.deptFilter);
    return list;
  },

  renderCards() {
    const grid = document.getElementById("employeeCardsGrid");
    if (!grid) return;
    const filtered = this.getFiltered();
    grid.innerHTML = filtered.slice(0, 8).map((emp) => `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="stat-card glass-panel text-center">
          <img src="${Utils.imgPath(emp.image)}" alt="${Utils.escapeHtml(emp.name)}"
               style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:8px;"
               onerror="Utils.onImgError(this)">
          <div class="stat-info">
            <span class="stat-label d-block">${Utils.escapeHtml(emp.name)}</span>
            <span class="stat-label text-muted">${Utils.escapeHtml(emp.designation || "-")}</span>
          </div>
        </div>
      </div>`).join("");
  },

  renderTable() {
    const tbody = document.getElementById("employeeTableBody");
    if (!tbody) return;
    const filtered = this.getFiltered();

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">No employees found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((emp) => `
      <tr>
        <td>${Utils.escapeHtml(emp.code || "-")}</td>
        <td><img src="${Utils.imgPath(emp.image)}" alt="${Utils.escapeHtml(emp.name)}"
             style="width:36px;height:36px;border-radius:50%;object-fit:cover;"
             onerror="Utils.onImgError(this)"></td>
        <td>${Utils.escapeHtml(emp.name)}</td>
        <td>${Utils.escapeHtml(emp.designation || "-")}</td>
        <td>${Utils.escapeHtml(emp.department || "-")}</td>
        <td>${Utils.escapeHtml(emp.phone || emp.email || "-")}</td>
        <td><span class="badge ${emp.status === "active" ? "bg-success" : "bg-secondary"}">${emp.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-info me-1 edit-emp-btn" data-id="${emp.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger del-emp-btn" data-id="${emp.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join("");

    tbody.querySelectorAll(".edit-emp-btn").forEach((btn) =>
      btn.addEventListener("click", () => this.openModal(btn.dataset.id)));
    tbody.querySelectorAll(".del-emp-btn").forEach((btn) =>
      btn.addEventListener("click", () => this.handleDelete(btn.dataset.id)));
  },

  handlePhotoSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.photoDataUrl = ev.target.result;
      const preview = document.getElementById("employeePhotoPreview");
      if (preview) preview.src = this.photoDataUrl;
    };
    reader.readAsDataURL(file);
  },

  openModal(id = null) {
    const backdrop = document.getElementById("employeeModalBackdrop");
    if (!backdrop) return;
    backdrop.dataset.editId = id || "";
    this.photoDataUrl = null;

    const emp = id ? this.cache.find((e) => e.id === id) : null;
    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ""; };

    document.getElementById("employeeModalTitle").textContent = emp ? "Edit Employee" : "Add Employee";
    setVal("employeeIdInput", emp ? emp.id : "");
    setVal("employeeNameInput", emp ? emp.name : "");
    setVal("employeeCodeInput", emp ? emp.code : "");
    setVal("employeeDesignationInput", emp ? emp.designation : "");
    setVal("employeeEmailInput", emp ? emp.email : "");
    setVal("employeePhoneInput", emp ? emp.phone : "");
    setVal("employeeJoinDateInput", emp ? emp.joinDate : Utils.todayStr());
    setVal("employeeStatusInput", emp ? emp.status : "active");

    const deptSelect = document.getElementById("employeeDepartmentInput");
    if (deptSelect) {
      const depts = [...new Set(this.cache.map((e) => e.department).filter(Boolean))];
      deptSelect.innerHTML = '<option value="">Select Department</option>' +
        depts.map((d) => `<option value="${Utils.escapeHtml(d)}">${Utils.escapeHtml(d)}</option>`).join("");
      deptSelect.value = emp ? emp.department : "";
    }

    const preview = document.getElementById("employeePhotoPreview");
    if (preview) preview.src = emp ? Utils.imgPath(emp.image) : Utils.imgPath(CONFIG.LOGO);

    Modals.open("employeeModalBackdrop");
  },

  async handleSave() {
    const backdrop = document.getElementById("employeeModalBackdrop");
    const editId = backdrop ? backdrop.dataset.editId : "";

    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };

    const data = {
      name: getVal("employeeNameInput"),
      code: getVal("employeeCodeInput"),
      designation: getVal("employeeDesignationInput"),
      department: getVal("employeeDepartmentInput"),
      email: getVal("employeeEmailInput"),
      phone: getVal("employeePhoneInput"),
      joinDate: getVal("employeeJoinDateInput"),
      status: getVal("employeeStatusInput") || "active",
      role: CONFIG.ROLES.EMPLOYEE
    };

    if (!data.name || !data.phone) {
      Utils.toast("error", "Name and Phone are required.");
      return;
    }

    if (this.photoDataUrl) data.image = this.photoDataUrl;
    else if (!editId) data.image = CONFIG.LOGO;

    const result = editId ? await API.updateEmployee(editId, data) : await API.saveEmployee(data);

    if (result.success) {
      Utils.toast("success", editId ? "Employee updated." : "Employee added.");
      this.cache = await API.getEmployees();
      this.populateDeptFilter();
      this.renderCards();
      this.renderTable();
      Modals.close("employeeModalBackdrop");
      Dashboard.refresh();
    } else {
      Utils.toast("error", result.message || "Failed to save employee.");
    }
  },

  async handleDelete(id) {
    const emp = this.cache.find((e) => e.id === id);
    const confirmed = await Utils.confirm("Delete Employee?", `Delete ${emp ? emp.name : "this employee"}?`);
    if (!confirmed) return;
    const result = await API.deleteEmployee(id);
    if (result.success) {
      Utils.toast("success", "Employee deleted.");
      this.cache = await API.getEmployees();
      this.populateDeptFilter();
      this.renderCards();
      this.renderTable();
      Dashboard.refresh();
    }
  }
};

/* =========================================================================
   9. MODALS HELPER (matches modal-backdrop-custom pattern in HTML)
   ========================================================================= */
const Modals = {
  open(backdropId) {
    const el = document.getElementById(backdropId);
    if (el) el.classList.remove("d-none");
  },
  close(backdropId) {
    const el = document.getElementById(backdropId);
    if (el) el.classList.add("d-none");
  }
};

/* =========================================================================
   10. ATTENDANCE MODULE
   ========================================================================= */
const AttendanceModule = {
  officeCheckedIn: false,
  siteCheckedIn: false,
  qrScanner: null,
  clockTimers: [],

  async init() {
    this.bindEvents();
    this.startClocks();
    await this.refreshOfficeView();
    await this.refreshSiteView();
    await this.refreshHistoryView();
    await this.refreshApprovalView();
  },

  bindEvents() {
    const bind = (id, handler) => {
      const el = document.getElementById(id);
      if (el && !el.dataset.bound) { el.dataset.bound = "true"; el.addEventListener("click", handler); }
    };

    // Office: scan-driven check in/out (no selfie)
    bind("officeScanCheckInBtn", () => this.beginQrFlow("office", "checkIn"));
    bind("officeScanCheckOutBtn", () => this.beginQrFlow("office", "checkOut"));

    // Site: scan-driven check in/out (selfie + photo required)
    bind("siteScanCheckInBtn", () => this.beginQrFlow("site", "checkIn"));
    bind("siteScanCheckOutBtn", () => this.beginQrFlow("site", "checkOut"));

    bind("approveBtn", () => this.handleApprove());
    bind("rejectBtn", () => this.handleReject());
    bind("historyFilterBtn", () => this.applyHistoryFilters());
    bind("historyExportBtn", () => this.exportHistoryCsv());

    // QR scan modal
    bind("qrScanModalCloseBtn", () => this.closeQrScanModal());

    // Large QR view modal
    bind("officeQrViewBtn", () => this.openLargeQrModal());
    bind("qrLargeModalCloseBtn", () => Modals.close("qrLargeModalBackdrop"));
    bind("officeQrDownloadBtn", () => this.downloadOfficeQr());
    bind("officeQrPrintBtn", () => this.printOfficeQr());
    bind("officeQrRegenerateBtn", () => this.regenerateOfficeQr());

    // Site capture modal
    bind("siteCaptureModalCloseBtn", () => this.closeSiteCaptureModal());
    bind("siteCaptureCancelBtn", () => this.closeSiteCaptureModal());
    bind("siteCaptureSubmitBtn", () => this.submitSiteCapture());
    bind("selfieStartBtn", () => this.startSelfieCamera());
    bind("selfieCaptureBtn", () => this.captureSelfie());

    const sitePhotoInput = document.getElementById("sitePhotoInput");
    if (sitePhotoInput && !sitePhotoInput.dataset.bound) {
      sitePhotoInput.dataset.bound = "true";
      sitePhotoInput.addEventListener("change", (e) => this.handleSitePhotoSelect(e));
    }

    const employeeFilter = document.getElementById("historyEmployeeFilter");
    if (employeeFilter && !employeeFilter.dataset.bound) {
      employeeFilter.dataset.bound = "true";
      this.populateHistoryEmployeeFilter();
    }

    this.renderOfficeQrPreview();
    this.bindRippleButtons();
  },

  /* ---------- RIPPLE EFFECT ---------- */
  bindRippleButtons() {
    document.querySelectorAll(".ripple-btn").forEach((btn) => {
      if (btn.dataset.rippleBound) return;
      btn.dataset.rippleBound = "true";
      btn.addEventListener("click", (e) => {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement("span");
        const size = Math.max(rect.width, rect.height);
        ripple.className = "ripple-effect";
        ripple.style.width = ripple.style.height = size + "px";
        ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
        ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 650);
      });
    });
  },

  startClocks() {
    this.clockTimers.forEach((t) => clearInterval(t));
    this.clockTimers = [];
    const officeClock = document.getElementById("officeClock");
    const officeDate = document.getElementById("officeDateDisplay");
    const siteClock = document.getElementById("siteClock");
    const siteDate = document.getElementById("siteDateDisplay");

    const tick = () => {
      const now = new Date();
      const t = Utils.timeStr(now);
      const d = now.toDateString();
      if (officeClock) officeClock.textContent = t;
      if (officeDate) officeDate.textContent = d;
      if (siteClock) siteClock.textContent = t;
      if (siteDate) siteDate.textContent = d;
      const dashChip = document.getElementById("dashboardDateChip");
      if (dashChip) dashChip.innerHTML = `<i class="bi bi-calendar3 me-2"></i>${d}`;
    };
    tick();
    this.clockTimers.push(setInterval(tick, 1000));
  },

  async populateHistoryEmployeeFilter() {
    const sel = document.getElementById("historyEmployeeFilter");
    if (!sel) return;
    const employees = await API.getEmployees();
    sel.innerHTML = '<option value="">All Employees</option>' +
      employees.map((e) => `<option value="${e.id}">${Utils.escapeHtml(e.name)}</option>`).join("");
  },

  async markAttendance(type, action, extra = {}) {
    const session = Auth.currentSession();
    if (!session) { Utils.toast("error", "Please login first."); return; }

    const today = Utils.todayStr();
    const existing = await API.getAttendance({ employeeId: session.employeeId, date: today, type });
    let rec = existing[0];

    const nowTime = Utils.timeStr().slice(0, 5);

    let approvalStatus = "pending";
    let notes = "";
    if (type === "site") {
      const siteSelect = document.getElementById("siteLocationSelect");
      const siteLabel = siteSelect && siteSelect.value ? siteSelect.value : "";
      const bits = [];
      if (extra.vehicle) bits.push(`Vehicle: ${extra.vehicle}`);
      if (extra.bikeNumber) bits.push(`Vehicle No: ${extra.bikeNumber}`);
      if (extra.meterReading) bits.push(`Meter: ${extra.meterReading}km`);
      if (extra.remarks) bits.push(extra.remarks);
      notes = bits.join(" | ");
      this._pendingSiteLabel = siteLabel;
    }

    const gpsVerified = extra.gps ? !!extra.gps.verified : null;

    if (action === "checkIn") {
      if (rec) { Utils.toast("warning", "Already checked in today."); return; }
      const result = await API.saveAttendance({
        employeeId: session.employeeId,
        employeeName: session.name,
        type, checkIn: nowTime, checkOut: null,
        site: type === "site" ? (document.getElementById("siteLocationSelect")?.value || null) : null,
        status: "present", approvalStatus, notes,
        gpsVerified,
        selfie: extra.selfie || null,
        sitePhoto: extra.sitePhoto || null,
        vehicle: extra.vehicle || null,
        bikeNumber: extra.bikeNumber || null,
        meterReading: extra.meterReading || null
      });
      if (result.success) {
        Utils.toast("success", `${type === "office" ? "Office" : "Site"} attendance submitted for approval.`);
        this.setStatusBadge(type, "Pending Approval");
      }
    } else {
      if (!rec) { Utils.toast("warning", "No check-in found for today."); return; }
      const result = await API.updateAttendance(rec.id, { checkOut: nowTime });
      if (result.success) {
        Utils.toast("success", `${type === "office" ? "Office" : "Site"} check-out recorded.`);
        this.setStatusBadge(type, "Checked Out");
      }
    }

    await this.refreshOfficeView();
    await this.refreshSiteView();
    await this.refreshHistoryView();
    await this.refreshApprovalView();
    Dashboard.refresh();
  },

  setStatusBadge(type, text) {
    const badge = document.getElementById(type === "office" ? "officeAttendanceStatus" : "siteAttendanceStatus");
    if (badge) badge.textContent = text;
  },

  async refreshOfficeView() {
    const today = Utils.todayStr();
    const records = await API.getAttendance({ date: today, type: "office" });
    const tbody = document.getElementById("officeAttendanceTableBody");
    if (tbody) {
      tbody.innerHTML = records.length === 0
        ? `<tr><td colspan="5" class="text-center py-3">No office attendance today.</td></tr>`
        : records.map((r) => `
          <tr>
            <td>${Utils.escapeHtml(r.employeeName)}</td>
            <td>${r.checkIn || "-"}</td>
            <td>${r.checkOut || "-"}</td>
            <td><span class="badge ${this.statusBadgeClass(r.status)}">${r.status}</span></td>
            <td><span class="badge ${this.approvalBadgeClass(r.approvalStatus)}">${r.approvalStatus}</span></td>
          </tr>`).join("");
    }
    const setCount = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setCount("officePresentCount", records.filter((r) => r.status === "present").length);
    setCount("officeAbsentCount", records.filter((r) => r.status === "absent").length);
    setCount("officeLateCount", records.filter((r) => r.status === "late").length);
    setCount("officeOnLeaveCount", records.filter((r) => r.status === "leave").length);

    this.renderTimeline("officeTimeline", records);

    const session = Auth.currentSession();
    if (session) {
      const mine = records.find((r) => r.employeeId === session.employeeId);
      this.setStatusBadge("office", mine ? (mine.checkOut ? "Checked Out" : (mine.approvalStatus === "pending" ? "Pending Approval" : "Checked In")) : "Not Checked In");

      const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setText("officeTodayCheckIn", mine && mine.checkIn ? mine.checkIn : "--:--");
      setText("officeTodayCheckOut", mine && mine.checkOut ? mine.checkOut : "--:--");
      let hours = "0.0h";
      if (mine && mine.checkIn && mine.checkOut) {
        const [ih, im] = mine.checkIn.split(":").map(Number);
        const [oh, om] = mine.checkOut.split(":").map(Number);
        const diff = (oh + om / 60) - (ih + im / 60);
        if (diff > 0) hours = diff.toFixed(1) + "h";
      }
      setText("officeWorkingHours", hours);

      const approvalStrip = document.getElementById("officeApprovalStrip");
      const approvalText = document.getElementById("officeApprovalText");
      if (mine && approvalText) {
        approvalText.textContent = mine.approvalStatus.charAt(0).toUpperCase() + mine.approvalStatus.slice(1);
        if (approvalStrip) {
          approvalStrip.className = "approval-status-strip" +
            (mine.approvalStatus === "approved" ? " approved" : mine.approvalStatus === "rejected" ? " rejected" : "");
        }
      } else if (approvalText) {
        approvalText.textContent = "—";
        if (approvalStrip) approvalStrip.className = "approval-status-strip";
      }
    }

    // Show/hide Office QR management card based on role
    const qrCard = document.getElementById("officeQrPreviewCard");
    if (qrCard) {
      qrCard.classList.toggle("d-none", !(session && (session.role === CONFIG.ROLES.CONTROLLER || session.role === CONFIG.ROLES.BOSS)));
    }
  },

  siteProjects: [],

  async populateSiteProjects() {
    const sel = document.getElementById("siteLocationSelect");
    if (!sel || sel.dataset.populated) return;
    sel.dataset.populated = "true";
    this.siteProjects = await API.getSites();
    sel.innerHTML = '<option value="">Select Project</option>' +
      this.siteProjects.map((p) => `<option value="${Utils.escapeHtml(p.name)}" data-code="${p.code}">${Utils.escapeHtml(p.name)}</option>`).join("");
    sel.addEventListener("change", () => {
      const codeDisplay = document.getElementById("siteProjectCodeDisplay");
      const opt = sel.selectedOptions[0];
      if (codeDisplay) codeDisplay.value = opt && opt.dataset.code ? opt.dataset.code : "";
    });
  },

  async refreshSiteView() {
    await this.populateSiteProjects();
    const today = Utils.todayStr();
    const records = await API.getAttendance({ date: today, type: "site" });
    const tbody = document.getElementById("siteAttendanceTableBody");
    if (tbody) {
      tbody.innerHTML = records.length === 0
        ? `<tr><td colspan="6" class="text-center py-3">No site attendance today.</td></tr>`
        : records.map((r) => `
          <tr>
            <td>${Utils.escapeHtml(r.employeeName)}</td>
            <td>${Utils.escapeHtml(r.site || "-")}</td>
            <td>${r.checkIn || "-"}</td>
            <td>${r.checkOut || "-"}</td>
            <td><span class="badge ${this.statusBadgeClass(r.status)}">${r.status}</span></td>
            <td><span class="badge ${this.approvalBadgeClass(r.approvalStatus)}">${r.approvalStatus}</span></td>
          </tr>`).join("");
    }

    this.renderTimeline("siteTimeline", records);

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText("siteCompletedVisits", records.filter((r) => r.checkOut).length);
    setText("sitePendingVisits", records.filter((r) => !r.checkOut).length);

    const session = Auth.currentSession();
    if (session) {
      const mine = records.find((r) => r.employeeId === session.employeeId);
      this.setStatusBadge("site", mine ? (mine.checkOut ? "Checked Out" : (mine.approvalStatus === "pending" ? "Pending Approval" : "Checked In")) : "Not Checked In");

      const managerText = document.getElementById("siteManagerApprovalText");
      const controllerText = document.getElementById("siteControllerApprovalText");
      const status = mine ? (mine.approvalStatus.charAt(0).toUpperCase() + mine.approvalStatus.slice(1)) : "—";
      if (managerText) managerText.textContent = status;
      if (controllerText) controllerText.textContent = status;

      const strip = document.getElementById("siteApprovalStrip");
      if (strip && mine) {
        strip.className = "approval-status-strip" +
          (mine.approvalStatus === "approved" ? " approved" : mine.approvalStatus === "rejected" ? " rejected" : "");
      }

      const selfieChip = document.getElementById("siteSelfieChip");
      const selfieValue = document.getElementById("siteSelfieValue");
      if (selfieValue) selfieValue.textContent = mine && mine.selfie ? "Captured" : "Pending";
      if (selfieChip) selfieChip.classList.toggle("verified", !!(mine && mine.selfie));
    }
  },

  statusBadgeClass(status) {
    switch (status) {
      case "present": return "bg-success";
      case "late": return "bg-warning text-dark";
      case "absent": return "bg-danger";
      case "leave": return "bg-secondary";
      default: return "bg-info text-dark";
    }
  },
  approvalBadgeClass(status) {
    switch (status) {
      case "approved": return "bg-success";
      case "rejected": return "bg-danger";
      default: return "bg-warning text-dark";
    }
  },

  historyFilters: {},

  async applyHistoryFilters() {
    const empId = document.getElementById("historyEmployeeFilter")?.value || "";
    const type = document.getElementById("historyTypeFilter")?.value || "";
    const fromDate = document.getElementById("historyFromDate")?.value || "";
    const toDate = document.getElementById("historyToDate")?.value || "";
    this.historyFilters = {};
    if (empId) this.historyFilters.employeeId = empId;
    if (type) this.historyFilters.type = type;
    if (fromDate) this.historyFilters.fromDate = fromDate;
    if (toDate) this.historyFilters.toDate = toDate;
    await this.refreshHistoryView();
  },

  async refreshHistoryView() {
    const session = Auth.currentSession();
    const filters = { ...this.historyFilters };
    if (session && !Auth.hasRole(CONFIG.ROLES.BOSS, CONFIG.ROLES.CONTROLLER, CONFIG.ROLES.MANAGER)) {
      filters.employeeId = session.employeeId;
    }
    const records = await API.getAttendance(filters);
    const tbody = document.getElementById("attendanceTableBody");
    if (!tbody) return;
    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No attendance records found.</td></tr>`;
      return;
    }
    tbody.innerHTML = records.map((r) => {
      let hours = "-";
      if (r.checkIn && r.checkOut) {
        const [ih, im] = r.checkIn.split(":").map(Number);
        const [oh, om] = r.checkOut.split(":").map(Number);
        const diff = (oh + om / 60) - (ih + im / 60);
        if (diff > 0) hours = diff.toFixed(1) + "h";
      }
      return `
        <tr>
          <td>${r.date}</td>
          <td>${Utils.escapeHtml(r.employeeName)}</td>
          <td>${r.type === "office" ? "Office" : "Site"}</td>
          <td>${r.checkIn || "-"}</td>
          <td>${r.checkOut || "-"}</td>
          <td>${hours}</td>
          <td><span class="badge ${this.approvalBadgeClass(r.approvalStatus)}">${r.approvalStatus}</span></td>
        </tr>`;
    }).join("");
  },

  exportHistoryCsv() {
    API.getAttendance(this.historyFilters).then((records) => {
      if (records.length === 0) { Utils.toast("warning", "No records to export."); return; }
      const header = "Date,Employee,Type,CheckIn,CheckOut,Status,Approval\n";
      const rows = records.map((r) =>
        [r.date, r.employeeName, r.type, r.checkIn || "", r.checkOut || "", r.status, r.approvalStatus].join(",")
      ).join("\n");
      const blob = new Blob([header + rows], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance_history.csv";
      a.click();
      URL.revokeObjectURL(url);
      Utils.toast("success", "Export downloaded.");
    });
  },

  currentApprovalId: null,

  async refreshApprovalView() {
    const records = await API.getAttendance({ approvalStatus: "pending" });
    const tbody = document.getElementById("approvalTableBody");
    const badge = document.getElementById("approvalBadge");
    if (badge) badge.textContent = records.length;

    if (!tbody) return;
    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">No pending requests.</td></tr>`;
      return;
    }
    tbody.innerHTML = records.map((r) => `
      <tr>
        <td>${Utils.escapeHtml(r.employeeName)}</td>
        <td>${r.type === "office" ? "Office Attendance" : "Site Attendance"}</td>
        <td>${r.date}</td>
        <td>${Utils.escapeHtml(r.notes || "-")}</td>
        <td><span class="badge ${this.approvalBadgeClass(r.approvalStatus)}">${r.approvalStatus}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-success me-1 open-approval-btn" data-id="${r.id}"><i class="bi bi-eye"></i></button>
        </td>
      </tr>`).join("");

    tbody.querySelectorAll(".open-approval-btn").forEach((btn) =>
      btn.addEventListener("click", () => this.openApprovalModal(btn.dataset.id)));
  },

  async openApprovalModal(id) {
    const records = await API.getAttendance();
    const rec = records.find((r) => r.id === id);
    if (!rec) return;
    this.currentApprovalId = id;
    const list = document.getElementById("approvalDetailList");
    if (list) {
      list.innerHTML = `
        <p><strong>Employee:</strong> ${Utils.escapeHtml(rec.employeeName)}</p>
        <p><strong>Type:</strong> ${rec.type === "office" ? "Office" : "Site"}</p>
        <p><strong>Date:</strong> ${rec.date}</p>
        <p><strong>Check In:</strong> ${rec.checkIn || "-"}</p>
        <p><strong>Check Out:</strong> ${rec.checkOut || "-"}</p>
        <p><strong>Notes:</strong> ${Utils.escapeHtml(rec.notes || "-")}</p>`;
    }
    Modals.open("approvalModalBackdrop");
  },

  async handleApprove() {
    if (!this.currentApprovalId) return;
    const result = await API.approveAttendance(this.currentApprovalId);
    if (result.success) {
      Utils.toast("success", "Attendance approved.");
      Modals.close("approvalModalBackdrop");
      await this.refreshApprovalView();
      await this.refreshHistoryView();
      Dashboard.refresh();
    }
  },


  /* ---------- GPS VERIFICATION ---------- */
  pendingContext: null, // { type, action, gps, distance }

  getGpsPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  },

  async verifyGps(chipPrefix) {
    const gpsChip = document.getElementById(chipPrefix + "GpsChip");
    const gpsValue = document.getElementById(chipPrefix + "GpsValue");
    const distValue = document.getElementById(chipPrefix + "DistanceValue");
    const pos = await this.getGpsPosition();
    if (!pos) {
      if (gpsChip) { gpsChip.classList.remove("verified"); gpsChip.classList.add("failed"); }
      if (gpsValue) gpsValue.textContent = "Location Failed";
      return { verified: false, distance: null, pos: null };
    }
    const settings = Storage.get(Storage.keys.SETTINGS, {});
    const office = settings.officeLocation || CONFIG.OFFICE_LOCATION;
    const distance = Utils.distanceMeters(pos.lat, pos.lng, office.lat, office.lng);
    const verified = distance <= (office.radiusMeters || 500);
    if (gpsChip) { gpsChip.classList.toggle("verified", verified); gpsChip.classList.toggle("failed", !verified); }
    if (gpsValue) gpsValue.textContent = verified ? "Location Verified" : "Out of Range";
    if (distValue) distValue.textContent = Math.round(distance) + " m";
    return { verified, distance, pos };
  },

  /* ---------- QR SCANNER (html5-qrcode) ---------- */
  html5QrScanner: null,
  availableCameras: [],
  activeCameraIndex: 0,

  async initQRScanner(elementId, onScanSuccess) {
    this.stopQRScanner();

    const el = document.getElementById(elementId);
    if (el) el.innerHTML = "";

    if (typeof Html5Qrcode === "undefined") {
      Utils.toast("error", "QR scanner library not loaded.");
      return;
    }

    try {
      this.availableCameras = await Html5Qrcode.getCameras();
    } catch (e) {
      this.availableCameras = [];
    }

    this.html5QrScanner = new Html5Qrcode(elementId);
    const config = { fps: 15, qrbox: { width: 230, height: 230 }, aspectRatio: 1.0 };

    let cameraConstraint = { facingMode: "environment" };
    if (this.availableCameras.length > 0) {
      // Find back camera by label or fallback
      const backCamIndex = this.availableCameras.findIndex((c) =>
        /back|rear|environment|0/i.test(c.label)
      );
      this.activeCameraIndex = backCamIndex >= 0 ? backCamIndex : 0;
      cameraConstraint = this.availableCameras[this.activeCameraIndex].id;
    }

    const startWithConstraint = (constraint) => {
      return this.html5QrScanner.start(
        constraint,
        config,
        (decodedText) => {
          this.stopQRScanner();
          onScanSuccess(decodedText);
        },
        () => {}
      );
    };

    startWithConstraint(cameraConstraint).catch((err) => {
      console.warn("Camera start failed with primary constraint, attempting fallback", err);
      startWithConstraint({ facingMode: "environment" }).catch((fallbackErr) => {
        console.error("QR scanner start failed completely", fallbackErr);
        Utils.toast("error", "Unable to start back camera for QR scan.");
      });
    });
  },

  stopQRScanner() {
    if (this.html5QrScanner) {
      const scanner = this.html5QrScanner;
      this.html5QrScanner = null;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {
          try { scanner.clear(); } catch (e) {}
        });
    }
  },

  /* ---------- QR SCAN FLOW (Office: no selfie / Site: selfie + photo) ---------- */
  async beginQrFlow(type, action) {
    const session = Auth.currentSession();
    if (!session) { Utils.toast("error", "Please login first."); return; }

    if (type === "site") {
      const siteSelect = document.getElementById("siteLocationSelect");
      if (!siteSelect || !siteSelect.value) {
        Utils.toast("warning", "Please select a project/site first.");
        return;
      }
    }

    this.pendingContext = { type, action };

    const title = document.getElementById("qrScanModalTitle");
    if (title) title.innerHTML = `<i class="bi bi-qr-code-scan me-2"></i>Scan ${type === "office" ? "Office" : "Site"} QR — ${action === "checkIn" ? "Check In" : "Check Out"}`;

    Modals.open("qrScanModalBackdrop");
    const gpsRow = document.getElementById("qrGpsRow");
    const gpsText = document.getElementById("qrGpsStatusText");
    if (gpsRow) gpsRow.className = "gps-check-row";
    if (gpsText) gpsText.textContent = "Verifying GPS...";

    this.verifyGps(type === "office" ? "office" : "site").then((result) => {
      if (gpsText) gpsText.textContent = result.verified ? "Location Verified" : "Location could not be verified";
      if (gpsRow) gpsRow.classList.add(result.verified ? "verified" : "failed");
      this.pendingContext.gpsResult = result;
    });

    this.initQRScanner("qrReaderEl", (decodedText) => this.onQrScanned(decodedText));
  },

  closeQrScanModal() {
    this.stopQRScanner();
    Modals.close("qrScanModalBackdrop");
  },

  async onQrScanned(decodedText) {
    this.stopQRScanner();
    Modals.close("qrScanModalBackdrop");

    let payload;
    try { payload = JSON.parse(decodedText); } catch (e) { payload = { code: decodedText }; }
    const scannedCode = (payload && (payload.code || payload.qr)) || decodedText;

    const ctx = this.pendingContext || {};

    if (ctx.type === "office") {
      const verify = await API.verifyQr({ code: scannedCode, type: "office", action: ctx.action });
      if (!verify.success) {
        Utils.toast("error", verify.message || "QR verification failed.");
        return;
      }
      // No selfie/photo — straight to marking attendance
      await this.markAttendance("office", ctx.action, { gps: ctx.gpsResult });
      this.playSuccessAnimation(ctx.action === "checkIn" ? "Checked In!" : "Checked Out!");
    } else {
      // Site flow requires selfie + photo + optional meter reading
      this.openSiteCaptureModal(ctx.action);
    }
  },

  playSuccessAnimation(text) {
    const overlay = document.getElementById("qrSuccessOverlay");
    const label = document.getElementById("qrSuccessText");
    if (label) label.textContent = text;
    if (overlay) {
      overlay.classList.remove("d-none");
      setTimeout(() => overlay.classList.add("d-none"), 1600);
    }
  },

  /* ---------- SITE CAPTURE MODAL (Selfie + Site Photo + Meter) ---------- */
  selfieStream: null,
  selfieDataUrl: null,
  sitePhotoDataUrl: null,

  openSiteCaptureModal(action) {
    this.pendingContext = this.pendingContext || {};
    this.pendingContext.action = action;
    this.selfieDataUrl = null;
    this.sitePhotoDataUrl = null;

    const title = document.getElementById("siteCaptureModalTitle");
    if (title) title.innerHTML = `<i class="bi bi-camera-fill me-2"></i>Site Verification — ${action === "checkIn" ? "Check In" : "Check Out"}`;

    const selfiePreview = document.getElementById("selfiePreviewImg");
    const selfiePlaceholder = document.getElementById("selfiePlaceholder");
    const selfieVideo = document.getElementById("selfieVideoEl");
    if (selfiePreview) { selfiePreview.classList.add("d-none"); selfiePreview.src = ""; }
    if (selfiePlaceholder) selfiePlaceholder.classList.remove("d-none");
    if (selfieVideo) selfieVideo.classList.add("d-none");
    document.getElementById("selfieStartBtn")?.classList.remove("d-none");
    document.getElementById("selfieCaptureBtn")?.classList.add("d-none");

    const sitePhotoPreview = document.getElementById("sitePhotoPreviewImg");
    const sitePhotoPlaceholder = document.getElementById("sitePhotoPlaceholder");
    if (sitePhotoPreview) { sitePhotoPreview.classList.add("d-none"); sitePhotoPreview.src = ""; }
    if (sitePhotoPlaceholder) sitePhotoPlaceholder.classList.remove("d-none");

    ["siteVehicleSelect", "siteBikeNumberInput", "siteMeterReadingInput", "siteRemarksInput"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    Modals.open("siteCaptureModalBackdrop");
  },

  closeSiteCaptureModal() {
    this.stopSelfieCamera();
    Modals.close("siteCaptureModalBackdrop");
  },

  async startSelfieCamera() {
    try {
      this.stopSelfieCamera();
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      } catch (err) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      this.selfieStream = stream;
      const video = document.getElementById("selfieVideoEl");
      const placeholder = document.getElementById("selfiePlaceholder");
      if (video) {
        video.srcObject = this.selfieStream;
        video.classList.remove("d-none");
        video.play();
      }
      if (placeholder) placeholder.classList.add("d-none");
      document.getElementById("selfieStartBtn")?.classList.add("d-none");
      document.getElementById("selfieCaptureBtn")?.classList.remove("d-none");
    } catch (e) {
      console.error("Selfie camera start failed", e);
      Utils.toast("error", "Camera permission denied or unavailable.");
    }
  },

  stopSelfieCamera() {
    if (this.selfieStream) {
      this.selfieStream.getTracks().forEach((t) => t.stop());
      this.selfieStream = null;
    }
  },

  captureSelfie() {
    const video = document.getElementById("selfieVideoEl");
    if (!video || !video.videoWidth) { Utils.toast("error", "Camera not ready."); return; }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.selfieDataUrl = canvas.toDataURL("image/jpeg", 0.85);

    const preview = document.getElementById("selfiePreviewImg");
    if (preview) { preview.src = this.selfieDataUrl; preview.classList.remove("d-none"); }
    video.classList.add("d-none");
    this.stopSelfieCamera();
    document.getElementById("selfieCaptureBtn")?.classList.add("d-none");
    Utils.toast("success", "Selfie captured.");
  },

  handleSitePhotoSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.sitePhotoDataUrl = ev.target.result;
      const preview = document.getElementById("sitePhotoPreviewImg");
      const placeholder = document.getElementById("sitePhotoPlaceholder");
      if (preview) { preview.src = this.sitePhotoDataUrl; preview.classList.remove("d-none"); }
      if (placeholder) placeholder.classList.add("d-none");
    };
    reader.readAsDataURL(file);
  },

  async submitSiteCapture() {
    if (!this.selfieDataUrl) { Utils.toast("warning", "Please capture a selfie."); return; }
    if (!this.sitePhotoDataUrl) { Utils.toast("warning", "Please upload a site photo."); return; }

    const action = (this.pendingContext && this.pendingContext.action) || "checkIn";
    const extra = {
      gps: this.pendingContext ? this.pendingContext.gpsResult : null,
      selfie: this.selfieDataUrl,
      sitePhoto: this.sitePhotoDataUrl,
      vehicle: document.getElementById("siteVehicleSelect")?.value || "",
      bikeNumber: document.getElementById("siteBikeNumberInput")?.value || "",
      meterReading: document.getElementById("siteMeterReadingInput")?.value || "",
      remarks: document.getElementById("siteRemarksInput")?.value || ""
    };

    await this.markAttendance("site", action, extra);
    this.closeSiteCaptureModal();
    this.playSuccessAnimation(action === "checkIn" ? "Checked In!" : "Checked Out!");
  },

  /* ---------- OFFICE QR PREVIEW / DOWNLOAD / PRINT / REGENERATE ---------- */
  officeQrValue: null,
  async getOfficeQrValue() {
    if (this.officeQrValue) return this.officeQrValue;
    const qr = await API.getOfficeQr();
    this.officeQrValue = (qr && (qr.code || qr.value || qr.qrCode)) || CONFIG.OFFICE_QR_CODE;
    return this.officeQrValue;
  },
  async renderOfficeQrPreview() {
    if (typeof QRCode === "undefined") return;
    const wrap = document.getElementById("officeQrCanvas");
    if (wrap && !wrap.dataset.rendered) {
      wrap.dataset.rendered = "true";
      const value = await this.getOfficeQrValue();
      new QRCode(wrap, {
        text: value,
        width: 160,
        height: 160,
        colorDark: "#021C4F",
        colorLight: "#ffffff"
      });
    }
  },

  async openLargeQrModal() {
    if (typeof QRCode !== "undefined") {
      const wrap = document.getElementById("officeQrCanvasLarge");
      if (wrap && !wrap.dataset.rendered) {
        wrap.dataset.rendered = "true";
        const value = await this.getOfficeQrValue();
        new QRCode(wrap, {
          text: value,
          width: 220,
          height: 220,
          colorDark: "#021C4F",
          colorLight: "#ffffff"
        });
      }
    }
    Modals.open("qrLargeModalBackdrop");
  },

  downloadOfficeQr() {
    const wrap = document.getElementById("officeQrCanvas");
    const img = wrap ? wrap.querySelector("img, canvas") : null;
    if (!img) { Utils.toast("error", "QR not ready yet."); return; }
    const dataUrl = img.tagName === "CANVAS" ? img.toDataURL("image/png") : img.src;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "SAFE-SOLUTIONS-HQ-001-QR.png";
    a.click();
    Utils.toast("success", "QR code downloaded.");
  },

  printOfficeQr() {
    const wrap = document.getElementById("officeQrCanvas");
    const img = wrap ? wrap.querySelector("img, canvas") : null;
    if (!img) { Utils.toast("error", "QR not ready yet."); return; }
    const dataUrl = img.tagName === "CANVAS" ? img.toDataURL("image/png") : img.src;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Office QR</title></head><body style="text-align:center;margin-top:60px;">
      <h2>SAFE SOLUTIONS — Office QR</h2>
      <img src="${dataUrl}" style="width:280px;height:280px;" />
      <p>SAFE-SOLUTIONS-HQ-001</p>
      <script>window.onload = () => { window.print(); }<\/script>
      </body></html>`);
    win.document.close();
  },

  async regenerateOfficeQr() {
    const session = Auth.currentSession();
    if (!session || (session.role !== CONFIG.ROLES.CONTROLLER && session.role !== CONFIG.ROLES.BOSS)) {
      Utils.toast("error", "Only Controller or Boss can regenerate the office QR.");
      return;
    }
    const confirmed = await Utils.confirm("Regenerate Office QR?", "This will invalidate the previous printed QR codes.");
    if (!confirmed) return;
    const wrap = document.getElementById("officeQrCanvas");
    const large = document.getElementById("officeQrCanvasLarge");
    [wrap, large].forEach((el) => { if (el) { el.innerHTML = ""; delete el.dataset.rendered; } });
    this.officeQrValue = null;
    await this.renderOfficeQrPreview();
    Utils.toast("success", "Office QR regenerated.");
  },

  /* ---------- TIMELINE RENDERING ---------- */
  renderTimeline(elementId, records) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!records || records.length === 0) {
      el.innerHTML = `<div class="timeline-empty">No activity recorded yet today.</div>`;
      return;
    }
    const items = [];
    records.forEach((r) => {
      if (r.checkIn) {
        items.push({ time: r.checkIn, title: `${r.employeeName} checked in`, meta: r.type === "office" ? "Office" : (r.site || "Site"), cls: "success", icon: "bi-box-arrow-in-right" });
      }
      if (r.checkOut) {
        items.push({ time: r.checkOut, title: `${r.employeeName} checked out`, meta: r.type === "office" ? "Office" : (r.site || "Site"), cls: "warning", icon: "bi-box-arrow-right" });
      }
    });
    items.sort((a, b) => (a.time > b.time ? -1 : 1));
    el.innerHTML = items.slice(0, 12).map((it) => `
      <div class="timeline-item">
        <div class="timeline-dot ${it.cls}"><i class="bi ${it.icon}"></i></div>
        <div class="timeline-content">
          <span class="timeline-title">${Utils.escapeHtml(it.title)}</span>
          <span class="timeline-meta">${Utils.escapeHtml(it.meta)} • ${it.time}</span>
        </div>
      </div>`).join("");
  }
};

/* =========================================================================
   11. REPORTS MODULE
   ========================================================================= */
const ReportsModule = {
  charts: {},

  async init() {
    this.bindEvents();
    await this.refresh();
  },

  bindEvents() {
    const genBtn = document.getElementById("reportGenerateBtn");
    if (genBtn && !genBtn.dataset.bound) {
      genBtn.dataset.bound = "true";
      genBtn.addEventListener("click", () => this.refresh());
    }
    const pdfBtn = document.getElementById("reportExportPdfBtn");
    if (pdfBtn && !pdfBtn.dataset.bound) {
      pdfBtn.dataset.bound = "true";
      pdfBtn.addEventListener("click", () => this.downloadReportFile("/reports/export/pdf", "attendance_report.pdf"));
    }
    const excelBtn = document.getElementById("reportExportExcelBtn");
    if (excelBtn && !excelBtn.dataset.bound) {
      excelBtn.dataset.bound = "true";
      excelBtn.addEventListener("click", () => this.downloadReportFile("/reports/export/excel", "attendance_report.xlsx"));
    }
  },

  async downloadReportFile(endpoint, filename) {
    const monthInput = document.getElementById("reportMonthInput");
    const params = new URLSearchParams();
    if (monthInput && monthInput.value) {
      params.append("fromDate", monthInput.value + "-01");
      const [yr, mo] = monthInput.value.split("-").map(Number);
      const lastDay = new Date(yr, mo, 0).getDate();
      params.append("toDate", monthInput.value + "-" + String(lastDay).padStart(2, "0"));
    }
    const token = Storage.getToken();
    const headers = {};
    if (token) headers["Authorization"] = "Bearer " + token;

    try {
      const res = await fetch(CONFIG.API_BASE + endpoint + (params.toString() ? "?" + params.toString() : ""), { headers });
      if (!res.ok) throw new Error("Failed to download file");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      Utils.toast("success", "Export downloaded.");
    } catch (e) {
      console.error("Export error", e);
      Utils.toast("error", "Export failed.");
    }
  },

  ensureCanvas(containerId, canvasId) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    let canvas = document.getElementById(canvasId);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = canvasId;
      container.appendChild(canvas);
    }
    return canvas;
  },

  async refresh() {
    const monthInput = document.getElementById("reportMonthInput");
    const filters = {};
    if (monthInput && monthInput.value) {
      filters.fromDate = monthInput.value + "-01";
      const [yr, mo] = monthInput.value.split("-").map(Number);
      const lastDay = new Date(yr, mo, 0).getDate();
      filters.toDate = monthInput.value + "-" + String(lastDay).padStart(2, "0");
    }
    const data = await API.getReports(filters);
    this.renderCharts(data);
    this.renderTable(data);
  },

  renderTable(data) {
    const tbody = document.getElementById("reportsTableBody");
    if (!tbody) return;
    const rows = Object.values(data.byEmployee);
    tbody.innerHTML = rows.map((r) => `
      <tr>
        <td>${Utils.escapeHtml(r.name)}</td>
        <td>${r.present}</td>
        <td>${r.absent}</td>
        <td>${r.late}</td>
        <td>${r.leave}</td>
        <td>${r.hours.toFixed(1)}</td>
      </tr>`).join("");
  },

  renderCharts(data) {
    if (typeof Chart === "undefined") return;

    const trendCanvas = this.ensureCanvas("monthlyTrendChart", "monthlyTrendChartCanvas");
    if (trendCanvas) {
      const dates = Object.keys(data.byDate).sort();
      const counts = dates.map((d) => data.byDate[d]);
      if (this.charts.trend) this.charts.trend.destroy();
      this.charts.trend = new Chart(trendCanvas, {
        type: "line",
        data: { labels: dates, datasets: [{ label: "Attendance", data: counts, borderColor: "#FF6B8F", backgroundColor: "rgba(135,245,245,0.2)", tension: 0.35, fill: true }] },
        options: {
          scales: { x: { ticks: { color: "#FFE5F1" }, grid: { color: "rgba(255,255,255,0.1)" } }, y: { ticks: { color: "#FFE5F1" }, grid: { color: "rgba(255,255,255,0.1)" } } },
          plugins: { legend: { labels: { color: "#FFE5F1" } } }
        }
      });
    }

    const deptCanvas = this.ensureCanvas("departmentChart", "departmentChartCanvas");
    if (deptCanvas) {
      const rows = Object.values(data.byEmployee);
      if (this.charts.dept) this.charts.dept.destroy();
      this.charts.dept = new Chart(deptCanvas, {
        type: "bar",
        data: { labels: rows.map((r) => r.name), datasets: [{ label: "Present Days", data: rows.map((r) => r.present), backgroundColor: "#C50337" }] },
        options: {
          scales: { x: { ticks: { color: "#FFE5F1" }, grid: { color: "rgba(255,255,255,0.1)" } }, y: { ticks: { color: "#FFE5F1" }, grid: { color: "rgba(255,255,255,0.1)" } } },
          plugins: { legend: { labels: { color: "#FFE5F1" } } }
        }
      });
    }
  },

  exportExcelCsv() {
    API.getReports().then((data) => {
      const rows = Object.values(data.byEmployee);
      const header = "Employee,Present,Absent,Late,Leave,Hours\n";
      const csv = rows.map((r) => [r.name, r.present, r.absent, r.late, r.leave, r.hours.toFixed(1)].join(",")).join("\n");
      const blob = new Blob([header + csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance_report.csv";
      a.click();
      URL.revokeObjectURL(url);
      Utils.toast("success", "Report exported.");
    });
  }
};

/* =========================================================================
   12. DASHBOARD MODULE
   ========================================================================= */
const Dashboard = {
  charts: {},

  async init() {
    this.initHeroSlider();
    await this.refresh();
  },

  async refresh() {
    const today = Utils.todayStr();
    const todayRecords = await API.getAttendance({ date: today });
    const backendStats = await API.getDashboardStats();
    const weekly = await API.getWeeklyAttendance();

    let stats;
    if (backendStats && (backendStats.total !== undefined || backendStats.totalEmployees !== undefined)) {
      stats = {
        total: backendStats.total ?? backendStats.totalEmployees ?? 0,
        present: backendStats.present ?? backendStats.presentToday ?? 0,
        absent: backendStats.absent ?? backendStats.absentToday ?? 0,
        pending: backendStats.pending ?? backendStats.pendingApprovals ?? 0
      };
    } else {
      const employees = await API.getEmployees();
      const pending = await API.getAttendance({ approvalStatus: "pending" });
      const presentIds = new Set(todayRecords.filter((r) => r.status === "present").map((r) => r.employeeId));
      stats = {
        total: employees.length,
        present: presentIds.size,
        absent: Math.max(0, employees.length - presentIds.size),
        pending: pending.length
      };
    }

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText("statTotalEmployees", stats.total);
    setText("statPresentToday", stats.present);
    setText("statAbsentToday", stats.absent);
    setText("statPendingApprovals", stats.pending);

    const approvalBadge = document.getElementById("approvalBadge");
    if (approvalBadge) approvalBadge.textContent = stats.pending;

    this.renderRecentActivity(todayRecords.slice(0, 8));
    this.renderCharts(todayRecords, stats, weekly);
  },

  renderRecentActivity(records) {
    const tbody = document.getElementById("recentActivityTableBody");
    if (!tbody) return;
    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3">No activity today.</td></tr>`;
      return;
    }
    tbody.innerHTML = records.map((r) => `
      <tr>
        <td>${Utils.escapeHtml(r.employeeName)}</td>
        <td>${r.type === "office" ? "Office" : "Site"}</td>
        <td><span class="badge ${AttendanceModule.approvalBadgeClass(r.approvalStatus)}">${r.approvalStatus}</span></td>
        <td>${r.checkIn || "-"}</td>
      </tr>`).join("");
  },

  renderCharts(todayRecords, stats, weekly) {
    if (typeof Chart === "undefined") return;

    let weeklyCanvas = document.getElementById("weeklyAttendanceChartCanvas");
    const weeklyContainer = document.getElementById("weeklyAttendanceChart");
    if (weeklyContainer && !weeklyCanvas) {
      weeklyCanvas = document.createElement("canvas");
      weeklyCanvas.id = "weeklyAttendanceChartCanvas";
      weeklyContainer.appendChild(weeklyCanvas);
    }
    if (weeklyCanvas) {
      let labels = [];
      let counts = [];
      const weeklyArr = Array.isArray(weekly) ? weekly : (weekly && (weekly.data || weekly.days));
      if (Array.isArray(weeklyArr) && weeklyArr.length) {
        labels = weeklyArr.map((d) => d.label || d.day || d.date || "");
        counts = weeklyArr.map((d) => d.count ?? d.present ?? d.total ?? 0);
      } else {
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          labels.push(d.toLocaleDateString(undefined, { weekday: "short" }));
          counts.push(0);
        }
      }
      if (this.charts.weekly) this.charts.weekly.destroy();
      this.charts.weekly = new Chart(weeklyCanvas, {
        type: "bar",
        data: { labels, datasets: [{ label: "Attendance", data: counts, backgroundColor: "#C50337" }] },
        options: {
          scales: { x: { ticks: { color: "#FFE5F1" }, grid: { color: "rgba(255,255,255,0.1)" } }, y: { ticks: { color: "#FFE5F1" }, grid: { color: "rgba(255,255,255,0.1)" } } },
          plugins: { legend: { labels: { color: "#FFE5F1" } } }
        }
      });
    }

    let ratioCanvas = document.getElementById("attendanceRatioChartCanvas");
    const ratioContainer = document.getElementById("attendanceRatioChart");
    if (ratioContainer && !ratioCanvas) {
      ratioCanvas = document.createElement("canvas");
      ratioCanvas.id = "attendanceRatioChartCanvas";
      ratioContainer.appendChild(ratioCanvas);
    }
    if (ratioCanvas) {
      if (this.charts.ratio) this.charts.ratio.destroy();
      this.charts.ratio = new Chart(ratioCanvas, {
        type: "doughnut",
        data: { labels: ["Present", "Absent"], datasets: [{ data: [stats.present, stats.absent], backgroundColor: ["#FF6B8F", "#E31A4F"], borderColor: "#021C4F" }] },
        options: { plugins: { legend: { labels: { color: "#FFE5F1" } } } }
      });
    }
  },

  initHeroSlider() {
    const slider = document.getElementById("heroSlider");
    if (!slider || slider.dataset.initialized) return;
    slider.dataset.initialized = "true";

    const slides = slider.querySelectorAll(".hero-slide");
    const dots = slider.querySelectorAll(".hero-dot");
    let index = 0;

    const show = (i) => {
      slides.forEach((s, si) => s.classList.toggle("active", si === i));
      dots.forEach((d, di) => d.classList.toggle("active", di === i));
      index = i;
    };

    const prevBtn = document.getElementById("heroPrevBtn");
    const nextBtn = document.getElementById("heroNextBtn");
    if (prevBtn) prevBtn.addEventListener("click", () => show((index - 1 + slides.length) % slides.length));
    if (nextBtn) nextBtn.addEventListener("click", () => show((index + 1) % slides.length));
    dots.forEach((d, i) => d.addEventListener("click", () => show(i)));

    setInterval(() => show((index + 1) % slides.length), 5000);
  }
};

/* =========================================================================
   13. PROFILE MODULE
   ========================================================================= */
const ProfileModule = {
  init() {
    this.render();
    this.bindEvents();
  },

  render() {
    const session = Auth.currentSession();
    if (!session) return;

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
    const setImg = (id, val) => { const el = document.getElementById(id); if (el) el.src = Utils.imgPath(val); };

    setImg("profileAvatar", session.image);
    setText("profileName", session.name);
    setText("profileRole", session.role);
    setText("profileEmail", session.email || "-");
    setText("profilePhone", session.phone || "-");
    setText("profileDepartment", session.department || "-");
    setText("profileJoinDate", session.joinDate || "-");

    setVal("profileFullNameInput", session.name);
    setVal("profileEmailInput", session.email);
    setVal("profilePhoneInput", session.phone);
    setVal("profileDesignationInput", session.designation);

    setImg("topbarUserAvatar", session.image);
    setText("topbarUserName", session.name);
  },

  bindEvents() {
    const saveBtn = document.getElementById("profileSaveBtn");
    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = "true";
      saveBtn.addEventListener("click", () => this.handleSave());
    }
    const updatePwBtn = document.getElementById("updatePasswordBtn");
    if (updatePwBtn && !updatePwBtn.dataset.bound) {
      updatePwBtn.dataset.bound = "true";
      updatePwBtn.addEventListener("click", () => this.handlePasswordUpdate());
    }
    const avatarEditBtn = document.getElementById("profileAvatarEditBtn");
    if (avatarEditBtn && !avatarEditBtn.dataset.bound) {
      avatarEditBtn.dataset.bound = "true";
      avatarEditBtn.addEventListener("click", () => Utils.toast("info", "Photo upload available in Employee Management."));
    }
  },

  async handleSave() {
    const session = Auth.currentSession();
    if (!session) return;
    const getVal = (id) => document.getElementById(id)?.value.trim() || "";
    const data = {
      name: getVal("profileFullNameInput") || session.name,
      email: getVal("profileEmailInput") || session.email,
      phone: getVal("profilePhoneInput") || session.phone,
      designation: getVal("profileDesignationInput") || session.designation
    };
    const result = await API.updateEmployee(session.employeeId, data);
    if (result.success) {
      Utils.toast("success", "Profile updated.");
      const updatedSession = { ...session, ...data };
      Storage.set(Storage.keys.SESSION, updatedSession);
      this.render();
    } else {
      Utils.toast("error", result.message || "Failed to update profile.");
    }
  },

  async handlePasswordUpdate() {
    const session = Auth.currentSession();
    if (!session) return;
    const current = document.getElementById("currentPasswordInput")?.value || "";
    const next = document.getElementById("newPasswordInput")?.value || "";
    const confirm = document.getElementById("confirmPasswordInput")?.value || "";

    if (!current || !next || !confirm) { Utils.toast("error", "All password fields are required."); return; }
    if (next.length < 6) { Utils.toast("error", "New password must be at least 6 characters."); return; }
    if (next !== confirm) { Utils.toast("error", "Passwords do not match."); return; }

    const result = await API.changePassword(session.username, current, next);
    if (result.success) {
      Utils.toast("success", "Password updated successfully.");
      ["currentPasswordInput", "newPasswordInput", "confirmPasswordInput"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
    } else {
      Utils.toast("error", result.message);
    }
  }
};

/* =========================================================================
   14. SETTINGS MODULE
   ========================================================================= */
const SettingsModule = {
  async init() {
    const settings = await API.getSettings() || {};
    Storage.set(Storage.keys.SETTINGS, settings);
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setChecked = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

    setVal("officeStartTimeInput", settings.officeStartTime || "09:00");
    setVal("officeEndTimeInput", settings.officeEndTime || "17:00");
    setVal("lateGraceMinutesInput", settings.lateGraceMinutes ?? 15);
    setChecked("darkModeToggle", settings.darkMode !== false);
    setChecked("emailNotifToggle", settings.emailNotif !== false);
    setChecked("pushNotifToggle", settings.pushNotif !== false);

    const saveBtn = document.getElementById("saveSettingsBtn");
    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = "true";
      saveBtn.addEventListener("click", () => this.save());
    }
  },
  async save() {
    const settings = Storage.get(Storage.keys.SETTINGS, {}) || {};
    settings.officeStartTime = document.getElementById("officeStartTimeInput")?.value || "09:00";
    settings.officeEndTime = document.getElementById("officeEndTimeInput")?.value || "17:00";
    settings.lateGraceMinutes = parseInt(document.getElementById("lateGraceMinutesInput")?.value, 10) || 15;
    settings.darkMode = document.getElementById("darkModeToggle")?.checked ?? true;
    settings.emailNotif = document.getElementById("emailNotifToggle")?.checked ?? true;
    settings.pushNotif = document.getElementById("pushNotifToggle")?.checked ?? true;
    const result = await API.saveSettings(settings);
    if (result.success) {
      Storage.set(Storage.keys.SETTINGS, result.settings || settings);
      Utils.toast("success", "Settings saved.");
    } else {
      Utils.toast("error", result.message || "Failed to save settings.");
    }
  }
};

/* =========================================================================
   15. UI HELPERS
   ========================================================================= */
const UI = {
  async renderNotificationBell() {
    const dot = document.getElementById("notifDot");
    const list = document.getElementById("notifList");
    await Notifications.refresh();
    const count = Notifications.unreadCount();
    if (dot) dot.style.display = count > 0 ? "block" : "none";
    if (list) {
      const all = (Notifications.cache || []).slice(0, 10);
      list.innerHTML = all.length === 0
        ? `<div class="p-2 text-center text-muted">No notifications.</div>`
        : all.map((n) => `<div class="notif-item p-2 border-bottom">${Utils.escapeHtml(n.message)}<br><small class="text-muted">${Utils.dateTimeStr(n.time)}</small></div>`).join("");
    }
  },

  applyRoleVisibility() {
    const session = Auth.currentSession();
    if (!session) return;

    const navMap = {
      navEmployee: "manageEmployees",
      navApprovals: "approve",
      navReports: "reports",
      navSettings: "settings"
    };
    Object.entries(navMap).forEach(([id, perm]) => {
      const el = document.getElementById(id);
      if (el) el.style.display = Auth.can(perm) ? "" : "none";
    });

    const addEmpBtn = document.getElementById("addEmployeeBtn");
    if (addEmpBtn) addEmpBtn.style.display = Auth.can("manageEmployees") ? "" : "none";
  },

  bindNotificationBell() {
    const bell = document.getElementById("notificationBell");
    const dropdown = document.getElementById("notificationDropdown");
    if (bell && !bell.dataset.bound) {
      bell.dataset.bound = "true";
      bell.addEventListener("click", async (e) => {
        e.stopPropagation();
        await Notifications.markAllRead();
        if (dropdown) dropdown.classList.toggle("d-none");
      });
    }
    document.addEventListener("click", (e) => {
      if (dropdown && !dropdown.classList.contains("d-none") && !dropdown.contains(e.target) && e.target !== bell) {
        dropdown.classList.add("d-none");
      }
    });
  },

  bindUserDropdown() {
    const trigger = document.getElementById("userDropdown");
    const menu = document.getElementById("userDropdownMenu");
    if (trigger && !trigger.dataset.bound) {
      trigger.dataset.bound = "true";
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        if (menu) menu.classList.toggle("d-none");
      });
    }
    document.addEventListener("click", (e) => {
      if (menu && !menu.classList.contains("d-none") && !menu.contains(e.target) && e.target !== trigger) {
        menu.classList.add("d-none");
      }
    });

    const profileLink = document.getElementById("ddProfileLink");
    if (profileLink && !profileLink.dataset.bound) {
      profileLink.dataset.bound = "true";
      profileLink.addEventListener("click", (e) => { e.preventDefault(); App.showView("profileView"); if (menu) menu.classList.add("d-none"); });
    }
    const settingsLink = document.getElementById("ddSettingsLink");
    if (settingsLink && !settingsLink.dataset.bound) {
      settingsLink.dataset.bound = "true";
      settingsLink.addEventListener("click", (e) => { e.preventDefault(); App.showView("settingsView"); if (menu) menu.classList.add("d-none"); });
    }
    const logoutLink = document.getElementById("ddLogoutLink");
    if (logoutLink && !logoutLink.dataset.bound) {
      logoutLink.dataset.bound = "true";
      logoutLink.addEventListener("click", (e) => { e.preventDefault(); Auth.logout(); });
    }
  },

  bindSidebarToggle() {
    const menuToggle = document.getElementById("menuToggleBtn");
    const sidebarClose = document.getElementById("sidebarCloseBtn");
    const overlay = document.getElementById("sidebarOverlay");
    const sidebar = document.getElementById("sidebar");

    const openSidebar = () => {
      if (sidebar) sidebar.classList.add("show");
      if (overlay) { overlay.classList.remove("d-none"); overlay.classList.add("show"); }
    };
    const closeSidebar = () => {
      if (sidebar) sidebar.classList.remove("show");
      if (overlay) { overlay.classList.add("d-none"); overlay.classList.remove("show"); }
    };

    if (menuToggle && !menuToggle.dataset.bound) { menuToggle.dataset.bound = "true"; menuToggle.addEventListener("click", openSidebar); }
    if (sidebarClose && !sidebarClose.dataset.bound) { sidebarClose.dataset.bound = "true"; sidebarClose.addEventListener("click", closeSidebar); }
    if (overlay && !overlay.dataset.bound) { overlay.dataset.bound = "true"; overlay.addEventListener("click", closeSidebar); }
  },

  bindThemeToggle() {
    const btn = document.getElementById("themeToggleBtn");
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "true";
      btn.addEventListener("click", () => document.body.classList.toggle("light-mode"));
    }
  },

  bindGlobalRipple() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".premium-btn, .outline-btn, .reject-btn");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      ripple.className = "ripple-effect";
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
      ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
      const prevPosition = getComputedStyle(btn).position;
      if (prevPosition === "static") btn.style.position = "relative";
      btn.style.overflow = "hidden";
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  }
};

/* =========================================================================
   16. APP CONTROLLER
   ========================================================================= */
const App = {
  views: [
    "dashboardView", "employeeView", "officeAttendanceView", "siteAttendanceView",
    "historyView", "approvalView", "reportsView", "profileView", "settingsView"
  ],

  async init() {
    Seed.init();
    this.bindLoginForm();
    UI.bindNotificationBell();
    UI.bindUserDropdown();
    UI.bindSidebarToggle();
    UI.bindThemeToggle();
    UI.bindGlobalRipple();
    this.bindSidebarNav();
    this.bindLogoutBtn();

    const token = Storage.getToken();
    if (token) {
      const session = await API.fetchMe();
      if (session) this.postLoginSetup();
      else { Storage.removeToken(); Storage.remove(Storage.keys.SESSION); this.showLoginScreen(); }
    } else {
      this.showLoginScreen();
    }
  },

  bindLoginForm() {
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn && !loginBtn.dataset.bound) {
      loginBtn.dataset.bound = "true";
      loginBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        const username = document.getElementById("loginUsername")?.value?.trim();
        const password = document.getElementById("loginPassword")?.value;
        if (!username || !password) {
          const errBox = document.getElementById("loginError");
          const errText = document.getElementById("loginErrorText");
          if (errText) errText.textContent = "Please enter username and password.";
          if (errBox) errBox.classList.remove("d-none");
          return;
        }
        await Auth.login(username, password);
      });
    }

    const passwordInput = document.getElementById("loginPassword");
    if (passwordInput && !passwordInput.dataset.bound) {
      passwordInput.dataset.bound = "true";
      passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); document.getElementById("loginBtn")?.click(); }
      });
    }

    const forgotLink = document.getElementById("forgotPasswordLink");
    if (forgotLink && !forgotLink.dataset.bound) {
      forgotLink.dataset.bound = "true";
      forgotLink.addEventListener("click", (e) => {
        e.preventDefault();
        Utils.alertMsg("Forgot Password", "Please contact your system administrator to reset your password.", "info");
      });
    }
  },

  bindLogoutBtn() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn && !logoutBtn.dataset.bound) {
      logoutBtn.dataset.bound = "true";
      logoutBtn.addEventListener("click", (e) => { e.preventDefault(); Auth.logout(); });
    }
  },

  bindSidebarNav() {
    document.querySelectorAll("#sidebarNav .sidebar-link").forEach((el) => {
      if (el.dataset.bound) return;
      el.dataset.bound = "true";
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const target = el.dataset.target;
        if (!target) return;
        this.showView(target);
        document.querySelectorAll("#sidebarNav .sidebar-link").forEach((l) => l.classList.remove("active"));
        el.classList.add("active");
        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("sidebarOverlay");
        if (sidebar) sidebar.classList.remove("show");
        if (overlay) { overlay.classList.add("d-none"); overlay.classList.remove("show"); }
      });
    });
  },

  showLoginScreen() {
    const loginView = document.getElementById("loginView");
    const appShell = document.getElementById("appShell");
    if (loginView) loginView.classList.remove("d-none");
    if (appShell) appShell.classList.add("d-none");
  },

  showView(viewId) {
    if (!this.views.includes(viewId)) return;
    if (!Auth.isLoggedIn()) { this.showLoginScreen(); return; }

    this.views.forEach((v) => {
      const el = document.getElementById(v);
      if (el) el.classList.toggle("d-none", v !== viewId);
    });

    this.onViewShown(viewId);
  },

  onViewShown(viewId) {
    switch (viewId) {
      case "dashboardView": Dashboard.init(); break;
      case "employeeView": EmployeeModule.init(); break;
      case "officeAttendanceView": AttendanceModule.refreshOfficeView(); break;
      case "siteAttendanceView": AttendanceModule.refreshSiteView(); break;
      case "historyView": AttendanceModule.refreshHistoryView(); break;
      case "approvalView": AttendanceModule.refreshApprovalView(); break;
      case "reportsView": ReportsModule.init(); break;
      case "settingsView": SettingsModule.init(); break;
      case "profileView": ProfileModule.init(); break;
    }
    UI.applyRoleVisibility();
  },

  postLoginSetup() {
    const loginView = document.getElementById("loginView");
    const appShell = document.getElementById("appShell");
    if (loginView) loginView.classList.add("d-none");
    if (appShell) appShell.classList.remove("d-none");

    ProfileModule.render();
    UI.renderNotificationBell();
    UI.applyRoleVisibility();
    AttendanceModule.init();
    this.showView("dashboardView");
  }
};

/* =========================================================================
   17. BOOTSTRAP
   ========================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});