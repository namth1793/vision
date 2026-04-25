const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

router.get('/stages', authenticate, (req, res) => {
  res.json(db.prepare('SELECT * FROM pipeline_stages ORDER BY order_index').all());
});

router.get('/items', authenticate, (req, res) => {
  try {
    let query = `SELECT pi.*, ps.name as stage_name, ps.color as stage_color, c.contract_no, u.name as assigned_to_name, u2.name as created_by_name FROM pipeline_items pi LEFT JOIN pipeline_stages ps ON pi.stage_id=ps.id LEFT JOIN contracts c ON pi.contract_id=c.id LEFT JOIN users u ON pi.assigned_to=u.id LEFT JOIN users u2 ON pi.created_by=u2.id`;
    const params = [];
    const conds = [];
    if (req.query.stage_id) { conds.push('pi.stage_id=?'); params.push(req.query.stage_id); }
    if (req.user.role === 'seller') { conds.push('pi.assigned_to=?'); params.push(req.user.id); }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY pi.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/items', authenticate, (req, res) => {
  try {
    const { stage_id, title, description, contract_id, assigned_to, priority, due_date } = req.body;
    if (!stage_id || !title) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    const result = db.prepare('INSERT INTO pipeline_items (stage_id,title,description,contract_id,assigned_to,priority,due_date,created_by) VALUES (?,?,?,?,?,?,?,?)').run(stage_id, title, description, contract_id || null, assigned_to || null, priority || 'medium', due_date, req.user.id);
    const item = db.prepare(`SELECT pi.*, ps.name as stage_name, ps.color as stage_color, c.contract_no, u.name as assigned_to_name FROM pipeline_items pi LEFT JOIN pipeline_stages ps ON pi.stage_id=ps.id LEFT JOIN contracts c ON pi.contract_id=c.id LEFT JOIN users u ON pi.assigned_to=u.id WHERE pi.id=?`).get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/items/:id', authenticate, (req, res) => {
  try {
    const { stage_id, title, description, contract_id, assigned_to, priority, due_date } = req.body;
    db.prepare('UPDATE pipeline_items SET stage_id=?,title=?,description=?,contract_id=?,assigned_to=?,priority=?,due_date=? WHERE id=?').run(stage_id, title, description, contract_id || null, assigned_to || null, priority, due_date, req.params.id);
    const item = db.prepare(`SELECT pi.*, ps.name as stage_name, ps.color as stage_color, c.contract_no, u.name as assigned_to_name FROM pipeline_items pi LEFT JOIN pipeline_stages ps ON pi.stage_id=ps.id LEFT JOIN contracts c ON pi.contract_id=c.id LEFT JOIN users u ON pi.assigned_to=u.id WHERE pi.id=?`).get(req.params.id);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/items/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM pipeline_items WHERE id=?').run(req.params.id);
  res.json({ message: 'Đã xóa' });
});

module.exports = router;
