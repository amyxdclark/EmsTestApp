let incidentItems = [];
let incidentScanner = null;

function openIncident(cfg){
  incidentItems = [];
  $("#incidentNumber").val("");
  $("#incidentNotes").val("");
  hydrateIncidentLocationDropdown(cfg);
  renderIncidentRows(cfg);
  stopIncidentScanner();
  $("#qrIncidentWrap").hide();
  $("#btnIncidentStop").prop("disabled", true);

  const s = getSession();
  const role = getRole(cfg, s.roleId);
  const canNarc = !!role?.canCheckoutNarcotics && (s.modeKey === "MedChecks");
  $("#btnIncidentAddNarc").prop("disabled", !canNarc);

  new bootstrap.Modal(document.getElementById("incidentModal")).show();
  addLog("Open Incident", "Create incident PDF");
}

function renderIncidentRows(cfg){
  const body = $("#incidentBody");
  body.empty();

  const allMeds = getMaster(cfg, "meds");

  incidentItems.forEach((it, idx) => {
    const badge = it.category === "sup"
      ? `<span class="badge text-bg-danger">SUP</span>`
      : (it.isNarcotic ? `<span class="badge text-bg-warning">NARC</span>` : `<span class="badge text-bg-success">MED</span>`);

    let scheduleBadge = "";
    if (it.isNarcotic && it.category === "med"){
      const medItem = allMeds.find(m => m.name === it.item);
      if (medItem?.deaSchedule){
        scheduleBadge = ` <span class="badge text-bg-dark">Sched ${escapeHtml(medItem.deaSchedule)}</span>`;
      }
    }

    body.append(`
      <tr>
        <td>${badge}${scheduleBadge}</td>
        <td><b>${escapeHtml(it.item)}</b></td>
        <td><input class="form-control form-control-sm" data-i-idx="${idx}" data-field="doseQty" value="${escapeAttr(it.doseQty || "")}"/></td>
        <td><input class="form-control form-control-sm" data-i-idx="${idx}" data-field="details" value="${escapeAttr(it.details || "")}"/></td>
        <td><button class="btn btn-sm btn-outline-danger" style="border-radius: 999px;" data-i-del="${idx}">X</button></td>
      </tr>
    `);
  });

  body.find("input[data-i-idx]").off("input").on("input", function(){
    const i = +$(this).data("i-idx");
    const f = $(this).data("field");
    incidentItems[i][f] = $(this).val();
  });
  body.find("button[data-i-del]").off("click").on("click", function(){
    const i = +$(this).data("i-del");
    incidentItems.splice(i,1);
    renderIncidentRows(cfg);
  });
}

function addIncidentItem(cfg, srcType, x){
  const s = getSession();
  const role = getRole(cfg, s.roleId);

  const row = {
    category: (srcType === "sup") ? "sup" : "med",
    isNarcotic: (srcType === "narc") ? true : !!x.isNarcotic,
    item: x.name,
    doseQty: (srcType === "sup") ? (x.par || "") : (x.defaultDose || ""),
    details: x.notes || ""
  };

  if (row.category === "med" && row.isNarcotic && !role?.canCheckoutNarcotics){
    toast("Not allowed", "Narcotics require Paramedic+.");
    addLog("Incident Add Blocked", `Narcotic: ${row.item}`);
    return;
  }

  incidentItems.unshift(row);
  renderIncidentRows(cfg);
  addLog("Incident Add", `${row.category.toUpperCase()}${row.isNarcotic ? " (NARC)" : ""}: ${row.item}`);
}

function stopIncidentScanner(){
  if (incidentScanner){
    try{ incidentScanner.stop().then(() => incidentScanner.clear()).catch(()=>{}); }catch(_){}
    incidentScanner = null;
  }
}

function addScannedToIncident(cfg, decodedText){
  const row = parseQrTextToItem(cfg, decodedText);
  row.details = "";
  delete row.done;

  const s = getSession();
  const role = getRole(cfg, s.roleId);
  if (row.category === "med" && row.isNarcotic && !role?.canCheckoutNarcotics){
    toast("Not allowed", "Narcotics require Paramedic+.");
    addLog("Incident Scan Blocked", decodedText);
    return;
  }

  incidentItems.unshift(row);
  renderIncidentRows(cfg);
  addLog("Incident Scan", decodedText);
  toast("Added", decodedText);
}

function trunc(s, n){
  s = String(s || "");
  return s.length > n ? (s.slice(0, n-1) + "…") : s;
}

