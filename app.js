// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const SUPABASE_URL = "https://xhzmedynqgpfvycnlnuf.supabase.co/rest/v1"; // e.g. https://xyz.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhoem1lZHlucWdwZnZ5Y25sbnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNTMzMzEsImV4cCI6MjEwODgyOTMzMX0.1M1QGNDXT6BL6Ergcqq_q96JDvShOJCocbgym-t5zFQ"; // public anon key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// In-memory runtime state synced with Supabase
let patients = [];
let records = [];
let archivedRecords = [];
let currentUser = JSON.parse(sessionStorage.getItem("bmc_current_user")) || null;

// ==========================================
// 2. ROUTE DETECTION
// ==========================================
const rawPath = window.location.pathname.toLowerCase().split("/").pop();
const isIndex = rawPath === "" || rawPath === "index.html" || rawPath === "index";
const isPatient = rawPath === "patient.html" || rawPath === "patient";
const isMedical = rawPath === "medical.html" || rawPath === "medical";
const isReport = rawPath === "report.html" || rawPath === "report";

// ==========================================
// 3. AUTHENTICATION GUARD
// ==========================================
function checkAuth() {
  if (!currentUser) {
    if (!isIndex) {
      window.location.href = "index.html";
      return;
    }
    const authBox = document.getElementById("auth-container");
    const appBox = document.getElementById("app-container");
    if (authBox) authBox.classList.remove("hidden");
    if (appBox) appBox.classList.add("hidden");
  } else {
    const authBox = document.getElementById("auth-container");
    const appBox = document.getElementById("app-container");
    if (authBox) authBox.classList.add("hidden");
    if (appBox) appBox.classList.remove("hidden");

    const displayName = document.getElementById("user-display-name");
    const displayRole = document.getElementById("user-role-badge");
    const displayAvatar = document.getElementById("avatar-circle");

    if (displayName) displayName.textContent = currentUser.username === "admin" ? "Angel Nelson" : "Dr. Ana";
    if (displayRole) displayRole.textContent = currentUser.role === "admin" ? "Admin" : "Doctor";
    if (displayAvatar) displayAvatar.textContent = currentUser.username === "admin" ? "AN" : "DA";

    // Load initial data once authenticated
    initializeAppData();
  }
}

// LOGIN FORM SUBMISSION
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();
    const errEl = document.getElementById("login-error");

    if (u === "admin" && p === "admin123") {
      currentUser = { username: "admin", role: "admin" };
    } else if (u === "doctor" && p === "doc123") {
      currentUser = { username: "doctor", role: "user" };
    } else {
      if (errEl) errEl.textContent = "Invalid credentials.";
      return;
    }

    sessionStorage.setItem("bmc_current_user", JSON.stringify(currentUser));
    if (errEl) errEl.textContent = "";
    checkAuth();
  });
}

// LOGOUT
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("bmc_current_user");
    currentUser = null;
    window.location.href = "index.html";
  });
}

// ==========================================
// 4. SUPABASE DATA FETCHING & REALTIME SYNC
// ==========================================
async function fetchPatients() {
  const { data, error } = await supabaseClient
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && data) {
    patients = data;
  }
}

async function fetchRecords() {
  const { data, error } = await supabaseClient
    .from("records")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && data) {
    records = data.filter((r) => !r.is_archived);
    archivedRecords = data.filter((r) => r.is_archived);
  }
}

async function initializeAppData() {
  await Promise.all([fetchPatients(), fetchRecords()]);

  if (isIndex) renderDashboard();
  if (isPatient) renderPatients();
  if (isMedical) {
    renderRecords();
    renderArchivedRecords();
    populatePatientsDropdown();
  }
  if (isReport) populateReportPatientSelect();

  setupRealtimeListeners();
}

function setupRealtimeListeners() {
  supabaseClient
    .channel("public-db-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, async () => {
      await fetchPatients();
      if (isIndex) renderDashboard();
      if (isPatient) renderPatients();
      if (isMedical) populatePatientsDropdown();
      if (isReport) populateReportPatientSelect();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "records" }, async () => {
      await fetchRecords();
      if (isIndex) renderDashboard();
      if (isMedical) {
        renderRecords();
        renderArchivedRecords();
      }
    })
    .subscribe();
}

