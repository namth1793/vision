const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  try {
    let q = 'SELECT * FROM gpxk_turkey';
    const params = [], cond = [];
    if (req.query.search) {
      cond.push("(seller LIKE ? OR cert_no LIKE ?)");
      const s = `%${req.query.search}%`;
      params.push(s, s);
    }
    if (cond.length) q += ' WHERE ' + cond.join(' AND ');
    q += ' ORDER BY seller ASC';
    res.json(db.prepare(q).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lookup by seller name (for auto-fill)
router.get('/lookup/:seller', authenticate, (req, res) => {
  try {
    const row = db.prepare(
      "SELECT * FROM gpxk_turkey WHERE LOWER(seller) LIKE LOWER(?) ORDER BY expiry_date DESC LIMIT 1"
    ).get(`%${req.params.seller}%`);
    res.json(row || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM gpxk_turkey WHERE id=?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { seller, cert_no, expiry_date, notes } = req.body;
    if (!seller) return res.status(400).json({ error: 'Seller là bắt buộc' });
    const result = db.prepare(`
      INSERT INTO gpxk_turkey (seller, cert_no, expiry_date, notes, created_by)
      VALUES (?,?,?,?,?)
    `).run(seller, cert_no||null, expiry_date||null, notes||null, req.user.id);
    res.status(201).json(db.prepare('SELECT * FROM gpxk_turkey WHERE id=?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { seller, cert_no, expiry_date, notes } = req.body;
    db.prepare(`UPDATE gpxk_turkey SET seller=?, cert_no=?, expiry_date=?, notes=?,
      updated_at=datetime('now','localtime') WHERE id=?`
    ).run(seller, cert_no||null, expiry_date||null, notes||null, req.params.id);
    res.json(db.prepare('SELECT * FROM gpxk_turkey WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM gpxk_turkey WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
