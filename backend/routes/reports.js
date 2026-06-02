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

module.exports = router;
