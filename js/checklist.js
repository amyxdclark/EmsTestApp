let currentChecklist = null;
let qrScanner = null;

function checklistStateKey(key){ return "mc_checklist_" + key; }
function loadChecklistState(key){
  const raw = localStorage.getItem(checklistStateKey(key));
  return raw ? JSON.parse(raw) : null;
}
function persistChecklistState(key, value){
  localStorage.setItem(checklistStateKey(key), JSON.stringify(value));
}

function seedRowsFromMaster(cfg, category){
  const list = (category === "med") ? getMaster(cfg, "meds") : getMaster(cfg, "supplies");
  return list.slice(0, 8).map(x => ({
    done:false,
    category,
    isNarcotic: !!x.isNarcotic,
    item:x.name,
    doseQty: (category === "med") ? (x.defaultDose || "") : (x.par || ""),
    notes: x.notes || ""
  }));
}

function openChecklistForLocation(loc){
  const cfg = loadConfig();
  const s = getSession();
  if (!s) return;

  const category = loc.category;
  const title = loc.label;
  const subtitle = `${s.service} • ${s.modeKey} • ${category.toUpperCase()} checklist`;

  const saved = loadChecklistState(`loc:${loc.id}:${s.modeKey}`);
  currentChecklist = {
    kind:"location",
    storageKey:`loc:${loc.id}:${s.modeKey}`,
    title, subtitle, category,
    rows: saved?.rows || seedRowsFromMaster(cfg, category)
  };

  showChecklistModal(cfg);
  addLog("Open Checklist", title);
}

function openChecklistForScheduledCheck(chk){
  const cfg = loadConfig();
  const s = getSession();
  if (!s) return;

  const title = chk.label;
  const subtitle = `${s.service} • ${chk.cadence} • ${chk.category.toUpperCase()}`;

  const storageKey = `chk:${chk.id}:${s.modeKey}`;
  const saved = loadChecklistState(storageKey);

  currentChecklist = {
    kind:"scheduled",
    storageKey,
    scheduledId: chk.id,
    title, subtitle,
    category: chk.category,
    rows: saved?.rows || seedRowsFromMaster(cfg, chk.category)
  };

  showChecklistModal(cfg);
  addLog("Open Scheduled Check", title);
}

function showChecklistModal(cfg){
  $("#checklistTitle").text(currentChecklist.title);
  $("#checklistSubtitle").text(currentChecklist.subtitle);

  $("#qrRegionWrap").hide();
  $("#btnStopScan").prop("disabled", true);
  stopQrIfRunning();

  const s = getSession();
  const role = getRole(cfg, s.roleId);
  const medMode = (s.modeKey === "MedChecks");
  const canUseNarcUi = medMode && !!role?.canCheckoutNarcotics;

  $("#btnAddNarcManual").prop("disabled", !canUseNarcUi);
  $("#btnAddNarcManual").attr("title", canUseNarcUi ? "" : "Paramedic+ required (MedChecks only)");

  renderChecklistRows(cfg);

  new bootstrap.Modal(document.getElementById("checklistModal")).show();
}

function renderChecklistRows(cfg){
  const body = $("#checklistBody");
  body.empty();

  const allMeds = getMaster(cfg, "meds");

  currentChecklist.rows.forEach((r, idx) => {
    const typeBadge = r.category === "sup"
      ? `<span class="badge text-bg-danger">SUP</span>`
      : (r.isNarcotic ? `<span class="badge text-bg-warning">NARC</span>` : `<span class="badge text-bg-success">MED</span>`);

    let scheduleBadge = "";
    if (r.isNarcotic && r.category === "med"){
      const medItem = allMeds.find(m => m.name === r.item);
      if (medItem?.deaSchedule){
        scheduleBadge = ` <span class="badge text-bg-dark">Sched ${escapeHtml(medItem.deaSchedule)}</span>`;
      }
    }

    body.append(`
      <tr>
        <td><input type="checkbox" class="form-check-input" data-idx="${idx}" ${r.done ? "checked":""} /></td>
        <td><b>${escapeHtml(r.item)}</b></td>
        <td>${typeBadge}${scheduleBadge}</td>
        <td><input class="form-control form-control-sm" data-field="doseQty" data-idx="${idx}" value="${escapeAttr(r.doseQty || "")}" /></td>
        <td><input class="form-control form-control-sm" data-field="notes" data-idx="${idx}" value="${escapeAttr(r.notes || "")}" /></td>
        <td><button class="btn btn-sm btn-outline-danger" style="border-radius: 999px;" data-del="${idx}">X</button></td>
      </tr>
    `);
  });

  body.find('input[type="checkbox"]').off("change").on("change", function(){
    const i = +$(this).data("idx");
    currentChecklist.rows[i].done = this.checked;
  });
  body.find('input[data-field]').off("input").on("input", function(){
    const i = +$(this).data("idx");
    const f = $(this).data("field");
    currentChecklist.rows[i][f] = $(this).val();
  });
  body.find('button[data-del]').off("click").on("click", function(){
    const i = +$(this).data("del");
    currentChecklist.rows.splice(i,1);
    renderChecklistRows(cfg);
  });
}

