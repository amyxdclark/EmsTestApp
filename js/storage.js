function loadConfig(){
  const raw = localStorage.getItem(STORAGE_KEYS.config);
  if (!raw) return structuredClone(DEFAULT_CONFIG);
  try { return JSON.parse(raw); } catch { return structuredClone(DEFAULT_CONFIG); }
}

function saveConfig(cfg){
  cfg.meta.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(cfg, null, 2));
}

function getSession(){ return JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || "null"); }
function setSession(s){ localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(s)); }
function clearSession(){ localStorage.removeItem(STORAGE_KEYS.session); }

function getLogs(){ return JSON.parse(localStorage.getItem(STORAGE_KEYS.logs) || "[]"); }
function setLogs(arr){ localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(arr)); }
function addLog(action, details, transactionId){
  const s = getSession() || {};
  const logs = getLogs();
  const logEntry = {
    t: new Date().toISOString(),
    user: s.user || "—",
    service: s.service || "—",
    role: s.roleId || "—",
    mode: s.modeKey || "—",
    action, details
  };
  if (transactionId){
    logEntry.transactionId = transactionId;
  }
  logs.unshift(logEntry);
  setLogs(logs.slice(0, 250));
  renderLogs();
  return logEntry.t; // Return timestamp as transaction ID if none provided
}

function generateTransactionId(){
  return `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getChecksState(){ return JSON.parse(localStorage.getItem(STORAGE_KEYS.checks) || "{}"); }
function setChecksState(obj){ localStorage.setItem(STORAGE_KEYS.checks, JSON.stringify(obj)); }

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s).replaceAll("\n"," "); }

function getServiceOverrideKey(serviceId){ return `mc_service_${serviceId}_override_v1`; }
function getService(cfg, serviceId){
  const base = cfg.services.find(x => x.id === serviceId);
  if (!base) return null;
  const raw = localStorage.getItem(getServiceOverrideKey(serviceId));
  if (!raw) return structuredClone(base);
  try { return { ...structuredClone(base), ...JSON.parse(raw) }; } catch { return structuredClone(base); }
}
function saveServiceOverride(serviceId, partial){
  localStorage.setItem(getServiceOverrideKey(serviceId), JSON.stringify(partial, null, 2));
}
function clearServiceOverride(serviceId){
  localStorage.removeItem(getServiceOverrideKey(serviceId));
}

function getMasterOverrideKey(kind){ return `mc_master_${kind}_override_v1`; }
function getMaster(cfg, kind){
  const raw = localStorage.getItem(getMasterOverrideKey(kind));
  if (!raw) return structuredClone(cfg.master[kind]);
  try { return JSON.parse(raw); } catch { return structuredClone(cfg.master[kind]); }
}
function saveMaster(kind, arr){ localStorage.setItem(getMasterOverrideKey(kind), JSON.stringify(arr, null, 2)); }
function clearMaster(kind){ localStorage.removeItem(getMasterOverrideKey(kind)); }
