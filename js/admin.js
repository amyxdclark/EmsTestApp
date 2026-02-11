function loadServiceAdmin(cfg){
  const s = getSession();
  if (!s?.service) return;
  $("#adminMedsJson").val(JSON.stringify(getMaster(cfg, "meds"), null, 2));
  $("#adminSuppliesJson").val(JSON.stringify(getMaster(cfg, "supplies"), null, 2));
  $("#adminServiceLocationsJson").val(JSON.stringify(getService(cfg, s.service).locations || [], null, 2));
}

function saveServiceAdminMeds(cfg){
  try{
    const arr = JSON.parse($("#adminMedsJson").val() || "[]");
    if (!Array.isArray(arr)) throw new Error("Meds JSON must be an array.");
    arr.forEach(x => { if (!x.name) throw new Error("Each med must have a name."); });
    saveMaster("meds", arr);
    toast("Saved", "Med master list saved.");
    addLog("Admin Save", "Meds master list");
    renderAll(loadConfig());
  }catch(e){ toast("Invalid JSON", e.message || "Error parsing meds JSON."); }
}

function saveServiceAdminSupplies(cfg){
  try{
    const arr = JSON.parse($("#adminSuppliesJson").val() || "[]");
    if (!Array.isArray(arr)) throw new Error("Supplies JSON must be an array.");
    arr.forEach(x => { if (!x.name) throw new Error("Each supply must have a name."); });
    saveMaster("supplies", arr);
    toast("Saved", "Supply master list saved.");
    addLog("Admin Save", "Supplies master list");
    renderAll(loadConfig());
  }catch(e){ toast("Invalid JSON", e.message || "Error parsing supplies JSON."); }
}

function saveServiceAdminLocations(cfg){
  const s = getSession();
  if (!s?.service) return;
  try{
    const arr = JSON.parse($("#adminServiceLocationsJson").val() || "[]");
    if (!Array.isArray(arr)) throw new Error("Locations JSON must be an array.");
    arr.forEach(x => {
      if (!x.id || !x.label || !x.category) throw new Error("Each location needs id, label, category (med|sup).");
      if (!["med","sup"].includes(x.category)) throw new Error("category must be 'med' or 'sup'.");
    });
    saveServiceOverride(s.service, { locations: arr });
    toast("Saved", "Service locations saved.");
    addLog("Admin Save", `Locations for ${s.service}`);
    renderAll(loadConfig());
  }catch(e){ toast("Invalid JSON", e.message || "Error parsing locations JSON."); }
}

function resetServiceAdmin(cfg){
  const s = getSession();
  if (!s?.service) return;
  clearMaster("meds");
  clearMaster("supplies");
  clearServiceOverride(s.service);
  toast("Reset", "Defaults restored (local overrides cleared).");
  addLog("Admin Reset", `Defaults for ${s.service}`);
  loadServiceAdmin(loadConfig());
  renderAll(loadConfig());
}
