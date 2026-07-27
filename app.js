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
let currentUser = JSON.parse(sessionStorage.getItem("bmc_current_user")) || null;

const currentPage = window.location.pathname.split("/").pop() || "index.html";

// AUTHENTICATION GUARD
function checkAuth() {
  if (!currentUser && currentPage !== "index.html") {
    window.location.href = "index.html";
    return;
  }

  if (currentUser) {
    const authBox = document.getElementById("auth-container");
    const appBox = document.getElementById("app-container");
    if (authBox) authBox.classList.add("hidden");
    if (appBox) appBox.classList.remove("hidden");

    const displayName = document.getElementById("user-display-name");
    const displayRole = document.getElementById("user-role-badge");
    const displayAvatar = document.getElementById("avatar-circle");

    if (displayName) displayName.textContent = currentUser.username === "admin" ? "Owokoni Agrinya" : "Dr. Ana";
    if (displayRole) displayRole.textContent = currentUser.role === "admin" ? "Admin" : "Doctor";
    if (displayAvatar) displayAvatar.textContent = currentUser.username === "admin" ? "OA" : "DA";
  }
}

// LOGIN & LOGOUT
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();

    if (u === "admin" && p === "admin123") {
      currentUser = { username: "admin", role: "admin" };
    } else if (u === "doctor" && p === "doc123") {
      currentUser = { username: "doctor", role: "user" };
    } else {
      document.getElementById("login-error").textContent = "Invalid credentials.";
      return;
    }

    sessionStorage.setItem("bmc_current_user", JSON.stringify(currentUser));
    checkAuth();
  });
}

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("bmc_current_user");
    window.location.href = "index.html";
  });
}

// DASHBOARD PAGE LOGIC
if (currentPage === "index.html" || currentPage === "") {
  if (currentUser) {
    document.getElementById("stat-patient-count").textContent = patients.length;
    document.getElementById("stat-record-count").textContent = records.length;

    const recentList = document.getElementById("recent-records-list");
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
if (currentPage === "patient.html") {
  const renderPatients = (filter = "") => {
    const list = document.getElementById("patients-list");
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
  document.getElementById("patient-search").addEventListener("input", (e) => renderPatients(e.target.value));

  const modal = document.getElementById("patient-modal");
  document.getElementById("open-patient-modal-btn").onclick = () => modal.classList.remove("hidden");
  document.querySelector(".close-modal").onclick = () => modal.classList.add("hidden");

  if (new URLSearchParams(window.location.search).get("action") === "new") {
    modal.classList.remove("hidden");
  }

  document.getElementById("patient-form").onsubmit = (e) => {
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
    modal.classList.add("hidden");
  };
}

// MEDICAL RECORDS PAGE LOGIC
if (currentPage === "medical.html") {
  const renderRecords = (filter = "") => {
    const list = document.getElementById("records-list");
    list.innerHTML = "";
    records
      .filter((r) => r.patient_id.toLowerCase().includes(filter.toLowerCase()) || r.diagnosis.toLowerCase().includes(filter.toLowerCase()))
      .forEach((r) => {
        list.innerHTML += `
          <tr>
            <td><strong>${r.record_id}</strong></td>
            <td>${r.patient_id}</td>
            <td>${r.visit_date}</td>
            <td>${r.diagnosis}</td>
            <td>${r.treatment}</td>
            <td><button class="link-btn" style="color:#ef4444;" onclick="deleteRecord('${r.record_id}')">Delete</button></td>
          </tr>`;
      });
  };

  const populatePatients = () => {
    const sel = document.getElementById("record_patient_id");
    sel.innerHTML = '<option value="">Select Patient</option>';
    patients.forEach((p) => (sel.innerHTML += `<option value="${p.patient_id}">${p.full_name} (${p.patient_id})</option>`));
  };

  renderRecords();
  populatePatients();
  document.getElementById("record-search").addEventListener("input", (e) => renderRecords(e.target.value));

  const modal = document.getElementById("record-modal");
  document.getElementById("open-record-modal-btn").onclick = () => modal.classList.remove("hidden");
  document.querySelector(".close-modal").onclick = () => modal.classList.add("hidden");

  if (new URLSearchParams(window.location.search).get("action") === "new") {
    modal.classList.remove("hidden");
  }

  document.getElementById("record-form").onsubmit = (e) => {
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
    modal.classList.add("hidden");
  };

  window.deleteRecord = (id) => {
    if (confirm("Delete this record?")) {
      records = records.filter((r) => r.record_id !== id);
      setStored("bmc_records", records);
      renderRecords();
    }
  };
}

// REPORTS PAGE LOGIC
if (currentPage === "report.html") {
  const sel = document.getElementById("report-patient-select");
  sel.innerHTML = '<option value="">Select Patient</option>';
  patients.forEach((p) => (sel.innerHTML += `<option value="${p.patient_id}">${p.full_name} (${p.patient_id})</option>`));

  const queryPatient = new URLSearchParams(window.location.search).get("patient_id");
  if (queryPatient) sel.value = queryPatient;

  document.getElementById("generate-report-btn").onclick = () => {
    const pId = sel.value;
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

checkAuth();



// SIDEBAR TOGGLE WITH OVERLAY BUTTON CONTRAST
const sidebar = document.querySelector(".sidebar");
const appLayout = document.querySelector(".app-layout");
const toggleBtn = document.getElementById("toggle-sidebar-btn");

// Load initial state
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