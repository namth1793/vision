const bcrypt = require('bcryptjs');
const db = require('./database');

console.log('🌱 Seeding Vision database...');

// Clear tables in dependency order
db.exec(`
  DELETE FROM notifications;
  DELETE FROM pipeline_items;
  DELETE FROM pipeline_stages;
  DELETE FROM expenses;
  DELETE FROM commissions;
  DELETE FROM debt_payments;
  DELETE FROM debts;
  DELETE FROM warehouse_entries;
  DELETE FROM orders;
  DELETE FROM contracts;
  DELETE FROM files;
  DELETE FROM users;
  DELETE FROM sqlite_sequence;
`);

// Users - capture actual IDs
const hash = (p) => bcrypt.hashSync(p, 10);
const iu = db.prepare(`INSERT INTO users (name,email,password_hash,role,department,phone) VALUES (?,?,?,?,?,?)`);
const adminId  = iu.run('Admin Vision',      'admin@vision.vn',      hash('admin123'),  'admin',  'Ban Giám Đốc', '0901234567').lastInsertRowid;
const seller1  = iu.run('Nguyễn Văn Nam',    'nam.nguyen@vision.vn', hash('seller123'), 'seller', 'Kinh Doanh',   '0912345678').lastInsertRowid;
const seller2  = iu.run('Trần Thị Hoa',      'hoa.tran@vision.vn',   hash('seller123'), 'seller', 'Kinh Doanh',   '0923456789').lastInsertRowid;
const brokerId = iu.run('Lê Văn Bình',       'binh.le@vision.vn',    hash('broker123'), 'broker', 'Đối Tác',      '0934567890').lastInsertRowid;
const staffId  = iu.run('Phạm Thị Mai',      'mai.pham@vision.vn',   hash('staff123'),  'staff',  'Hành Chính',   '0945678901').lastInsertRowid;

