const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

router.get('/overview', authenticate, (req, res) => {
  try {
    // New tables
    const importCount = db.prepare("SELECT COUNT(*) as count, SUM(CAST(price AS REAL)*CAST(quantity AS REAL)) as total FROM import_records").get();
    const exportCount = db.prepare("SELECT COUNT(*) as count, SUM(CAST(price AS REAL)*CAST(quantity AS REAL)) as total FROM export_records").get();
    const exportSigned = db.prepare("SELECT COUNT(*) as count FROM export_records WHERE status='SIGNED'").get();
    const bwhCount = db.prepare("SELECT COUNT(*) as count FROM bwh_records").get();
    const bwhUnsold = db.prepare("SELECT COUNT(*) as count FROM bwh_records WHERE status='CHƯA BÁN'").get();
    const buyerCount = db.prepare("SELECT COUNT(*) as count FROM buyers").get();
    const pendingExpenses = db.prepare("SELECT COUNT(*) as count FROM expenses WHERE status='pending'").get();
    const recentImports = db.prepare("SELECT id, sale_contract, buyer, price*quantity as contract_value, status FROM import_records ORDER BY created_at DESC LIMIT 5").all();
    const recentExports = db.prepare("SELECT id, sale_contract, buyer1, commodity, status FROM export_records ORDER BY created_at DESC LIMIT 5").all();
    res.json({ importCount, exportCount, exportSigned, bwhCount, bwhUnsold, buyerCount, pendingExpenses, recentImports, recentExports });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/monthly', authenticate, (req, res) => {
  try {
    const importsByMonth = db.prepare(`SELECT strftime('%Y-%m',date) as month, COUNT(*) as count, SUM(CAST(price AS REAL)*CAST(quantity AS REAL)) as total_value FROM import_records WHERE date IS NOT NULL AND date >= date('now','-12 months') GROUP BY month ORDER BY month`).all();
    const exportsByMonth = db.prepare(`SELECT strftime('%Y-%m',date) as month, COUNT(*) as count, SUM(CAST(price AS REAL)*CAST(quantity AS REAL)) as total_value FROM export_records WHERE date IS NOT NULL AND date >= date('now','-12 months') GROUP BY month ORDER BY month`).all();
    const expensesByMonth = db.prepare(`SELECT strftime('%Y-%m',date) as month, SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses, SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income FROM expenses WHERE date >= date('now','-12 months') GROUP BY month ORDER BY month`).all();
    res.json({ importsByMonth, exportsByMonth, expensesByMonth });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/charts', authenticate, (req, res) => {
  try {
    const bwhByStatus = db.prepare("SELECT status, COUNT(*) as count FROM bwh_records GROUP BY status").all();
    const importBySeller = db.prepare("SELECT seller, COUNT(*) as count, SUM(CAST(price AS REAL)*CAST(quantity AS REAL)) as total FROM import_records WHERE seller IS NOT NULL AND seller != '' GROUP BY seller ORDER BY total DESC LIMIT 5").all();
    const exportByBuyer = db.prepare("SELECT buyer1, COUNT(*) as count, SUM(CAST(price AS REAL)*CAST(quantity AS REAL)) as total FROM export_records WHERE buyer1 IS NOT NULL AND buyer1 != '' GROUP BY buyer1 ORDER BY total DESC LIMIT 5").all();
    const expensesByMonth = db.prepare(`SELECT strftime('%Y-%m',date) as month, SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses, SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income FROM expenses WHERE date >= date('now','-12 months') GROUP BY month ORDER BY month`).all();
    res.json({ bwhByStatus, importBySeller, exportByBuyer, expensesByMonth });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/dashboard', authenticate, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // === PANEL 1: XUẤT ===
    const exportSignedByCommodity = db.prepare(
      "SELECT commodity, COUNT(*) as count FROM export_records WHERE status='SIGNED' AND commodity IS NOT NULL AND commodity!='' GROUP BY commodity ORDER BY count DESC"
    ).all();
    const exportUnsigned = db.prepare(
      "SELECT id, sale_contract, buyer1, commodity, status, date, etd, eta FROM export_records WHERE (status IS NULL OR status = '' OR status != 'SIGNED') ORDER BY created_at DESC"
    ).all();
    const exportETDSoon = db.prepare(
      "SELECT id, sale_contract, buyer1, commodity, etd, eta, pol, pod, shipping_line FROM export_records WHERE etd IS NOT NULL AND etd != '' AND etd >= ? AND etd <= ? ORDER BY etd ASC"
    ).all(today, in30);
    const exportETASoon = db.prepare(
      "SELECT id, sale_contract, buyer1, commodity, etd, eta, pol, pod, shipping_line FROM export_records WHERE eta IS NOT NULL AND eta != '' AND eta >= ? AND eta <= ? ORDER BY eta ASC"
    ).all(today, in30);

    // === PANEL 2: NHẬP ===
    const importByStatus = db.prepare(
      "SELECT status, COUNT(*) as count FROM import_records WHERE status IS NOT NULL AND status != '' GROUP BY status ORDER BY count DESC"
    ).all();
    const importPendingList = db.prepare(
      "SELECT id, sale_contract, seller, buyer, status, quantity, price, date FROM import_records ORDER BY created_at DESC LIMIT 50"
    ).all();
    const importETDSoon = db.prepare(
      `SELECT id, sale_contract, seller, quantity, eta_caimep, eta_hcm, eta_pod, bl_number, total_cont
       FROM import_records
       WHERE (eta_pod IS NOT NULL AND eta_pod != '' AND eta_pod >= ? AND eta_pod <= ?)
          OR (eta_hcm IS NOT NULL AND eta_hcm != '' AND eta_hcm >= ? AND eta_hcm <= ?)
          OR (eta_caimep IS NOT NULL AND eta_caimep != '' AND eta_caimep >= ? AND eta_caimep <= ?)
       ORDER BY COALESCE(eta_pod, eta_hcm, eta_caimep) ASC`
    ).all(today, in30, today, in30, today, in30);
    const importReceivable = db.prepare(
      "SELECT id, sale_contract, seller, buyer, debit_credit_input, final_settlement, payment_date3 FROM import_records WHERE debit_credit_input IS NOT NULL AND CAST(debit_credit_input AS REAL) > 0 ORDER BY created_at DESC"
    ).all();
    const importPayable = db.prepare(
      "SELECT id, sale_contract, seller, buyer, debit_credit_input, final_settlement, payment_date3 FROM import_records WHERE debit_credit_input IS NOT NULL AND CAST(debit_credit_input AS REAL) < 0 ORDER BY created_at DESC"
    ).all();

    // === PANEL 3: KHO NQ ===
    const bwhAll = db.prepare(
      "SELECT id, bwh, no, seller, bl, status, commodity, net_weight, eta_vung_tau, eta_hcm, total_cont FROM bwh_records ORDER BY CASE status WHEN 'CHƯA NHẬP KHO' THEN 1 WHEN 'CHƯA BÁN' THEN 2 WHEN 'ĐÃ BÁN' THEN 3 WHEN 'ĐÃ XUẤT KHO' THEN 4 ELSE 5 END, created_at DESC"
    ).all();
    const bwhETDSoon = db.prepare(
      `SELECT id, bwh, bl, seller, commodity, eta_vung_tau, eta_hcm, total_cont, net_weight
       FROM bwh_records
       WHERE (eta_vung_tau IS NOT NULL AND eta_vung_tau != '' AND eta_vung_tau >= ? AND eta_vung_tau <= ?)
          OR (eta_hcm IS NOT NULL AND eta_hcm != '' AND eta_hcm >= ? AND eta_hcm <= ?)
       ORDER BY COALESCE(eta_vung_tau, eta_hcm) ASC`
    ).all(today, in30, today, in30);
    const bwhDebts = db.prepare(
      "SELECT id, bwh, bl, seller, commodity, deposit, deposit_payment_date, amount_paid, amount_paid_date, price_bwh_inventory, net_weight FROM bwh_records WHERE (deposit IS NOT NULL AND CAST(deposit AS REAL) > 0) OR (amount_paid IS NOT NULL AND CAST(amount_paid AS REAL) > 0) ORDER BY created_at DESC"
    ).all();

    // === PANEL 4: LỊCH KIỂM HÀNG ===
    const inspectionBL = db.prepare(
      "SELECT id, sale_contract, bl_number, seller, eta_pod, eta_hcm, eta_caimep, date_unload, outturn_vina, certificate_no FROM import_records WHERE bl_number IS NOT NULL AND bl_number != '' ORDER BY COALESCE(date_unload, eta_pod, eta_hcm, eta_caimep) ASC"
    ).all();
    const expenseTotals = db.prepare(
      "SELECT type, SUM(CAST(amount AS REAL)) as total FROM expenses WHERE status IN ('approved','paid') GROUP BY type"
    ).all();
    const expensePending = db.prepare(
      "SELECT type, SUM(CAST(amount AS REAL)) as total FROM expenses WHERE status = 'pending' GROUP BY type"
    ).all();

    res.json({
      exportSignedByCommodity, exportUnsigned, exportETDSoon, exportETASoon,
      importByStatus, importPendingList, importETDSoon, importReceivable, importPayable,
      bwhAll, bwhETDSoon, bwhDebts,
      inspectionBL, expenseTotals, expensePending
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
