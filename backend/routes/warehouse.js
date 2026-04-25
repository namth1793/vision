const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  try {
    let query = `SELECT w.*, o.order_no, u.name as created_by_name FROM warehouse_entries w LEFT JOIN orders o ON w.order_id=o.id LEFT JOIN users u ON w.created_by=u.id`;
    const params = [];
    const conds = [];
    if (req.query.type) { conds.push('w.type=?'); params.push(req.query.type); }
    if (req.query.search) { conds.push("(w.product LIKE ? OR w.entry_no LIKE ?)"); params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY w.date DESC, w.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stock', authenticate, (req, res) => {
  const stock = db.prepare(`SELECT product, warehouse_location, unit, SUM(CASE WHEN type='in' THEN quantity ELSE -quantity END) as current_stock FROM warehouse_entries GROUP BY product, warehouse_location, unit HAVING current_stock > 0 ORDER BY product`).all();
  res.json(stock);
});

router.post('/', authenticate, (req, res) => {
  try {
    const { entry_no, order_id, product, quantity, unit, warehouse_location, type, date, notes } = req.body;
    if (!entry_no || !product || !quantity || !type || !date) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    if (type === 'out') {
      const stock = db.prepare("SELECT SUM(CASE WHEN type='in' THEN quantity ELSE -quantity END) as available FROM warehouse_entries WHERE product=? AND warehouse_location=?").get(product, warehouse_location || 'Kho ngoại quan Đà Nẵng');
      if (!stock || stock.available < quantity) return res.status(400).json({ error: 'Không đủ tồn kho để xuất' });
    }
    const result = db.prepare('INSERT INTO warehouse_entries (entry_no,order_id,product,quantity,unit,warehouse_location,type,date,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)').run(entry_no, order_id || null, product, quantity, unit || 'tấn', warehouse_location || 'Kho ngoại quan Đà Nẵng', type, date, notes, req.user.id);
    const entry = db.prepare('SELECT w.*, o.order_no FROM warehouse_entries w LEFT JOIN orders o ON w.order_id=o.id WHERE w.id=?').get(result.lastInsertRowid);
    res.status(201).json(entry);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Số phiếu đã tồn tại' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { entry_no, order_id, product, quantity, unit, warehouse_location, type, date, notes } = req.body;
    db.prepare('UPDATE warehouse_entries SET entry_no=?,order_id=?,product=?,quantity=?,unit=?,warehouse_location=?,type=?,date=?,notes=? WHERE id=?').run(entry_no, order_id || null, product, quantity, unit, warehouse_location, type, date, notes, req.params.id);
    res.json(db.prepare('SELECT * FROM warehouse_entries WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM warehouse_entries WHERE id=?').run(req.params.id);
  res.json({ message: 'Đã xóa phiếu' });
});

module.exports = router;