// ==========================================
// 5. DASHBOARD PAGE LOGIC
// ==========================================
function renderDashboard() {
  const pStat = document.getElementById("stat-patient-count");
  const rStat = document.getElementById("stat-record-count");
  if (pStat) pStat.textContent = patients.length;
  if (rStat) rStat.textContent = records.length;

  const recentList = document.getElementById("recent-records-list");
  if (recentList) {
    recentList.innerHTML = "";
    records.slice(0, 3).forEach((r) => {
      const p = patients.find((pat) => pat.patient_id === r.patient_id);
      recentList.innerHTML += `
        <tr>
          <td><strong>${p ? p.full_name : r.patient_id}</strong></td>
          <td>${r.diagnosis}</td>
          <td>${r.visit_date}</td>
        </tr>`;
    });
  }
}

// ==========================================
// 6. PATIENT PAGE LOGIC
// ==========================================
function renderPatients(filter = "") {
  const list = document.getElementById("patients-list");
  if (!list) return;
  list.innerHTML = "";

  const filtered = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(filter.toLowerCase()) ||
      p.patient_id.toLowerCase().includes(filter.toLowerCase()) ||
      (p.phone && p.phone.includes(filter))
  );

  if (filtered.length === 0) {
    list.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#6b7280; padding:1.25rem;">No patient records found.</td></tr>`;
    return;
  }

  filtered.forEach((p) => {
    list.innerHTML += `
      <tr>
        <td><strong>${p.patient_id}</strong></td>
        <td><i class="fa-regular fa-user" style="margin-right:8px; color:#0d9488;"></i>${p.full_name}</td>
        <td>${p.gender}</td>
        <td>${p.dob}</td>
        <td>${p.phone}</td>
        <td><a href="report.html?patient_id=${p.patient_id}" class="link-btn"><i class="fa-solid fa-clock-rotate-left"></i> History</a></td>
      </tr>`;
  });
}

if (isPatient) {
  const pSearch = document.getElementById("patient-search");
  if (pSearch) pSearch.addEventListener("input", (e) => renderPatients(e.target.value));

  const modal = document.getElementById("patient-modal");
  const openBtn = document.getElementById("open-patient-modal-btn");
  const closeBtn = document.querySelector(".close-modal");

  if (openBtn) openBtn.onclick = () => modal?.classList.remove("hidden");
  if (closeBtn) closeBtn.onclick = () => modal?.classList.add("hidden");

  if (new URLSearchParams(window.location.search).get("action") === "new") {
    modal?.classList.remove("hidden");
  }

  const pForm = document.getElementById("patient-form");
  if (pForm) {
    pForm.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = pForm.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";
      }

      const newPatient = {
        patient_id: "PAT-" + Math.floor(1000 + Math.random() * 9000),
        full_name: document.getElementById("full_name").value.trim(),
        gender: document.getElementById("gender").value,
        dob: document.getElementById("dob").value,
        phone: document.getElementById("phone").value.trim(),
        address: document.getElementById("address").value.trim()
      };

      const { error } = await supabaseClient.from("patients").insert([newPatient]);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Patient Profile";
      }

      if (error) {
        alert("Failed to save patient: " + error.message);
        return;
      }

      pForm.reset();
      modal?.classList.add("hidden");
      await fetchPatients();
      renderPatients();
    };
  }
}

// ==========================================
// 7. MEDICAL RECORDS PAGE LOGIC
// ==========================================
function renderRecords(filter = "") {
  const list = document.getElementById("records-list");
  if (!list) return;
  list.innerHTML = "";

  const filtered = records.filter(
    (r) =>
      r.patient_id.toLowerCase().includes(filter.toLowerCase()) ||
      r.diagnosis.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    list.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#6b7280; padding: 1.25rem;">No active records found.</td></tr>`;
    return;
  }

  filtered.forEach((r) => {
    list.innerHTML += `
      <tr>
        <td><strong>${r.record_id}</strong></td>
        <td>${r.patient_id}</td>
        <td>${r.visit_date}</td>
        <td>${r.diagnosis}</td>
        <td>${r.treatment}</td>
        <td>
          <button class="link-btn" style="color:#d97706;" onclick="archiveRecord('${r.record_id}')">
            <i class="fa-solid fa-box-archive"></i> Archive
          </button>
        </td>
      </tr>`;
  });
}

