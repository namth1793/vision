const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

// ── GET all buyers ──────────────────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  try {
    let q = 'SELECT * FROM buyers';
    const params = [], cond = [];
    if (req.query.search) {
      const s = `%${req.query.search}%`;
      cond.push(`(buyer_name LIKE ? OR company_address LIKE ? OR company_vi LIKE ?
        OR email LIKE ? OR phone LIKE ? OR tax_code LIKE ?)`);
      params.push(s, s, s, s, s, s);
    }
    if (cond.length) q += ' WHERE ' + cond.join(' AND ');
    q += ' ORDER BY buyer_name ASC';
    const buyers = db.prepare(q).all(...params);

    // Attach banks to each buyer
    const bankStmt = db.prepare('SELECT * FROM company_banks WHERE buyer_id = ? ORDER BY is_primary DESC, id ASC');
    const result = buyers.map(b => ({ ...b, banks: bankStmt.all(b.id) }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Search buyers by bank account number
router.get('/search-bank', authenticate, (req, res) => {
  try {
    const { account_no } = req.query;
    if (!account_no) return res.json([]);
    const rows = db.prepare(`
      SELECT b.*, cb.bank_name, cb.account_no, cb.swift_bic
      FROM buyers b
      JOIN company_banks cb ON cb.buyer_id = b.id
      WHERE cb.account_no LIKE ?
      ORDER BY b.buyer_name ASC
    `).all(`%${account_no}%`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET single buyer ─────────────────────────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM buyers WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy' });
    r.banks = db.prepare('SELECT * FROM company_banks WHERE buyer_id = ? ORDER BY is_primary DESC, id ASC').all(r.id);
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── CREATE buyer ─────────────────────────────────────────────────────────────
router.post('/', authenticate, (req, res) => {
  try {
    const { buyer_name, company_address, company_vi, tax_code, email, phone, notes, banks } = req.body;
    if (!buyer_name) return res.status(400).json({ error: 'Buyer name is required' });
    const result = db.prepare(`
      INSERT INTO buyers (buyer_name, company_address, company_vi, tax_code, email, phone, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(buyer_name, company_address||null, company_vi||null, tax_code||null,
           email||null, phone||null, notes||null, req.user.id);
    const buyerId = result.lastInsertRowid;

    // Insert banks
    if (Array.isArray(banks)) {
      const ins = db.prepare(`INSERT INTO company_banks
        (buyer_id, bank_name, account_no, swift_bic, iban, bank_branch, bank_address, currency, notes, is_primary)
        VALUES (?,?,?,?,?,?,?,?,?,?)`);
      banks.forEach((bk, i) => {
        ins.run(buyerId, bk.bank_name||null, bk.account_no||null, bk.swift_bic||null,
          bk.iban||null, bk.bank_branch||null, bk.bank_address||null, bk.currency||'USD',
          bk.notes||null, i === 0 ? 1 : 0);
      });
    }

    const buyer = db.prepare('SELECT * FROM buyers WHERE id=?').get(buyerId);
    buyer.banks = db.prepare('SELECT * FROM company_banks WHERE buyer_id=? ORDER BY is_primary DESC, id ASC').all(buyerId);
    res.status(201).json(buyer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── UPDATE buyer ─────────────────────────────────────────────────────────────
router.put('/:id', authenticate, (req, res) => {
  try {
    const { buyer_name, company_address, company_vi, tax_code, email, phone, notes, banks } = req.body;
    db.prepare(`
      UPDATE buyers SET buyer_name=?, company_address=?, company_vi=?, tax_code=?, email=?, phone=?, notes=?,
      updated_at=datetime('now','localtime') WHERE id=?
    `).run(buyer_name, company_address||null, company_vi||null, tax_code||null,
           email||null, phone||null, notes||null, req.params.id);

    // Replace banks
    if (Array.isArray(banks)) {
      db.prepare('DELETE FROM company_banks WHERE buyer_id=?').run(req.params.id);
      const ins = db.prepare(`INSERT INTO company_banks
        (buyer_id, bank_name, account_no, swift_bic, iban, bank_branch, bank_address, currency, notes, is_primary)
        VALUES (?,?,?,?,?,?,?,?,?,?)`);
      banks.forEach((bk, i) => {
        ins.run(req.params.id, bk.bank_name||null, bk.account_no||null, bk.swift_bic||null,
          bk.iban||null, bk.bank_branch||null, bk.bank_address||null, bk.currency||'USD',
          bk.notes||null, i === 0 ? 1 : 0);
      });
    }

    const buyer = db.prepare('SELECT * FROM buyers WHERE id=?').get(req.params.id);
    buyer.banks = db.prepare('SELECT * FROM company_banks WHERE buyer_id=? ORDER BY is_primary DESC, id ASC').all(req.params.id);
    res.json(buyer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE buyer ─────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM company_banks WHERE buyer_id=?').run(req.params.id);
    db.prepare('DELETE FROM buyers WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
