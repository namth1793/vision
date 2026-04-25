const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const BASE_QUERY = `
  SELECT c.*, u1.name as seller_name, u2.name as broker_name, u3.name as created_by_name
  FROM contracts c
  LEFT JOIN users u1 ON c.seller_id = u1.id
  LEFT JOIN users u2 ON c.broker_id = u2.id
  LEFT JOIN users u3 ON c.created_by = u3.id
`;

router.get('/', authenticate, (req, res) => {
  try {
    let query = BASE_QUERY;
    const params = [];
    const conditions = [];
    if (req.user.role === 'seller') { conditions.push('c.seller_id = ?'); params.push(req.user.id); }
    if (req.user.role === 'broker') { conditions.push('c.broker_id = ?'); params.push(req.user.id); }
    if (req.query.status) { conditions.push('c.status = ?'); params.push(req.query.status); }
    if (req.query.type) { conditions.push('c.type = ?'); params.push(req.query.type); }
    if (req.query.search) { conditions.push("(c.contract_no LIKE ? OR c.customer_name LIKE ? OR c.product LIKE ?)"); params.push(`%${req.query.search}%`, `%${req.query.search}%`, `%${req.query.search}%`); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY c.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const contract = db.prepare(BASE_QUERY + ' WHERE c.id = ?').get(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Không tìm thấy hợp đồng' });
    const orders = db.prepare('SELECT * FROM orders WHERE contract_id = ? ORDER BY created_at DESC').all(req.params.id);
    const debts = db.prepare('SELECT * FROM debts WHERE contract_id = ? ORDER BY created_at DESC').all(req.params.id);
    const commissions = db.prepare('SELECT cm.*, u.name as broker_name FROM commissions cm LEFT JOIN users u ON cm.broker_id=u.id WHERE cm.contract_id=?').all(req.params.id);
    const files = db.prepare("SELECT * FROM files WHERE related_type='contract' AND related_id=? ORDER BY created_at DESC").all(req.params.id);
    res.json({ ...contract, orders, debts, commissions, files });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { contract_no, type, customer_name, customer_country, product, quantity, unit, unit_price, total_value, currency, status, seller_id, broker_id, sign_date, delivery_date, payment_terms, notes } = req.body;
    if (!contract_no || !type || !customer_name || !product) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    const tv = total_value || (quantity && unit_price ? quantity * unit_price : null);
    const result = db.prepare(`INSERT INTO contracts (contract_no,type,customer_name,customer_country,product,quantity,unit,unit_price,total_value,currency,status,seller_id,broker_id,sign_date,delivery_date,payment_terms,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(contract_no, type, customer_name, customer_country, product, quantity, unit, unit_price, tv, currency || 'USD', status || 'draft', seller_id || null, broker_id || null, sign_date, delivery_date, payment_terms, notes, req.user.id);
    const contract = db.prepare(BASE_QUERY + ' WHERE c.id=?').get(result.lastInsertRowid);
    req.app.get('io').emit('contract_created', contract);
    res.status(201).json(contract);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Số hợp đồng đã tồn tại' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { contract_no, type, customer_name, customer_country, product, quantity, unit, unit_price, total_value, currency, status, seller_id, broker_id, sign_date, delivery_date, payment_terms, notes } = req.body;
    const tv = total_value || (quantity && unit_price ? quantity * unit_price : null);
    db.prepare(`UPDATE contracts SET contract_no=?,type=?,customer_name=?,customer_country=?,product=?,quantity=?,unit=?,unit_price=?,total_value=?,currency=?,status=?,seller_id=?,broker_id=?,sign_date=?,delivery_date=?,payment_terms=?,notes=?,updated_at=datetime('now','localtime') WHERE id=?`).run(contract_no, type, customer_name, customer_country, product, quantity, unit, unit_price, tv, currency, status, seller_id || null, broker_id || null, sign_date, delivery_date, payment_terms, notes, req.params.id);
    res.json(db.prepare(BASE_QUERY + ' WHERE c.id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM contracts WHERE id=?').run(req.params.id);
  res.json({ message: 'Đã xóa hợp đồng' });
});

module.exports = router;
