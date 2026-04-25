const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const users = db.prepare('SELECT id,name,email,role,department,phone,active,created_at FROM users ORDER BY id').all();
  res.json(users);
});

router.get('/sellers', authenticate, (req, res) => {
  const users = db.prepare("SELECT id,name FROM users WHERE role='seller' AND active=1").all();
  res.json(users);
});

router.get('/brokers', authenticate, (req, res) => {
  const users = db.prepare("SELECT id,name FROM users WHERE role='broker' AND active=1").all();
  res.json(users);
});

router.post('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, email, password, role, department, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name,email,password_hash,role,department,phone) VALUES (?,?,?,?,?,?)').run(name, email, hash, role || 'staff', department, phone);
    const user = db.prepare('SELECT id,name,email,role,department,phone,active,created_at FROM users WHERE id=?').get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email đã tồn tại' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, email, role, department, phone, active, password } = req.body;
    let query = 'UPDATE users SET name=?,email=?,role=?,department=?,phone=?,active=? WHERE id=?';
    let params = [name, email, role, department, phone, active !== undefined ? active : 1, req.params.id];
    if (password) {
      query = 'UPDATE users SET name=?,email=?,role=?,department=?,phone=?,active=?,password_hash=? WHERE id=?';
      params = [name, email, role, department, phone, active !== undefined ? active : 1, bcrypt.hashSync(password, 10), req.params.id];
    }
    db.prepare(query).run(...params);
    const user = db.prepare('SELECT id,name,email,role,department,phone,active,created_at FROM users WHERE id=?').get(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Không thể xóa chính mình' });
  db.prepare('UPDATE users SET active=0 WHERE id=?').run(req.params.id);
  res.json({ message: 'Đã vô hiệu hóa tài khoản' });
});

module.exports = router;
