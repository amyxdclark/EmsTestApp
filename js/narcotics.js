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

  bootstrap.Modal.getInstance(document.getElementById("witnessModal")).hide();
  const res = witnessResolve; witnessResolve = null;
  res?.({ ok:true, witnessUser:user.username, witnessRole:user.roleId });
  toast("Witness accepted", `${user.username} (${user.roleId})`);
}