// Contracts
const ic = db.prepare(`INSERT INTO contracts (contract_no,type,customer_name,customer_country,product,quantity,unit,unit_price,total_value,currency,status,seller_id,broker_id,sign_date,delivery_date,payment_terms,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const c1  = ic.run('VN-CF-2024-001','export','Kafferöst GmbH','Đức','Cà phê Robusta',20,'tấn',4500,90000,'USD','active',seller1,brokerId,'2024-01-15','2024-03-15','T/T 30 ngày',adminId).lastInsertRowid;
const c2  = ic.run('VN-RS-2024-002','export','Yokohama Rubber Co.','Nhật Bản','Cao su SVR 10',50,'tấn',1200,60000,'USD','active',seller1,brokerId,'2024-02-01','2024-04-01','L/C at sight',adminId).lastInsertRowid;
const c3  = ic.run('VN-CW-2024-003','export','Premium Nuts LLC','Mỹ','Hạt điều nhân W240',10,'tấn',8000,80000,'USD','completed',seller2,null,'2024-02-10','2024-04-10','T/T 100% trước',adminId).lastInsertRowid;
const c4  = ic.run('VN-RC-2024-004','export','Al Futtaim Trading','UAE','Gạo trắng 5% tấm',100,'tấn',450,45000,'USD','active',seller2,brokerId,'2024-03-01','2024-05-01','L/C 60 ngày',adminId).lastInsertRowid;
const c5  = ic.run('VN-PP-2024-005','export','Schwartz Gewürze','Đức','Tiêu đen nguyên hạt',5,'tấn',3500,17500,'USD','draft',seller1,null,'2024-03-20','2024-06-20','T/T 50/50',adminId).lastInsertRowid;
const c6  = ic.run('TH-RC-2024-001','import','Thai Rice Export Co.','Thái Lan','Gạo Jasmine',200,'tấn',380,76000,'USD','active',seller1,brokerId,'2024-01-20','2024-03-20','L/C at sight',adminId).lastInsertRowid;
const c7  = ic.run('AU-WH-2024-001','import','Grains Australia Ltd','Úc','Bột mì số 11',500,'tấn',250,125000,'USD','completed',seller2,null,'2024-02-15','2024-04-15','T/T 30 ngày',adminId).lastInsertRowid;
const c8  = ic.run('US-CN-2024-001','import','Iowa Grain Corp','Mỹ','Ngô vàng non-GMO',300,'tấn',220,66000,'USD','active',seller1,brokerId,'2024-03-05','2024-05-05','L/C 90 ngày',adminId).lastInsertRowid;
const c9  = ic.run('VN-CF-2024-009','export','Café de France SAS','Pháp','Cà phê Arabica',15,'tấn',4200,63000,'USD','active',seller2,brokerId,'2024-03-10','2024-05-10','T/T 30 ngày',adminId).lastInsertRowid;
const c10 = ic.run('VN-CW-2024-010','export','Berlin Food Imports','Đức','Hạt điều nhân W180',8,'tấn',8200,65600,'USD','draft',seller1,null,'2024-04-01','2024-06-01','T/T 50/50',adminId).lastInsertRowid;

// Orders
const io2 = db.prepare(`INSERT INTO orders (order_no,contract_id,type,product,quantity,unit,status,shipment_date,arrival_date,port_loading,port_discharge,vessel,bill_of_lading,freight,freight_currency,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const o1 = io2.run('ORD-2024-001',c1,'export','Cà phê Robusta',20,'tấn','completed','2024-03-10','2024-04-05','Cảng Đà Nẵng','Hamburg Port','MSC DIANA','MSCDN240310A',2800,'USD',adminId).lastInsertRowid;
const o2 = io2.run('ORD-2024-002',c2,'export','Cao su SVR 10',50,'tấn','in_transit','2024-03-25','2024-04-25','Cảng Hồ Chí Minh','Yokohama Port','EVER GIVEN II','EVHCM240325B',5500,'USD',adminId).lastInsertRowid;
const o3 = io2.run('ORD-2024-003',c3,'export','Hạt điều nhân W240',10,'tấn','completed','2024-04-05','2024-05-01','Cảng Hải Phòng','Los Angeles','CMA CGM MARCO POLO','CMAHN240405C',1800,'USD',adminId).lastInsertRowid;
const o4 = io2.run('ORD-2024-004',c4,'export','Gạo trắng 5% tấm',100,'tấn','in_transit','2024-04-10','2024-05-15','Cảng Đà Nẵng','Jebel Ali','APL YANGON','APLDN240410D',3200,'USD',adminId).lastInsertRowid;
const o5 = io2.run('ORD-2024-005',c6,'import','Gạo Jasmine',200,'tấn','arrived','2024-03-15','2024-04-10','Bangkok Port','Cảng Đà Nẵng','THAI STAR','THBKK240315E',2400,'USD',adminId).lastInsertRowid;
const o6 = io2.run('ORD-2024-006',c7,'import','Bột mì số 11',500,'tấn','completed','2024-04-10','2024-05-20','Port of Melbourne','Cảng Hồ Chí Minh','PACIFIC VOYAGER','PVMEL240410F',8500,'USD',adminId).lastInsertRowid;
const o7 = io2.run('ORD-2024-007',c8,'import','Ngô vàng non-GMO',300,'tấn','in_transit','2024-04-20','2024-06-01','Port of Seattle','Cảng Hải Phòng','EVERGREEN PRIDE','EGSEA240420G',6200,'USD',adminId).lastInsertRowid;
const o8 = io2.run('ORD-2024-008',c9,'export','Cà phê Arabica',15,'tấn','pending',null,null,'Cảng Đà Nẵng','Marseille Port',null,null,2200,'USD',adminId).lastInsertRowid;

// Warehouse entries
const iw = db.prepare(`INSERT INTO warehouse_entries (entry_no,order_id,product,quantity,unit,warehouse_location,type,date,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`);
iw.run('WH-IN-001',o5,'Gạo Jasmine',200,'tấn','Kho ngoại quan Đà Nẵng - Khu A','in','2024-04-10','Nhập kho từ lô ORD-2024-005',staffId);
iw.run('WH-OUT-001',o5,'Gạo Jasmine',150,'tấn','Kho ngoại quan Đà Nẵng - Khu A','out','2024-04-15','Xuất giao cho khách hàng nội địa',staffId);
iw.run('WH-IN-002',o6,'Bột mì số 11',500,'tấn','Kho ngoại quan HCM - Khu B','in','2024-05-20','Nhập kho từ lô ORD-2024-006',staffId);
iw.run('WH-OUT-002',o6,'Bột mì số 11',300,'tấn','Kho ngoại quan HCM - Khu B','out','2024-05-25','Xuất giao lô 1',staffId);
iw.run('WH-IN-003',o1,'Cà phê Robusta',20,'tấn','Kho ngoại quan Đà Nẵng - Khu C','in','2024-03-10','Chờ xuất tàu',staffId);
iw.run('WH-OUT-003',o1,'Cà phê Robusta',20,'tấn','Kho ngoại quan Đà Nẵng - Khu C','out','2024-03-12','Xuất tàu MSC DIANA',staffId);

// Debts
const id2 = db.prepare(`INSERT INTO debts (type,party_name,party_country,original_amount,paid_amount,currency,due_date,status,contract_id,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
const d1 = id2.run('receivable','Kafferöst GmbH','Đức',90000,45000,'USD','2024-05-15','partial',c1,'Thanh toán 50% trước, còn lại T/T 30 ngày sau giao hàng',adminId).lastInsertRowid;
const d2 = id2.run('receivable','Yokohama Rubber Co.','Nhật Bản',60000,0,'USD','2024-05-01','pending',c2,'L/C at sight - chờ tàu cập cảng',adminId).lastInsertRowid;
const d3 = id2.run('receivable','Al Futtaim Trading','UAE',45000,0,'USD','2024-06-15','pending',c4,'L/C 60 ngày',adminId).lastInsertRowid;
const d4 = id2.run('receivable','Premium Nuts LLC','Mỹ',80000,80000,'USD','2024-05-10','paid',c3,'Đã thanh toán đủ',adminId).lastInsertRowid;
const d5 = id2.run('receivable','Café de France SAS','Pháp',63000,0,'USD','2024-06-10','pending',c9,'T/T 30 ngày sau B/L',adminId).lastInsertRowid;
const d6 = id2.run('payable','Thai Rice Export Co.','Thái Lan',76000,76000,'USD','2024-04-20','paid',c6,'Đã thanh toán đủ',adminId).lastInsertRowid;
const d7 = id2.run('payable','Grains Australia Ltd','Úc',125000,125000,'USD','2024-05-15','paid',c7,'Đã thanh toán đủ',adminId).lastInsertRowid;
const d8 = id2.run('payable','Iowa Grain Corp','Mỹ',66000,0,'USD','2024-07-05','pending',c8,'L/C 90 ngày',adminId).lastInsertRowid;
const d9 = id2.run('receivable','Yokohama Rubber Co.','Nhật Bản',60000,0,'USD','2024-04-25','overdue',c2,'Quá hạn 15 ngày',adminId).lastInsertRowid;
const d10= id2.run('payable','MSC Vietnam','Việt Nam',15200000,0,'VND',null,'pending',null,'Cước vận chuyển các lô Q1/2024',adminId).lastInsertRowid;

// Debt payments
const idp = db.prepare(`INSERT INTO debt_payments (debt_id,amount,currency,payment_date,method,reference,notes,created_by) VALUES (?,?,?,?,?,?,?,?)`);
idp.run(d1,45000,'USD','2024-03-20','bank_transfer','TT240320001','Thanh toán 50% theo hợp đồng',staffId);
idp.run(d6,76000,'USD','2024-04-18','bank_transfer','TT240418001','Thanh toán đủ L/C',staffId);
idp.run(d7,125000,'USD','2024-05-12','bank_transfer','TT240512001','Thanh toán đủ',staffId);
idp.run(d4,80000,'USD','2024-05-08','bank_transfer','TT240508001','Thanh toán 100%',staffId);

// Commissions
const icm = db.prepare(`INSERT INTO commissions (contract_id,broker_id,rate,amount,currency,status,payment_date,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?)`);
icm.run(c1,brokerId,1.0,900,'USD','paid','2024-04-01','Hoa hồng 1% HĐ VN-CF-2024-001',adminId);
icm.run(c2,brokerId,0.8,480,'USD','approved',null,'Hoa hồng 0.8% HĐ VN-RS-2024-002',adminId);
icm.run(c4,brokerId,0.5,225,'USD','pending',null,'Hoa hồng 0.5% HĐ VN-RC-2024-004',adminId);
icm.run(c6,brokerId,0.8,608,'USD','paid','2024-04-20','Hoa hồng 0.8% HĐ TH-RC-2024-001',adminId);
icm.run(c8,brokerId,0.5,330,'USD','pending',null,'Hoa hồng 0.5% HĐ US-CN-2024-001',adminId);
icm.run(c9,brokerId,1.0,630,'USD','approved',null,'Hoa hồng 1% HĐ VN-CF-2024-009',adminId);

// Pipeline stages
const ips = db.prepare(`INSERT INTO pipeline_stages (name,order_index,color) VALUES (?,?,?)`);
const s1 = ips.run('Tiềm Năng',1,'#94a3b8').lastInsertRowid;
const s2 = ips.run('Đàm Phán',2,'#f59e0b').lastInsertRowid;
const s3 = ips.run('Đã Ký Hợp Đồng',3,'#3b82f6').lastInsertRowid;
const s4 = ips.run('Đang Thực Hiện',4,'#8b5cf6').lastInsertRowid;
const s5 = ips.run('Hoàn Thành',5,'#10b981').lastInsertRowid;

// Pipeline items
const ipi = db.prepare(`INSERT INTO pipeline_items (stage_id,title,description,contract_id,assigned_to,priority,due_date,created_by) VALUES (?,?,?,?,?,?,?,?)`);
ipi.run(s1,'Khách hàng tiềm năng - Pháp','Liên hệ nhà nhập khẩu cà phê tại Lyon',null,seller1,'high','2024-05-30',adminId);
ipi.run(s1,'Nguồn cung cao su mới - Malaysia','Tìm nhà cung cấp cao su SVR 20 giá tốt',null,seller2,'medium','2024-05-15',adminId);
ipi.run(s2,'Đàm phán HĐ tiêu đen - Hà Lan','Báo giá và điều khoản thanh toán',c5,seller1,'high','2024-05-10',adminId);
ipi.run(s2,'Đàm phán nhập bột mì - Canada','Xem xét điều khoản L/C',null,seller2,'medium','2024-05-20',adminId);
ipi.run(s3,'HĐ xuất hạt điều Berlin đã ký',null,c10,seller1,'medium','2024-06-01',adminId);
ipi.run(s3,'HĐ xuất tiêu Đức đã ký',null,c5,seller1,'high','2024-06-20',adminId);
ipi.run(s4,'Lô cà phê Pháp đang thực hiện','Chuẩn bị chứng từ xuất khẩu',c9,seller1,'high','2024-05-15',adminId);
ipi.run(s4,'Lô ngô Mỹ đang vận chuyển','Theo dõi tàu EVERGREEN PRIDE',c8,seller2,'medium','2024-06-01',adminId);
ipi.run(s4,'Lô cao su Nhật đang vận chuyển','Tàu EVER GIVEN II trên đường đến Yokohama',c2,seller2,'high','2024-04-30',adminId);
ipi.run(s5,'HĐ hạt điều Mỹ hoàn thành',null,c3,seller2,'low',null,adminId);
ipi.run(s5,'HĐ bột mì Úc hoàn thành',null,c7,seller1,'low',null,adminId);
ipi.run(s5,'HĐ cà phê Đức hoàn thành',null,c1,seller2,'low',null,adminId);

// Expenses
const iex = db.prepare(`INSERT INTO expenses (type,category,amount,currency,date,description,submitted_by,approved_by,status) VALUES (?,?,?,?,?,?,?,?,?)`);
iex.run('expense','travel',3500000,'VND','2024-03-15','Vé máy bay HAN-SGN công tác ký HĐ với đối tác Úc',seller1,adminId,'approved');
iex.run('expense','entertainment',2800000,'VND','2024-03-20','Tiếp khách đối tác Nhật tại nhà hàng Indochine',seller1,adminId,'approved');
iex.run('expense','travel',5200000,'VND','2024-04-05','Vé máy bay + khách sạn ĐN-HCM 3 ngày',seller2,adminId,'paid');
iex.run('expense','office',850000,'VND','2024-04-10','Văn phòng phẩm Q1/2024 - giấy, mực in',staffId,adminId,'paid');
iex.run('expense','transport',420000,'VND','2024-04-12','Taxi đi về cảng Đà Nẵng kiểm tra lô hàng',staffId,adminId,'approved');
iex.run('income','other',50000000,'VND','2024-04-15','Thu tiền hoa hồng từ đối tác Lê Văn Bình Q1',adminId,null,'approved');
iex.run('expense','travel',7800000,'VND','2024-04-20','Công tác Hà Nội gặp khách hàng mới 4 ngày',seller1,null,'pending');
iex.run('expense','entertainment',1500000,'VND','2024-04-22','Coffee meeting với nhà cung cấp mới',seller2,null,'pending');
iex.run('expense','office',2200000,'VND','2024-04-25','Mua printer mực + giấy A4 cho phòng kinh doanh',staffId,null,'pending');
iex.run('expense','other',9600000,'VND','2024-04-25','Phí kiểm định chất lượng hàng hóa - SGS Vietnam',adminId,adminId,'approved');

// Notifications
const inf = db.prepare(`INSERT INTO notifications (user_id,title,message,type,link) VALUES (?,?,?,?,?)`);
inf.run(null,'Hợp đồng mới được ký','VN-CF-2024-009 đã ký với Café de France SAS - 63,000 USD','success','/contracts');
inf.run(seller1,'Công nợ sắp đến hạn','Receivable từ Kafferöst GmbH còn 45,000 USD - đến hạn 15/05','warning','/debts');
inf.run(adminId,'Hoa hồng chờ duyệt','Lê Văn Bình có 2 khoản hoa hồng chờ duyệt','info','/commissions');
inf.run(null,'Đơn hàng cập cảng','ORD-2024-005 đã cập cảng Đà Nẵng - 200 tấn gạo Jasmine','success','/orders');
inf.run(seller2,'Chi phí chờ duyệt','Bạn có 2 khoản chi phí đang chờ duyệt','info','/expenses');
inf.run(null,'Cảnh báo công nợ quá hạn','Công nợ từ Yokohama Rubber Co. đã quá hạn 15 ngày - 60,000 USD','error','/debts');

console.log('✅ Database seeded successfully!');
console.log(`   Users: admin(${adminId}), seller1(${seller1}), seller2(${seller2}), broker(${brokerId}), staff(${staffId})`);
console.log('   admin@vision.vn / admin123');
console.log('   nam.nguyen@vision.vn / seller123');
console.log('   binh.le@vision.vn / broker123');
console.log('   mai.pham@vision.vn / staff123');
