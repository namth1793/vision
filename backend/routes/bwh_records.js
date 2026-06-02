const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const FIELDS = [
  'year','bwh','no','seller','bl','status',
  'eta_vung_tau','eta_hcm','total_cont','total_bags',
  'gross_weight','net_weight','origin','commodity',
  'price_bwh_inventory','inv_number','note_tt_kho',
  'date_into_bwh','supervisor_in','gw_into_bwh','nw_into_bwh','note_into_bwh',
  'date_out_bwh','supervisor_out','gw_out_bwh','nw_out_bwh','note_out_bwh',
  'ins_company','ins_fee','pct_insured','ins_rate','ins_vat',
  'exchange_rate','ins_duration','ins_payment_date','note_ins',
  'deposit','deposit_payment_date','amount_paid','amount_paid_date','note_pay_bwh',
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
    let q = 'SELECT * FROM bwh_records';
    const params = [], cond = [];
    if (req.query.search) {
      cond.push("(bwh LIKE ? OR seller LIKE ? OR bl LIKE ? OR commodity LIKE ?)");
      const s = `%${req.query.search}%`;
      params.push(s, s, s, s);
    }
    if (req.query.year) { cond.push('year = ?'); params.push(req.query.year); }
    if (req.query.status) { cond.push('status = ?'); params.push(req.query.status); }
    if (cond.length) q += ' WHERE ' + cond.join(' AND ');
    q += ' ORDER BY created_at DESC';
    res.json(db.prepare(q).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM bwh_records WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const result = db.prepare(
      `INSERT INTO bwh_records (${FIELDS.join(',')}, created_by) VALUES (${placeholders}, ?)`
    ).run(...vals(FIELDS, req.body), req.user.id);
    res.status(201).json(db.prepare('SELECT * FROM bwh_records WHERE id=?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    db.prepare(
      `UPDATE bwh_records SET ${setClause}, updated_at=datetime('now','localtime') WHERE id=?`
    ).run(...vals(FIELDS, req.body), req.params.id);
    res.json(db.prepare('SELECT * FROM bwh_records WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM bwh_records WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
