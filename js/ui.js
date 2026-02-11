function toast(title, msg){
  const id = "t" + Math.random().toString(16).slice(2);
  const html = `
    <div class="alert alert-light border" id="${id}">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <div style="font-weight:950;">${escapeHtml(title)}</div>
          <div class="text-muted">${escapeHtml(msg || "")}</div>
        </div>
        <button class="btn btn-sm btn-outline-secondary" style="border-radius: 999px;" onclick="document.getElementById('${id}').remove()">X</button>
      </div>
    </div>
  `;
  $("#toastHost").append(html);
  setTimeout(() => { document.getElementById(id)?.remove(); }, 4200);
}

function applyModeTheme(modeKey){
  const isSupply = modeKey === "SupplyChecks";
  document.body.classList.toggle("mode-supply", isSupply);
  $("#brandName").text(isSupply ? "SupplyChecks" : "MedChecks");
  $("#modeChip").text(isSupply ? "SUP" : "MED");
}

function setActiveNav(key){
  $(".nav-link").removeClass("active");
  $(`.nav-link[data-nav="${key}"]`).addClass("active");
}
function showView(name){
  $(".view").removeClass("active");
  $(`#view-${name}`).addClass("active");
  setActiveNav(name === "home" ? "home" : name);
}

function squareButton(label, tag, meta, onClick){
  const el = $(`
    <div class="square-btn">
      <div>
        <div class="label">${escapeHtml(label)}</div>
        <div class="meta">${escapeHtml(meta || "")}</div>
      </div>
      <div class="tag">${escapeHtml(tag || "")}</div>
    </div>
  `);
  el.on("click", onClick);
  return el;
}

function getRole(cfg, roleId){ return cfg.roles.find(r => r.id === roleId) || null; }
function isSystemAdmin(cfg, s){ return !!getRole(cfg, s?.roleId)?.canAdminSystem; }
function isServiceAdmin(cfg, s){ return !!getRole(cfg, s?.roleId)?.canAdminService; }

function openHelp(cfg, key){
  const topic = (cfg.docs || {})[key];
  if (!topic){
    $("#helpTitle").text("Help");
    $("#helpSubtitle").text(key);
    $("#helpBody").html(`<div class="alert alert-info">No documentation found for key: <b>${escapeHtml(key)}</b></div>`);
  } else {
    $("#helpTitle").text(topic.title || "Help");
    $("#helpSubtitle").text(topic.subtitle || "");
    $("#helpBody").html(topic.html || "<i>No content</i>");
  }
  new bootstrap.Modal(document.getElementById("helpModal")).show();
}

function renderLogs(){
  const logs = getLogs();
  const tbody = $("#logTableBody");
  tbody.empty();
  logs.slice(0, 60).forEach(l => {
    const dt = new Date(l.t);
    tbody.append(`
      <tr>
        <td>${escapeHtml(dt.toLocaleString())}</td>
        <td>${escapeHtml(l.user)}</td>
        <td>${escapeHtml(l.service)}</td>
        <td>${escapeHtml(l.role)}</td>
        <td>${escapeHtml(l.mode)}</td>
        <td>${escapeHtml(l.action)}</td>
        <td style="min-width: 220px;">${escapeHtml(l.details || "")}</td>
      </tr>
    `);
  });
}

function renderDocsList(cfg){
  const list = $("#docsList");
  list.empty();
  const topics = cfg.docs || {};
  Object.keys(topics).forEach(key => {
    const t = topics[key];
    const card = $(`
      <div class="col-12 col-md-6 col-lg-4">
        <button class="btn btn-light w-100 text-start mb-2" type="button" style="border-radius:18px;">
          <b>${escapeHtml(t.title || key)}</b>
          <div class="small text-muted">${escapeHtml(t.subtitle || "")}</div>
          <div class="small text-muted">Topic key: <code>${escapeHtml(key)}</code></div>
        </button>
      </div>
    `);
    card.find("button").on("click", () => openHelp(cfg, key));
    list.append(card);
  });
}

