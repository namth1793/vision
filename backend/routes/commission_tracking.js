const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// ── INCOME ──────────────────────────────────────────────────────────────────
router.get('/income', authenticate, (req, res) => {
  try {
    let q = 'SELECT * FROM commission_income';
    const params = [], cond = [];
    if (req.query.type) { cond.push('type=?'); params.push(req.query.type); }
    if (req.query.seller) { cond.push('seller LIKE ?'); params.push(`%${req.query.seller}%`); }
    if (req.query.agency) { cond.push('agency LIKE ?'); params.push(`%${req.query.agency}%`); }
    if (cond.length) q += ' WHERE ' + cond.join(' AND ');
    q += ' ORDER BY created_at DESC';
    const rows = db.prepare(q).all(...params);
    // Compute remaining
    const result = rows.map(r => ({
      ...r,
      total_received: (r.received_1||0) + (r.received_2||0) + (r.received_3||0),
      remaining: (r.actual_amount || r.est_amount || 0) - ((r.received_1||0) + (r.received_2||0) + (r.received_3||0))
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/income', authenticate, (req, res) => {
  try {
    const f = req.body;
    const result = db.prepare(`
      INSERT INTO commission_income
        (type, sale_contract, lot_number, seller, agency, commodity,
         qty_contract, qty_actual_nw, rate, rate_unit, est_amount, actual_amount,
         received_1, date_1, received_2, date_2, received_3, date_3, note, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(f.type||'export', f.sale_contract||null, f.lot_number||null, f.seller||null,
           f.agency||null, f.commodity||null, f.qty_contract||null, f.qty_actual_nw||null,
           f.rate||null, f.rate_unit||'USD/MT', f.est_amount||null, f.actual_amount||null,
           f.received_1||null, f.date_1||null, f.received_2||null, f.date_2||null,
           f.received_3||null, f.date_3||null, f.note||null, req.user.id);
    res.status(201).json(db.prepare('SELECT * FROM commission_income WHERE id=?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/income/:id', authenticate, (req, res) => {
  try {
    const f = req.body;
    db.prepare(`UPDATE commission_income SET
      type=?, sale_contract=?, lot_number=?, seller=?, agency=?, commodity=?,
      qty_contract=?, qty_actual_nw=?, rate=?, rate_unit=?, est_amount=?, actual_amount=?,
      received_1=?, date_1=?, received_2=?, date_2=?, received_3=?, date_3=?, note=?,
      updated_at=datetime('now','localtime') WHERE id=?`
    ).run(f.type||'export', f.sale_contract||null, f.lot_number||null, f.seller||null,
          f.agency||null, f.commodity||null, f.qty_contract||null, f.qty_actual_nw||null,
          f.rate||null, f.rate_unit||'USD/MT', f.est_amount||null, f.actual_amount||null,
          f.received_1||null, f.date_1||null, f.received_2||null, f.date_2||null,
          f.received_3||null, f.date_3||null, f.note||null, req.params.id);
    res.json(db.prepare('SELECT * FROM commission_income WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/income/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM commission_income WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── EXPENSE ──────────────────────────────────────────────────────────────────
router.get('/expense', authenticate, (req, res) => {
  try {
    let q = 'SELECT * FROM commission_expense';
    const params = [], cond = [];
    if (req.query.type) { cond.push('type=?'); params.push(req.query.type); }
    if (req.query.vn_broker) { cond.push('vn_broker LIKE ?'); params.push(`%${req.query.vn_broker}%`); }
    if (cond.length) q += ' WHERE ' + cond.join(' AND ');
    q += ' ORDER BY created_at DESC';
    const rows = db.prepare(q).all(...params);
    const result = rows.map(r => ({
      ...r,
      total_paid: (r.paid_1||0) + (r.paid_2||0) + (r.paid_3||0),
      remaining: (r.actual_amount || r.est_amount || 0) - ((r.paid_1||0) + (r.paid_2||0) + (r.paid_3||0))
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/expense', authenticate, (req, res) => {
  try {
    const f = req.body;
    const result = db.prepare(`
      INSERT INTO commission_expense
        (type, sale_contract, lot_number, vn_broker, commodity,
         qty_contract, qty_actual_bl, rate, rate_unit, est_amount, actual_amount,
         paid_1, date_1, paid_2, date_2, paid_3, date_3, note, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(f.type||'export', f.sale_contract||null, f.lot_number||null, f.vn_broker||null,
           f.commodity||null, f.qty_contract||null, f.qty_actual_bl||null,
           f.rate||null, f.rate_unit||'USD/MT', f.est_amount||null, f.actual_amount||null,
           f.paid_1||null, f.date_1||null, f.paid_2||null, f.date_2||null,
           f.paid_3||null, f.date_3||null, f.note||null, req.user.id);
    res.status(201).json(db.prepare('SELECT * FROM commission_expense WHERE id=?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/expense/:id', authenticate, (req, res) => {
  try {
    const f = req.body;
    db.prepare(`UPDATE commission_expense SET
      type=?, sale_contract=?, lot_number=?, vn_broker=?, commodity=?,
      qty_contract=?, qty_actual_bl=?, rate=?, rate_unit=?, est_amount=?, actual_amount=?,
      paid_1=?, date_1=?, paid_2=?, date_2=?, paid_3=?, date_3=?, note=?,
      updated_at=datetime('now','localtime') WHERE id=?`
    ).run(f.type||'export', f.sale_contract||null, f.lot_number||null, f.vn_broker||null,
          f.commodity||null, f.qty_contract||null, f.qty_actual_bl||null,
          f.rate||null, f.rate_unit||'USD/MT', f.est_amount||null, f.actual_amount||null,
          f.paid_1||null, f.date_1||null, f.paid_2||null, f.date_2||null,
          f.paid_3||null, f.date_3||null, f.note||null, req.params.id);
    res.json(db.prepare('SELECT * FROM commission_expense WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/expense/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM commission_expense WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
