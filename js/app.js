function buildServiceSelect(cfg){
  const sel = $("#serviceSelect");
  sel.empty();
  sel.append(`<option value="">-- Choose Service --</option>`);
  cfg.services.forEach(s => sel.append(`<option value="${escapeAttr(s.id)}">${escapeHtml(s.label)}</option>`));
}

function buildRoleSelect(cfg){
  const sel = $("#roleSelect");
  sel.empty();
  cfg.roles.forEach(r => sel.append(`<option value="${escapeAttr(r.id)}">${escapeHtml(r.label)}</option>`));
}

function authenticate(cfg, username, password){
  return cfg.users.find(u => u.username === username && u.password === password) || null;
}

function doLogin(){
  const cfg = loadConfig();
  const u = ($("#loginUser").val() || "").trim();
  const p = ($("#loginPass").val() || "").trim();
  const user = authenticate(cfg, u, p);

  if (!user){
    toast("Login failed", "Use demo: user/user, aemt/aemt, medic/medic, svc/svc, admin/admin");
    return;
  }

  const session = { user: user.username, display: user.display, roleId: user.roleId, service: "", modeKey: "MedChecks" };
  setSession(session);

  buildServiceSelect(cfg);
  buildRoleSelect(cfg);
  $("#roleSelect").val(session.roleId);

  $("#servicePickerPanel").show();
  $("#rolePickerPanel").show();
  $("#btnLogout").show();

  $("#whoPill").text(`${session.user} (${session.roleId}) • pick service`);
  $("#adminNav").hide();
  $("#sysAdminNav").hide();

  applyModeTheme(session.modeKey);
  toast("Logged in", "Select service to continue.");
  addLog("Login", `${session.user} (${session.roleId})`);
}

function applyRoleOverride(){
  const cfg = loadConfig();
  const s = getSession();
  if (!s) return;
  const roleId = ($("#roleSelect").val() || "").trim();
  if (!cfg.roles.some(r => r.id === roleId)){
    toast("Invalid role", "Role not found.");
    return;
  }
  s.roleId = roleId;
  setSession(s);
  toast("Role updated", roleId);
  if (s.service){
    hydrateTopPills();
    enforceNavVisibility();
  } else {
    $("#whoPill").text(`${s.user} (${s.roleId}) • pick service`);
  }
}

function enterApp(){
  const cfg = loadConfig();
  const s = getSession();
  if (!s) return;

  const serviceId = ($("#serviceSelect").val() || "").trim();
  if (!serviceId){
    toast("Service required", "Select MC1 or Lisbon.");
    return;
  }

  s.service = serviceId;
  s.roleId = ($("#roleSelect").val() || s.roleId).trim() || s.roleId;
  setSession(s);

  applyModeTheme(s.modeKey);
  hydrateTopPills();
  enforceNavVisibility();

  renderAll(cfg);
  showView("home");
  toast("Ready", `Service set to ${serviceId}.`);
  addLog("Select Service", serviceId);
}

function doLogout(){
  stopQrIfRunning();
  stopIncidentScanner();
  clearSession();
  $("#whoPill").text("Not logged in");
  $("#btnLogout").hide();
  $("#adminNav").hide();
  $("#sysAdminNav").hide();
  $("#servicePickerPanel").hide();
  $("#rolePickerPanel").hide();
  showView("login");
  toast("Logged out", "Session cleared.");
}

