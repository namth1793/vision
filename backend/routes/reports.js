const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

router.get('/overview', authenticate, (req, res) => {
  try {
    const totalContracts = db.prepare("SELECT COUNT(*) as count, SUM(total_value) as total FROM contracts WHERE status NOT IN ('cancelled','draft')").get();
    const activeContracts = db.prepare("SELECT COUNT(*) as count FROM contracts WHERE status='active'").get();
    const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('cancelled')").get();
    const inTransitOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status='in_transit'").get();
    const receivables = db.prepare("SELECT SUM(original_amount-paid_amount) as total, COUNT(*) as count FROM debts WHERE type='receivable' AND status NOT IN ('paid')").get();
    const payables = db.prepare("SELECT SUM(original_amount-paid_amount) as total, COUNT(*) as count FROM debts WHERE type='payable' AND status NOT IN ('paid')").get();
    const overdueDebts = db.prepare("SELECT COUNT(*) as count FROM debts WHERE status='overdue'").get();
    const pendingCommissions = db.prepare("SELECT SUM(amount) as total, COUNT(*) as count FROM commissions WHERE status='pending'").get();
    const pendingExpenses = db.prepare("SELECT COUNT(*) as count FROM expenses WHERE status='pending'").get();
    const warehouseStock = db.prepare("SELECT COUNT(DISTINCT product) as products, SUM(CASE WHEN type='in' THEN quantity ELSE -quantity END) as total_qty FROM warehouse_entries").get();
    const recentContracts = db.prepare("SELECT c.*, u.name as seller_name FROM contracts c LEFT JOIN users u ON c.seller_id=u.id ORDER BY c.created_at DESC LIMIT 5").all();
    const recentOrders = db.prepare("SELECT o.*, c.contract_no FROM orders o LEFT JOIN contracts c ON o.contract_id=c.id ORDER BY o.created_at DESC LIMIT 5").all();
    res.json({ totalContracts, activeContracts, totalOrders, inTransitOrders, receivables, payables, overdueDebts, pendingCommissions, pendingExpenses, warehouseStock, recentContracts, recentOrders });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/monthly', authenticate, (req, res) => {
  try {
    const contractsByMonth = db.prepare(`SELECT strftime('%Y-%m',sign_date) as month, COUNT(*) as count, SUM(total_value) as total_value FROM contracts WHERE sign_date IS NOT NULL AND sign_date >= date('now','-12 months') GROUP BY month ORDER BY month`).all();
    const ordersByMonth = db.prepare(`SELECT strftime('%Y-%m',shipment_date) as month, COUNT(*) as count, type FROM orders WHERE shipment_date IS NOT NULL AND shipment_date >= date('now','-12 months') GROUP BY month, type ORDER BY month`).all();
    const expensesByMonth = db.prepare(`SELECT strftime('%Y-%m',date) as month, SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses, SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income FROM expenses WHERE date >= date('now','-12 months') GROUP BY month ORDER BY month`).all();
    res.json({ contractsByMonth, ordersByMonth, expensesByMonth });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/charts', authenticate, (req, res) => {
  try {
    const contractByType = db.prepare("SELECT type, COUNT(*) as count, SUM(total_value) as total FROM contracts WHERE status!='cancelled' GROUP BY type").all();
    const orderByStatus = db.prepare("SELECT status, COUNT(*) as count FROM orders GROUP BY status").all();
    const topCustomers = db.prepare("SELECT customer_name, customer_country, COUNT(*) as contracts, SUM(total_value) as total FROM contracts WHERE status!='cancelled' GROUP BY customer_name ORDER BY total DESC LIMIT 5").all();
    const debtSummary = db.prepare("SELECT type, SUM(original_amount) as total, SUM(paid_amount) as paid, SUM(original_amount-paid_amount) as remaining FROM debts GROUP BY type").all();
    const commissionByBroker = db.prepare("SELECT u.name, SUM(cm.amount) as total, cm.status FROM commissions cm LEFT JOIN users u ON cm.broker_id=u.id GROUP BY cm.broker_id, cm.status").all();
    res.json({ contractByType, orderByStatus, topCustomers, debtSummary, commissionByBroker });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