function renderArchivedRecords() {
  const list = document.getElementById("archived-records-list");
  const countBadge = document.getElementById("archived-count-badge");
  if (countBadge) countBadge.textContent = archivedRecords.length;

  if (!list) return;
  list.innerHTML = "";

  if (archivedRecords.length === 0) {
    list.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#6b7280; padding: 1.25rem;">No archived records available.</td></tr>`;
    return;
  }

  archivedRecords.forEach((r) => {
    const formattedDate = r.archived_at ? r.archived_at.split("T")[0] : "N/A";
    list.innerHTML += `
      <tr>
        <td><strong>${r.record_id}</strong></td>
        <td>${r.patient_id}</td>
        <td>${r.visit_date}</td>
        <td>${r.diagnosis}</td>
        <td>${formattedDate}</td>
        <td>
          <button class="link-btn" style="color:#0d9488; margin-right: 12px;" onclick="restoreRecord('${r.record_id}')">
            <i class="fa-solid fa-rotate-left"></i> Restore
          </button>
          <button class="link-btn" style="color:#dc2626;" onclick="deleteArchivedRecord('${r.record_id}')">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </td>
      </tr>`;
  });
}

function populatePatientsDropdown() {
  const sel = document.getElementById("record_patient_id");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Patient</option>';
  patients.forEach((p) => {
    sel.innerHTML += `<option value="${p.patient_id}">${p.full_name} (${p.patient_id})</option>`;
  });
}

if (isMedical) {
  const toggleArchiveBtn = document.getElementById("toggle-archive-btn");
  const archiveContent = document.getElementById("archived-section-content");
  const archiveChevron = document.getElementById("archive-chevron-icon");
  const archiveToggleText = document.getElementById("archive-toggle-text");

  if (toggleArchiveBtn && archiveContent) {
    toggleArchiveBtn.addEventListener("click", () => {
      const isHidden = archiveContent.classList.toggle("hidden");
      if (isHidden) {
        if (archiveToggleText) archiveToggleText.textContent = "Show Archive";
        if (archiveChevron) archiveChevron.style.transform = "rotate(0deg)";
      } else {
        if (archiveToggleText) archiveToggleText.textContent = "Hide Archive";
        if (archiveChevron) archiveChevron.style.transform = "rotate(180deg)";
      }
    });
  }

  const rSearch = document.getElementById("record-search");
  if (rSearch) rSearch.addEventListener("input", (e) => renderRecords(e.target.value));

  const modal = document.getElementById("record-modal");
  const openBtn = document.getElementById("open-record-modal-btn");
  const closeBtn = document.querySelector(".close-modal");

  if (openBtn) openBtn.onclick = () => modal?.classList.remove("hidden");
  if (closeBtn) closeBtn.onclick = () => modal?.classList.add("hidden");

  if (new URLSearchParams(window.location.search).get("action") === "new") {
    modal?.classList.remove("hidden");
  }

  const rForm = document.getElementById("record-form");
  if (rForm) {
    rForm.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = rForm.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";
      }

      const newRecord = {
        record_id: "REC-" + Math.floor(1000 + Math.random() * 9000),
        patient_id: document.getElementById("record_patient_id").value,
        visit_date: document.getElementById("visit_date").value,
        diagnosis: document.getElementById("diagnosis").value.trim(),
        treatment: document.getElementById("treatment").value.trim(),
        notes: document.getElementById("notes").value.trim(),
        is_archived: false
      };

      const { error } = await supabaseClient.from("records").insert([newRecord]);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Record";
      }

      if (error) {
        alert("Failed to save record: " + error.message);
        return;
      }

      modal?.classList.add("hidden");
      rForm.reset();
      await fetchRecords();
      renderRecords();
    };
  }

  // ARCHIVE RECORD (Sets flag is_archived: true in Supabase)
  window.archiveRecord = async (id) => {
    if (!confirm("Are you sure you want to archive this record?")) return;

    const { error } = await supabaseClient
      .from("records")
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq("record_id", id);

    if (error) {
      alert("Error archiving: " + error.message);
      return;
    }

    await fetchRecords();
    renderRecords();
    renderArchivedRecords();
  };

  // RESTORE ARCHIVED RECORD
  window.restoreRecord = async (id) => {
    if (!confirm("Restore this record back to active records?")) return;

    const { error } = await supabaseClient
      .from("records")
      .update({ is_archived: false, archived_at: null })
      .eq("record_id", id);

    if (error) {
      alert("Error restoring: " + error.message);
      return;
    }

    await fetchRecords();
    renderRecords();
    renderArchivedRecords();
  };

  // PERMANENTLY DELETE ARCHIVED RECORD
  window.deleteArchivedRecord = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this record? This cannot be undone.")) return;

    const { error } = await supabaseClient
      .from("records")
      .delete()
      .eq("record_id", id);

    if (error) {
      alert("Error deleting: " + error.message);
      return;
    }

    await fetchRecords();
    renderArchivedRecords();
  };
}