function handleScenario(cfg, id){
  const s = getSession();
  if (!s?.service){ toast("Login required", "Please login and select a service."); showView("login"); return; }

  if (id === "morningTruckCheck"){ openMorningTruckCheck(cfg); return; }
  if (id === "createIncident"){ openIncident(cfg); return; }

  if (id === "scanItem"){
    const locs = getLocationsForCurrent(cfg);
    if (!locs.length){ toast("No locations", "No locations for this mode/service."); return; }
    openChecklistForLocation(locs[0]);
    $("#qrRegionWrap").show();
    stopQrIfRunning();
    qrScanner = startQrScanner("qr-reader", (text) => {
      addScannedToChecklist(text);
      stopQrIfRunning();
      $("#btnStopScan").prop("disabled", true);
    });
    if (qrScanner){ $("#btnStopScan").prop("disabled", false); addLog("Start QR", "Scenario scan item"); }
    return;
  }

  if (id === "runTodaysCheck"){
    const checks = buildScheduledChecksForCurrent(cfg);
    const first = checks.find(x => x.cadence === "daily") || checks[0];
    if (!first){ toast("No checks", "No scheduled checks available."); return; }
    openChecklistForScheduledCheck(first);
    return;
  }

  if (id === "checkoutMeds"){ toast("Tip", "Open a checklist, mark items Done, then use Check Out Selected."); addLog("Scenario", "checkout meds"); return; }
  if (id === "wasteMeds"){ toast("Tip", "Open a checklist, mark items Done, then use Waste Selected."); addLog("Scenario", "waste meds"); return; }
  if (id === "stockSupplies"){ openStockSupplies(cfg); return; }
  if (id === "transferItems"){ openTransferItems(cfg); return; }
  if (id === "reportDiscrepancy"){ handleReport(cfg, "reportDiscrepancy"); return; }
  if (id === "searchLogs"){ handleReport(cfg, "searchLogs"); return; }
  if (id === "narcShiftCount"){ openNarcShiftCount(cfg); return; }
  if (id === "narcTransfer"){ openNarcTransfer(cfg); return; }
  if (id === "checkExpirations"){ handleReport(cfg, "expirationReport"); return; }

  toast("Scenario", `Clicked: ${id}`); addLog("Scenario", id);
}

function handleReport(cfg, id){
  if (id === "history"){ toast("History", "Showing latest activity below."); addLog("Report", "History"); showView("reports"); return; }

  if (id === "searchLogs"){
    const q = prompt("Search logs for keyword:");
    if (q){
      const logs = getLogs();
      const hits = logs.filter(l => JSON.stringify(l).toLowerCase().includes(q.toLowerCase()));
      $("#logExportBox").show().text(JSON.stringify(hits.slice(0,150), null, 2));
      toast("Search", `${hits.length} hits (showing up to 150).`);
      addLog("Report", "Search logs: " + q);
      showView("reports");
    }
    return;
  }

  if (id === "reportDiscrepancy"){
    const d = prompt("Describe discrepancy (missing/damaged/expired):");
    if (d){
      addLog("Discrepancy", d);
      toast("Discrepancy Saved", "Logged locally.");
      renderLogs();
      showView("reports");
    }
    return;
  }

  if (id === "expirationReport"){
    generateExpirationReport(cfg);
    showView("reports");
    return;
  }
}

function getLocationsForCurrent(cfg){
  const s = getSession();
  if (!s) return [];
  const svc = getService(cfg, s.service);
  if (!svc) return [];
  const category = (s.modeKey === "MedChecks") ? "med" : "sup";
  // Equipment is always visible regardless of mode
  return (svc.locations || []).filter(l => l.category === category || l.category === "equip");
}

function buildScheduledChecksForCurrent(cfg){
  const s = getSession();
  if (!s) return [];
  const svc = getService(cfg, s.service);
  if (!svc) return [];

  const now = new Date();
  const daily = now.toISOString().slice(0,10);
  const monthly = daily.slice(0,7);

  const category = (s.modeKey === "MedChecks") ? "med" : "sup";

  return (svc.scheduledChecks || [])
    .filter(c => c.category === category)
    .map(c => ({ ...c, id: c.idTemplate.replace("{daily}", daily).replace("{monthly}", monthly) }));
}

