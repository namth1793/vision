const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET audit logs — hỗ trợ filter & phân trang
router.get('/', authenticate, (req, res) => {
  try {
    const { limit = 100, offset = 0, action, user_id, search } = req.query;
    const conditions = [];
    const params = [];

    if (action)   { conditions.push('action = ?');           params.push(action); }
    if (user_id)  { conditions.push('user_id = ?');          params.push(user_id); }
    if (search)   {
      conditions.push('(contract_no LIKE ? OR user_name LIKE ? OR summary LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const rows = db.prepare(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, Number(limit), Number(offset));

    const total = db.prepare(
      `SELECT COUNT(*) as n FROM audit_logs ${where}`
    ).get(...params).n;

    res.json({ logs: rows, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET stats — top users & action counts
router.get('/stats', authenticate, (req, res) => {
  try {
    const actionCounts = db.prepare(`
      SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action
    `).all();

    const topUsers = db.prepare(`
      SELECT user_id, user_name, user_role, COUNT(*) as count
      FROM audit_logs
      GROUP BY user_id
      ORDER BY count DESC
      LIMIT 10
    `).all();

    const recent7days = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= date('now', '-6 days')
      GROUP BY day
      ORDER BY day
    `).all();

    res.json({ actionCounts, topUsers, recent7days });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
