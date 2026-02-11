function loadSystemAdmin(cfg){
  $("#sysConfigJson").val(JSON.stringify(cfg, null, 2));
}

function validateSystemConfig(){
  try{ JSON.parse($("#sysConfigJson").val() || "{}"); toast("Valid JSON", "Config parses successfully."); }
  catch(e){ toast("Invalid JSON", e.message || "JSON parsing error."); }
}

function saveSystemConfig(){
  try{
    const cfg = JSON.parse($("#sysConfigJson").val() || "{}");
    if (!cfg.services || !Array.isArray(cfg.services)) throw new Error("Config must have services[]");
    if (!cfg.roles || !Array.isArray(cfg.roles)) throw new Error("Config must have roles[]");
    if (!cfg.users || !Array.isArray(cfg.users)) throw new Error("Config must have users[]");
    if (!cfg.master || !cfg.master.meds || !cfg.master.supplies) throw new Error("Config must have master.meds and master.supplies");
    saveConfig(cfg);
    toast("Saved", "Config saved locally.");
    addLog("System Admin Save", "Full config updated");
    enforceNavVisibility();
    renderAll(loadConfig());
  }catch(e){ toast("Invalid JSON", e.message || "Error saving config."); }
}

function resetSystemConfig(){
  localStorage.removeItem(STORAGE_KEYS.config);
  const cfg = loadConfig();
  toast("Reset", "Config reset to defaults.");
  addLog("System Admin Reset", "Default config restored");
  loadSystemAdmin(cfg);
  enforceNavVisibility();
  renderAll(cfg);
}