$(function(){
  $(document).on("click", ".nav-link[data-nav]", function(e){
    e.preventDefault();
    const key = $(this).data("nav");
    const cfg = loadConfig();
    const s = getSession();

    if (key === "home"){ if (!s?.service){ showView("login"); return; } showView("home"); return; }
    if (key === "iwant"){ if (!s?.service){ showView("login"); return; } showView("iwant"); return; }
    if (key === "reports"){ if (!s?.service){ showView("login"); return; } showView("reports"); return; }
    if (key === "docs"){ showView("docs"); return; }

    if (key === "admin"){
      if (!s?.service || !(isServiceAdmin(cfg, s) || isSystemAdmin(cfg, s))){
        toast("Not allowed", "Service Admin or System Admin required.");
        return;
      }
      loadServiceAdmin(cfg);
      showView("admin");
      return;
    }

    if (key === "sysadmin"){
      if (!s?.service || !isSystemAdmin(cfg, s)){
        toast("Not allowed", "System Admin required.");
        return;
      }
      loadSystemAdmin(cfg);
      showView("sysadmin");
      return;
    }
  });

  $(document).on("click", ".help-q[data-help]", function(){
    openHelp(loadConfig(), $(this).data("help"));
  });

  $("#btnLogin").on("click", doLogin);
  $("#btnEnterApp").on("click", enterApp);
  $("#btnApplyRole").on("click", applyRoleOverride);
  $("#btnLogout").on("click", doLogout);

  $("#btnSwitchMode").on("click", () => {
    const cfg = loadConfig();
    const s = getSession();
    if (!s){ toast("Login first", "Please login first."); return; }
    s.modeKey = (s.modeKey === "MedChecks") ? "SupplyChecks" : "MedChecks";
    setSession(s);
    applyModeTheme(s.modeKey);
    hydrateTopPills();
    renderAll(cfg);
    addLog("Switch Mode", s.modeKey);
    toast("Mode switched", s.modeKey);
  });

  $("#btnResetChecks").on("click", () => {
    localStorage.removeItem(STORAGE_KEYS.checks);
    toast("Reset", "Demo check status cleared.");
    addLog("Reset", "Check status");
    renderChecks(loadConfig());
  });

  $("#btnSaveChecklist").on("click", saveChecklist);
  $("#btnCheckout").on("click", checkoutFromChecklist);
  $("#btnWaste").on("click", wasteFromChecklist);
  $("#btnMarkDiscrepancy").on("click", discrepancyFromChecklist);

  $("#btnAddManual").on("click", () => {
    const cfg = loadConfig();
    if (!currentChecklist) return;
    openPicker(cfg, "Add Item", `To: ${currentChecklist.title}`, { forceType:null }, (type, item) => {
      const row = {
        done:false,
        category: (type === "sup") ? "sup" : "med",
        isNarcotic: (type === "narc") ? true : !!item.isNarcotic,
        item: item.name,
        doseQty: (type === "sup") ? (item.par || "") : (item.defaultDose || ""),
        notes: item.notes || ""
      };
      currentChecklist.rows.unshift(row);
      renderChecklistRows(cfg);
      addLog("Add Item", `${type.toUpperCase()}: ${item.name}`);
    });
  });

  $("#btnAddNarcManual").on("click", () => {
    const cfg = loadConfig();
    const s = getSession();
    if (!getRole(cfg, s.roleId)?.canCheckoutNarcotics){ toast("Not allowed", "Paramedic+ required."); return; }
    if (!currentChecklist) return;
    openPicker(cfg, "Add Narcotic", `To: ${currentChecklist.title}`, { forceType:"narc" }, (type, item) => {
      const row = { done:false, category:"med", isNarcotic:true, item:item.name, doseQty:item.defaultDose || "", notes:item.notes || "" };
      currentChecklist.rows.unshift(row);
      renderChecklistRows(cfg);
      addLog("Add Narcotic", item.name);
    });
  });

  $("#pickerSearch").on("input", () => renderPickerList(loadConfig()));
  $("#pickerType").on("change", () => renderPickerList(loadConfig()));

  $("#btnScanQr").on("click", () => {
    if (!currentChecklist) return;
    $("#qrRegionWrap").show();
    stopQrIfRunning();
    qrScanner = startQrScanner("qr-reader", (text) => {
      addScannedToChecklist(text);
      stopQrIfRunning();
      $("#btnStopScan").prop("disabled", true);
    });
    if (qrScanner){ $("#btnStopScan").prop("disabled", false); addLog("Start QR", currentChecklist.title); }
  });

  $("#btnStopScan").on("click", () => {
    stopQrIfRunning();
    $("#btnStopScan").prop("disabled", true);
    $("#qrRegionWrap").hide();
    addLog("Stop QR", currentChecklist?.title || "");
  });

  $("#btnWitnessConfirm").on("click", () => witnessConfirm(loadConfig()));

  $("#btnConfirmShiftCount").on("click", () => confirmShiftCount(loadConfig()));
  $("#btnConfirmTransfer").on("click", () => confirmNarcTransfer(loadConfig()));
  $("#btnConfirmPartialWaste").on("click", () => confirmPartialWaste(loadConfig()));

  $("#btnMarkInService").on("click", () => markTruckStatus("in-service"));
  $("#btnMarkOutOfService").on("click", () => markTruckStatus("out-of-service"));

  $("#btnStockAddItem").on("click", () => {
    const cfg = loadConfig();
    openPicker(cfg, "Add Item to Stock", "Select an item", { forceType:null }, (type, item) => {
      addStockItem(type, item);
    });
  });
  $("#btnConfirmStock").on("click", () => confirmStockSupplies());

  $("#btnTransferAddItem").on("click", () => {
    const cfg = loadConfig();
    openPicker(cfg, "Add Item to Transfer", "Select an item", { forceType:null }, (type, item) => {
      addTransferItem(type, item);
    });
  });
  $("#btnConfirmTransfer").on("click", () => confirmTransferItems());

  $("#btnClearLogs").on("click", () => { localStorage.removeItem(STORAGE_KEYS.logs); renderLogs(); toast("Cleared", "Logs cleared."); });
  $("#btnExportLogsJson").on("click", () => { $("#logExportBox").show().text(JSON.stringify(getLogs(), null, 2)); toast("Export", "Logs shown as JSON."); });

  $("#btnOpenAllDocs").on("click", () => {
    const cfg = loadConfig();
    const topics = cfg.docs || {};
    let html = "";
    Object.keys(topics).forEach(k => {
      const t = topics[k];
      html += `<hr/><h5 style="font-weight:950;">${escapeHtml(t.title || k)}</h5>`;
      if (t.subtitle) html += `<div class="text-muted mb-2">${escapeHtml(t.subtitle)}</div>`;
      html += `<div>${t.html || ""}</div>`;
    });
    $("#helpTitle").text("Documentation");
    $("#helpSubtitle").text("All topics");
    $("#helpBody").html(html || "<i>No topics</i>");
    new bootstrap.Modal(document.getElementById("helpModal")).show();
  });

  $("#btnSaveMedsJson").on("click", () => saveServiceAdminMeds(loadConfig()));
  $("#btnSaveSuppliesJson").on("click", () => saveServiceAdminSupplies(loadConfig()));
  $("#btnSaveServiceLocationsJson").on("click", () => saveServiceAdminLocations(loadConfig()));
  $("#btnResetMedsJson, #btnResetSuppliesJson, #btnResetServiceLocationsJson").on("click", () => resetServiceAdmin(loadConfig()));

  $("#btnSysValidateConfig").on("click", validateSystemConfig);
  $("#btnSysSaveConfig").on("click", saveSystemConfig);
  $("#btnSysResetConfig").on("click", resetSystemConfig);

  $("#btnIncidentAdd").on("click", () => {
    const cfg = loadConfig();
    openPicker(cfg, "Add Item to Incident", "Select an item", { forceType:null }, (type, item) => {
      addIncidentItem(cfg, type, item);
    });
  });

  $("#btnIncidentAddNarc").on("click", () => {
    const cfg = loadConfig();
    openPicker(cfg, "Add Narcotic to Incident", "Select narcotic", { forceType:"narc" }, (type, item) => {
      addIncidentItem(cfg, type, item);
    });
  });

  $("#btnIncidentScan").on("click", () => {
    const cfg = loadConfig();
    $("#qrIncidentWrap").show();
    stopIncidentScanner();
    incidentScanner = startQrScanner("qr-incident-reader", (text) => {
      addScannedToIncident(cfg, text);
      stopIncidentScanner();
      $("#btnIncidentStop").prop("disabled", true);
    });
    if (incidentScanner){ $("#btnIncidentStop").prop("disabled", false); addLog("Incident Scan Start", "QR scan"); }
  });

  $("#btnIncidentStop").on("click", () => {
    stopIncidentScanner();
    $("#btnIncidentStop").prop("disabled", true);
    $("#qrIncidentWrap").hide();
    addLog("Incident Scan Stop", "QR scan");
  });

  $("#btnExportPdf").on("click", () => exportIncidentPdf(loadConfig()));
  $("#btnIncidentCheckout").on("click", () => incidentCheckout(loadConfig()));
  $("#btnIncidentWaste").on("click", () => incidentWaste(loadConfig()));

  boot();
});

