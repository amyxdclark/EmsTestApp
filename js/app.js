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
  if (id === "stockSupplies"){ addLog("Stock", "Prototype stock action"); toast("Stock (demo)", "Logged locally."); return; }
  if (id === "transferItems"){ addLog("Transfer", "Prototype transfer action"); toast("Transfer (demo)", "Logged locally."); return; }
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
    toast("Expiration Report", "This feature displays items expiring within 30/60/90 days (prototype).");
    addLog("Report", "Expiration Report");
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
