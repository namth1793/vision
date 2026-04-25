const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const BASE = `SELECT d.*, d.original_amount - d.paid_amount as remaining_amount, c.contract_no, u.name as created_by_name FROM debts d LEFT JOIN contracts c ON d.contract_id=c.id LEFT JOIN users u ON d.created_by=u.id`;

router.get('/', authenticate, (req, res) => {
  try {
    let query = BASE;
    const params = [];
    const conds = [];
    if (req.query.type) { conds.push('d.type=?'); params.push(req.query.type); }
    if (req.query.status) { conds.push('d.status=?'); params.push(req.query.status); }
    if (req.query.search) { conds.push("(d.party_name LIKE ? OR c.contract_no LIKE ?)"); params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY d.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { type, party_name, party_country, original_amount, currency, due_date, contract_id, notes } = req.body;
    if (!type || !party_name || !original_amount) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    const result = db.prepare('INSERT INTO debts (type,party_name,party_country,original_amount,currency,due_date,contract_id,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?)').run(type, party_name, party_country, original_amount, currency || 'USD', due_date, contract_id || null, notes, req.user.id);
    res.status(201).json(db.prepare(BASE + ' WHERE d.id=?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { type, party_name, party_country, original_amount, currency, due_date, status, contract_id, notes } = req.body;
    db.prepare('UPDATE debts SET type=?,party_name=?,party_country=?,original_amount=?,currency=?,due_date=?,status=?,contract_id=?,notes=? WHERE id=?').run(type, party_name, party_country, original_amount, currency, due_date, status, contract_id || null, notes, req.params.id);
    res.json(db.prepare(BASE + ' WHERE d.id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM debts WHERE id=?').run(req.params.id);
  res.json({ message: 'Đã xóa công nợ' });
});

router.get('/:id/payments', authenticate, (req, res) => {
  const payments = db.prepare('SELECT dp.*, u.name as created_by_name FROM debt_payments dp LEFT JOIN users u ON dp.created_by=u.id WHERE dp.debt_id=? ORDER BY dp.payment_date DESC').all(req.params.id);
  res.json(payments);
});

router.post('/:id/payments', authenticate, (req, res) => {
  try {
    const { amount, currency, payment_date, method, reference, notes } = req.body;
    if (!amount || !payment_date) return res.status(400).json({ error: 'Thiếu thông tin thanh toán' });
    const debt = db.prepare('SELECT * FROM debts WHERE id=?').get(req.params.id);
    if (!debt) return res.status(404).json({ error: 'Không tìm thấy công nợ' });
    db.prepare('INSERT INTO debt_payments (debt_id,amount,currency,payment_date,method,reference,notes,created_by) VALUES (?,?,?,?,?,?,?,?)').run(req.params.id, amount, currency || debt.currency, payment_date, method || 'bank_transfer', reference, notes, req.user.id);
    const newPaid = debt.paid_amount + parseFloat(amount);
    const newStatus = newPaid >= debt.original_amount ? 'paid' : 'partial';
    db.prepare('UPDATE debts SET paid_amount=?,status=? WHERE id=?').run(newPaid, newStatus, req.params.id);
    res.status(201).json(db.prepare(BASE + ' WHERE d.id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
