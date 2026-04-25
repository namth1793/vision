const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const BASE = `SELECT o.*, c.contract_no, c.customer_name, u.name as created_by_name FROM orders o LEFT JOIN contracts c ON o.contract_id=c.id LEFT JOIN users u ON o.created_by=u.id`;

router.get('/', authenticate, (req, res) => {
  try {
    let query = BASE;
    const params = [];
    const conds = [];
    if (req.query.status) { conds.push('o.status=?'); params.push(req.query.status); }
    if (req.query.type) { conds.push('o.type=?'); params.push(req.query.type); }
    if (req.query.contract_id) { conds.push('o.contract_id=?'); params.push(req.query.contract_id); }
    if (req.query.search) { conds.push("(o.order_no LIKE ? OR o.product LIKE ? OR o.vessel LIKE ?)"); params.push(`%${req.query.search}%`, `%${req.query.search}%`, `%${req.query.search}%`); }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY o.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, (req, res) => {
  const order = db.prepare(BASE + ' WHERE o.id=?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  const entries = db.prepare('SELECT * FROM warehouse_entries WHERE order_id=? ORDER BY date DESC').all(req.params.id);
  const files = db.prepare("SELECT * FROM files WHERE related_type='order' AND related_id=?").all(req.params.id);
  res.json({ ...order, warehouse_entries: entries, files });
});

router.post('/', authenticate, (req, res) => {
  try {
    const { order_no, contract_id, type, product, quantity, unit, status, shipment_date, arrival_date, port_loading, port_discharge, vessel, bill_of_lading, freight, freight_currency, notes } = req.body;
    if (!order_no || !type) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    const result = db.prepare(`INSERT INTO orders (order_no,contract_id,type,product,quantity,unit,status,shipment_date,arrival_date,port_loading,port_discharge,vessel,bill_of_lading,freight,freight_currency,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(order_no, contract_id || null, type, product, quantity, unit, status || 'pending', shipment_date, arrival_date, port_loading, port_discharge, vessel, bill_of_lading, freight, freight_currency || 'USD', notes, req.user.id);
    res.status(201).json(db.prepare(BASE + ' WHERE o.id=?').get(result.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Số đơn hàng đã tồn tại' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { order_no, contract_id, type, product, quantity, unit, status, shipment_date, arrival_date, port_loading, port_discharge, vessel, bill_of_lading, freight, freight_currency, notes } = req.body;
    db.prepare(`UPDATE orders SET order_no=?,contract_id=?,type=?,product=?,quantity=?,unit=?,status=?,shipment_date=?,arrival_date=?,port_loading=?,port_discharge=?,vessel=?,bill_of_lading=?,freight=?,freight_currency=?,notes=? WHERE id=?`).run(order_no, contract_id || null, type, product, quantity, unit, status, shipment_date, arrival_date, port_loading, port_discharge, vessel, bill_of_lading, freight, freight_currency, notes, req.params.id);
    res.json(db.prepare(BASE + ' WHERE o.id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  res.json({ message: 'Đã xóa đơn hàng' });
});

module.exports = router;
