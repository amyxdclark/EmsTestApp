let witnessResolve = null;

async function requireWitnessIfNeeded(cfg, needsWitness){
  if (!needsWitness) return { ok:true };
  return new Promise((resolve) => {
    witnessResolve = resolve;
    new bootstrap.Modal(document.getElementById("witnessModal")).show();
  });
}

function witnessConfirm(cfg){
  const u = ($("#witnessUser").val() || "").trim();
  const p = ($("#witnessPass").val() || "").trim();
  const user = authenticate(cfg, u, p);
  if (!user){ toast("Witness invalid", "Credentials not recognized."); return; }
  const role = getRole(cfg, user.roleId);
  if (user.roleId !== "Paramedic" && !role?.canAdminSystem){
    toast("Witness invalid", "Witness must be Paramedic (or System Admin in this demo).");
    return;
  }

  const s = getSession();
  if (s && s.user === user.username){
    toast("Witness invalid", "Witness cannot be the same person who is wasting/transferring the narcotic.");
    return;
  }

  bootstrap.Modal.getInstance(document.getElementById("witnessModal")).hide();
  const res = witnessResolve; witnessResolve = null;
  res?.({ ok:true, witnessUser:user.username, witnessRole:user.roleId });
  toast("Witness accepted", `${user.username} (${user.roleId})`);
}

function openNarcShiftCount(cfg){
  const s = getSession();
  if (!s){ toast("Login required", "Please login first."); return; }
  const role = getRole(cfg, s.roleId);
  if (!role?.canCheckoutNarcotics){
    toast("Not allowed", "Narcotic shift count requires Paramedic+ role.");
    return;
  }

  $("#shiftCountOutgoing").val(`${s.user} (${s.roleId})`);
  $("#shiftCountIncomingUser").val("");
  $("#shiftCountIncomingPass").val("");

  const narcMeds = getMaster(cfg, "meds").filter(m => m.isNarcotic);
  const tbody = $("#shiftCountBody");
  tbody.empty();

  narcMeds.forEach(med => {
    const schedule = med.deaSchedule || "—";
    const expectedQty = med.quantity || 0;
    tbody.append(`
      <tr>
        <td>
          <b>${escapeHtml(med.name)}</b>
          <div class="small text-muted">Lot: ${escapeHtml(med.lotNumber || "—")}</div>
          <div class="small text-muted">Exp: ${escapeHtml(med.expirationDate || "—")}</div>
        </td>
        <td><span class="badge text-bg-dark">Sched ${escapeHtml(schedule)}</span></td>
        <td><input type="number" class="form-control form-control-sm shift-expected" data-med="${escapeAttr(med.name)}" placeholder="0" value="${expectedQty}" /></td>
        <td><input type="number" class="form-control form-control-sm shift-actual" data-med="${escapeAttr(med.name)}" placeholder="0" /></td>
        <td class="shift-discrepancy" data-med="${escapeAttr(med.name)}">—</td>
      </tr>
    `);
  });

  tbody.find(".shift-expected, .shift-actual").on("input", function(){
    const med = $(this).data("med");
    const expected = parseInt($(`input.shift-expected[data-med="${escapeAttr(med)}"]`).val() || "0");
    const actual = parseInt($(`input.shift-actual[data-med="${escapeAttr(med)}"]`).val() || "0");
    const disc = actual - expected;
    $(`.shift-discrepancy[data-med="${escapeAttr(med)}"]`).text(disc !== 0 ? disc : "—");
  });

  new bootstrap.Modal(document.getElementById("narcShiftCountModal")).show();
}

