// INITIAL DATA
const defaultPatients = [
  { patient_id: "PAT-1001", full_name: "John Doe", gender: "Male", dob: "1995-06-15", phone: "08012345678", address: "Calabar" },
  { patient_id: "PAT-1002", full_name: "Mary Okon", gender: "Female", dob: "1990-03-22", phone: "08098765432", address: "Calabar" },
  { patient_id: "PAT-1003", full_name: "Emeka Obi", gender: "Male", dob: "1988-11-09", phone: "07055667788", address: "Calabar" }
];

const defaultRecords = [
  { record_id: "REC-5001", patient_id: "PAT-1001", visit_date: "2026-07-20", diagnosis: "Acute Malaria", treatment: "Artemether + Lumefantrine", notes: "Rest advised." }
];

function getStored(key, fallback) {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(data);
}

function setStored(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

let patients = getStored("bmc_patients", defaultPatients);
let records = getStored("bmc_records", defaultRecords);
let archivedRecords = getStored("bmc_archived_records", []);
let currentUser = JSON.parse(sessionStorage.getItem("bmc_current_user")) || null;

// FLEXIBLE ROUTE DETECTION
const rawPath = window.location.pathname.toLowerCase().split("/").pop();
const isIndex = rawPath === "" || rawPath === "index.html" || rawPath === "index";
const isPatient = rawPath === "patient.html" || rawPath === "patient";
const isMedical = rawPath === "medical.html" || rawPath === "medical";
const isReport = rawPath === "report.html" || rawPath === "report";

// AUTHENTICATION GUARD
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

    if (isIndex) renderDashboard();
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

// DASHBOARD RENDER LOGIC
function renderDashboard() {
  const pStat = document.getElementById("stat-patient-count");
  const rStat = document.getElementById("stat-record-count");
  if (pStat) pStat.textContent = patients.length;
  if (rStat) rStat.textContent = records.length;

  const recentList = document.getElementById("recent-records-list");
  if (recentList) {
    recentList.innerHTML = "";
    records.slice(-3).reverse().forEach((r) => {
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

// PATIENT PAGE LOGIC
if (isPatient) {
  const renderPatients = (filter = "") => {
    const list = document.getElementById("patients-list");
    if (!list) return;
    list.innerHTML = "";
    patients
      .filter((p) => p.full_name.toLowerCase().includes(filter.toLowerCase()) || p.patient_id.toLowerCase().includes(filter.toLowerCase()))
      .forEach((p) => {
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
  };

  renderPatients();

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
    pForm.onsubmit = (e) => {
      e.preventDefault();
      patients.push({
        patient_id: "PAT-" + Math.floor(1000 + Math.random() * 9000),
        full_name: document.getElementById("full_name").value,
        gender: document.getElementById("gender").value,
        dob: document.getElementById("dob").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value
      });
      setStored("bmc_patients", patients);
      renderPatients();
      modal?.classList.add("hidden");
    };
  }
}

// MEDICAL RECORDS PAGE LOGIC
if (isMedical) {
  // Render Active Records
  const renderRecords = (filter = "") => {
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
  };

  // Render Archived Records Table and update badge counter
  const renderArchivedRecords = () => {
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
      const formattedDate = r.archivedAt ? r.archivedAt.split("T")[0] : "N/A";
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
  };

  // Toggle Collapse/Dropdown for Archived Records
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

  const populatePatients = () => {
    const sel = document.getElementById("record_patient_id");
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Patient</option>';
    patients.forEach((p) => (sel.innerHTML += `<option value="${p.patient_id}">${p.full_name} (${p.patient_id})</option>`));
  };

  renderRecords();
  renderArchivedRecords();
  populatePatients();

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
    rForm.onsubmit = (e) => {
      e.preventDefault();
      records.push({
        record_id: "REC-" + Math.floor(1000 + Math.random() * 9000),
        patient_id: document.getElementById("record_patient_id").value,
        visit_date: document.getElementById("visit_date").value,
        diagnosis: document.getElementById("diagnosis").value,
        treatment: document.getElementById("treatment").value,
        notes: document.getElementById("notes").value
      });
      setStored("bmc_records", records);
      renderRecords();
      modal?.classList.add("hidden");
      rForm.reset();
    };
  }

  // ARCHIVE RECORD ACTION
  window.archiveRecord = (id) => {
    if (confirm("Are you sure you want to archive this record?")) {
      const recordToArchive = records.find((r) => r.record_id === id);

      if (recordToArchive) {
        archivedRecords = getStored("bmc_archived_records", []);
        archivedRecords.push({ ...recordToArchive, archivedAt: new Date().toISOString() });
        setStored("bmc_archived_records", archivedRecords);

        records = records.filter((r) => r.record_id !== id);
        setStored("bmc_records", records);

        renderRecords();
        renderArchivedRecords();
      }
    }
  };

  // RESTORE ARCHIVED RECORD ACTION
  window.restoreRecord = (id) => {
    if (confirm("Restore this record back to active records?")) {
      const recordToRestore = archivedRecords.find((r) => r.record_id === id);

      if (recordToRestore) {
        archivedRecords = archivedRecords.filter((r) => r.record_id !== id);
        setStored("bmc_archived_records", archivedRecords);

        delete recordToRestore.archivedAt;
        records.push(recordToRestore);
        setStored("bmc_records", records);

        renderRecords();
        renderArchivedRecords();
      }
    }
  };

  // PERMANENTLY DELETE ARCHIVED RECORD ACTION
  window.deleteArchivedRecord = (id) => {
    if (confirm("Are you sure you want to permanently delete this archived record? This action cannot be undone.")) {
      archivedRecords = archivedRecords.filter((r) => r.record_id !== id);
      setStored("bmc_archived_records", archivedRecords);
      renderArchivedRecords();
    }
  };
}

// REPORTS PAGE LOGIC
if (isReport) {
  const sel = document.getElementById("report-patient-select");
  if (sel) {
    sel.innerHTML = '<option value="">Select Patient</option>';
    patients.forEach((p) => (sel.innerHTML += `<option value="${p.patient_id}">${p.full_name} (${p.patient_id})</option>`));

    const queryPatient = new URLSearchParams(window.location.search).get("patient_id");
    if (queryPatient) sel.value = queryPatient;
  }

  const genBtn = document.getElementById("generate-report-btn");
  if (genBtn) {
    genBtn.onclick = () => {
      const pId = sel?.value;
      if (!pId) return alert("Please select a patient.");

      const p = patients.find((pat) => pat.patient_id === pId);
      const pRecs = records.filter((r) => r.patient_id === pId);

      document.getElementById("report-content").innerHTML = `
        <h3>Patient Profile</h3>
        <p><strong>Name:</strong> ${p.full_name} | <strong>ID:</strong> ${p.patient_id}</p>
        <p><strong>Gender:</strong> ${p.gender} | <strong>DOB:</strong> ${p.dob}</p>
        <p><strong>Phone:</strong> ${p.phone} | <strong>Address:</strong> ${p.address || "N/A"}</p>
        <br/>
        <h3>Medical History (${pRecs.length} visits)</h3>
        <table border="1" cellpadding="8" style="width:100%; border-collapse:collapse; margin-top:10px;">
          <thead><tr><th>Date</th><th>Diagnosis</th><th>Treatment</th><th>Notes</th></tr></thead>
          <tbody>
            ${pRecs.map((r) => `<tr><td>${r.visit_date}</td><td>${r.diagnosis}</td><td>${r.treatment}</td><td>${r.notes || "None"}</td></tr>`).join("")}
          </tbody>
        </table>`;

      document.getElementById("printable-report").classList.remove("hidden");
      window.print();
      document.getElementById("printable-report").classList.add("hidden");
    };
  }
}

// SIDEBAR TOGGLE
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

// RUN AUTH CHECK ON LOAD
checkAuth();