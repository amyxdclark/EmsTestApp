# Feature Testing Guide

## New Scenarios Added to "I want to..." Menu

### 1. Partial Dose Waste
**Location**: "I want to..." → "Partial Dose Waste" (DEA tag)

**What it does**:
- Opens a medication picker showing only narcotic medications
- User selects medication (e.g., Fentanyl, Morphine)
- Modal opens with fields for:
  - Total amount in vial
  - Amount administered to patient
  - Amount wasted
  - Waste method (Sink, Sharps Container, Other)
  - Lot number (optional)
  - Witness credentials (required)

**Validation**:
- ✅ Ensures "Administered + Wasted = Total" (with 0.01 tolerance)
- ✅ Requires all fields to be filled
- ✅ Requires valid Paramedic witness credentials
- ✅ Prevents same person as provider and witness

**Output**:
- Log entry: "Partial Dose Waste: Med: Fentanyl, Total: 100 mcg, Administered: 75 mcg, Wasted: 25 mcg..."
- PDF export: `PartialWaste_Fentanyl_{timestamp}.pdf` with signature lines

**Example Use Case**:
Patient received 75mcg of Fentanyl from a 100mcg vial. The remaining 25mcg must be wasted with proper documentation.

---

### 2. Return Items to Stock
**Location**: "I want to..." → "Return Items to Stock" (Inventory tag)

**What it does**:
- Opens modal with item picker
- User adds items to return (meds, supplies, or equipment)
- User enters reason for return
- For narcotic returns, witness credentials are required

**Validation**:
- ✅ Requires at least one item
- ✅ Requires reason text
- ✅ Requires Paramedic witness for narcotic returns

**Output**:
- Log entry: "Return to Stock: 3 items: Aspirin (324 mg PO), Epinephrine 1:1000 (0.3 mg IM). Reason: Patient refusal"
- For narcotics: "...witness=medic"

**Example Use Cases**:
1. Patient refused medication before administration
2. Incident was cancelled and items need to be returned
3. Accidental checkout that needs to be corrected
4. Transfer error correction

---

### 3. Void Checkout
**Location**: "I want to..." → "Void Checkout" (Log tag)

**What it does**:
- Opens modal asking for transaction ID
- User enters the TX-xxxxx ID from the activity log
- User enters reason for voiding
- System validates transaction exists and isn't already voided

**Validation**:
- ✅ Transaction ID must exist in logs
- ✅ Transaction cannot already be voided
- ✅ Requires reason text

**Output**:
- Log entry: "Void Checkout: Voided transaction TX-1234567890-abc. Original: Checkout - 3 items... Reason: Duplicate entry"

**Example Use Cases**:
1. Duplicate checkout log entry
2. Wrong items were logged
3. Checkout was entered in error
4. Transaction needs to be marked as invalid for audit

**How to find Transaction ID**:
1. Go to Reports view
2. Look in activity log
3. Find the checkout entry to void
4. Copy the transaction ID (e.g., "TX-1707698765432-xyz")
5. Use that ID in the void modal

---

## Enhanced Existing Features

### All Checkout Operations Now Include:
1. **Confirmation Dialog**: "Check out X item(s) including Y narcotic(s)?"
2. **Transaction ID**: Each checkout gets unique ID like "TX-1707698765432-abc"
3. **Itemized Logs**: Full medication names and doses
4. **Toast Notification**: Shows transaction ID for reference

### All Waste Operations Now Include:
1. **Confirmation Dialog**: "Waste X item(s) including Y narcotic(s)?"
2. **Transaction ID**: Each waste gets unique ID
3. **Itemized Logs**: Full medication names and doses
4. **Witness Documentation**: For narcotics

### Incident Items Now:
1. **Auto-save to localStorage**: Items persist through page refresh
2. **Itemized in logs**: Full medication details in all logs
3. **Auto-clear**: Storage cleared after successful PDF export

---

## Testing Checklist

