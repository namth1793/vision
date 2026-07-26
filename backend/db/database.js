const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// On Railway, RAILWAY_ENVIRONMENT is set automatically — mount volume at /app/data
const dataDir = process.env.DATA_DIR
  || (process.env.RAILWAY_ENVIRONMENT ? '/app/data' : path.join(__dirname, '..', 'data'));
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'vision.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    department TEXT,
    phone TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_no TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_country TEXT,
    product TEXT NOT NULL,
    quantity REAL,
    unit TEXT DEFAULT 'tấn',
    unit_price REAL,
    total_value REAL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'draft',
    seller_id INTEGER,
    broker_id INTEGER,
    sign_date TEXT,
    delivery_date TEXT,
    payment_terms TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (broker_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    contract_id INTEGER,
    type TEXT NOT NULL,
    product TEXT,
    quantity REAL,
    unit TEXT DEFAULT 'tấn',
    status TEXT DEFAULT 'pending',
    shipment_date TEXT,
    arrival_date TEXT,
    port_loading TEXT,
    port_discharge TEXT,
    vessel TEXT,
    bill_of_lading TEXT,
    freight REAL,
    freight_currency TEXT DEFAULT 'USD',
    notes TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS warehouse_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_no TEXT UNIQUE NOT NULL,
    order_id INTEGER,
    product TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT DEFAULT 'tấn',
    warehouse_location TEXT DEFAULT 'Kho ngoại quan Đà Nẵng',
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    party_name TEXT NOT NULL,
    party_country TEXT,
    original_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    due_date TEXT,
    status TEXT DEFAULT 'pending',
    contract_id INTEGER,
    notes TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS debt_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    debt_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_date TEXT NOT NULL,
    method TEXT DEFAULT 'bank_transfer',
    reference TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (debt_id) REFERENCES debts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    broker_id INTEGER NOT NULL,
    rate REAL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    payment_date TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    FOREIGN KEY (broker_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    category TEXT DEFAULT 'other',
    related_type TEXT,
    related_id INTEGER,
    uploader_id INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (uploader_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    color TEXT DEFAULT '#3b82f6'
  );

  CREATE TABLE IF NOT EXISTS pipeline_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    contract_id INTEGER,
    assigned_to INTEGER,
    priority TEXT DEFAULT 'medium',
    due_date TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id),
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    category TEXT DEFAULT 'other',
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'VND',
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    submitted_by INTEGER,
    approved_by INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    read INTEGER DEFAULT 0,
    link TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS trade_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Section 1: Contract Info
    staff TEXT,
    broker TEXT,
    year INTEGER,
    contract_no TEXT,
    contract_date TEXT,
    seller TEXT,
    buyer TEXT,
    status TEXT DEFAULT 'active',
    ship_date TEXT,
    qty REAL,
    origin TEXT,
    pol TEXT,
    lbs REAL,
    nut REAL,
    price REAL,
    retention REAL,
    double_penalty REAL,
    notes1 TEXT,
    -- Section 2: Payment
    advanced_payment REAL,
    second_payment REAL,
    final_settlement REAL,
    -- Section 3: Shipment / Bill of Lading
    line_loader TEXT,
    bl_number TEXT,
    eta_caimep TEXT,
    eta_hcm TEXT,
    eta_pod TEXT,
    notes2 TEXT,
    dhl_fedex_number TEXT,
    dhl_delivered TEXT,
    total_cont INTEGER,
    cont_size TEXT,
    bags TEXT,
    gw_bl REAL,
    nw_bl REAL,
    advanced_paid_bl REAL,
    -- Section 4: Quality Check
    date_unload TEXT,
    notes3 TEXT,
    certificate_no TEXT,
    date_certificate TEXT,
    nw_bw REAL,
    outturn_vina REAL,
    nutcount_vina REAL,
    outturn_claim_1to1 REAL,
    outturn_claim_1to2 REAL,
    -- Section 5: Settlement
    dem_det REAL,
    sto REAL,
    other_fee1 REAL,
    other_fee2 REAL,
    notes6 TEXT,
    -- Section 6: Commission
    commission_rate REAL,
    pay_on_behalf REAL,
    notes7 TEXT,
    fee_from_buyer REAL,
    -- Meta
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS buyers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_name TEXT NOT NULL,
    company_address TEXT,
    bank_details TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS import_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER,
    staff TEXT,
    vn_broker TEXT,
    agency TEXT,
    order_note TEXT,
    sale_contract TEXT,
    date TEXT,
    seller TEXT,
    buyer TEXT,
    status TEXT,
    shipment TEXT,
    quantity REAL,
    origin TEXT,
    pol TEXT,
    outturn REAL,
    nutcount REAL,
    moisture REAL,
    price REAL,
    pct1 REAL,
    pct2 REAL,
    pct3 REAL,
    double_penalty REAL,
    penalty_1to1 REAL,
    nutcount_penalty REAL,
    moisture_penalty REAL,
    advanced_payment REAL,
    payment_date1 TEXT,
    second_payment REAL,
    payment_date2 TEXT,
    final_settlement REAL,
    payment_date3 TEXT,
    line_loader TEXT,
    bl_number TEXT,
    eta_caimep TEXT,
    eta_hcm TEXT,
    eta_pod TEXT,
    notes_bill TEXT,
    dhl_fedex_number TEXT,
    dhl_delivered TEXT,
    total_cont TEXT,
    cont_size TEXT,
    total_bags REAL,
    gw_bl REAL,
    less_advance REAL,
    discount1 REAL,
    seller_invoice_amount REAL,
    notes_invoice TEXT,
    date_unload TEXT,
    notes_cert TEXT,
    certificate_no TEXT,
    date_certificate TEXT,
    nw_bw REAL,
    outturn_vina REAL,
    nutcount_vina REAL,
    moisture_vina REAL,
    dem_det REAL,
    sto REAL,
    other_fee1 REAL,
    other_fee2 REAL,
    debit_credit_input REAL,
    notes_final TEXT,
    commission1_usd_mt REAL,
    pay_on_behalf1 REAL,
    notes_comm1 TEXT,
    commission2_usd_mt REAL,
    pay_on_behalf2 REAL,
    notes_comm2 TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS export_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER,
    staff TEXT,
    vn_broker TEXT,
    order_note TEXT,
    lot_number REAL,
    sale_contract TEXT,
    date TEXT,
    status TEXT DEFAULT 'SIGNED',
    expiry_export_cert_turkey TEXT,
    seller TEXT,
    buyer1 TEXT,
    buyer2 TEXT,
    commodity TEXT,
    qty_commodity REAL,
    price REAL,
    shipment TEXT,
    packing TEXT,
    packing_ctn REAL,
    packing_unit TEXT DEFAULT 'kgs',
    ctn_cont REAL,
    quantity REAL,
    quantity_unit TEXT DEFAULT 'kgs',
    advance_payment REAL,
    payment_date1 TEXT,
    payment2 REAL,
    payment_date2 TEXT,
    payment3 REAL,
    payment_date3 TEXT,
    note_pay TEXT,
    market TEXT,
    crd TEXT,
    req_get_bkg TEXT,
    inspection_date TEXT,
    loading_date TEXT,
    supervisor TEXT,
    fwd TEXT,
    ocean_freight REAL,
    note_booking TEXT,
    pol TEXT,
    pod TEXT,
    shipping_line TEXT,
    etd TEXT,
    eta TEXT,
    bkg_details TEXT,
    container_seal TEXT,
    bl_bkg_freetime TEXT,
    seller_invoice_no TEXT,
    note_shipping TEXT,
    commodity2 TEXT,
    total_cont REAL,
    ctn2 REAL,
    gw_bl_lbs REAL,
    gw_bl_kgs REAL,
    nw_bl_lbs REAL,
    nw_bl_kgs REAL,
    nw_to_pay REAL,
    nw_to_pay_unit TEXT DEFAULT 'lbs',
    less_advance REAL,
    discount1 REAL,
    other_fee1 REAL,
    include_other_fee INTEGER DEFAULT 1,
    seller_invoice_amount REAL,
    note_invoice TEXT,
    ins_company TEXT,
    ins_fee REAL,
    pct_insured REAL,
    ins_rate REAL,
    ins_vat REAL,
    exchange_rate_usd_vnd REAL,
    ins_duration TEXT,
    ins_payment_date TEXT,
    note_ins TEXT,
    dhl_fedex_number TEXT,
    dhl_delivered TEXT,
    dhl_fee REAL,
    note_dhl TEXT,
    selling_price REAL,
    mark_up REAL,
    discount2 REAL,
    other_fee2 REAL,
    amount_buyer2_paid REAL,
    payment_date_buyer2 TEXT,
    cosmos_rate REAL,
    cosmos_payment_date TEXT,
    note_cos TEXT,
    commission_usd_lbs REAL,
    rate_exchange_vnd REAL,
    commission_payment_date TEXT,
    note_com TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bwh_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER,
    bwh TEXT,
    no TEXT,
    seller TEXT,
    bl TEXT,
    status TEXT DEFAULT 'CHƯA NHẬP KHO',
    eta_vung_tau TEXT,
    eta_hcm TEXT,
    total_cont TEXT,
    total_bags REAL,
    gross_weight REAL,
    net_weight REAL,
    origin TEXT,
    commodity TEXT,
    price_bwh_inventory REAL,
    inv_number TEXT,
    note_tt_kho TEXT,
    date_into_bwh TEXT,
    supervisor_in TEXT,
    gw_into_bwh REAL,
    nw_into_bwh REAL,
    note_into_bwh TEXT,
    date_out_bwh TEXT,
    supervisor_out TEXT,
    gw_out_bwh REAL,
    nw_out_bwh REAL,
    note_out_bwh TEXT,
    ins_company TEXT,
    ins_fee REAL,
    pct_insured REAL,
    ins_rate REAL,
    ins_vat REAL,
    exchange_rate REAL,
    ins_duration TEXT,
    ins_payment_date TEXT,
    note_ins TEXT,
    deposit REAL,
    deposit_payment_date TEXT,
    amount_paid REAL,
    amount_paid_date TEXT,
    note_pay_bwh TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    record_id INTEGER,
    contract_no TEXT,
    user_id INTEGER,
    user_name TEXT,
    user_role TEXT,
    summary TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ── NEW TABLES ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS company_banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER NOT NULL,
    bank_name TEXT,
    account_no TEXT,
    swift_bic TEXT,
    iban TEXT,
    bank_branch TEXT,
    bank_address TEXT,
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    is_primary INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS company_gpxk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER NOT NULL,
    country_type TEXT,
    cert_no TEXT,
    issue_date TEXT,
    expiry_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS import_bls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_record_id INTEGER NOT NULL,
    bl_seq INTEGER DEFAULT 1,
    shipping_line TEXT, loader TEXT, bl_number TEXT,
    eta_caimep TEXT, eta_hcm TEXT, eta_pod TEXT, notes_bill TEXT,
    dhl_fedex_number TEXT, dhl_delivered TEXT,
    total_cont TEXT, cont_size TEXT, total_bags REAL, gw_bl REAL, nw_bl REAL,
    less_advance REAL, discount1 REAL, bl_other_fee REAL,
    seller_invoice_amount REAL, notes_invoice TEXT,
    second_payment REAL, payment_date2 TEXT,
    final_settlement REAL, payment_date3 TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (import_record_id) REFERENCES import_records(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS export_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    export_record_id INTEGER NOT NULL,
    item_seq INTEGER DEFAULT 1,
    commodity TEXT,
    cont_count REAL,
    cont_type TEXT DEFAULT '20',
    ctn_cont REAL,
    packing_ctn REAL,
    packing_unit TEXT DEFAULT 'kgs',
    price REAL,
    price_unit TEXT DEFAULT 'USD/LB',
    quantity REAL,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (export_record_id) REFERENCES export_records(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS import_staff_bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_record_id INTEGER NOT NULL,
    bonus_seq INTEGER DEFAULT 1,
    rate_pct REAL,
    rate_exchange REAL,
    other_fee REAL,
    payment_date TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (import_record_id) REFERENCES import_records(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS export_staff_bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    export_record_id INTEGER NOT NULL,
    bonus_seq INTEGER DEFAULT 1,
    rate_pct REAL,
    rate_exchange REAL,
    other_fee REAL,
    payment_date TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (export_record_id) REFERENCES export_records(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS gpxk_turkey (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller TEXT NOT NULL,
    cert_no TEXT,
    expiry_date TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS commission_income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT DEFAULT 'export',
    sale_contract TEXT,
    lot_number TEXT,
    seller TEXT,
    agency TEXT,
    commodity TEXT,
    qty_contract REAL,
    qty_actual_nw REAL,
    rate REAL,
    rate_unit TEXT DEFAULT 'USD/MT',
    est_amount REAL,
    actual_amount REAL,
    received_1 REAL,
    date_1 TEXT,
    received_2 REAL,
    date_2 TEXT,
    received_3 REAL,
    date_3 TEXT,
    note TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS commission_expense (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT DEFAULT 'export',
    sale_contract TEXT,
    lot_number TEXT,
    vn_broker TEXT,
    commodity TEXT,
    qty_contract REAL,
    qty_actual_bl REAL,
    rate REAL,
    rate_unit TEXT DEFAULT 'USD/MT',
    est_amount REAL,
    actual_amount REAL,
    paid_1 REAL,
    date_1 TEXT,
    paid_2 REAL,
    date_2 TEXT,
    paid_3 REAL,
    date_3 TEXT,
    note TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

// Add new columns safely (ignored if already exist)
const addCol = (table, col, def) => { try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`) } catch {} }
addCol('expenses', 'bl_number', 'TEXT')
addCol('expenses', 'supervisor_name', 'TEXT')
addCol('expenses', 'company_warehouse', 'TEXT')
addCol('expenses', 'province_city', 'TEXT')
addCol('buyers', 'seller_name', 'TEXT')
addCol('buyers', 'company_vi', 'TEXT')
addCol('buyers', 'tax_code', 'TEXT')
addCol('export_records', 'cont_type', "TEXT DEFAULT '20'")
addCol('export_records', 'price_unit', "TEXT DEFAULT 'USD/LB'")
addCol('export_records', 'dhl_pay_to', 'TEXT')
addCol('export_records', 'dhl_payment_date', 'TEXT')
// Export: new fields
addCol('export_records', 'agency', 'TEXT')
addCol('export_records', 'pct1', 'REAL')
addCol('export_records', 'pct2', 'REAL')
addCol('export_records', 'pct3', 'REAL')
addCol('export_records', 'b2_advance_payment', 'REAL')
addCol('export_records', 'b2_pay_date1', 'TEXT')
addCol('export_records', 'b2_payment2', 'REAL')
addCol('export_records', 'b2_pay_date2', 'TEXT')
addCol('export_records', 'b2_payment3', 'REAL')
addCol('export_records', 'b2_pay_date3', 'TEXT')
addCol('export_records', 'b2_note_pay', 'TEXT')
addCol('export_records', 's_advance_payment', 'REAL')
addCol('export_records', 's_pay_date1', 'TEXT')
addCol('export_records', 's_payment2', 'REAL')
addCol('export_records', 's_pay_date2', 'TEXT')
addCol('export_records', 's_payment3', 'REAL')
addCol('export_records', 's_pay_date3', 'TEXT')
addCol('export_records', 's_note_pay', 'TEXT')
addCol('export_records', 'note_donghang', 'TEXT')
addCol('export_records', 'company_inspection', 'TEXT')
addCol('export_records', 'nw_to_pay_2', 'REAL')
addCol('export_records', 'nw_to_pay_2_unit', "TEXT DEFAULT 'lbs'")
addCol('export_records', 'less_prepayment2', 'REAL')
addCol('export_records', 'note_invoice2', 'TEXT')
addCol('export_records', 'cosmos_other_fee', 'REAL')
addCol('export_records', 'commission2_usd_lbs', 'REAL')
addCol('export_records', 'rate_exchange2_vnd', 'REAL')
addCol('export_records', 'commission2_payment_date', 'TEXT')
addCol('export_records', 'note_com2', 'TEXT')
addCol('export_records', 'commission_other_fee', 'REAL')
addCol('export_records', 'commission2_other_fee', 'REAL')
// Import: new fields
addCol('import_records', 'bl_seq', 'INTEGER DEFAULT 1')
addCol('import_records', 'bl_number_2', 'TEXT')
addCol('import_records', 'bl_number_3', 'TEXT')
addCol('import_records', 'note_pay', 'TEXT')
addCol('import_records', 'shipping_line', 'TEXT')
addCol('import_records', 'loader', 'TEXT')
// Buyers/companies: consolidated free-text company + bank info (replaces per-field entry)
addCol('buyers', 'company_info_en', 'TEXT')
addCol('buyers', 'company_info_vi', 'TEXT')
addCol('buyers', 'company_type', 'TEXT')
addCol('company_banks', 'bank_info', 'TEXT')
// Import: 1:2 penalty override + one-time migration guard for the
// double_penalty sign convention flip (was negative offset, now positive)
addCol('import_records', 'penalty_1to2', 'REAL')
addCol('import_records', 'double_penalty_sign_migrated', 'INTEGER DEFAULT 0')

// One-time (idempotent) backfill: fold old per-field buyer/bank data into the
// new consolidated text blobs so nothing already entered gets lost.
try {
  const oldBuyers = db.prepare(`
    SELECT id, buyer_name, company_address, company_vi, tax_code, email, phone
    FROM buyers WHERE company_info_en IS NULL OR company_info_en = ''
  `).all();
  const fillBuyerInfo = db.prepare('UPDATE buyers SET company_info_en=?, company_info_vi=? WHERE id=?');
  oldBuyers.forEach(b => {
    const en = [b.buyer_name, b.company_address, b.tax_code && `Tax code: ${b.tax_code}`, b.email, b.phone]
      .filter(Boolean).join('\n');
    const vi = b.company_vi || null;
    if (en || vi) fillBuyerInfo.run(en || null, vi, b.id);
  });

  const oldBanks = db.prepare(`
    SELECT id, bank_name, account_no, swift_bic, iban, bank_branch, bank_address, currency, notes
    FROM company_banks WHERE bank_info IS NULL OR bank_info = ''
  `).all();
  const fillBankInfo = db.prepare('UPDATE company_banks SET bank_info=? WHERE id=?');
  oldBanks.forEach(bk => {
    const info = [
      bk.bank_name && `Bank: ${bk.bank_name}`,
      bk.account_no && `Account No: ${bk.account_no}`,
      bk.swift_bic && `Swift/BIC: ${bk.swift_bic}`,
      bk.iban && `IBAN: ${bk.iban}`,
      bk.bank_branch && `Branch: ${bk.bank_branch}`,
      bk.bank_address && `Address: ${bk.bank_address}`,
      bk.currency && `Currency: ${bk.currency}`,
      bk.notes && `Notes: ${bk.notes}`,
    ].filter(Boolean).join('\n');
    if (info) fillBankInfo.run(info, bk.id);
  });
} catch (e) { /* backfill is best-effort, non-fatal */ }

// One-time (idempotent, guarded by double_penalty_sign_migrated): Double
// Penalty used to be entered as a negative offset; it's now entered as a
// positive "points below" number, so flip the sign on already-entered values.
try {
  db.prepare(`
    UPDATE import_records SET double_penalty = -double_penalty
    WHERE (double_penalty_sign_migrated IS NULL OR double_penalty_sign_migrated = 0)
      AND double_penalty IS NOT NULL AND double_penalty != 0
  `).run();
  db.prepare(`
    UPDATE import_records SET double_penalty_sign_migrated = 1
    WHERE double_penalty_sign_migrated IS NULL OR double_penalty_sign_migrated = 0
  `).run();
} catch (e) { /* non-fatal */ }

// One-time (idempotent): fold each import record's old flat BL/payment
// fields into a single import_bls row (BL #1) so existing data survives the
// move to a repeatable multi-BL structure. Only runs for records that don't
// have any import_bls rows yet.
try {
  const legacyImports = db.prepare(`
    SELECT id, shipping_line, loader, bl_number, eta_caimep, eta_hcm, eta_pod, notes_bill,
      dhl_fedex_number, dhl_delivered, total_cont, cont_size, total_bags, gw_bl,
      less_advance, discount1, seller_invoice_amount, notes_invoice,
      second_payment, payment_date2, final_settlement, payment_date3
    FROM import_records ir
    WHERE NOT EXISTS (SELECT 1 FROM import_bls b WHERE b.import_record_id = ir.id)
  `).all();
  const insertBl = db.prepare(`
    INSERT INTO import_bls (
      import_record_id, bl_seq, shipping_line, loader, bl_number, eta_caimep, eta_hcm, eta_pod, notes_bill,
      dhl_fedex_number, dhl_delivered, total_cont, cont_size, total_bags, gw_bl,
      less_advance, discount1, seller_invoice_amount, notes_invoice,
      second_payment, payment_date2, final_settlement, payment_date3
    ) VALUES (?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  legacyImports.forEach(r => {
    const hasAny = [r.bl_number, r.eta_caimep, r.gw_bl, r.second_payment, r.final_settlement].some(v => v != null && v !== '');
    if (!hasAny) return; // nothing to migrate — leave record with zero BLs
    insertBl.run(
      r.id, r.shipping_line, r.loader, r.bl_number, r.eta_caimep, r.eta_hcm, r.eta_pod, r.notes_bill,
      r.dhl_fedex_number, r.dhl_delivered, r.total_cont, r.cont_size, r.total_bags, r.gw_bl,
      r.less_advance, r.discount1, r.seller_invoice_amount, r.notes_invoice,
      r.second_payment, r.payment_date2, r.final_settlement, r.payment_date3
    );
  });
} catch (e) { /* non-fatal */ }

// One-time (idempotent): fold each export record's single commodity/qty/
// packing fields into an export_items row (item #1) so existing data
// survives the move to a repeatable multi-commodity/multi-price structure.
try {
  const legacyExports = db.prepare(`
    SELECT id, commodity, qty_commodity, cont_type, ctn_cont, packing_ctn, packing_unit, quantity, price, price_unit
    FROM export_records er
    WHERE NOT EXISTS (SELECT 1 FROM export_items ei WHERE ei.export_record_id = er.id)
  `).all();
  const insertItem = db.prepare(`
    INSERT INTO export_items (export_record_id, item_seq, commodity, cont_count, cont_type, ctn_cont, packing_ctn, packing_unit, price, price_unit, quantity)
    VALUES (?,1,?,?,?,?,?,?,?,?,?)
  `);
  legacyExports.forEach(r => {
    const hasAny = [r.commodity, r.qty_commodity, r.quantity, r.price].some(v => v != null && v !== '');
    if (!hasAny) return;
    insertItem.run(r.id, r.commodity, r.qty_commodity, r.cont_type, r.ctn_cont, r.packing_ctn, r.packing_unit, r.price, r.price_unit, r.quantity);
  });
} catch (e) { /* non-fatal */ }

module.exports = db;
