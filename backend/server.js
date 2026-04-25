const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*';
const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }
});

app.set('io', io);
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Auto-seed if database is empty
try {
  const db = require('./db/database');
  const count = db.prepare('SELECT COUNT(*) as n FROM users').get();
  if (count.n === 0) {
    console.log('📦 Empty database, seeding demo data...');
    require('./db/seed');
  }
} catch (e) {
  console.error('Seed check error:', e.message);
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/warehouse', require('./routes/warehouse'));
app.use('/api/debts', require('./routes/debts'));
app.use('/api/commissions', require('./routes/commissions'));
app.use('/api/files', require('./routes/files'));
app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

io.on('connection', (socket) => {
  socket.on('join_user', (userId) => socket.join(`user_${userId}`));
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5016;
server.listen(PORT, () => {
  console.log(`\n🚀 Vision Backend: http://localhost:${PORT}`);
});