function boot(){
  const cfg = loadConfig();
  renderLogs();

  const s = getSession();
  if (!s){
    $("#btnLogout").hide();
    $("#adminNav").hide();
    $("#sysAdminNav").hide();
    $("#servicePickerPanel").hide();
    $("#rolePickerPanel").hide();
    applyModeTheme("MedChecks");
    showView("login");
    renderDocsList(cfg);
    return;
  }

  applyModeTheme(s.modeKey || "MedChecks");
  $("#btnLogout").show();

  buildServiceSelect(cfg);
  buildRoleSelect(cfg);
  $("#roleSelect").val(s.roleId || "EMT");

  if (!s.service){
    $("#servicePickerPanel").show();
    $("#rolePickerPanel").show();
    $("#whoPill").text(`${s.user} (${s.roleId}) • pick service`);
    renderDocsList(cfg);
    showView("login");
    return;
  }

  enforceNavVisibility();
  renderAll(cfg);
  showView("home");
}

function generateExpirationReport(cfg){
  const now = new Date();
  const meds = getMaster(cfg, "meds");
  const supplies = getMaster(cfg, "supplies");
  const allItems = [...meds.map(m => ({...m, type:"med"})), ...supplies.map(s => ({...s, type:"sup"}))];
  
  const expired = [];
  const within30 = [];
  const within60 = [];
  const within90 = [];
  
  allItems.forEach(item => {
    if (!item.expirationDate) return;
    const expDate = new Date(item.expirationDate);
    const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
    
    const entry = { name: item.name, type: item.type, expirationDate: item.expirationDate, daysUntil: diffDays };
    
    if (diffDays < 0) {
      expired.push(entry);
    } else if (diffDays <= 30) {
      within30.push(entry);
    } else if (diffDays <= 60) {
      within60.push(entry);
    } else if (diffDays <= 90) {
      within90.push(entry);
    }
  });
  
  // Render the report
  let html = `
    <div class="panel-white mt-3">
      <h5 class="mb-3" style="font-weight:950;">Expiration Report</h5>
      <div class="small-note mb-3">Generated: ${now.toLocaleString()}</div>
  `;
  
  if (expired.length > 0){
    html += `
      <div class="alert alert-danger">
        <h6 style="font-weight:950;">⚠️ EXPIRED (${expired.length} items)</h6>
        <ul class="mb-0">
    `;
    expired.forEach(e => {
      html += `<li><b>${escapeHtml(e.name)}</b> (${e.type.toUpperCase()}) - Expired ${Math.abs(e.daysUntil)} days ago (${e.expirationDate})</li>`;
    });
    html += `</ul></div>`;
  }
  
  if (within30.length > 0){
    html += `
      <div class="alert alert-warning">
        <h6 style="font-weight:950;">⚠️ Expiring Within 30 Days (${within30.length} items)</h6>
        <ul class="mb-0">
    `;
    within30.forEach(e => {
      html += `<li><b>${escapeHtml(e.name)}</b> (${e.type.toUpperCase()}) - ${e.daysUntil} days (${e.expirationDate})</li>`;
    });
    html += `</ul></div>`;
  }
  
  if (within60.length > 0){
    html += `
      <div class="alert alert-info">
        <h6 style="font-weight:950;">ℹ️ Expiring Within 60 Days (${within60.length} items)</h6>
        <ul class="mb-0">
    `;
    within60.forEach(e => {
      html += `<li><b>${escapeHtml(e.name)}</b> (${e.type.toUpperCase()}) - ${e.daysUntil} days (${e.expirationDate})</li>`;
    });
    html += `</ul></div>`;
  }
  
  if (within90.length > 0){
    html += `
      <div class="alert alert-light border">
        <h6 style="font-weight:950;">📅 Expiring Within 90 Days (${within90.length} items)</h6>
        <ul class="mb-0">
    `;
    within90.forEach(e => {
      html += `<li><b>${escapeHtml(e.name)}</b> (${e.type.toUpperCase()}) - ${e.daysUntil} days (${e.expirationDate})</li>`;
    });
    html += `</ul></div>`;
  }
  
  if (expired.length === 0 && within30.length === 0 && within60.length === 0 && within90.length === 0){
    html += `<div class="alert alert-success">✅ No items expiring within 90 days!</div>`;
  }
  
  html += `
      <div class="mt-3">
        <button class="btn btn-outline-secondary" type="button" id="btnExportExpirationPdf">Export as PDF</button>
      </div>
    </div>
  `;
  
  $("#logExportBox").show().html(html);
  
  $("#btnExportExpirationPdf").off("click").on("click", () => {
    exportExpirationReportPdf(expired, within30, within60, within90);
  });
  
  addLog("Report", "Expiration Report");
  toast("Expiration Report", "Report generated.");
}