// ==========================================
// 8. REPORTS PAGE LOGIC
// ==========================================
function populateReportPatientSelect() {
  const sel = document.getElementById("report-patient-select");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Patient</option>';
  patients.forEach((p) => {
    sel.innerHTML += `<option value="${p.patient_id}">${p.full_name} (${p.patient_id})</option>`;
  });

  const queryPatient = new URLSearchParams(window.location.search).get("patient_id");
  if (queryPatient) sel.value = queryPatient;
}

if (isReport) {
  const genBtn = document.getElementById("generate-report-btn");
  if (genBtn) {
    genBtn.onclick = () => {
      const sel = document.getElementById("report-patient-select");
      const pId = sel?.value;
      if (!pId) return alert("Please select a patient.");

      const p = patients.find((pat) => pat.patient_id === pId);
      // Include all non-archived visits for that patient
      const pRecs = records.filter((r) => r.patient_id === pId);

      document.getElementById("report-content").innerHTML = `
        <h3>Patient Profile</h3>
        <p><strong>Name:</strong> ${p?.full_name || "N/A"} | <strong>ID:</strong> ${pId}</p>
        <p><strong>Gender:</strong> ${p?.gender || "N/A"} | <strong>DOB:</strong> ${p?.dob || "N/A"}</p>
        <p><strong>Phone:</strong> ${p?.phone || "N/A"} | <strong>Address:</strong> ${p?.address || "N/A"}</p>
        <br/>
        <h3>Medical History (${pRecs.length} visits)</h3>
        <table border="1" cellpadding="8" style="width:100%; border-collapse:collapse; margin-top:10px;">
          <thead><tr><th>Date</th><th>Diagnosis</th><th>Treatment</th><th>Notes</th></tr></thead>
          <tbody>
            ${
              pRecs.length > 0
                ? pRecs.map((r) => `<tr><td>${r.visit_date}</td><td>${r.diagnosis}</td><td>${r.treatment}</td><td>${r.notes || "None"}</td></tr>`).join("")
                : `<tr><td colspan="4" style="text-align:center;">No active records for this patient.</td></tr>`
            }
          </tbody>
        </table>`;

      const printable = document.getElementById("printable-report");
      printable?.classList.remove("hidden");
      window.print();
      printable?.classList.add("hidden");
    };
  }
}

// ==========================================
// 9. SIDEBAR TOGGLE (Preserved locally)
// ==========================================
const sidebar = document.querySelector(".sidebar");
const appLayout = document.querySelector(".app-layout");
const toggleBtn = document.getElementById("toggle-sidebar-btn");

if (localStorage.getItem("sidebar_collapsed") === "true") {
  sidebar?.classList.add("collapsed");
  appLayout?.classList.add("has-collapsed-sidebar");
}

toggleBtn?.addEventListener("click", () => {
  sidebar?.classList.toggle("collapsed");
  appLayout?.classList.toggle("has-collapsed-sidebar");

  const isCollapsed = sidebar?.classList.contains("collapsed");
  localStorage.setItem("sidebar_collapsed", isCollapsed);
});

// Run auth check on script load
checkAuth();