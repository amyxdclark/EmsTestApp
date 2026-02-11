// Training and Certification Management Module

function renderTraining(cfg){
  const s = getSession();
  if (!s) return;
  
  const trainingSect = $("#trainingSection");
  trainingSect.empty();
  
  const training = cfg.training || {};
  const userCerts = training.userCertifications || {};
  const myCerts = userCerts[s.user] || [];
  
  trainingSect.append(`
    <div class="section-card">
      <div class="section-header">
        <div>
          <h3 class="section-title mb-1">Training & Certifications</h3>
          <div class="section-sub">Manage certifications, skills, training logs, and protocol references.</div>
        </div>
      </div>
      
      <div class="panel-white">
        <h5 style="font-weight:950;">My Certifications</h5>
        <div class="small-note mb-3">Track your professional certifications and renewal dates.</div>
        <div id="myCertsList"></div>
        <button class="btn btn-outline-secondary mt-2" type="button" id="btnAddCertification">Add Certification</button>
      </div>
      
      <div class="panel-white mt-3">
        <h5 style="font-weight:950;">Skills Checklist</h5>
        <div class="small-note mb-3">Track competency sign-offs for clinical skills.</div>
        <div id="mySkillsList"></div>
      </div>
      
      <div class="panel-white mt-3">
        <h5 style="font-weight:950;">Training Log</h5>
        <div class="small-note mb-3">Record completed training sessions.</div>
        <div id="trainingLogList"></div>
        <button class="btn btn-outline-secondary mt-2" type="button" id="btnAddTraining">Add Training Record</button>
      </div>
      
      <div class="panel-white mt-3">
        <h5 style="font-weight:950;">Protocol Quick Reference</h5>
        <div class="small-note mb-3">Access common protocol cards.</div>
        <div id="protocolsList"></div>
      </div>
    </div>
  `);
  
  renderMyCertifications(cfg, myCerts);
  renderMySkills(cfg);
  renderTrainingLog(cfg);
  renderProtocols(cfg);
}