function renderReportsButtons(cfg){
  const wrap = $("#grid-reports");
  wrap.empty();
  cfg.reports.forEach(r => wrap.append(squareButton(r.label, r.tag, r.meta, () => handleReport(cfg, r.id))));
}

function renderScenarios(cfg){
  const wrap = $("#grid-iwant");
  wrap.empty();
  cfg.scenarios.forEach(scn => wrap.append(squareButton(scn.label, scn.tag, scn.meta, () => handleScenario(cfg, scn.id))));
}

function renderChecks(cfg){
  const wrap = $("#grid-checks");
  wrap.empty();
  const s = getSession();
  if (!s) return;

  const checks = buildScheduledChecksForCurrent(cfg);
  const state = getChecksState();

  checks.forEach(chk => {
    const done = !!state[chk.id];
    const tag = chk.cadence.toUpperCase() + (done ? " ✓" : "");
    const meta = done ? "Saved (tap to view/edit)" : "Tap to perform checklist";
    wrap.append(squareButton(chk.label, tag, meta, () => openChecklistForScheduledCheck(chk)));
  });

  if (!checks.length){
    wrap.append(`
      <div style="grid-column: span 12;">
        <div class="panel-white">
          <b>No scheduled checks</b>
          <div class="small-note">Add checks via JSON config (System Admin).</div>
        </div>
      </div>
    `);
  }
}

function renderInventory(cfg){
  const wrap = $("#grid-inventory");
  wrap.empty();

  const s = getSession();
  if (!s) return;

  const locs = getLocationsForCurrent(cfg);
  const categoryLabel = (s.modeKey === "MedChecks") ? "Meds" : "Supplies";

  wrap.append(`
    <div style="grid-column: span 12;">
      <div class="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-1">
        <div>
          <h4 class="mb-0" style="font-weight:950;">Inventory / Manage</h4>
          <div class="section-sub">Showing: <b>${escapeHtml(categoryLabel)}</b> locations for <b>${escapeHtml(s.service)}</b>.</div>
        </div>
        <div class="d-flex gap-2 flex-wrap align-items-center">
          <span class="pill">Tap a location to open a checklist</span>
          <span class="help-q" data-help="dashboard">?</span>
        </div>
      </div>
    </div>
  `);

  if (!locs.length){
    wrap.append(`
      <div style="grid-column: span 12;">
        <div class="panel-white">
          <b>No locations found</b>
          <div class="small-note">Service Admin can edit service locations in Admin.</div>
        </div>
      </div>
    `);
    return;
  }

  locs.forEach(loc => {
    wrap.append(squareButton(
      loc.label,
      s.modeKey === "MedChecks" ? "MED" : "SUP",
      "Open checklist",
      () => openChecklistForLocation(loc)
    ));
  });
}

function renderAll(cfg){
  hydrateTopPills();
  renderInventory(cfg);
  renderChecks(cfg);
  renderScenarios(cfg);
  renderReportsButtons(cfg);
  renderDocsList(cfg);
  renderLogs();
  hydrateIncidentLocationDropdown(cfg);
}

function hydrateTopPills(){
  const s = getSession();
  if (!s) return;
  $("#whoPill").text(`${s.user} (${s.roleId}) • ${s.service}`);
  $("#servicePill").text(s.service);
  $("#rolePill").text(s.roleId);
  $("#modePill").text(s.modeKey);
}

function enforceNavVisibility(){
  const cfg = loadConfig();
  const s = getSession();
  const showAdmin = s?.service && (isServiceAdmin(cfg, s) || isSystemAdmin(cfg, s));
  const showSys = s?.service && isSystemAdmin(cfg, s);
  $("#adminNav").toggle(!!showAdmin);
  $("#sysAdminNav").toggle(!!showSys);
}

function hydrateIncidentLocationDropdown(cfg){
  const s = getSession();
  const sel = $("#incidentLocation");
  sel.empty();
  if (!s?.service) return;

  const svc = getService(cfg, s.service);
  (svc?.locations || []).forEach(l => sel.append(`<option value="${escapeAttr(l.id)}">${escapeHtml(l.label)}</option>`));
}
