const STORAGE_KEYS = {
  config: "mc_config_v1",
  session: "mc_session_v1",
  logs: "mc_logs_v1",
  checks: "mc_checks_v1"
};

const DEFAULT_CONFIG = {
  meta: { configVersion:"1.0.0", appSuiteName:"MedChecks Suite", lastUpdated: new Date().toISOString() },
  apps: [
    { id:"medchecks", name:"MedChecks", modeKey:"MedChecks", theme:{ bodyClass:"mode-med", accent:"seafoam" } },
    { id:"supplychecks", name:"SupplyChecks", modeKey:"SupplyChecks", theme:{ bodyClass:"mode-supply", accent:"red" } }
  ],
  roles: [
    { id:"EMT", label:"EMT", canCheckoutMeds:true, canCheckoutNarcotics:false, canWasteNarcotics:false, canAdminService:false, canAdminSystem:false },
    { id:"AEMT", label:"AEMT", canCheckoutMeds:true, canCheckoutNarcotics:false, canWasteNarcotics:false, canAdminService:false, canAdminSystem:false },
    { id:"Paramedic", label:"Paramedic", canCheckoutMeds:true, canCheckoutNarcotics:true, canWasteNarcotics:true, canAdminService:false, canAdminSystem:false },
    { id:"ServiceAdmin", label:"Service Admin", canCheckoutMeds:true, canCheckoutNarcotics:true, canWasteNarcotics:true, canAdminService:true, canAdminSystem:false },
    { id:"SystemAdmin", label:"System Admin", canCheckoutMeds:true, canCheckoutNarcotics:true, canWasteNarcotics:true, canAdminService:true, canAdminSystem:true }
  ],
  users: [
    { username:"user",  password:"user",  display:"Demo EMT", roleId:"EMT" },
    { username:"aemt",  password:"aemt",  display:"Demo AEMT", roleId:"AEMT" },
    { username:"medic", password:"medic", display:"Demo Paramedic", roleId:"Paramedic" },
    { username:"svc",   password:"svc",   display:"Demo Service Admin", roleId:"ServiceAdmin" },
    { username:"admin", password:"admin", display:"Demo System Admin", roleId:"SystemAdmin" }
  ],
  services: [
    {
      id:"MC1", label:"MC1",
      locations:[
        { id:"mc1-medbox", label:"MC1 Medication Box", category:"med" },
        { id:"mc1-narc",   label:"MC1 Narcotics", category:"med" },
        { id:"sr-mc1",     label:"Supply Room (MC1)", category:"sup" },
        { id:"mc1-jump",   label:"MC1 Jump Kit", category:"sup" },
        { id:"mc1-equip",  label:"MC1 Equipment Check", category:"equip" }
      ],
      scheduledChecks:[
        { idTemplate:"chk-mc1-medbox-{daily}", label:"Daily: MC1 Medication Box", cadence:"daily", locationId:"mc1-medbox", category:"med" },
        { idTemplate:"chk-mc1-jump-{daily}",   label:"Daily: MC1 Jump Kit", cadence:"daily", locationId:"mc1-jump", category:"sup" },
        { idTemplate:"chk-sr-mc1-{monthly}",   label:"Monthly: Supply Room (MC1)", cadence:"monthly", locationId:"sr-mc1", category:"sup" },
        { idTemplate:"chk-mc1-equip-{daily}",  label:"Daily: MC1 Equipment", cadence:"daily", locationId:"mc1-equip", category:"equip" }
      ]
    },
    {
      id:"Lisbon", label:"Lisbon",
      locations:[
        { id:"u42-obo",  label:"Unit 42 Out of Box (Meds)", category:"med" },
        { id:"u42-narc", label:"Unit 42 Narcotic Box", category:"med" },
        { id:"u43-obo",  label:"Unit 43 Out of Box (Meds)", category:"med" },
        { id:"u43-narc", label:"Unit 43 Narcotic Box", category:"med" },
        { id:"sr-lisbon", label:"Supply Room (Lisbon)", category:"sup" },
        { id:"u42-jump",  label:"Unit 42 Jump Kit", category:"sup" },
        { id:"u42-cab",   label:"Unit 42 Cabinet", category:"sup" },
        { id:"u42-equip", label:"Unit 42 Equipment", category:"equip" },
        { id:"u43-equip", label:"Unit 43 Equipment", category:"equip" }
      ],
      scheduledChecks:[
        { idTemplate:"chk-u42-obo-{daily}", label:"Daily: Unit 42 Out of Box", cadence:"daily", locationId:"u42-obo", category:"med" },
        { idTemplate:"chk-u43-obo-{daily}", label:"Daily: Unit 43 Out of Box", cadence:"daily", locationId:"u43-obo", category:"med" },
        { idTemplate:"chk-u42-jump-{daily}", label:"Daily: Unit 42 Jump Kit", cadence:"daily", locationId:"u42-jump", category:"sup" },
        { idTemplate:"chk-u42-cab-{daily}",  label:"Daily: Unit 42 Cabinet", cadence:"daily", locationId:"u42-cab", category:"sup" },
        { idTemplate:"chk-sr-lisbon-{monthly}", label:"Monthly: Supply Room (Lisbon)", cadence:"monthly", locationId:"sr-lisbon", category:"sup" },
        { idTemplate:"chk-u42-equip-{daily}", label:"Daily: Unit 42 Equipment", cadence:"daily", locationId:"u42-equip", category:"equip" },
        { idTemplate:"chk-u43-equip-{daily}", label:"Daily: Unit 43 Equipment", cadence:"daily", locationId:"u43-equip", category:"equip" }
      ]
    }
  ],
  master:{
    meds:[
      { name:"Aspirin", defaultDose:"324 mg PO", isNarcotic:false, notes:"chewable", expirationDate:"2026-12-31" },
      { name:"Nitroglycerin", defaultDose:"0.4 mg SL", isNarcotic:false, notes:"per protocol/contraindications", expirationDate:"2026-03-15" },
      { name:"Ondansetron", defaultDose:"4 mg IV/ODT", isNarcotic:false, notes:"n/v", expirationDate:"2027-01-20" },
      { name:"Dextrose (D10)", defaultDose:"100–250 mL IV", isNarcotic:false, notes:"hypoglycemia", expirationDate:"2026-11-10" },
      { name:"Glucagon", defaultDose:"1 mg IM", isNarcotic:false, notes:"no IV access", expirationDate:"2026-04-05" },
      { name:"Epinephrine 1:10,000", defaultDose:"1 mg IV/IO", isNarcotic:false, notes:"arrest", expirationDate:"2026-02-28" },
      { name:"Epinephrine 1:1,000", defaultDose:"0.3 mg IM", isNarcotic:false, notes:"anaphylaxis", expirationDate:"2026-03-10" },
      { name:"Albuterol", defaultDose:"2.5 mg neb", isNarcotic:false, notes:"bronchospasm", expirationDate:"2027-02-15" },
      { name:"Naloxone", defaultDose:"0.4–2 mg IN/IV", isNarcotic:false, notes:"overdose", expirationDate:"2026-12-20" },
      { name:"Amiodarone", defaultDose:"300 mg IV/IO", isNarcotic:false, notes:"cardiac arrhythmias", expirationDate:"2027-03-01" },
      { name:"Adenosine", defaultDose:"6 mg rapid IV", isNarcotic:false, notes:"SVT conversion", expirationDate:"2026-05-18" },
      { name:"Atropine", defaultDose:"0.5–1 mg IV/IO", isNarcotic:false, notes:"bradycardia", expirationDate:"2026-08-25" },
      { name:"Diphenhydramine", defaultDose:"25–50 mg IV/IM", isNarcotic:false, notes:"allergic reaction", expirationDate:"2027-01-10" },
      { name:"Lidocaine", defaultDose:"1–1.5 mg/kg IV", isNarcotic:false, notes:"ventricular arrhythmias", expirationDate:"2026-10-30" },
      { name:"Magnesium Sulfate", defaultDose:"2 g IV", isNarcotic:false, notes:"torsades, asthma", expirationDate:"2026-09-15" },
      { name:"Calcium Chloride", defaultDose:"500 mg–1 g IV", isNarcotic:false, notes:"hyperkalemia, hypocalcemia", expirationDate:"2027-02-20" },
      { name:"Sodium Bicarbonate", defaultDose:"1 mEq/kg IV", isNarcotic:false, notes:"metabolic acidosis", expirationDate:"2026-07-08" },
      { name:"Ipratropium", defaultDose:"0.5 mg neb", isNarcotic:false, notes:"bronchodilation", expirationDate:"2026-11-22" },
      { name:"Methylprednisolone", defaultDose:"125 mg IV", isNarcotic:false, notes:"inflammation, asthma", expirationDate:"2026-06-14" },
      { name:"Dopamine", defaultDose:"5–20 mcg/kg/min", isNarcotic:false, notes:"hypotension infusion", expirationDate:"2026-04-20" },
      { name:"Normal Saline 1000mL", defaultDose:"1 L IV", isNarcotic:false, notes:"fluid resuscitation", expirationDate:"2028-01-01" },
      { name:"Lactated Ringers 1000mL", defaultDose:"1 L IV", isNarcotic:false, notes:"fluid resuscitation", expirationDate:"2028-01-01" },
      { name:"Tranexamic Acid (TXA)", defaultDose:"1 g IV", isNarcotic:false, notes:"hemorrhage control", expirationDate:"2026-03-25" },
      { name:"Fentanyl", defaultDose:"25–100 mcg IV/IN", isNarcotic:true, deaSchedule:"II", notes:"pain", quantity:2, lotNumber:"FEN2024-A", expirationDate:"2026-08-15" },
      { name:"Morphine", defaultDose:"2–10 mg IV", isNarcotic:true, deaSchedule:"II", notes:"pain", quantity:2, lotNumber:"MOR2024-B", expirationDate:"2026-09-20" },
      { name:"Ketamine", defaultDose:"0.2–0.5 mg/kg IV", isNarcotic:true, deaSchedule:"III", notes:"pain, sedation", quantity:2, lotNumber:"KET2024-C", expirationDate:"2026-07-10" },
      { name:"Midazolam", defaultDose:"2–5 mg IV/IN", isNarcotic:true, deaSchedule:"IV", notes:"seizure, sedation", quantity:3, lotNumber:"MID2024-D", expirationDate:"2026-10-05" },
      { name:"Lorazepam", defaultDose:"2–4 mg IV/IM", isNarcotic:true, deaSchedule:"IV", notes:"seizure, anxiety", quantity:2, lotNumber:"LOR2024-E", expirationDate:"2026-06-25" },
      { name:"Diazepam", defaultDose:"5–10 mg IV", isNarcotic:true, deaSchedule:"IV", notes:"seizure, muscle relaxant", quantity:2, lotNumber:"DIA2024-F", expirationDate:"2026-11-15" }
    ],
    supplies:[
      { name:"O2 Nasal Cannula", par:"10", notes:"adult", expirationDate:"2029-12-31" },
      { name:"O2 Non-Rebreather Mask", par:"6", notes:"adult", expirationDate:"2029-12-31" },
      { name:"BVM Adult", par:"2", notes:"add PEEP if available", expirationDate:"2028-06-30" },
      { name:"OPA assorted", par:"1 set", notes:"sizes", expirationDate:"2030-01-01" },
      { name:"NPA assorted", par:"1 set", notes:"with lube", expirationDate:"2030-01-01" },
      { name:"Suction Yankauer", par:"4", notes:"disposable", expirationDate:"2029-08-15" },
      { name:"IV Start Kit", par:"10", notes:"tourniquet/CHG/tape", expirationDate:"2027-03-20" },
      { name:"18ga IV Catheter", par:"10", notes:"", expirationDate:"2028-12-31" },
      { name:"20ga IV Catheter", par:"10", notes:"", expirationDate:"2028-12-31" },
      { name:"Saline Flush (10mL)", par:"20", notes:"", expirationDate:"2027-06-30" },
      { name:"0.9% NS 1L", par:"6", notes:"fluids", expirationDate:"2028-01-01" },
      { name:"4x4 Gauze", par:"20", notes:"", expirationDate:"2029-12-31" },
      { name:"ABD Pad", par:"10", notes:"", expirationDate:"2029-12-31" },
      { name:"Coban", par:"10", notes:"", expirationDate:"2029-12-31" },
      { name:"Trauma Shears", par:"2", notes:"", expirationDate:"2035-01-01" },
      { name:"BP Cuff Adult", par:"1", notes:"", expirationDate:"2030-01-01" },
      { name:"King/iGel Airway", par:"1 set", notes:"supraglottic airways", expirationDate:"2028-06-30" },
      { name:"ET Tubes assorted", par:"1 set", notes:"2.5-8.0mm", expirationDate:"2028-12-31" },
      { name:"Capnography adapter", par:"4", notes:"end-tidal CO2", expirationDate:"2028-12-31" },
      { name:"IO Needle (EZ-IO)", par:"2", notes:"intraosseous access", expirationDate:"2027-09-30" },
      { name:"Chest Seal (Hyfin)", par:"4", notes:"occlusive dressing", expirationDate:"2027-12-31" },
      { name:"Tourniquet (CAT)", par:"4", notes:"extremity hemorrhage", expirationDate:"2030-01-01" },
      { name:"Hemostatic Gauze", par:"4", notes:"QuikClot or similar", expirationDate:"2027-08-15" },
      { name:"Pressure Bandage", par:"6", notes:"Israeli or similar", expirationDate:"2028-06-30" },
      { name:"SAM Splint", par:"4", notes:"moldable splint", expirationDate:"2035-01-01" },
      { name:"Traction Splint", par:"1", notes:"femur fracture", expirationDate:"2030-01-01" },
      { name:"Burn Sheet (sterile)", par:"2", notes:"sterile water gel", expirationDate:"2027-10-31" },
      { name:"Emergency Blanket", par:"4", notes:"hypothermia prevention", expirationDate:"2035-01-01" },
      { name:"Sharps Container", par:"1", notes:"needle disposal", expirationDate:"2035-01-01" },
      { name:"Medication Lock", par:"10", notes:"saline lock", expirationDate:"2028-12-31" },
      { name:"Blood Glucose Monitor", par:"1", notes:"with strips", expirationDate:"2027-04-30" },
      { name:"12-Lead ECG Cables", par:"1", notes:"cardiac monitoring", expirationDate:"2030-01-01" },
      { name:"Pediatric BVM", par:"1", notes:"infant/child", expirationDate:"2028-06-30" },
      { name:"Peds NRB", par:"4", notes:"pediatric mask", expirationDate:"2029-12-31" },
      { name:"Cold Pack (instant)", par:"6", notes:"activated cold pack", expirationDate:"2027-12-31" },
      { name:"OB Kit", par:"2", notes:"emergency delivery", expirationDate:"2028-03-31" }
    ],
    equipment: [
      { name:"Cardiac Monitor/Defib", checkType:"equipment", notes:"power on, pads, cables, battery" },
      { name:"Suction Unit", checkType:"equipment", notes:"power on, tubing, adequate suction" },
      { name:"Pulse Oximeter", checkType:"equipment", notes:"power on, waveform" },
      { name:"Glucometer", checkType:"equipment", notes:"power on, strips not expired" },
      { name:"Portable Radio", checkType:"equipment", notes:"power on, channels clear" },
      { name:"Stretcher", checkType:"equipment", notes:"functions, straps, wheels lock" },
      { name:"Stair Chair", checkType:"equipment", notes:"functions, straps" }
    ]
  },
  scenarios:[
    { id:"morningTruckCheck", label:"Morning Truck Check", tag:"Truck", meta:"Full unit checkout: meds + supplies + equipment", requiresLogin:true },
    { id:"createIncident", label:"Create an incident", tag:"PDF", meta:"Select items used + export PDF", requiresLogin:true },
    { id:"scanItem", label:"Scan an item", tag:"QR", meta:"Scan to add to checklist/incident", requiresLogin:true },
    { id:"checkoutMeds", label:"Check out meds", tag:"Med", meta:"Role-based checkout (narcotics only for Paramedic+)", requiresLogin:true },
    { id:"wasteMeds", label:"Waste meds", tag:"Med", meta:"Narcotics require witness Paramedic", requiresLogin:true },
    { id:"runTodaysCheck", label:"Run today's check", tag:"Checklist", meta:"Launch a scheduled check due today", requiresLogin:true },
    { id:"stockSupplies", label:"Stock supplies", tag:"Supply", meta:"Prototype stock action (log entry)", requiresLogin:true },
    { id:"transferItems", label:"Transfer items", tag:"Inventory", meta:"Prototype transfer action (log entry)", requiresLogin:true },
    { id:"reportDiscrepancy", label:"Report discrepancy", tag:"Report", meta:"Missing/damaged/expired", requiresLogin:true },
    { id:"searchLogs", label:"Search logs", tag:"Log", meta:"Search local logs by keyword", requiresLogin:true },
    { id:"narcShiftCount", label:"Narcotic Shift Count", tag:"DEA", meta:"Dual-provider shift change count", requiresLogin:true },
    { id:"narcTransfer", label:"Transfer Narcotic Custody", tag:"DEA", meta:"Chain of custody documentation", requiresLogin:true },
    { id:"checkExpirations", label:"Check Expirations", tag:"Report", meta:"Items expiring within 30/60/90 days", requiresLogin:true }
  ],
  reports:[
    { id:"history", label:"History", tag:"Log", meta:"View recent actions" },
    { id:"searchLogs", label:"Search logs", tag:"Log", meta:"Filter by keywords" },
    { id:"reportDiscrepancy", label:"Report discrepancy", tag:"Report", meta:"Create a discrepancy record" },
    { id:"expirationReport", label:"Expiration Report", tag:"Report", meta:"Items expiring soon" },
    { id:"parLevelReport", label:"Par Level Report", tag:"Inventory", meta:"Items below par levels" },
    { id:"complianceReport", label:"Compliance Summary", tag:"Analytics", meta:"Check completion rates" }
  ],
  docs:{
    login:{ title:"Login (Prototype)", subtitle:"Demo accounts and role assignment",
      html:`<p>This is a <b>concept prototype</b> (no security). Demo users:</p>
      <ul>
        <li><b>user/user</b> → EMT</li>
        <li><b>aemt/aemt</b> → AEMT</li>
        <li><b>medic/medic</b> → Paramedic</li>
        <li><b>svc/svc</b> → Service Admin</li>
        <li><b>admin/admin</b> → System Admin</li>
      </ul>
      <p>After login, you must select a <b>Service</b> (MC1 vs Lisbon).</p>` },
    servicePicker:{ title:"Service Selection", subtitle:"MC1 vs Lisbon changes locations",
      html:`<ul>
        <li><b>Lisbon</b>: Units 42/43 + Lisbon supply room</li>
        <li><b>MC1</b>: MC1 supply room, MC1 jump kit, MC1 med box, MC1 narcotics</li>
      </ul>` },
    roles:{ title:"Roles & Medication Controls", subtitle:"Role-based permissions",
      html:`<ul>
        <li><b>EMT / AEMT</b>: can check out non-narcotic meds</li>
        <li><b>Paramedic</b>: can check out narcotics</li>
        <li><b>Narcotic waste</b>: requires <b>witness Paramedic</b></li>
        <li><b>Service Admin</b>: manages service lists/settings</li>
        <li><b>System Admin</b>: edits global JSON config + creates new app variants</li>
      </ul>` },
    dashboard:{ title:"Dashboard", subtitle:"Locations and checks",
      html:`<p>Shows locations filtered by <b>Service</b> and <b>Mode</b> (MedChecks vs SupplyChecks).</p>` },
    scheduledChecks:{ title:"Scheduled Checks", subtitle:"Daily/Monthly checklists",
      html:`<p>Scheduled checks open real checklists. Saving marks the scheduled check done for the day/month.</p>` },
    iwant:{ title:"I want to…", subtitle:"Scenario shortcuts",
      html:`<p>Shortcut workflows like incident PDF export, QR scan, and discrepancy reporting.</p>` },
    reports:{ title:"Reports & Logs", subtitle:"Local demo reporting",
      html:`<p>All actions write to a local activity log (browser storage).</p>` },
    serviceAdmin:{ title:"Service Admin", subtitle:"Manage service settings",
      html:`<p>Edit master lists + service locations via JSON. Stored locally in this prototype.</p>` },
    systemAdmin:{ title:"System Admin", subtitle:"Global configuration + new app variants",
      html:`<p>Edit the entire JSON config and re-render the UI.</p>` }
  },
  training: {
    certifications: [
      { name:"CPR/BLS", renewalPeriod:"2 years" },
      { name:"ACLS", renewalPeriod:"2 years" },
      { name:"PALS", renewalPeriod:"2 years" },
      { name:"PHTLS", renewalPeriod:"4 years" },
      { name:"NR-EMT", renewalPeriod:"2 years" },
      { name:"NR-Paramedic", renewalPeriod:"2 years" },
      { name:"State EMT License", renewalPeriod:"varies" },
      { name:"State Paramedic License", renewalPeriod:"varies" }
    ],
    skills: [
      { name:"IV Insertion", description:"Peripheral IV access" },
      { name:"IO Insertion", description:"Intraosseous access" },
      { name:"Endotracheal Intubation", description:"Advanced airway management" },
      { name:"Supraglottic Airway", description:"King/iGel placement" },
      { name:"12-Lead ECG", description:"Acquisition and interpretation" },
      { name:"Medication Administration", description:"IV/IM/IN routes" },
      { name:"Narcotic Checkout/Waste", description:"DEA controlled substance handling" },
      { name:"Cardiac Arrest Management", description:"ACLS algorithm" },
      { name:"Pediatric Assessment", description:"Peds patient care" },
      { name:"Obstetric Emergencies", description:"Emergency delivery" }
    ],
    protocols: [
      { 
        title:"Chest Pain / Acute Coronary Syndrome",
        indications:"Chest pain, discomfort, pressure, or MI equivalent symptoms",
        keySteps:[
          "Oxygen if SpO2 < 94%",
          "Aspirin 324 mg PO (chewable)",
          "Nitroglycerin 0.4 mg SL (if no contraindications)",
          "12-Lead ECG",
          "IV access",
          "Monitor vital signs and cardiac rhythm"
        ],
        medications:["Aspirin 324 mg", "Nitroglycerin 0.4 mg SL", "Morphine 2-4 mg IV (if needed)"]
      },
      {
        title:"Stroke / CVA",
        indications:"Sudden neurological deficit, facial droop, arm drift, speech difficulty",
        keySteps:[
          "Establish time of symptom onset (critical for treatment)",
          "Cincinnati Stroke Scale or FAST assessment",
          "Blood glucose check",
          "Oxygen if SpO2 < 94%",
          "IV access",
          "Notify receiving facility - potential stroke alert",
          "Rapid transport"
        ],
        medications:["No routine medications; supportive care"]
      },
      {
        title:"Cardiac Arrest (ACLS)",
        indications:"Unresponsive, not breathing, no pulse",
        keySteps:[
          "Begin high-quality CPR immediately",
          "Apply AED/monitor and analyze rhythm",
          "Defibrillate if shockable rhythm (VF/pVT)",
          "Establish airway (BVM → SGA → ETT)",
          "IV/IO access",
          "Epinephrine 1 mg IV/IO every 3-5 minutes",
          "Amiodarone 300 mg IV/IO for refractory VF/pVT",
          "Treat reversible causes (Hs and Ts)"
        ],
        medications:["Epinephrine 1 mg IV/IO", "Amiodarone 300 mg IV/IO", "Atropine (PEA/Asystole - optional)"]
      },
      {
        title:"Anaphylaxis",
        indications:"Severe allergic reaction with respiratory distress, hypotension, or angioedema",
        keySteps:[
          "Epinephrine 0.3 mg IM (1:1,000) immediately",
          "Oxygen high-flow",
          "Albuterol 2.5 mg neb if bronchospasm",
          "IV access",
          "Diphenhydramine 25-50 mg IV/IM",
          "Consider second dose Epi if no improvement in 5 minutes"
        ],
        medications:["Epinephrine 1:1,000 IM", "Albuterol neb", "Diphenhydramine 25-50 mg"]
      },
      {
        title:"Respiratory Distress",
        indications:"Shortness of breath, dyspnea, wheezing, stridor",
        keySteps:[
          "Position of comfort (usually upright)",
          "Oxygen to maintain SpO2 ≥ 94%",
          "Assess lung sounds and work of breathing",
          "Albuterol 2.5 mg neb if bronchospasm",
          "Consider Ipratropium with Albuterol",
          "CPAP if indicated (CHF, COPD)",
          "IV access"
        ],
        medications:["Albuterol 2.5 mg neb", "Ipratropium 0.5 mg neb", "Nitroglycerin if CHF"]
      },
      {
        title:"Trauma / Major Bleeding",
        indications:"Significant trauma, hemorrhage, shock",
        keySteps:[
          "Scene safety and BSI",
          "Control life-threatening bleeding (tourniquets, hemostatic agents)",
          "C-spine precautions if indicated",
          "Oxygen high-flow",
          "Treat for shock (IV fluid resuscitation)",
          "Rapid transport to trauma center",
          "Consider TXA if significant hemorrhage"
        ],
        medications:["TXA 1 g IV (if significant hemorrhage)", "Pain management (Fentanyl, Ketamine)"]
      }
    ],
    userCertifications: {},
    userSkills: {},
    trainingRecords: []
  },
  bulletins: [
    { id:1, date:"2026-02-10", author:"Chief Smith", title:"New STEMI Protocol Update", content:"Effective immediately, all STEMI patients should receive 12-lead ECG within 10 minutes of patient contact. Update your protocols.", priority:"high" },
    { id:2, date:"2026-02-08", author:"Training Office", title:"Upcoming ACLS Recertification", content:"ACLS recertification sessions scheduled for March 15-17. Sign up in the training office.", priority:"normal" },
    { id:3, date:"2026-02-05", author:"Fleet Manager", title:"Vehicle Maintenance Schedule", content:"Unit 42 scheduled for PM service Feb 20. Unit 43 scheduled for Feb 22.", priority:"normal" }
  ]
};
