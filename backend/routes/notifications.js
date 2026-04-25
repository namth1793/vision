const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id=? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json(notifications);
});

router.get('/unread-count', authenticate, (req, res) => {
  const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE (user_id=? OR user_id IS NULL) AND read=0').get(req.user.id);
  res.json(result);
});

router.put('/:id/read', authenticate, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE id=?').run(req.params.id);
  res.json({ message: 'OK' });
});

router.put('/read-all', authenticate, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=? OR user_id IS NULL').run(req.user.id);
  res.json({ message: 'OK' });
});

router.delete('/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id=?').run(req.params.id);
  res.json({ message: 'OK' });
});

module.exports = router;
