const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { buildTemplateBuffer, parseUploadBuffer, bulkUpsert } = require('../utils/excel');
const LABELS = require('../utils/labels').IMPORT_RECORDS;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Contract-level fields only — BL-specific fields (shipping/ETA/GW/NW/discount/
// other fee/2nd payment/final settlement) live per-row in import_bls, since a
// contract can be shipped across multiple BLs.
const FIELDS = [
  'year','staff','vn_broker','agency','order_note','sale_contract','date',
  'seller','buyer','status',
  'shipment','quantity','origin','pol',
  'outturn','nutcount','moisture','price',
  'pct1','pct2','pct3','double_penalty','penalty_1to1','penalty_1to2','nutcount_penalty','moisture_penalty',
  'advanced_payment','payment_date1','note_pay',
  'date_unload','notes_cert','certificate_no','date_certificate','nw_bw',
  'outturn_vina','nutcount_vina','moisture_vina',
  'dem_det','sto','other_fee1','other_fee2',
  'debit_credit_input','notes_final',
  'commission1_usd_mt','pay_on_behalf1','notes_comm1',
  'commission2_usd_mt','pay_on_behalf2','notes_comm2',
];

const BL_FIELDS = [
  'shipping_line','loader','bl_number','eta_caimep','eta_hcm','eta_pod','notes_bill',
  'dhl_fedex_number','dhl_delivered','total_cont','cont_size','total_bags','gw_bl','nw_bl',
  'less_advance','discount1','bl_other_fee',
  'seller_invoice_amount','notes_invoice',
  'second_payment','payment_date2','final_settlement','payment_date3',
];

const BONUS_FIELDS = ['rate_pct','rate_exchange','other_fee','payment_date','note'];

const placeholders = FIELDS.map(() => '?').join(',');
const setClause = FIELDS.map(f => `${f}=?`).join(',');
const blStmt = db.prepare(`SELECT id, bl_seq, ${BL_FIELDS.join(',')} FROM import_bls WHERE import_record_id = ? ORDER BY bl_seq ASC, id ASC`);
const bonusStmt = db.prepare(`SELECT id, bonus_seq, ${BONUS_FIELDS.join(',')} FROM import_staff_bonuses WHERE import_record_id = ? ORDER BY bonus_seq ASC, id ASC`);

function vals(f, body) {
  return f.map(k => {
    const v = body[k];
    return (v === '' || v === undefined) ? null : v;
  });
}

function attach(record) {
  record.bls = blStmt.all(record.id);
  record.staff_bonuses = bonusStmt.all(record.id);
  return record;
}

function saveBls(recordId, bls) {
  db.prepare('DELETE FROM import_bls WHERE import_record_id=?').run(recordId);
  if (!Array.isArray(bls) || bls.length === 0) return;
  const ins = db.prepare(
    `INSERT INTO import_bls (import_record_id, bl_seq, ${BL_FIELDS.join(',')}) VALUES (?,?,${BL_FIELDS.map(() => '?').join(',')})`
  );
  bls.forEach((bl, i) => ins.run(recordId, i + 1, ...vals(BL_FIELDS, bl)));
}

function saveBonuses(recordId, bonuses) {
  db.prepare('DELETE FROM import_staff_bonuses WHERE import_record_id=?').run(recordId);
  if (!Array.isArray(bonuses) || bonuses.length === 0) return;
  const ins = db.prepare(
    `INSERT INTO import_staff_bonuses (import_record_id, bonus_seq, ${BONUS_FIELDS.join(',')}) VALUES (?,?,${BONUS_FIELDS.map(() => '?').join(',')})`
  );
  bonuses.forEach((b, i) => ins.run(recordId, i + 1, ...vals(BONUS_FIELDS, b)));
}

router.get('/template', authenticate, (req, res) => {
  try {
    const buf = buildTemplateBuffer(FIELDS, LABELS, 'Import');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="mau_nhap_lieu_import.xlsx"');
    res.send(buf);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Không có file' });
    const rows = parseUploadBuffer(req.file.buffer, FIELDS);
    const result = bulkUpsert(db, 'import_records', FIELDS, rows, req.user.id);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', authenticate, (req, res) => {
  try {
    let q = 'SELECT * FROM import_records';
    const params = [], cond = [];
    if (req.query.search) {
      cond.push("(sale_contract LIKE ? OR seller LIKE ? OR buyer LIKE ? OR staff LIKE ?)");
      const s = `%${req.query.search}%`;
      params.push(s, s, s, s);
    }
    if (req.query.year) { cond.push('year = ?'); params.push(req.query.year); }
    if (cond.length) q += ' WHERE ' + cond.join(' AND ');
    q += ' ORDER BY created_at DESC';
    res.json(db.prepare(q).all(...params).map(attach));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM import_records WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(attach(r));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const result = db.prepare(
      `INSERT INTO import_records (${FIELDS.join(',')}, created_by) VALUES (${placeholders}, ?)`
    ).run(...vals(FIELDS, req.body), req.user.id);
    const id = result.lastInsertRowid;
    saveBls(id, req.body.bls);
    saveBonuses(id, req.body.staff_bonuses);
    res.status(201).json(attach(db.prepare('SELECT * FROM import_records WHERE id=?').get(id)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    db.prepare(
      `UPDATE import_records SET ${setClause}, updated_at=datetime('now','localtime') WHERE id=?`
    ).run(...vals(FIELDS, req.body), req.params.id);
    saveBls(req.params.id, req.body.bls);
    saveBonuses(req.params.id, req.body.staff_bonuses);
    res.json(attach(db.prepare('SELECT * FROM import_records WHERE id=?').get(req.params.id)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM import_bls WHERE import_record_id=?').run(req.params.id);
    db.prepare('DELETE FROM import_staff_bonuses WHERE import_record_id=?').run(req.params.id);
    db.prepare('DELETE FROM import_records WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
