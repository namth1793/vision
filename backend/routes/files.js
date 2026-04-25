const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/', authenticate, (req, res) => {
  try {
    let query = 'SELECT f.*, u.name as uploader_name FROM files f LEFT JOIN users u ON f.uploader_id=u.id';
    const params = [];
    const conds = [];
    if (req.query.category) { conds.push('f.category=?'); params.push(req.query.category); }
    if (req.query.related_type) { conds.push('f.related_type=?'); params.push(req.query.related_type); }
    if (req.query.related_id) { conds.push('f.related_id=?'); params.push(req.query.related_id); }
    if (req.query.search) { conds.push('f.original_name LIKE ?'); params.push(`%${req.query.search}%`); }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY f.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Không có file' });
    const { category, related_type, related_id } = req.body;
    const result = db.prepare('INSERT INTO files (filename,original_name,file_path,file_size,mime_type,category,related_type,related_id,uploader_id) VALUES (?,?,?,?,?,?,?,?,?)').run(req.file.filename, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, category || 'other', related_type, related_id || null, req.user.id);
    const file = db.prepare('SELECT f.*, u.name as uploader_name FROM files f LEFT JOIN users u ON f.uploader_id=u.id WHERE f.id=?').get(result.lastInsertRowid);
    res.status(201).json(file);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id=?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'Không tìm thấy file' });
  if (file.uploader_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Không có quyền xóa' });
  try { fs.unlinkSync(file.file_path); } catch {}
  db.prepare('DELETE FROM files WHERE id=?').run(req.params.id);
  res.json({ message: 'Đã xóa file' });
});

module.exports = router;
