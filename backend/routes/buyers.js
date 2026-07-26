const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const COMPANY_TYPES = ['Buyer', 'Seller', 'Partner', 'Shipping Line', 'Khác'];

// Display name is auto-derived from the first non-empty line of the
// consolidated company info block — there is no dedicated "name" input.
function deriveName(en, vi) {
  const src = (en || vi || '').trim();
  const firstLine = src.split('\n').map(l => l.trim()).find(Boolean);
  return firstLine || 'Chưa đặt tên';
}

const bankStmt = db.prepare('SELECT id, bank_info, is_primary FROM company_banks WHERE buyer_id = ? ORDER BY is_primary DESC, id ASC');
const gpxkStmt = db.prepare('SELECT id, country_type, cert_no, issue_date, expiry_date, notes FROM company_gpxk WHERE buyer_id = ? ORDER BY expiry_date ASC, id ASC');

function attach(buyer) {
  buyer.banks = bankStmt.all(buyer.id);
  buyer.gpxk = gpxkStmt.all(buyer.id);
  return buyer;
}

// ── GET all companies ───────────────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  try {
    let q = 'SELECT * FROM buyers';
    const params = [], cond = [];
    if (req.query.company_type) { cond.push('company_type = ?'); params.push(req.query.company_type); }
    if (req.query.search) {
      const s = `%${req.query.search}%`;
      // Excel-style search: matches name, either language block, or any
      // bank's free-text info (e.g. typing an account number finds the company).
      cond.push(`(
        buyer_name LIKE ? OR company_info_en LIKE ? OR company_info_vi LIKE ?
        OR EXISTS (SELECT 1 FROM company_banks cb WHERE cb.buyer_id = buyers.id AND cb.bank_info LIKE ?)
        OR EXISTS (SELECT 1 FROM company_gpxk cg WHERE cg.buyer_id = buyers.id AND (cg.country_type LIKE ? OR cg.cert_no LIKE ?))
      )`);
      params.push(s, s, s, s, s, s);
    }
    if (cond.length) q += ' WHERE ' + cond.join(' AND ');
    q += ' ORDER BY buyer_name ASC';
    const buyers = db.prepare(q).all(...params);
    res.json(buyers.map(attach));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/company-types', authenticate, (req, res) => res.json(COMPANY_TYPES));

// ── GET single company ──────────────────────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM buyers WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(attach(r));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── CREATE company ──────────────────────────────────────────────────────────
router.post('/', authenticate, (req, res) => {
  try {
    const { company_info_en, company_info_vi, company_type, notes, banks, gpxk } = req.body;
    if (!company_info_en?.trim() && !company_info_vi?.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập thông tin công ty (tiếng Anh hoặc tiếng Việt)' });
    }
    const buyer_name = deriveName(company_info_en, company_info_vi);
    const result = db.prepare(`
      INSERT INTO buyers (buyer_name, company_info_en, company_info_vi, company_type, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(buyer_name, company_info_en || null, company_info_vi || null, company_type || null, notes || null, req.user.id);
    const buyerId = result.lastInsertRowid;

    if (Array.isArray(banks)) {
      const ins = db.prepare('INSERT INTO company_banks (buyer_id, bank_info, is_primary) VALUES (?,?,?)');
      banks.filter(bk => bk.bank_info?.trim()).forEach((bk, i) => ins.run(buyerId, bk.bank_info, i === 0 ? 1 : 0));
    }
    if (Array.isArray(gpxk)) {
      const ins = db.prepare('INSERT INTO company_gpxk (buyer_id, country_type, cert_no, issue_date, expiry_date, notes) VALUES (?,?,?,?,?,?)');
      gpxk.filter(g => g.country_type?.trim() || g.cert_no?.trim())
        .forEach(g => ins.run(buyerId, g.country_type || null, g.cert_no || null, g.issue_date || null, g.expiry_date || null, g.notes || null));
    }

    const buyer = db.prepare('SELECT * FROM buyers WHERE id=?').get(buyerId);
    res.status(201).json(attach(buyer));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── UPDATE company ──────────────────────────────────────────────────────────
router.put('/:id', authenticate, (req, res) => {
  try {
    const { company_info_en, company_info_vi, company_type, notes, banks, gpxk } = req.body;
    if (!company_info_en?.trim() && !company_info_vi?.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập thông tin công ty (tiếng Anh hoặc tiếng Việt)' });
    }
    const buyer_name = deriveName(company_info_en, company_info_vi);
    db.prepare(`
      UPDATE buyers SET buyer_name=?, company_info_en=?, company_info_vi=?, company_type=?, notes=?,
      updated_at=datetime('now','localtime') WHERE id=?
    `).run(buyer_name, company_info_en || null, company_info_vi || null, company_type || null, notes || null, req.params.id);

    if (Array.isArray(banks)) {
      db.prepare('DELETE FROM company_banks WHERE buyer_id=?').run(req.params.id);
      const ins = db.prepare('INSERT INTO company_banks (buyer_id, bank_info, is_primary) VALUES (?,?,?)');
      banks.filter(bk => bk.bank_info?.trim()).forEach((bk, i) => ins.run(req.params.id, bk.bank_info, i === 0 ? 1 : 0));
    }
    if (Array.isArray(gpxk)) {
      db.prepare('DELETE FROM company_gpxk WHERE buyer_id=?').run(req.params.id);
      const ins = db.prepare('INSERT INTO company_gpxk (buyer_id, country_type, cert_no, issue_date, expiry_date, notes) VALUES (?,?,?,?,?,?)');
      gpxk.filter(g => g.country_type?.trim() || g.cert_no?.trim())
        .forEach(g => ins.run(req.params.id, g.country_type || null, g.cert_no || null, g.issue_date || null, g.expiry_date || null, g.notes || null));
    }

    const buyer = db.prepare('SELECT * FROM buyers WHERE id=?').get(req.params.id);
    res.json(attach(buyer));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE company ──────────────────────────────────────────────────────────
router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM company_banks WHERE buyer_id=?').run(req.params.id);
    db.prepare('DELETE FROM company_gpxk WHERE buyer_id=?').run(req.params.id);
    db.prepare('DELETE FROM buyers WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
