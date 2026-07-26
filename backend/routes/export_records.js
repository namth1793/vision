const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { buildTemplateBuffer, parseUploadBuffer, bulkUpsert } = require('../utils/excel');
const LABELS = require('../utils/labels').EXPORT_RECORDS;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Contract-level fields only — commodity/container/packing/price/quantity now
// live per-row in export_items, since a contract can hold several goods
// lines at different prices. `price`/`price_unit` stay here: they now serve
// the NW-to-pay invoice calc (Buyer 1 Must Pay Seller), a separate concern
// from the per-item prices used for Contract Value.
const FIELDS = [
  'year','staff','vn_broker','agency','order_note','lot_number','sale_contract','date',
  'status','expiry_export_cert_turkey',
  'seller','buyer1','buyer2',
  'price','price_unit',
  'shipment','packing',
  'pct1','pct2','pct3',
  'advance_payment','payment_date1','payment2','payment_date2','payment3','payment_date3','note_pay',
  'b2_advance_payment','b2_pay_date1','b2_payment2','b2_pay_date2','b2_payment3','b2_pay_date3','b2_note_pay',
  's_advance_payment','s_pay_date1','s_payment2','s_pay_date2','s_payment3','s_pay_date3','s_note_pay',
  'dhl_fedex_number','dhl_delivered','dhl_fee','dhl_pay_to','dhl_payment_date','note_dhl',
  'market','crd','req_get_bkg','inspection_date','loading_date','supervisor','note_donghang','fwd',
  'ocean_freight','note_booking',
  'pol','pod','shipping_line','etd','eta',
  'bkg_details','container_seal','bl_bkg_freetime','seller_invoice_no','company_inspection','note_shipping',
  'gw_bl_lbs','gw_bl_kgs','nw_bl_lbs','nw_bl_kgs',
  'nw_to_pay','nw_to_pay_unit',
  'less_advance','discount1','other_fee1',
  'seller_invoice_amount','note_invoice',
  'selling_price','mark_up','less_prepayment2','discount2','other_fee2','note_invoice2',
  'ins_company','ins_fee','pct_insured','ins_rate','ins_vat',
  'exchange_rate_usd_vnd','ins_duration','ins_payment_date','note_ins',
  'cosmos_rate','cosmos_other_fee','cosmos_payment_date','note_cos',
  'commission_usd_lbs','commission_other_fee','rate_exchange_vnd','commission_payment_date','note_com',
  'commission2_usd_lbs','commission2_other_fee','rate_exchange2_vnd','commission2_payment_date','note_com2',
];

const ITEM_FIELDS = ['commodity','cont_count','cont_type','ctn_cont','packing_ctn','packing_unit','price','price_unit','quantity'];
const BONUS_FIELDS = ['rate_pct','rate_exchange','other_fee','payment_date','note'];

const placeholders = FIELDS.map(() => '?').join(',');
const setClause = FIELDS.map(f => `${f}=?`).join(',');
const itemStmt = db.prepare(`SELECT id, item_seq, ${ITEM_FIELDS.join(',')} FROM export_items WHERE export_record_id = ? ORDER BY item_seq ASC, id ASC`);
const bonusStmt = db.prepare(`SELECT id, bonus_seq, ${BONUS_FIELDS.join(',')} FROM export_staff_bonuses WHERE export_record_id = ? ORDER BY bonus_seq ASC, id ASC`);

function vals(f, body) {
  return f.map(k => {
    const v = body[k];
    return (v === '' || v === undefined) ? null : v;
  });
}

function attach(record) {
  record.items = itemStmt.all(record.id);
  record.staff_bonuses = bonusStmt.all(record.id);
  return record;
}

function saveItems(recordId, items) {
  db.prepare('DELETE FROM export_items WHERE export_record_id=?').run(recordId);
  if (!Array.isArray(items) || items.length === 0) return;
  const ins = db.prepare(
    `INSERT INTO export_items (export_record_id, item_seq, ${ITEM_FIELDS.join(',')}) VALUES (?,?,${ITEM_FIELDS.map(() => '?').join(',')})`
  );
  items.forEach((it, i) => ins.run(recordId, i + 1, ...vals(ITEM_FIELDS, it)));
}

function saveBonuses(recordId, bonuses) {
  db.prepare('DELETE FROM export_staff_bonuses WHERE export_record_id=?').run(recordId);
  if (!Array.isArray(bonuses) || bonuses.length === 0) return;
  const ins = db.prepare(
    `INSERT INTO export_staff_bonuses (export_record_id, bonus_seq, ${BONUS_FIELDS.join(',')}) VALUES (?,?,${BONUS_FIELDS.map(() => '?').join(',')})`
  );
  bonuses.forEach((b, i) => ins.run(recordId, i + 1, ...vals(BONUS_FIELDS, b)));
}

router.get('/template', authenticate, (req, res) => {
  try {
    const buf = buildTemplateBuffer(FIELDS, LABELS, 'Export');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="mau_nhap_lieu_export.xlsx"');
    res.send(buf);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Không có file' });
    const rows = parseUploadBuffer(req.file.buffer, FIELDS);
    const result = bulkUpsert(db, 'export_records', FIELDS, rows, req.user.id);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', authenticate, (req, res) => {
  try {
    let q = 'SELECT * FROM export_records';
    const params = [], cond = [];
    if (req.query.search) {
      cond.push("(sale_contract LIKE ? OR seller LIKE ? OR buyer1 LIKE ? OR staff LIKE ?)");
      const s = `%${req.query.search}%`;
      params.push(s, s, s, s);
    }
    if (req.query.year) { cond.push('year = ?'); params.push(req.query.year); }
    if (req.query.status) { cond.push('status = ?'); params.push(req.query.status); }
    if (cond.length) q += ' WHERE ' + cond.join(' AND ');
    q += ' ORDER BY created_at DESC';
    res.json(db.prepare(q).all(...params).map(attach));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM export_records WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(attach(r));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const result = db.prepare(
      `INSERT INTO export_records (${FIELDS.join(',')}, created_by) VALUES (${placeholders}, ?)`
    ).run(...vals(FIELDS, req.body), req.user.id);
    const id = result.lastInsertRowid;
    saveItems(id, req.body.items);
    saveBonuses(id, req.body.staff_bonuses);
    res.status(201).json(attach(db.prepare('SELECT * FROM export_records WHERE id=?').get(id)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    db.prepare(
      `UPDATE export_records SET ${setClause}, updated_at=datetime('now','localtime') WHERE id=?`
    ).run(...vals(FIELDS, req.body), req.params.id);
    saveItems(req.params.id, req.body.items);
    saveBonuses(req.params.id, req.body.staff_bonuses);
    res.json(attach(db.prepare('SELECT * FROM export_records WHERE id=?').get(req.params.id)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM export_items WHERE export_record_id=?').run(req.params.id);
    db.prepare('DELETE FROM export_staff_bonuses WHERE export_record_id=?').run(req.params.id);
    db.prepare('DELETE FROM export_records WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