function exportExpirationReportPdf(expired, within30, within60, within90){
  if (typeof jsPDF === "undefined"){
    toast("PDF Error", "jsPDF library not loaded.");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text("Expiration Report", 14, 20);
  
  doc.setFontSize(11);
  let y = 30;
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y); y += 10;
  
  if (expired.length > 0){
    doc.setFontSize(14);
    doc.setTextColor(200, 0, 0);
    doc.text(`EXPIRED (${expired.length} items)`, 14, y); y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    expired.slice(0, 40).forEach(e => {
      if (y > 270){ doc.addPage(); y = 20; }
      doc.text(`- ${e.name} (${e.type.toUpperCase()}) - Exp: ${e.expirationDate}`, 16, y);
      y += 5;
    });
    y += 5;
  }
  
  if (within30.length > 0){
    if (y > 250){ doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(200, 100, 0);
    doc.text(`Expiring Within 30 Days (${within30.length} items)`, 14, y); y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    within30.slice(0, 40).forEach(e => {
      if (y > 270){ doc.addPage(); y = 20; }
      doc.text(`- ${e.name} (${e.type.toUpperCase()}) - ${e.daysUntil} days (${e.expirationDate})`, 16, y);
      y += 5;
    });
    y += 5;
  }
  
  if (within60.length > 0){
    if (y > 250){ doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text(`Expiring Within 60 Days (${within60.length} items)`, 14, y); y += 8;
    doc.setFontSize(9);
    within60.slice(0, 40).forEach(e => {
      if (y > 270){ doc.addPage(); y = 20; }
      doc.text(`- ${e.name} (${e.type.toUpperCase()}) - ${e.daysUntil} days (${e.expirationDate})`, 16, y);
      y += 5;
    });
    y += 5;
  }
  
  if (within90.length > 0){
    if (y > 250){ doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text(`Expiring Within 90 Days (${within90.length} items)`, 14, y); y += 8;
    doc.setFontSize(9);
    within90.slice(0, 40).forEach(e => {
      if (y > 270){ doc.addPage(); y = 20; }
      doc.text(`- ${e.name} (${e.type.toUpperCase()}) - ${e.daysUntil} days (${e.expirationDate})`, 16, y);
      y += 5;
    });
  }
  
  const fileName = `ExpirationReport_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
  
  addLog("Export PDF", `Expiration Report: ${fileName}`);
  toast("PDF Exported", fileName);
}

// Stock Supplies Workflow
let stockSuppliesData = null;

function openStockSupplies(cfg){
  const s = getSession();
  if (!s){ toast("Login required", "Please login first."); return; }
  
  const svc = getService(cfg, s.service);
  if (!svc){ toast("Service Error", "Service not found."); return; }
  
  stockSuppliesData = {
    destination: "",
    items: [],
    receivedBy: s.display || s.user,
    timestamp: new Date().toISOString()
  };
  
  // Populate location dropdown
  const locSelect = $("#stockDestination");
  locSelect.empty();
  (svc.locations || []).forEach(loc => {
    locSelect.append(`<option value="${escapeAttr(loc.id)}">${escapeHtml(loc.label)}</option>`);
  });
  
  $("#stockReceivedBy").val(stockSuppliesData.receivedBy);
  renderStockItems(cfg);
  
  new bootstrap.Modal(document.getElementById("stockModal")).show();
  addLog("Open Stock Supplies", s.service);
}

function renderStockItems(cfg){
  const tbody = $("#stockBody");
  tbody.empty();
  
  stockSuppliesData.items.forEach((item, idx) => {
    tbody.append(`
      <tr>
        <td><b>${escapeHtml(item.name)}</b></td>
        <td><span class="badge text-bg-${item.type === 'sup' ? 'danger' : 'success'}">${item.type.toUpperCase()}</span></td>
        <td><input type="number" class="form-control form-control-sm stock-qty" data-idx="${idx}" value="${item.quantity}" min="0" /></td>
        <td><button class="btn btn-sm btn-outline-danger" data-del="${idx}">Remove</button></td>
      </tr>
    `);
  });
  
  tbody.find(".stock-qty").on("input", function(){
    const idx = +$(this).data("idx");
    stockSuppliesData.items[idx].quantity = parseInt($(this).val() || "0");
  });
  
  tbody.find("button[data-del]").on("click", function(){
    const idx = +$(this).data("del");
    stockSuppliesData.items.splice(idx, 1);
    renderStockItems(cfg);
  });
}

function addStockItem(type, item){
  stockSuppliesData.items.push({
    name: item.name,
    type: type === "sup" ? "sup" : "med",
    quantity: 1
  });
  renderStockItems(loadConfig());
}

function confirmStockSupplies(){
  const cfg = loadConfig();
  const destination = $("#stockDestination").val();
  const receivedBy = $("#stockReceivedBy").val().trim();
  
  if (!destination){
    toast("Missing Location", "Please select a destination location.");
    return;
  }
  
  if (stockSuppliesData.items.length === 0){
    toast("No Items", "Please add at least one item to stock.");
    return;
  }
  
  stockSuppliesData.destination = destination;
  stockSuppliesData.receivedBy = receivedBy;
  
  const logDetail = `Destination: ${destination}, Received by: ${receivedBy}, Items: ${JSON.stringify(stockSuppliesData.items)}`;
  addLog("Stock Supplies", logDetail);
  toast("Stock Complete", `${stockSuppliesData.items.length} items restocked at ${destination}.`);
  
  bootstrap.Modal.getInstance(document.getElementById("stockModal")).hide();
}

// Transfer Items Workflow
let transferItemsData = null;

function openTransferItems(cfg){
  const s = getSession();
  if (!s){ toast("Login required", "Please login first."); return; }
  
  const svc = getService(cfg, s.service);
  if (!svc){ toast("Service Error", "Service not found."); return; }
  
  transferItemsData = {
    source: "",
    destination: "",
    items: [],
    transferredBy: s.display || s.user,
    timestamp: new Date().toISOString()
  };
  
  // Populate location dropdowns
  const srcSelect = $("#transferSource");
  const dstSelect = $("#transferDest");
  srcSelect.empty();
  dstSelect.empty();
  (svc.locations || []).forEach(loc => {
    srcSelect.append(`<option value="${escapeAttr(loc.id)}">${escapeHtml(loc.label)}</option>`);
    dstSelect.append(`<option value="${escapeAttr(loc.id)}">${escapeHtml(loc.label)}</option>`);
  });
  
  $("#transferBy").val(transferItemsData.transferredBy);
  renderTransferItems(cfg);
  
  new bootstrap.Modal(document.getElementById("transferModal")).show();
  addLog("Open Transfer Items", s.service);
}

function renderTransferItems(cfg){
  const tbody = $("#transferBody");
  tbody.empty();
  
  transferItemsData.items.forEach((item, idx) => {
    tbody.append(`
      <tr>
        <td><b>${escapeHtml(item.name)}</b></td>
        <td><span class="badge text-bg-${item.type === 'sup' ? 'danger' : 'success'}">${item.type.toUpperCase()}</span></td>
        <td><input type="number" class="form-control form-control-sm transfer-qty" data-idx="${idx}" value="${item.quantity}" min="0" /></td>
        <td><button class="btn btn-sm btn-outline-danger" data-del="${idx}">Remove</button></td>
      </tr>
    `);
  });
  
  tbody.find(".transfer-qty").on("input", function(){
    const idx = +$(this).data("idx");
    transferItemsData.items[idx].quantity = parseInt($(this).val() || "0");
  });
  
  tbody.find("button[data-del]").on("click", function(){
    const idx = +$(this).data("del");
    transferItemsData.items.splice(idx, 1);
    renderTransferItems(cfg);
  });
}

function addTransferItem(type, item){
  transferItemsData.items.push({
    name: item.name,
    type: type === "sup" ? "sup" : "med",
    quantity: 1
  });
  renderTransferItems(loadConfig());
}

function confirmTransferItems(){
  const cfg = loadConfig();
  const source = $("#transferSource").val();
  const destination = $("#transferDest").val();
  const transferredBy = $("#transferBy").val().trim();
  
  if (!source || !destination){
    toast("Missing Location", "Please select both source and destination locations.");
    return;
  }
  
  if (source === destination){
    toast("Same Location", "Source and destination must be different.");
    return;
  }
  
  if (transferItemsData.items.length === 0){
    toast("No Items", "Please add at least one item to transfer.");
    return;
  }
  
  transferItemsData.source = source;
  transferItemsData.destination = destination;
  transferItemsData.transferredBy = transferredBy;
  
  const logDetail = `From: ${source}, To: ${destination}, By: ${transferredBy}, Items: ${JSON.stringify(transferItemsData.items)}`;
  addLog("Transfer Items", logDetail);
  toast("Transfer Complete", `${transferItemsData.items.length} items transferred from ${source} to ${destination}.`);
  
  bootstrap.Modal.getInstance(document.getElementById("transferModal")).hide();
}