function confirmShiftCount(cfg){
  const s = getSession();
  if (!s) return;

  const incomingUser = ($("#shiftCountIncomingUser").val() || "").trim();
  const incomingPass = ($("#shiftCountIncomingPass").val() || "").trim();
  const incoming = authenticate(cfg, incomingUser, incomingPass);

  if (!incoming){
    toast("Invalid credentials", "Incoming provider credentials not recognized.");
    return;
  }

  const incomingRole = getRole(cfg, incoming.roleId);
  if (!incomingRole?.canCheckoutNarcotics){
    toast("Not allowed", "Incoming provider must be Paramedic+.");
    return;
  }

  const counts = [];
  let hasDiscrepancy = false;
  $(".shift-expected").each(function(){
    const med = $(this).data("med");
    const expected = parseInt($(this).val() || "0");
    const actual = parseInt($(`.shift-actual[data-med="${escapeAttr(med)}"]`).val() || "0");
    const disc = actual - expected;
    if (disc !== 0) hasDiscrepancy = true;
    counts.push({ med, expected, actual, discrepancy: disc });
  });

  const logDetail = `Outgoing: ${s.user}, Incoming: ${incomingUser}, Counts: ${JSON.stringify(counts)}`;
  addLog("Narcotic Shift Count", logDetail);

  // Generate PDF
  exportNarcShiftCountPdf(s.user, incomingUser, counts, hasDiscrepancy);

  if (hasDiscrepancy){
    addLog("Narcotic Discrepancy (CRITICAL)", `Shift count discrepancies detected. See shift count log for details.`);
    toast("Count complete (with discrepancies)", "Discrepancy log created. PDF exported.");
  } else {
    toast("Count complete", "All counts matched. PDF exported.");
  }

  bootstrap.Modal.getInstance(document.getElementById("narcShiftCountModal")).hide();
}