function renderMyCertifications(cfg, myCerts){
  const list = $("#myCertsList");
  list.empty();
  
  if (myCerts.length === 0){
    list.append(`<div class="alert alert-info">No certifications recorded. Click "Add Certification" to add one.</div>`);
    return;
  }
  
  const now = new Date();
  
  myCerts.forEach((cert, idx) => {
    const expDate = cert.expirationDate ? new Date(cert.expirationDate) : null;
    const daysUntil = expDate ? Math.ceil((expDate - now) / (1000 * 60 * 60 * 24)) : null;
    
    let statusBadge = `<span class="badge text-bg-success">Valid</span>`;
    if (daysUntil !== null){
      if (daysUntil < 0){
        statusBadge = `<span class="badge text-bg-danger">Expired</span>`;
      } else if (daysUntil <= 30){
        statusBadge = `<span class="badge text-bg-warning">Expires in ${daysUntil} days</span>`;
      } else if (daysUntil <= 90){
        statusBadge = `<span class="badge text-bg-info">Expires in ${daysUntil} days</span>`;
      }
    }
    
    list.append(`
      <div class="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2">
        <div>
          <b>${escapeHtml(cert.name)}</b>
          <div class="small text-muted">
            Issued: ${cert.issueDate || "—"} • Expires: ${cert.expirationDate || "—"}
            ${cert.certNumber ? ` • Cert #: ${escapeHtml(cert.certNumber)}` : ""}
          </div>
        </div>
        <div>${statusBadge}</div>
      </div>
    `);
  });
}

function renderMySkills(cfg){
  const list = $("#mySkillsList");
  list.empty();
  
  const training = cfg.training || {};
  const skills = training.skills || [];
  const s = getSession();
  const userSkills = training.userSkills || {};
  const mySkills = userSkills[s.user] || [];
  
  if (skills.length === 0){
    list.append(`<div class="alert alert-info">No skills defined in configuration.</div>`);
    return;
  }
  
  skills.forEach((skill) => {
    const signedOff = mySkills.find(ms => ms.skill === skill.name);
    const status = signedOff 
      ? `<span class="badge text-bg-success">✓ Signed off by ${escapeHtml(signedOff.preceptor)} on ${signedOff.date}</span>`
      : `<span class="badge text-bg-secondary">Not signed off</span>`;
    
    list.append(`
      <div class="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2">
        <div>
          <b>${escapeHtml(skill.name)}</b>
          <div class="small text-muted">${escapeHtml(skill.description || "")}</div>
        </div>
        <div>${status}</div>
      </div>
    `);
  });
}

function renderTrainingLog(cfg){
  const list = $("#trainingLogList");
  list.empty();
  
  const s = getSession();
  const training = cfg.training || {};
  const trainingRecords = training.trainingRecords || [];
  const myRecords = trainingRecords.filter(r => r.user === s.user);
  
  if (myRecords.length === 0){
    list.append(`<div class="alert alert-info">No training records. Click "Add Training Record" to add one.</div>`);
    return;
  }
  
  myRecords.slice(0, 10).forEach((record) => {
    list.append(`
      <div class="border-bottom pb-2 mb-2">
        <b>${escapeHtml(record.topic)}</b>
        <div class="small text-muted">
          Date: ${record.date} • Hours: ${record.hours || 0} • Instructor: ${escapeHtml(record.instructor || "—")}
        </div>
        ${record.notes ? `<div class="small">${escapeHtml(record.notes)}</div>` : ""}
      </div>
    `);
  });
}

function renderProtocols(cfg){
  const list = $("#protocolsList");
  list.empty();
  
  const training = cfg.training || {};
  const protocols = training.protocols || [];
  
  if (protocols.length === 0){
    list.append(`<div class="alert alert-info">No protocols configured.</div>`);
    return;
  }
  
  protocols.forEach((protocol) => {
    const btn = $(`
      <button class="btn btn-light w-100 text-start mb-2" style="border-radius:18px;">
        <b>${escapeHtml(protocol.title)}</b>
        <div class="small text-muted">${escapeHtml(protocol.indications || "")}</div>
      </button>
    `);
    
    btn.on("click", () => openProtocol(protocol));
    list.append(btn);
  });
}

function openProtocol(protocol){
  $("#protocolTitle").text(protocol.title);
  $("#protocolIndications").text(protocol.indications || "");
  
  let stepsHtml = "<ol>";
  (protocol.keySteps || []).forEach(step => {
    stepsHtml += `<li>${escapeHtml(step)}</li>`;
  });
  stepsHtml += "</ol>";
  $("#protocolSteps").html(stepsHtml);
  
  let medsHtml = "<ul>";
  (protocol.medications || []).forEach(med => {
    medsHtml += `<li>${escapeHtml(med)}</li>`;
  });
  medsHtml += "</ul>";
  $("#protocolMeds").html(medsHtml);
  
  new bootstrap.Modal(document.getElementById("protocolModal")).show();
}

function openAddCertification(){
  $("#certName").val("");
  $("#certIssueDate").val("");
  $("#certExpirationDate").val("");
  $("#certNumber").val("");
  
  new bootstrap.Modal(document.getElementById("addCertModal")).show();
}

function confirmAddCertification(cfg){
  const s = getSession();
  const name = $("#certName").val().trim();
  const issueDate = $("#certIssueDate").val();
  const expirationDate = $("#certExpirationDate").val();
  const certNumber = $("#certNumber").val().trim();
  
  if (!name){
    toast("Missing Info", "Please enter certification name.");
    return;
  }
  
  const training = cfg.training || {};
  const userCerts = training.userCertifications || {};
  const myCerts = userCerts[s.user] || [];
  
  myCerts.push({
    name,
    issueDate,
    expirationDate,
    certNumber
  });
  
  userCerts[s.user] = myCerts;
  training.userCertifications = userCerts;
  cfg.training = training;
  saveConfig(cfg);
  
  addLog("Add Certification", `${name} - Expires: ${expirationDate || "N/A"}`);
  toast("Certification Added", name);
  
  bootstrap.Modal.getInstance(document.getElementById("addCertModal")).hide();
  renderTraining(cfg);
}

function openAddTraining(){
  $("#trainingTopic").val("");
  $("#trainingDate").val(new Date().toISOString().slice(0, 10));
  $("#trainingHours").val("");
  $("#trainingInstructor").val("");
  $("#trainingNotes").val("");
  
  new bootstrap.Modal(document.getElementById("addTrainingModal")).show();
}

function confirmAddTraining(cfg){
  const s = getSession();
  const topic = $("#trainingTopic").val().trim();
  const date = $("#trainingDate").val();
  const hours = $("#trainingHours").val();
  const instructor = $("#trainingInstructor").val().trim();
  const notes = $("#trainingNotes").val().trim();
  
  if (!topic){
    toast("Missing Info", "Please enter training topic.");
    return;
  }
  
  const training = cfg.training || {};
  const trainingRecords = training.trainingRecords || [];
  
  trainingRecords.push({
    user: s.user,
    topic,
    date,
    hours: parseFloat(hours) || 0,
    instructor,
    notes
  });
  
  training.trainingRecords = trainingRecords;
  cfg.training = training;
  saveConfig(cfg);
  
  addLog("Add Training Record", `${topic} - ${hours || 0} hours`);
  toast("Training Record Added", topic);
  
  bootstrap.Modal.getInstance(document.getElementById("addTrainingModal")).hide();
  renderTraining(cfg);
}
