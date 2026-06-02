const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  try {
    let q = 'SELECT * FROM buyers';
    const params = [], cond = [];
    if (req.query.search) {
      cond.push("(buyer_name LIKE ? OR company_address LIKE ? OR email LIKE ? OR phone LIKE ?)");
      const s = `%${req.query.search}%`;
      params.push(s, s, s, s);
    }
    if (cond.length) q += ' WHERE ' + cond.join(' AND ');
    q += ' ORDER BY buyer_name ASC';
    res.json(db.prepare(q).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM buyers WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { buyer_name, company_address, bank_details, email, phone, notes } = req.body;
    if (!buyer_name) return res.status(400).json({ error: 'Buyer name is required' });
    const result = db.prepare(`
      INSERT INTO buyers (buyer_name, company_address, bank_details, email, phone, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(buyer_name, company_address||null, bank_details||null, email||null, phone||null, notes||null, req.user.id);
    res.status(201).json(db.prepare('SELECT * FROM buyers WHERE id=?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { buyer_name, company_address, bank_details, email, phone, notes } = req.body;
    db.prepare(`
      UPDATE buyers SET buyer_name=?, company_address=?, bank_details=?, email=?, phone=?, notes=?,
      updated_at=datetime('now','localtime') WHERE id=?
    `).run(buyer_name, company_address||null, bank_details||null, email||null, phone||null, notes||null, req.params.id);
    res.json(db.prepare('SELECT * FROM buyers WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM buyers WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
