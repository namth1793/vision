const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const FIELDS = [
  'year','staff','vn_broker','agency','order_note','sale_contract','date',
  'seller','buyer','status',
  'shipment','quantity','origin','pol',
  'outturn','nutcount','moisture','price',
  'pct1','pct2','pct3','double_penalty','penalty_1to1','nutcount_penalty','moisture_penalty',
  'advanced_payment','payment_date1','second_payment','payment_date2','final_settlement','payment_date3',
  'line_loader','bl_number','eta_caimep','eta_hcm','eta_pod','notes_bill',
  'dhl_fedex_number','dhl_delivered','total_cont','cont_size','total_bags','gw_bl',
  'less_advance','discount1',
  'seller_invoice_amount','notes_invoice',
  'date_unload','notes_cert','certificate_no','date_certificate','nw_bw',
  'outturn_vina','nutcount_vina','moisture_vina',
  'dem_det','sto','other_fee1','other_fee2',
  'debit_credit_input','notes_final',
  'commission1_usd_mt','pay_on_behalf1','notes_comm1',
  'commission2_usd_mt','pay_on_behalf2','notes_comm2',
];

const placeholders = FIELDS.map(() => '?').join(',');
const setClause = FIELDS.map(f => `${f}=?`).join(',');

function vals(f, body) {
  return f.map(k => {
    const v = body[k];
    return (v === '' || v === undefined) ? null : v;
  });
}

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
    res.json(db.prepare(q).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM import_records WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const result = db.prepare(
      `INSERT INTO import_records (${FIELDS.join(',')}, created_by) VALUES (${placeholders}, ?)`
    ).run(...vals(FIELDS, req.body), req.user.id);
    res.status(201).json(db.prepare('SELECT * FROM import_records WHERE id=?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    db.prepare(
      `UPDATE import_records SET ${setClause}, updated_at=datetime('now','localtime') WHERE id=?`
    ).run(...vals(FIELDS, req.body), req.params.id);
    res.json(db.prepare('SELECT * FROM import_records WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM import_records WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