function saveChecklist(){
  if (!currentChecklist) return;
  persistChecklistState(currentChecklist.storageKey, { rows: currentChecklist.rows });

  if (currentChecklist.kind === "scheduled" && currentChecklist.scheduledId){
    const st = getChecksState();
    st[currentChecklist.scheduledId] = true;
    setChecksState(st);
  }

  addLog("Save Checklist", currentChecklist.title);
  toast("Saved", `${currentChecklist.title} saved locally.`);
  renderChecks(loadConfig());
  bootstrap.Modal.getInstance(document.getElementById("checklistModal")).hide();
}

function getSelectedChecklistRows(){
  return currentChecklist.rows.filter(r => r.done);
}

function enforceCheckoutRules(cfg, items){
  const s = getSession();
  const role = getRole(cfg, s.roleId);

  if (!items.length) return { ok:false, reason:"Mark items Done to select them (prototype)." };

  const hasMed = items.some(x => x.category === "med");
  const hasNarc = items.some(x => x.category === "med" && x.isNarcotic);

  if (hasMed){
    if (!role?.canCheckoutMeds) return { ok:false, reason:"Your role cannot check out medications." };
    if (hasNarc && !role?.canCheckoutNarcotics) return { ok:false, reason:"Narcotics require Paramedic (or Admin)." };
  }
  return { ok:true, hasNarc };
}

function enforceWasteRules(cfg, items){
  const s = getSession();
  const role = getRole(cfg, s.roleId);

  if (!items.length) return { ok:false, reason:"Mark items Done to select them (prototype)." };

  const hasNarc = items.some(x => x.category === "med" && x.isNarcotic);
  if (hasNarc && !role?.canWasteNarcotics) return { ok:false, reason:"Narcotic waste requires Paramedic (or Admin)." };

  return { ok:true, hasNarc };
}

function checkoutFromChecklist(){
  const cfg = loadConfig();
  const items = getSelectedChecklistRows();
  const check = enforceCheckoutRules(cfg, items);
  if (!check.ok){ toast("Not allowed", check.reason); addLog("Checkout Denied", check.reason); return; }

  const narcCount = items.filter(x => x.category==="med" && x.isNarcotic).length;
  addLog("Checkout", `${items.length} items${narcCount?` (${narcCount} narcotics)`:``} • ${currentChecklist.title}`);
  toast("Checked out", `${items.length} items logged.`);
}

async function wasteFromChecklist(){
  const cfg = loadConfig();
  const items = getSelectedChecklistRows();
  const check = enforceWasteRules(cfg, items);
  if (!check.ok){ toast("Not allowed", check.reason); addLog("Waste Denied", check.reason); return; }

  const witness = await requireWitnessIfNeeded(cfg, check.hasNarc);
  if (!witness.ok){ toast("Cancelled", "Witness not provided."); addLog("Waste Cancelled", "No witness"); return; }

  const narcCount = items.filter(x => x.category==="med" && x.isNarcotic).length;
  addLog("Waste", `${items.length} items${narcCount?` (${narcCount} narcotics, witness=${witness.witnessUser})`:``} • ${currentChecklist.title}`);
  toast("Waste logged", `${items.length} items logged.`);
}

function discrepancyFromChecklist(){
  const d = prompt("Describe discrepancy (missing/damaged/expired):");
  if (!d) return;
  addLog("Discrepancy", `${currentChecklist.title}: ${d}`);
  toast("Discrepancy saved", "Logged locally.");
  renderLogs();
}

function startQrScanner(targetDivId, onText){
  if (typeof Html5Qrcode === "undefined") {
    toast("QR Scanner Missing", "Html5Qrcode is not defined. Check the CDN include.");
    return null;
  }
  const scanner = new Html5Qrcode(targetDivId);
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  scanner.start(
    { facingMode: "environment" },
    config,
    (decodedText) => onText(decodedText),
    () => {}
  ).catch(e => {
    toast("Camera Error", (e && e.message) ? e.message : "Unable to start camera.");
  });

  return scanner;
}