function exportIncidentPdf(cfg){
  const s = getSession();
  const inc = ($("#incidentNumber").val() || "").trim();
  if (!inc){ toast("Missing Incident #", "Enter an incident number first."); return; }

  const notes = ($("#incidentNotes").val() || "").trim();
  const locId = ($("#incidentLocation").val() || "").trim();
  const svc = getService(cfg, s.service);
  const locLabel = svc?.locations?.find(l => l.id === locId)?.label || locId;

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF){ toast("PDF Missing", "jsPDF did not load."); return; }

  const doc = new jsPDF({ unit:"pt", format:"letter" });
  let y = 54;

  doc.setFont("helvetica","bold"); doc.setFontSize(16);
  doc.text("EMS Incident Item Summary", 54, y); y += 18;

  doc.setFont("helvetica","normal"); doc.setFontSize(11);
  doc.text(`Incident: ${inc}`, 54, y); y += 14;
  doc.text(`Service: ${s.service}   Location: ${locLabel}`, 54, y); y += 14;
  doc.text(`User: ${s.user}   Role: ${s.roleId}   Mode: ${s.modeKey}`, 54, y); y += 14;
  if (notes){ doc.text(`Notes: ${notes}`, 54, y); y += 14; }
  doc.text(`Generated: ${new Date().toLocaleString()}`, 54, y); y += 18;

  doc.setFont("helvetica","bold");
  doc.text("Type", 54, y);
  doc.text("Item", 120, y);
  doc.text("Dose/Qty", 360, y);
  doc.text("Details", 460, y);
  y += 10;
  doc.setLineWidth(0.5);
  doc.line(54, y, 558, y); y += 14;

  doc.setFont("helvetica","normal");
  const rows = incidentItems.slice().reverse();
  if (!rows.length){
    doc.text("(No items selected)", 54, y);
  } else {
    rows.forEach(r => {
      if (y > 740){ doc.addPage(); y = 54; }
      const type = r.category === "sup" ? "SUP" : (r.isNarcotic ? "NARC" : "MED");
      doc.text(type, 54, y);
      doc.text(trunc(r.item, 30), 120, y);
      doc.text(trunc(r.doseQty || "", 14), 360, y);
      doc.text(trunc(r.details || "", 18), 460, y);
      y += 14;
    });
  }

  doc.save(`Incident_${inc}.pdf`);
  addLog("Export PDF", `Incident ${inc} (${incidentItems.length} items)`);
  toast("PDF Created", `Incident ${inc} exported.`);
}

function incidentSelectedItems(){
  return incidentItems.map(x => ({ 
    category: x.category, 
    isNarcotic: !!x.isNarcotic, 
    item: x.item, 
    doseQty: x.doseQty || "", 
    details: x.details || "" 
  }));
}

async function incidentCheckout(cfg){
  const items = incidentSelectedItems();
  const check = enforceCheckoutRules(cfg, items);
  if (!check.ok){ toast("Not allowed", check.reason); addLog("Incident Checkout Denied", check.reason); return; }
  
  // Add confirmation dialog
  const narcCount = items.filter(x => x.category==="med" && x.isNarcotic).length;
  const msg = `Check out ${items.length} item(s) for incident${narcCount ? ` including ${narcCount} narcotic(s)` : ""}?`;
  if (!confirm(msg)) return;
  
  // Build itemized details string
  const itemDetails = items.map(it => `${it.item} (${it.doseQty || "qty not specified"})${it.details ? ` - ${it.details}` : ""}`).join(", ");
  
  addLog("Incident Checkout", `${items.length} items${narcCount?` (${narcCount} narcotics)`:``}: ${itemDetails}`);
  toast("Checked out", `${items.length} items logged.`);
}

async function incidentWaste(cfg){
  const items = incidentSelectedItems();
  const check = enforceWasteRules(cfg, items);
  if (!check.ok){ toast("Not allowed", check.reason); addLog("Incident Waste Denied", check.reason); return; }

  // Add confirmation dialog
  const narcCount = items.filter(x => x.category==="med" && x.isNarcotic).length;
  const msg = `Waste ${items.length} item(s) from incident${narcCount ? ` including ${narcCount} narcotic(s)` : ""}?`;
  if (!confirm(msg)) return;

  const witness = await requireWitnessIfNeeded(cfg, check.hasNarc);
  if (!witness.ok){ toast("Cancelled", "Witness not provided."); addLog("Incident Waste Cancelled", "No witness"); return; }

  // Build itemized details string
  const itemDetails = items.map(it => `${it.item} (${it.doseQty || "qty not specified"})${it.details ? ` - ${it.details}` : ""}`).join(", ");
  
  addLog("Incident Waste", `${items.length} items${narcCount?` (${narcCount} narcotics, witness=${witness.witnessUser})`:``}: ${itemDetails}`);
  toast("Waste logged", `${items.length} items logged.`);
}
