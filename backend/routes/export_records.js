const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const FIELDS = [
  'year','staff','vn_broker','order_note','lot_number','sale_contract','date',
  'status','expiry_export_cert_turkey',
  'seller','buyer1','buyer2','commodity','qty_commodity','price',
  'shipment','packing','packing_ctn','packing_unit','ctn_cont','quantity','quantity_unit',
  'advance_payment','payment_date1','payment2','payment_date2','payment3','payment_date3','note_pay',
  'market','crd','req_get_bkg','inspection_date','loading_date','supervisor','fwd',
  'ocean_freight','note_booking','pol','pod','shipping_line',
  'etd','eta',
  'bkg_details','container_seal','bl_bkg_freetime','seller_invoice_no','note_shipping',
  'commodity2','total_cont','ctn2',
  'gw_bl_lbs','gw_bl_kgs','nw_bl_lbs','nw_bl_kgs',
  'nw_to_pay','nw_to_pay_unit',
  'less_advance','discount1','other_fee1','include_other_fee',
  'seller_invoice_amount','note_invoice',
  'ins_company','ins_fee','pct_insured','ins_rate','ins_vat',
  'exchange_rate_usd_vnd','ins_duration','ins_payment_date','note_ins',
  'dhl_fedex_number','dhl_delivered','dhl_fee','note_dhl',
  'selling_price','mark_up','discount2','other_fee2',
  'amount_buyer2_paid','payment_date_buyer2',
  'cosmos_rate','cosmos_payment_date','note_cos',
  'commission_usd_lbs','rate_exchange_vnd','commission_payment_date','note_com',
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
    res.json(db.prepare(q).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM export_records WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const result = db.prepare(
      `INSERT INTO export_records (${FIELDS.join(',')}, created_by) VALUES (${placeholders}, ?)`
    ).run(...vals(FIELDS, req.body), req.user.id);
    res.status(201).json(db.prepare('SELECT * FROM export_records WHERE id=?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    db.prepare(
      `UPDATE export_records SET ${setClause}, updated_at=datetime('now','localtime') WHERE id=?`
    ).run(...vals(FIELDS, req.body), req.params.id);
    res.json(db.prepare('SELECT * FROM export_records WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM export_records WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