function stopQrIfRunning(){
  if (qrScanner){
    try{ qrScanner.stop().then(() => qrScanner.clear()).catch(()=>{}); } catch(_){}
    qrScanner = null;
  }
}

function parseQrTextToItem(cfg, decodedText){
  const txt = (decodedText || "").trim();
  const upper = txt.toUpperCase();

  let category = null;
  let isNarcotic = false;
  let name = txt;

  if (upper.startsWith("MED:")) { category = "med"; name = txt.slice(4).trim(); }
  if (upper.startsWith("SUP:")) { category = "sup"; name = txt.slice(4).trim(); }
  if (upper.startsWith("NARC:")) { category = "med"; isNarcotic = true; name = txt.slice(5).trim(); }

  const s = getSession();
  if (!category){
    category = (s?.modeKey === "SupplyChecks") ? "sup" : "med";
  }

  if (category === "med" && !isNarcotic){
    const meds = getMaster(cfg, "meds");
    const found = meds.find(m => (m.name||"").toLowerCase() === (name||"").toLowerCase());
    if (found?.isNarcotic) isNarcotic = true;
  }

  return { category, isNarcotic, item: name || txt, doseQty:"", notes:"Scanned", done:true };
}

function addScannedToChecklist(decodedText){
  const cfg = loadConfig();
  const row = parseQrTextToItem(cfg, decodedText);

  const s = getSession();
  const role = getRole(cfg, s.roleId);
  if (row.category === "med" && row.isNarcotic && !role?.canCheckoutNarcotics){
    toast("Not allowed", "Narcotics require Paramedic+.");
    addLog("Scan Blocked", `Narcotic scanned: ${decodedText}`);
    return;
  }

  currentChecklist.rows.unshift(row);
  renderChecklistRows(cfg);
  addLog("Scan QR", decodedText);
  toast("Scanned", decodedText);
}

let pickerCallback = null;
let pickerOptions = { forceType:null };

function openPicker(cfg, title, subtitle, options, callback){
  pickerCallback = callback;
  pickerOptions = options || { forceType:null };

  $("#pickerTitle").text(title);
  $("#pickerSubtitle").text(subtitle || "");
  $("#pickerSearch").val("");
  $("#pickerType").val(pickerOptions.forceType || "auto");

  renderPickerList(cfg);
  new bootstrap.Modal(document.getElementById("pickerModal")).show();
}

function getPickerSource(cfg){
  const s = getSession();
  const typeSel = $("#pickerType").val();
  const autoType = (s.modeKey === "SupplyChecks") ? "sup" : "med";
  let type = (typeSel === "auto") ? autoType : typeSel;
  if (pickerOptions.forceType) type = pickerOptions.forceType;

  if (type === "med") return { type:"med", list: getMaster(cfg, "meds").filter(m => !m.isNarcotic) };
  if (type === "narc") return { type:"narc", list: getMaster(cfg, "meds").filter(m => !!m.isNarcotic) };
  return { type:"sup", list: getMaster(cfg, "supplies") };
}

function renderPickerList(cfg){
  const q = ($("#pickerSearch").val() || "").toLowerCase().trim();
  const src = getPickerSource(cfg);
  const list = src.list.filter(x => !q || (x.name || "").toLowerCase().includes(q));
  const host = $("#pickerList");
  host.empty();

  if (!list.length){ host.append(`<div class="text-muted">No matches.</div>`); return; }

  list.slice(0, 80).forEach(x => {
    const sub = (src.type === "sup")
      ? `${x.par ? `Par ${x.par}` : ""}${x.notes ? " • " + x.notes : ""}`
      : `${x.defaultDose ? x.defaultDose : ""}${x.notes ? " • " + x.notes : ""}`;

    const badge = (src.type === "sup")
      ? `<span class="badge text-bg-danger">SUP</span>`
      : (src.type === "narc" ? `<span class="badge text-bg-warning">NARC</span>` : `<span class="badge text-bg-success">MED</span>`);

    let scheduleBadge = "";
    if (src.type === "narc" && x.deaSchedule){
      scheduleBadge = ` <span class="badge text-bg-dark">Sched ${escapeHtml(x.deaSchedule)}</span>`;
    }

    const btn = $(`
      <button type="button" class="btn btn-light w-100 text-start mb-2" style="border-radius:18px;">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <b>${escapeHtml(x.name)}</b>
            <div class="small text-muted">${escapeHtml(sub)}</div>
          </div>
          <div>${badge}${scheduleBadge}</div>
        </div>
      </button>
    `);

    btn.on("click", () => {
      pickerCallback?.(src.type, x);
      bootstrap.Modal.getInstance(document.getElementById("pickerModal")).hide();
    });
    host.append(btn);
  });
}
