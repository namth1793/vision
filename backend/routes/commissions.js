const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const BASE = `SELECT cm.*, c.contract_no, c.customer_name, c.total_value, u.name as broker_name, u2.name as created_by_name FROM commissions cm LEFT JOIN contracts c ON cm.contract_id=c.id LEFT JOIN users u ON cm.broker_id=u.id LEFT JOIN users u2 ON cm.created_by=u2.id`;

router.get('/', authenticate, (req, res) => {
  try {
    let query = BASE;
    const params = [];
    const conds = [];
    if (req.user.role === 'broker') { conds.push('cm.broker_id=?'); params.push(req.user.id); }
    if (req.query.status) { conds.push('cm.status=?'); params.push(req.query.status); }
    if (req.query.broker_id) { conds.push('cm.broker_id=?'); params.push(req.query.broker_id); }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY cm.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorize('admin', 'seller'), (req, res) => {
  try {
    const { contract_id, broker_id, rate, amount, currency, notes } = req.body;
    if (!contract_id || !broker_id || !amount) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    const result = db.prepare('INSERT INTO commissions (contract_id,broker_id,rate,amount,currency,notes,created_by) VALUES (?,?,?,?,?,?,?)').run(contract_id, broker_id, rate, amount, currency || 'USD', notes, req.user.id);
    res.status(201).json(db.prepare(BASE + ' WHERE cm.id=?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { contract_id, broker_id, rate, amount, currency, status, payment_date, notes } = req.body;
    db.prepare('UPDATE commissions SET contract_id=?,broker_id=?,rate=?,amount=?,currency=?,status=?,payment_date=?,notes=? WHERE id=?').run(contract_id, broker_id, rate, amount, currency, status, payment_date, notes, req.params.id);
    res.json(db.prepare(BASE + ' WHERE cm.id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM commissions WHERE id=?').run(req.params.id);
  res.json({ message: 'Đã xóa hoa hồng' });
});

module.exports = router;
