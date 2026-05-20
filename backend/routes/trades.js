const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET all trade records
router.get('/', authenticate, (req, res) => {
  try {
    let query = 'SELECT * FROM trade_records';
    const params = [];
    const conditions = [];
    if (req.query.search) {
      conditions.push("(contract_no LIKE ? OR seller LIKE ? OR buyer LIKE ? OR staff LIKE ?)");
      const s = `%${req.query.search}%`;
      params.push(s, s, s, s);
    }
    if (req.query.status) { conditions.push('status = ?'); params.push(req.query.status); }
    if (req.query.year) { conditions.push('year = ?'); params.push(req.query.year); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single trade record
router.get('/:id', authenticate, (req, res) => {
  try {
    const record = db.prepare('SELECT * FROM trade_records WHERE id = ?').get(req.params.id);
    if (!record) return res.status(404).json({ error: 'Không tìm thấy bản ghi' });
    res.json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create trade record
router.post('/', authenticate, (req, res) => {
  try {
    const f = req.body;
    const result = db.prepare(`
      INSERT INTO trade_records (
        staff, broker, year, contract_no, contract_date, seller, buyer, status,
        ship_date, qty, origin, pol, lbs, nut, price, retention, double_penalty, notes1,
        advanced_payment, second_payment, final_settlement,
        line_loader, bl_number, eta_caimep, eta_hcm, eta_pod, notes2,
        dhl_fedex_number, dhl_delivered, total_cont, cont_size, bags, gw_bl, nw_bl, advanced_paid_bl,
        date_unload, notes3, certificate_no, date_certificate, nw_bw, outturn_vina, nutcount_vina,
        outturn_claim_1to1, outturn_claim_1to2,
        dem_det, sto, other_fee1, other_fee2, notes6,
        commission_rate, pay_on_behalf, notes7, fee_from_buyer,
        created_by
      ) VALUES (
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
        ?,?,?,
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,
        ?,?,?,?,
        ?
      )
    `).run(
      f.staff||null, f.broker||null, f.year||null, f.contract_no||null, f.contract_date||null,
      f.seller||null, f.buyer||null, f.status||'active',
      f.ship_date||null, f.qty||null, f.origin||null, f.pol||null,
      f.lbs||null, f.nut||null, f.price||null, f.retention||null, f.double_penalty||null, f.notes1||null,
      f.advanced_payment||null, f.second_payment||null, f.final_settlement||null,
      f.line_loader||null, f.bl_number||null, f.eta_caimep||null, f.eta_hcm||null, f.eta_pod||null, f.notes2||null,
      f.dhl_fedex_number||null, f.dhl_delivered||null, f.total_cont||null, f.cont_size||null,
      f.bags||null, f.gw_bl||null, f.nw_bl||null, f.advanced_paid_bl||null,
      f.date_unload||null, f.notes3||null, f.certificate_no||null, f.date_certificate||null,
      f.nw_bw||null, f.outturn_vina||null, f.nutcount_vina||null,
      f.outturn_claim_1to1||null, f.outturn_claim_1to2||null,
      f.dem_det||null, f.sto||null, f.other_fee1||null, f.other_fee2||null, f.notes6||null,
      f.commission_rate||null, f.pay_on_behalf||null, f.notes7||null, f.fee_from_buyer||null,
      req.user.id
    );
    res.status(201).json(db.prepare('SELECT * FROM trade_records WHERE id=?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update trade record
router.put('/:id', authenticate, (req, res) => {
  try {
    const f = req.body;
    db.prepare(`
      UPDATE trade_records SET
        staff=?, broker=?, year=?, contract_no=?, contract_date=?, seller=?, buyer=?, status=?,
        ship_date=?, qty=?, origin=?, pol=?, lbs=?, nut=?, price=?, retention=?, double_penalty=?, notes1=?,
        advanced_payment=?, second_payment=?, final_settlement=?,
        line_loader=?, bl_number=?, eta_caimep=?, eta_hcm=?, eta_pod=?, notes2=?,
        dhl_fedex_number=?, dhl_delivered=?, total_cont=?, cont_size=?, bags=?, gw_bl=?, nw_bl=?, advanced_paid_bl=?,
        date_unload=?, notes3=?, certificate_no=?, date_certificate=?, nw_bw=?, outturn_vina=?, nutcount_vina=?,
        outturn_claim_1to1=?, outturn_claim_1to2=?,
        dem_det=?, sto=?, other_fee1=?, other_fee2=?, notes6=?,
        commission_rate=?, pay_on_behalf=?, notes7=?, fee_from_buyer=?,
        updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(
      f.staff||null, f.broker||null, f.year||null, f.contract_no||null, f.contract_date||null,
      f.seller||null, f.buyer||null, f.status||'active',
      f.ship_date||null, f.qty||null, f.origin||null, f.pol||null,
      f.lbs||null, f.nut||null, f.price||null, f.retention||null, f.double_penalty||null, f.notes1||null,
      f.advanced_payment||null, f.second_payment||null, f.final_settlement||null,
      f.line_loader||null, f.bl_number||null, f.eta_caimep||null, f.eta_hcm||null, f.eta_pod||null, f.notes2||null,
      f.dhl_fedex_number||null, f.dhl_delivered||null, f.total_cont||null, f.cont_size||null,
      f.bags||null, f.gw_bl||null, f.nw_bl||null, f.advanced_paid_bl||null,
      f.date_unload||null, f.notes3||null, f.certificate_no||null, f.date_certificate||null,
      f.nw_bw||null, f.outturn_vina||null, f.nutcount_vina||null,
      f.outturn_claim_1to1||null, f.outturn_claim_1to2||null,
      f.dem_det||null, f.sto||null, f.other_fee1||null, f.other_fee2||null, f.notes6||null,
      f.commission_rate||null, f.pay_on_behalf||null, f.notes7||null, f.fee_from_buyer||null,
      req.params.id
    );
    res.json(db.prepare('SELECT * FROM trade_records WHERE id=?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE trade record
router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM trade_records WHERE id=?').run(req.params.id);
    res.json({ message: 'Đã xóa bản ghi' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
