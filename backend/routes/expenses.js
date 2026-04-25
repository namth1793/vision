const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const BASE = `SELECT e.*, u1.name as submitter_name, u2.name as approver_name FROM expenses e LEFT JOIN users u1 ON e.submitted_by=u1.id LEFT JOIN users u2 ON e.approved_by=u2.id`;

router.get('/', authenticate, (req, res) => {
  try {
    let query = BASE;
    const params = [];
    const conds = [];
    if (req.user.role !== 'admin') { conds.push('e.submitted_by=?'); params.push(req.user.id); }
    if (req.query.status) { conds.push('e.status=?'); params.push(req.query.status); }
    if (req.query.type) { conds.push('e.type=?'); params.push(req.query.type); }
    if (req.query.search) { conds.push('e.description LIKE ?'); params.push(`%${req.query.search}%`); }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY e.date DESC, e.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { type, category, amount, currency, date, description } = req.body;
    if (!type || !amount || !date || !description) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    const result = db.prepare('INSERT INTO expenses (type,category,amount,currency,date,description,submitted_by) VALUES (?,?,?,?,?,?,?)').run(type, category || 'other', amount, currency || 'VND', date, description, req.user.id);
    res.status(201).json(db.prepare(BASE + ' WHERE e.id=?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { type, category, amount, currency, date, description, status } = req.body;
    const expense = db.prepare('SELECT * FROM expenses WHERE id=?').get(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Không tìm thấy' });
    if (status && status !== expense.status && req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ admin mới duyệt được' });
    const approvedBy = (status === 'approved' || status === 'paid') ? req.user.id : expense.approved_by;
    db.prepare('UPDATE expenses SET type=?,category=?,amount=?,currency=?,date=?,description=?,status=?,approved_by=? WHERE id=?').run(type, category, amount, currency, date, description, status || expense.status, approvedBy, req.params.id);
    res.json(db.prepare(BASE + ' WHERE e.id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, (req, res) => {
  const expense = db.prepare('SELECT * FROM expenses WHERE id=?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Không tìm thấy' });
  if (expense.submitted_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Không có quyền' });
  if (expense.status !== 'pending' && req.user.role !== 'admin') return res.status(400).json({ error: 'Chỉ xóa được khoản đang chờ duyệt' });
  db.prepare('DELETE FROM expenses WHERE id=?').run(req.params.id);
  res.json({ message: 'Đã xóa' });
});

module.exports = router;
