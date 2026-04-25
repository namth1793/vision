const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'vision_secret_2024_xnk';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  }
  next();
};

module.exports = { authenticate, authorize, JWT_SECRET };