function exportNarcShiftCountPdf(outgoingUser, incomingUser, counts, hasDiscrepancy){
  if (typeof jsPDF === "undefined"){
    toast("PDF Error", "jsPDF library not loaded.");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text("Narcotic Shift Count Sheet", 14, 20);
  
  doc.setFontSize(11);
  let y = 30;
  doc.text(`Date/Time: ${new Date().toLocaleString()}`, 14, y); y += 6;
  doc.text(`Outgoing Provider: ${outgoingUser}`, 14, y); y += 6;
  doc.text(`Incoming Provider: ${incomingUser}`, 14, y); y += 6;
  doc.text(`Status: ${hasDiscrepancy ? "DISCREPANCY DETECTED" : "ALL COUNTS MATCHED"}`, 14, y); y += 10;
  
  doc.setFontSize(12);
  doc.text("Narcotic Counts:", 14, y); y += 8;
  
  doc.setFontSize(9);
  counts.forEach(c => {
    if (y > 270){ doc.addPage(); y = 20; }
    const status = c.discrepancy === 0 ? "OK" : `DISCREPANCY: ${c.discrepancy > 0 ? "+" : ""}${c.discrepancy}`;
    doc.text(`${c.med}: Expected ${c.expected}, Actual ${c.actual} - ${status}`, 14, y);
    y += 5;
  });
  
  y += 15;
  if (y > 250){ doc.addPage(); y = 20; }
  doc.text("Provider Signatures:", 14, y); y += 10;
  doc.text(`Outgoing: ________________________ (${outgoingUser})`, 14, y); y += 10;
  doc.text(`Incoming: ________________________ (${incomingUser})`, 14, y);
  
  const fileName = `NarcShiftCount_${new Date().toISOString().slice(0,10)}_${Date.now()}.pdf`;
  doc.save(fileName);
  
  addLog("Export PDF", `Narcotic Shift Count: ${fileName}`);
}

function openNarcTransfer(cfg){
  const s = getSession();
  if (!s){ toast("Login required", "Please login first."); return; }
  const role = getRole(cfg, s.roleId);
  if (!role?.canCheckoutNarcotics){
    toast("Not allowed", "Narcotic custody transfer requires Paramedic+ role.");
    return;
  }

  $("#transferFrom").val(`${s.user} (${s.roleId})`);
  $("#transferToUser").val("");
  $("#transferToPass").val("");

  hydrateIncidentLocationDropdown(cfg);
  const locSelect = $("#transferLocation");
  locSelect.empty();
  const locs = getLocationsForCurrent(cfg);
  locs.forEach(loc => {
    locSelect.append(`<option value="${escapeAttr(loc.id)}">${escapeHtml(loc.label)}</option>`);
  });

  const narcMeds = getMaster(cfg, "meds").filter(m => m.isNarcotic);
  const tbody = $("#transferBody");
  tbody.empty();

  narcMeds.forEach(med => {
    const schedule = med.deaSchedule || "—";
    const defaultLot = med.lotNumber || "";
    tbody.append(`
      <tr>
        <td>
          <b>${escapeHtml(med.name)}</b>
          <div class="small text-muted">Exp: ${escapeHtml(med.expirationDate || "—")}</div>
        </td>
        <td><span class="badge text-bg-dark">Sched ${escapeHtml(schedule)}</span></td>
        <td><input type="number" class="form-control form-control-sm transfer-count" data-med="${escapeAttr(med.name)}" placeholder="0" /></td>
        <td><input type="text" class="form-control form-control-sm transfer-lot" data-med="${escapeAttr(med.name)}" placeholder="Lot number" value="${escapeAttr(defaultLot)}" /></td>
      </tr>
    `);
  });

  new bootstrap.Modal(document.getElementById("narcTransferModal")).show();
}

function confirmNarcTransfer(cfg){
  const s = getSession();
  if (!s) return;

  const toUser = ($("#transferToUser").val() || "").trim();
  const toPass = ($("#transferToPass").val() || "").trim();
  const toProvider = authenticate(cfg, toUser, toPass);

  if (!toProvider){
    toast("Invalid credentials", "Receiving provider credentials not recognized.");
    return;
  }

  const toRole = getRole(cfg, toProvider.roleId);
  if (!toRole?.canCheckoutNarcotics){
    toast("Not allowed", "Receiving provider must be Paramedic+.");
    return;
  }

  const location = $("#transferLocation").val();
  if (!location){
    toast("Location required", "Please select a location.");
    return;
  }

  const items = [];
  $(".transfer-count").each(function(){
    const med = $(this).data("med");
    const count = parseInt($(this).val() || "0");
    const lot = $(`.transfer-lot[data-med="${escapeAttr(med)}"]`).val() || "";
    if (count > 0){
      items.push({ med, count, lot });
    }
  });

  if (items.length === 0){
    toast("No items", "Enter at least one narcotic count to transfer.");
    return;
  }

  const logDetail = `From: ${s.user}, To: ${toUser}, Location: ${location}, Items: ${JSON.stringify(items)}`;
  addLog("Narcotic Custody Transfer", logDetail);
  toast("Transfer complete", `Custody transferred to ${toUser}.`);

  bootstrap.Modal.getInstance(document.getElementById("narcTransferModal")).hide();
}

function openPartialWaste(medName, defaultDose){
  $("#partialWasteMed").val(medName);
  $("#partialWasteTotal").val(defaultDose || "");
  $("#partialWasteAdministered").val("");
  $("#partialWasteWasted").val("");
  $("#partialWasteMethod").val("");
  $("#partialWasteLot").val("");
  $("#partialWasteWitnessUser").val("");
  $("#partialWasteWitnessPass").val("");

  new bootstrap.Modal(document.getElementById("partialWasteModal")).show();
}

function confirmPartialWaste(cfg){
  const s = getSession();
  if (!s) return;

  const med = $("#partialWasteMed").val();
  const total = $("#partialWasteTotal").val().trim();
  const administered = $("#partialWasteAdministered").val().trim();
  const wasted = $("#partialWasteWasted").val().trim();
  const method = $("#partialWasteMethod").val();
  const lot = $("#partialWasteLot").val().trim();
  const witnessUser = ($("#partialWasteWitnessUser").val() || "").trim();
  const witnessPass = ($("#partialWasteWitnessPass").val() || "").trim();

  if (!total || !administered || !wasted || !method){
    toast("Missing fields", "Please fill in all required fields.");
    return;
  }

  // Parse numeric values (strip units like "mcg", "mg", "mL")
  const extractNumericValue = (str) => {
    const match = str.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : NaN;
  };

  const totalNum = extractNumericValue(total);
  const administeredNum = extractNumericValue(administered);
  const wastedNum = extractNumericValue(wasted);

  // Validate that values are numeric
  if (isNaN(totalNum) || isNaN(administeredNum) || isNaN(wastedNum)){
    toast("Invalid values", "Total, Administered, and Wasted must contain numeric values.");
    return;
  }

  // Validate math: administered + wasted ≈ total (allow small floating point tolerance)
  const sum = administeredNum + wastedNum;
  const tolerance = 0.01; // Allow 0.01 unit tolerance for floating point
  if (Math.abs(sum - totalNum) > tolerance){
    toast("Amounts don't add up", `Administered (${administeredNum}) + Wasted (${wastedNum}) must equal Total (${totalNum}). Currently ${sum}.`);
    return;
  }

  const witness = authenticate(cfg, witnessUser, witnessPass);
  if (!witness){
    toast("Witness invalid", "Witness credentials not recognized.");
    return;
  }

  const witnessRole = getRole(cfg, witness.roleId);
  if (!witnessRole?.canWasteNarcotics){
    toast("Witness invalid", "Witness must be Paramedic+.");
    return;
  }

  if (s.user === witness.username){
    toast("Witness invalid", "Witness cannot be the same person who is wasting the narcotic.");
    return;
  }

  const logDetail = `Med: ${med}, Total: ${total}, Administered: ${administered}, Wasted: ${wasted}, Method: ${method}${lot ? `, Lot: ${lot}` : ""}, Witness: ${witnessUser}`;
  addLog("Partial Dose Waste", logDetail);
  
  // Generate PDF documentation for partial waste
  exportPartialWastePdf(s.user, med, total, administered, wasted, method, lot, witnessUser);
  
  toast("Waste logged", `${med} partial waste documented.`);

  bootstrap.Modal.getInstance(document.getElementById("partialWasteModal")).hide();
}

function exportPartialWastePdf(provider, medication, total, administered, wasted, method, lot, witnessUser){
  if (typeof jsPDF === "undefined"){
    toast("PDF Error", "jsPDF library not loaded.");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text("Partial Dose Waste Documentation", 14, 20);
  
  doc.setFontSize(11);
  let y = 30;
  doc.text(`Date/Time: ${new Date().toLocaleString()}`, 14, y); y += 6;
  doc.text(`Provider: ${provider}`, 14, y); y += 6;
  doc.text(`Witness: ${witnessUser}`, 14, y); y += 10;
  
  doc.setFontSize(12);
  doc.text("Medication Information:", 14, y); y += 8;
  
  doc.setFontSize(10);
  doc.text(`Medication: ${medication}`, 14, y); y += 6;
  doc.text(`Total Dose: ${total}`, 14, y); y += 6;
  doc.text(`Amount Administered: ${administered}`, 14, y); y += 6;
  doc.text(`Amount Wasted: ${wasted}`, 14, y); y += 6;
  doc.text(`Waste Method: ${method}`, 14, y); y += 6;
  if (lot){
    doc.text(`Lot Number: ${lot}`, 14, y); y += 6;
  }
  
  y += 10;
  doc.setFontSize(9);
  doc.text("This document certifies that the above medication was partially administered", 14, y); y += 5;
  doc.text("and the remaining portion was wasted according to DEA regulations.", 14, y); y += 10;
  
  y += 15;
  if (y > 250){ doc.addPage(); y = 20; }
  doc.text("Provider Signature:", 14, y); y += 10;
  doc.text(`________________________ (${provider})`, 14, y); y += 15;
  doc.text("Witness Signature:", 14, y); y += 10;
  doc.text(`________________________ (${witnessUser})`, 14, y);
  
  const fileName = `PartialWaste_${medication.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
  
  addLog("Export PDF", `Partial Waste: ${fileName}`);
}

let returnItems = [];

function openReturnToStock(cfg){
  const s = getSession();
  if (!s){ toast("Login required", "Please login first."); return; }
  
  returnItems = [];
  $("#returnReason").val("");
  renderReturnItems(cfg);
  
  new bootstrap.Modal(document.getElementById("returnToStockModal")).show();
  addLog("Open Return to Stock", "Return items scenario");
}

function renderReturnItems(cfg){
  const body = $("#returnItemsBody");
  body.empty();
  
  const allMeds = getMaster(cfg, "meds");
  
  returnItems.forEach((it, idx) => {
    const badge = it.category === "sup"
      ? `<span class="badge text-bg-danger">SUP</span>`
      : (it.isNarcotic ? `<span class="badge text-bg-warning">NARC</span>` : `<span class="badge text-bg-success">MED</span>`);
    
    body.append(`
      <tr>
        <td>${badge}</td>
        <td><b>${escapeHtml(it.item)}</b></td>
        <td><input class="form-control form-control-sm" data-r-idx="${idx}" data-field="doseQty" value="${escapeAttr(it.doseQty || "")}"/></td>
        <td><button class="btn btn-sm btn-outline-danger" style="border-radius: 999px;" data-r-del="${idx}">X</button></td>
      </tr>
    `);
  });
  
  body.find("input[data-r-idx]").off("input").on("input", function(){
    const i = +$(this).data("r-idx");
    const f = $(this).data("field");
    returnItems[i][f] = $(this).val();
  });
  body.find("button[data-r-del]").off("click").on("click", function(){
    const i = +$(this).data("r-del");
    returnItems.splice(i, 1);
    renderReturnItems(cfg);
  });
}

function addReturnItem(cfg, type, item){
  const row = {
    category: (type === "sup") ? "sup" : "med",
    isNarcotic: (type === "narc") ? true : !!item.isNarcotic,
    item: item.name,
    doseQty: (type === "sup") ? (item.par || "") : (item.defaultDose || "")
  };
  
  returnItems.unshift(row);
  renderReturnItems(cfg);
}

async function confirmReturnToStock(cfg){
  const s = getSession();
  if (!s) return;
  
  const reason = ($("#returnReason").val() || "").trim();
  if (!reason){
    toast("Missing reason", "Please provide a reason for the return.");
    return;
  }
  
  if (returnItems.length === 0){
    toast("No items", "Add at least one item to return.");
    return;
  }
  
  const hasNarcotic = returnItems.some(it => it.category === "med" && it.isNarcotic);
  
  // Require witness for narcotic returns
  if (hasNarcotic){
    const witness = await requireWitnessIfNeeded(cfg, true);
    if (!witness.ok){
      toast("Cancelled", "Witness required for narcotic returns.");
      addLog("Return to Stock Cancelled", "No witness for narcotic return");
      return;
    }
    
    const itemDetails = returnItems.map(it => `${it.item} (${it.doseQty || "qty not specified"})`).join(", ");
    addLog("Return to Stock", `${returnItems.length} items (witness=${witness.witnessUser}): ${itemDetails}. Reason: ${reason}`);
    toast("Return logged", `${returnItems.length} items returned to stock.`);
  } else {
    const itemDetails = returnItems.map(it => `${it.item} (${it.doseQty || "qty not specified"})`).join(", ");
    addLog("Return to Stock", `${returnItems.length} items: ${itemDetails}. Reason: ${reason}`);
    toast("Return logged", `${returnItems.length} items returned to stock.`);
  }
  
  bootstrap.Modal.getInstance(document.getElementById("returnToStockModal")).hide();
}

function openVoidCheckout(cfg){
  const s = getSession();
  if (!s){ toast("Login required", "Please login first."); return; }
  
  $("#voidTransactionId").val("");
  $("#voidReason").val("");
  
  new bootstrap.Modal(document.getElementById("voidCheckoutModal")).show();
  addLog("Open Void Checkout", "Void checkout scenario");
}

function confirmVoidCheckout(cfg){
  const s = getSession();
  if (!s) return;
  
  const txId = ($("#voidTransactionId").val() || "").trim();
  const reason = ($("#voidReason").val() || "").trim();
  
  if (!txId){
    toast("Missing transaction ID", "Please enter the transaction ID to void.");
    return;
  }
  
  if (!reason){
    toast("Missing reason", "Please provide a reason for voiding the checkout.");
    return;
  }
  
  // Check if transaction exists in logs
  const logs = getLogs();
  const txLog = logs.find(log => log.transactionId === txId);
  
  if (!txLog){
    toast("Transaction not found", `No transaction found with ID: ${txId}`);
    return;
  }
  
  if (txLog.action === "Void Checkout"){
    toast("Already voided", "This transaction has already been voided.");
    return;
  }
  
  addLog("Void Checkout", `Voided transaction ${txId}. Original: ${txLog.action} - ${txLog.details}. Reason: ${reason}`, txId);
  toast("Checkout voided", `Transaction ${txId} has been voided.`);
  
  bootstrap.Modal.getInstance(document.getElementById("voidCheckoutModal")).hide();
}