### Test Scenario 1: Partial Waste Math Validation
1. Login as medic/medic
2. Select service (MC1 or Lisbon)
3. Go to "I want to..." → "Partial Dose Waste"
4. Select "Fentanyl"
5. Enter: Total = "100 mcg", Administered = "60 mcg", Wasted = "30 mcg"
6. Expected: Error toast "Amounts don't add up... Currently 90"
7. Fix to: Wasted = "40 mcg"
8. Enter witness credentials: medic/medic (should fail - same person)
9. Enter different witness: admin/admin
10. Expected: Success, PDF download, log entry

### Test Scenario 2: Return to Stock
1. Go to "I want to..." → "Return Items to Stock"
2. Click "+ Add Item"
3. Select "Medications" → "Fentanyl" (narcotic)
4. Enter reason: "Patient refusal"
5. Try to submit (should require witness)
6. Enter witness: medic/medic
7. Expected: Success, log entry with witness

### Test Scenario 3: Void Checkout
1. Create a checkout (any items)
2. Note the transaction ID in the toast (e.g., "TX-123...")
3. Go to Reports view
4. Verify checkout appears in activity log
5. Go to "I want to..." → "Void Checkout"
6. Enter the transaction ID
7. Enter reason: "Testing void feature"
8. Expected: Success, new "Void Checkout" log entry

### Test Scenario 4: Confirmation Dialogs
1. Open any checklist
2. Mark an item as Done
3. Click "Check Out Selected"
4. Expected: Confirmation dialog appears
5. Click Cancel → Nothing happens
6. Click "Check Out Selected" again
7. Click OK → Checkout proceeds with transaction ID

### Test Scenario 5: Incident Persistence
1. Go to "I want to..." → "Create an incident"
2. Add several items to the incident
3. Refresh the browser (F5)
4. Go back to "I want to..." → "Create an incident"
5. Expected: Previous items are still there (restored from localStorage)

### Test Scenario 6: Witness Modal Cancellation
1. Open checklist
2. Mark narcotic item as Done
3. Click "Waste Selected"
4. Confirm the waste dialog
5. Witness modal appears
6. Click X or Cancel without entering credentials
7. Expected: Toast "Cancelled - Witness not provided"
8. No waste log entry created

---

## Log Examples

### Before (Old Format):
```
Checkout: 3 items (1 narcotics) • Daily: MC1 Medication Box
Waste: 2 items (1 narcotics, witness=medic) • Daily: MC1 Medication Box
```

### After (New Format with Transaction IDs and Details):
```
Checkout: 3 items (1 narcotics) • Daily: MC1 Medication Box: Fentanyl (50 mcg IV/IN), Aspirin (324 mg PO), Naloxone (2 mg IN) [TX-1707698765432-abc]

Waste: 2 items (1 narcotics, witness=medic) • Daily: MC1 Medication Box: Fentanyl (50 mcg IV/IN), Naloxone (2 mg IN) [TX-1707698800000-xyz]

Partial Dose Waste: Med: Morphine, Total: 10 mg, Administered: 6 mg, Wasted: 4 mg, Method: Sink, Lot: MOR2024-B, Witness: medic

Return to Stock: 2 items (witness=admin): Fentanyl (25-100 mcg IV/IN), Ketamine (0.2-0.5 mg/kg IV). Reason: Incident cancelled

Void Checkout: Voided transaction TX-1707698765432-abc. Original: Checkout - 3 items (1 narcotics)... Reason: Duplicate entry
```

---

## Common Questions

**Q: What happens if I close the witness modal without entering credentials?**
A: The operation is cancelled gracefully. You'll see a "Cancelled" toast and no log entry is created.

**Q: Can I void a waste transaction?**
A: Yes, the void checkout feature works for any transaction type. Just use the transaction ID from the log.

**Q: What if I enter the wrong amounts in partial waste?**
A: The system validates that Administered + Wasted = Total. You'll get an error message if they don't match.

**Q: Do transaction IDs have any special format?**
A: Yes: `TX-{timestamp}-{random}` format, e.g., "TX-1707698765432-abc123"

**Q: Are incident items really saved if I refresh?**
A: Yes! They're stored in localStorage under key `mc_incident_items_v1` and restored automatically.

**Q: What happens to incident storage after I export the PDF?**
A: The storage is automatically cleared after a successful PDF export to start fresh for the next incident.
