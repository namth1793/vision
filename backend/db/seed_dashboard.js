/**
 * seed_dashboard.js
 * Fills demo data for: export_records, import_records, bwh_records, buyers, expenses
 * Run: node db/seed_dashboard.js
 */

const db = require('./database');

console.log('🌱 Seeding dashboard tables...');

// Today: 2026-06-03 — dates for "sắp về/chạy/cập" must be within 30 days
const T = (offset) => {
  const d = new Date('2026-06-03');
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};

// ─────────────────────────────────────────────
// BUYERS
// ─────────────────────────────────────────────
db.prepare('DELETE FROM buyers').run();

const ib = db.prepare(`
  INSERT INTO buyers (buyer_name, seller_name, company_address, bank_details, email, phone, notes, created_by)
  VALUES (?,?,?,?,?,?,?,1)
`);

ib.run(
  'Kafferöst GmbH',
  'Vietnam Coffee Export Co.',
  'Kafferöst GmbH\nMusterstraße 45\n20095 Hamburg, Germany',
  'Bank: Deutsche Bank\nAccount: DE89 3704 0044 0532 0130 00\nSwift: DEUTDEDB\nIBAN: DE89370400440532013000',
  'import@kafferost.de',
  '+49 40 12345678',
  'Khách hàng thường xuyên mua cà phê Robusta/Arabica'
);
ib.run(
  'Yokohama Rubber Co.',
  'Mekong Rubber JSC',
  'Yokohama Rubber Co., Ltd\n36-11, Shimbashi 5-chome\nMinato-ku, Tokyo 105-8685, Japan',
  'Bank: MUFG Bank Tokyo\nAccount: 1234567890\nSwift: BOTKJPJT',
  'sourcing@yokohama-rubber.co.jp',
  '+81 3 5400 4500',
  'Mua cao su SVR 10, SVR 20 — L/C at sight'
);
ib.run(
  'Al Futtaim Trading LLC',
  'Mekong Rice Export Ltd',
  'Al Futtaim Trading LLC\nFestival City, Building 3\nDubai, UAE',
  'Bank: Emirates NBD\nAccount: 1011234567890\nSwift: EBILAEAD\nIBAN: AE070260001011234567890',
  'commodity@alfuttaim.ae',
  '+971 4 213 1111',
  'Nhập gạo trắng 5% tấm, gạo Jasmine'
);
ib.run(
  'Premium Nuts LLC',
  'Central Highlands Cashew',
  'Premium Nuts LLC\n1234 Food Industry Blvd\nFresno, CA 93711, USA',
  'Bank: Wells Fargo\nRouting: 121000248\nAccount: 9876543210\nSwift: WFBIUS6S',
  'procurement@premiumnuts.com',
  '+1 559 266 1234',
  'Chuyên nhập điều nhân W240, W180, W320'
);
ib.run(
  'Café de France SAS',
  'Vietnam Arabica Growers',
  'Café de France SAS\n12 Rue de la Paix\n75001 Paris, France',
  'Bank: BNP Paribas Paris\nIBAN: FR76 3000 4028 3798 7654 3210 943\nSwift: BNPAFRPP',
  'green.coffee@cafedefrance.fr',
  '+33 1 42 96 12 34',
  'Mua Arabica Grade 1 từ Tây Nguyên'
);

console.log('✅ buyers:', db.prepare('SELECT COUNT(*) as n FROM buyers').get().n);

// ─────────────────────────────────────────────
// EXPORT RECORDS
// ─────────────────────────────────────────────
db.prepare('DELETE FROM export_records').run();

const ier = db.prepare(`
  INSERT INTO export_records
  (year, staff, lot_number, sale_contract, date, status,
   seller, buyer1, commodity, qty_commodity, price, quantity, quantity_unit,
   pol, pod, shipping_line, etd, eta,
   advance_payment, payment_date1, payment2, payment_date2,
   inspection_date, loading_date, ocean_freight, created_by)
  VALUES (?,?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?, ?,?,?,1)
`);

// SIGNED — sắp chạy (ETD trong 30 ngày)
ier.run(2026,'Nguyễn Văn Nam',1,'EXP-2026-001','2026-05-10','SIGNED',
  'Vietnam Coffee Export Co.','Kafferöst GmbH','Cà phê Robusta',20,4500,20000,'kgs',
  'Đà Nẵng','Hamburg','MSC',T(7),T(35),
  45000,'2026-05-12',45000,'2026-06-20',
  '2026-06-02',T(5),3200);

ier.run(2026,'Trần Thị Hoa',2,'EXP-2026-002','2026-05-15','SIGNED',
  'Mekong Rubber JSC','Yokohama Rubber Co.','Cao su SVR 10',50,1250,50000,'kgs',
  'Hồ Chí Minh','Yokohama','Evergreen',T(12),T(42),
  31250,'2026-05-17',31250,'2026-07-01',
  '2026-06-05',T(10),5500);

ier.run(2026,'Nguyễn Văn Nam',3,'EXP-2026-003','2026-05-20','SIGNED',
  'Central Highlands Cashew','Premium Nuts LLC','Hạt điều W240',10,8200,10000,'kgs',
  'Hải Phòng','Los Angeles','CMA CGM',T(18),T(48),
  41000,'2026-05-22',41000,'2026-07-05',
  '2026-06-08',T(15),1800);

// SIGNED — sắp cập (ETA trong 30 ngày, ETD đã qua)
ier.run(2026,'Trần Thị Hoa',4,'EXP-2026-004','2026-04-20','SIGNED',
  'Vietnam Arabica Growers','Café de France SAS','Cà phê Arabica',15,4200,15000,'kgs',
  'Đà Nẵng','Marseille','CMA CGM',T(-15),T(8),
  31500,'2026-04-22',31500,'2026-05-30',
  '2026-04-18',T(-17),2200);

ier.run(2026,'Nguyễn Văn Nam',5,'EXP-2026-005','2026-04-25','SIGNED',
  'Mekong Rice Export Ltd','Al Futtaim Trading LLC','Gạo trắng 5%',100,460,100000,'kgs',
  'Đà Nẵng','Jebel Ali','APL',T(-20),T(4),
  23000,'2026-04-27',23000,'2026-05-25',
  '2026-04-22',T(-22),3200);

// SIGNED — quá khứ (không sắp chạy/cập, nhưng đã ký)
ier.run(2026,'Nguyễn Văn Nam',6,'EXP-2026-006','2026-03-10','SIGNED',
  'Central Highlands Cashew','Premium Nuts LLC','Hạt điều W180',8,8500,8000,'kgs',
  'Hải Phòng','New York','Cosco','2026-03-28','2026-04-25',
  34000,'2026-03-12',34000,'2026-04-20',
  '2026-03-26','2026-03-26',1600);

ier.run(2026,'Trần Thị Hoa',7,'EXP-2026-007','2026-02-15','SIGNED',
  'Vietnam Coffee Export Co.','Kafferöst GmbH','Cà phê Robusta',25,4400,25000,'kgs',
  'Đà Nẵng','Hamburg','MSC','2026-03-05','2026-04-02',
  55000,'2026-02-17',55000,'2026-04-01',
  '2026-03-02','2026-03-03',3800);

// CHƯA KÝ (status != SIGNED)
ier.run(2026,'Nguyễn Văn Nam',8,'EXP-2026-008','2026-06-01','DRAFT',
  'Vietnam Coffee Export Co.','Kafferöst GmbH','Cà phê Arabica Grade 1',12,4600,12000,'kgs',
  'Đà Nẵng','Hamburg','MSC',null,null,
  null,null,null,null,null,null,2400);

ier.run(2026,'Trần Thị Hoa',9,'EXP-2026-009','2026-05-28','PENDING',
  'Central Highlands Cashew','Premium Nuts LLC','Hạt điều W320',6,7800,6000,'kgs',
  'Hải Phòng','Los Angeles','CMA CGM',null,null,
  null,null,null,null,null,null,1500);

ier.run(2026,'Nguyễn Văn Nam',10,'EXP-2026-010','2026-06-02','DRAFT',
  'Vietnam Pepper Co.','Schwartz Gewürze GmbH','Tiêu đen nguyên hạt',5,3600,5000,'kgs',
  'Đà Nẵng','Hamburg','Hapag-Lloyd',null,null,
  null,null,null,null,null,null,1200);

console.log('✅ export_records:', db.prepare('SELECT COUNT(*) as n FROM export_records').get().n);

// ─────────────────────────────────────────────
// IMPORT RECORDS
// ─────────────────────────────────────────────
db.prepare('DELETE FROM import_records').run();

const iim = db.prepare(`
  INSERT INTO import_records
  (year, staff, agency, sale_contract, date, seller, buyer, status,
   shipment, quantity, origin, pol, price,
   advanced_payment, payment_date1, second_payment, payment_date2, final_settlement, payment_date3,
   line_loader, bl_number, eta_caimep, eta_hcm, eta_pod, notes_bill,
   total_cont, cont_size,
   date_unload, outturn_vina, nutcount_vina, moisture_vina,
   debit_credit_input, notes_final, created_by)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)
`);

// PENDING — ETA sắp về
iim.run(2026,'Nguyễn Văn Nam','Vietnam Nut Agency','IMP-2026-001','2026-05-15',
  'Ivory Coast Cashew Ltd','Vision Trading','PENDING',
  'APR/MAY 2026',500,'Ivory Coast','Abidjan Port',1.95,
  292500,'2026-05-17',null,null,null,null,
  'CMA CGM','BL-IMP-2026-001',null,null,T(9),'ETA Cái Mép ' + T(9),
  '25x40HC','40HC',
  null,null,null,null,
  null,null);

// SIGNED — ETA sắp về
iim.run(2026,'Trần Thị Hoa','Mekong Agency','IMP-2026-002','2026-05-20',
  'Ghana Cocoa Board','Vision Trading','SIGNED',
  'MAY/JUN 2026',300,'Ghana','Tema Port',2.15,
  193500,'2026-05-22',193500,'2026-06-15',null,null,
  'MSC','BL-IMP-2026-002',null,T(16),null,'ETA HCM ' + T(16),
  '15x40HC','40HC',
  null,null,null,null,
  null,null);

// DEPOSITED — ETA sắp về
iim.run(2026,'Nguyễn Văn Nam','Pacific Trading Agency','IMP-2026-003','2026-05-25',
  'Brazil Coffee Export SA','Vision Trading','DEPOSITED',
  'JUN 2026',200,'Brazil','Santos Port',2.80,
  168000,'2026-05-27',null,null,null,null,
  'Hapag-Lloyd','BL-IMP-2026-003',T(22),null,null,'ETA Cái Mép ' + T(22),
  '10x40HC','40HC',
  null,null,null,null,
  null,null);

// PARTIAL — ETA rất gần, đã có outturn (đã kiểm hàng)
iim.run(2026,'Trần Thị Hoa',null,'IMP-2026-004','2026-04-10',
  'Indian Pepper Corp','Vision Trading','PARTIAL',
  'MAY 2026',250,'India','Chennai Port',3.10,
  232500,'2026-04-12',116250,'2026-05-20',null,null,
  'Evergreen','BL-IMP-2026-004',T(5),null,null,'ETA Cái Mép ' + T(5),
  '13x40HC','40HC',
  T(-2),249.8,58.5,11.2,
  null,null);

// DONE — phải thu (debit_credit_input > 0)
iim.run(2026,'Nguyễn Văn Nam',null,'IMP-2026-005','2026-02-10',
  'Ivory Coast Cashew Ltd','Vision Trading','DONE',
  'FEB/MAR 2026',480,'Ivory Coast','Abidjan Port',1.92,
  276480,'2026-02-12',138240,'2026-03-15',138240,'2026-04-20',
  'CMA CGM','BL-IMP-2026-005',null,null,null,null,
  '24x40HC','40HC',
  '2026-03-28',476.5,52.3,10.8,
  2500.00,'CR 2500 USD - short weight claim settled');

// SIGNED — phải trả (debit_credit_input < 0)
iim.run(2026,'Trần Thị Hoa',null,'IMP-2026-006','2026-03-05',
  'Ghana Cocoa Board','Vision Trading','DONE',
  'MAR/APR 2026',320,'Ghana','Tema Port',2.18,
  208320,'2026-03-07',104160,'2026-04-10',104160,'2026-05-01',
  'MSC','BL-IMP-2026-006',null,null,null,null,
  '16x40HC','40HC',
  '2026-04-15',321.2,49.8,10.5,
  -1800.00,'DR 1800 USD - quality deduction applied');

// PENDING — chưa có BL
iim.run(2026,'Nguyễn Văn Nam','Vietnam Trade Agency','IMP-2026-007','2026-06-01',
  'Papua New Guinea Cocoa','Vision Trading','PENDING',
  'JUN/JUL 2026',150,'Papua New Guinea','Lae Port',2.95,
  132750,'2026-06-03',null,null,null,null,
  null,null,null,null,null,null,
  '8x40HC','40HC',
  null,null,null,null,
  null,null);

// PARTIAL — phải thu
iim.run(2026,'Trần Thị Hoa',null,'IMP-2026-008','2026-01-20',
  'Tanzania Coffee Board','Vision Trading','PARTIAL',
  'FEB 2026',180,'Tanzania','Dar es Salaam',3.05,
  164700,'2026-01-22',82350,'2026-02-28',null,null,
  'CMA CGM','BL-IMP-2026-008',null,null,null,null,
  '9x40HC','40HC',
  '2026-03-05',178.8,61.2,11.5,
  3200.00,'CR 3200 USD - weight surplus confirmed');

console.log('✅ import_records:', db.prepare('SELECT COUNT(*) as n FROM import_records').get().n);

// ─────────────────────────────────────────────
// BWH RECORDS (Kho Ngoại Quan)
// ─────────────────────────────────────────────
db.prepare('DELETE FROM bwh_records').run();

const ibwh = db.prepare(`
  INSERT INTO bwh_records
  (year, bwh, no, seller, bl, status,
   eta_vung_tau, eta_hcm, total_cont, total_bags,
   gross_weight, net_weight, origin, commodity,
   price_bwh_inventory, inv_number, note_tt_kho,
   date_into_bwh, supervisor_in, gw_into_bwh, nw_into_bwh,
   deposit, deposit_payment_date, amount_paid, amount_paid_date, note_pay_bwh,
   created_by)
  VALUES (?,?,?,?,?,?, ?,?,?,?, ?,?,?,?, ?,?,?, ?,?,?,?, ?,?,?,?,?,1)
`);

// CHƯA NHẬP KHO — sắp về
ibwh.run(2026,'Kho NQ Đà Nẵng - Khu A','A001',
  'Ivory Coast Cashew Ltd','BL-BWH-2026-001','CHƯA NHẬP KHO',
  T(7),null,'25x40HC',12500,
  637.5,625.0,'Ivory Coast','Hạt điều thô',
  1.95,'INV-BWH-001','Chờ tàu cập cảng Vũng Tàu',
  null,null,null,null,
  15000.00,'2026-05-20',10000.00,'2026-05-25','Còn thiếu 5,000 USD');

ibwh.run(2026,'Kho NQ HCM - Khu B','B001',
  'Ghana Cocoa Board','BL-BWH-2026-002','CHƯA NHẬP KHO',
  null,T(19),'15x40HC',7500,
  318.75,312.5,'Ghana','Hạt ca cao thô',
  2.15,'INV-BWH-002','ETA cảng HCM ' + T(19),
  null,null,null,null,
  22000.00,'2026-05-28',22000.00,'2026-05-28','Đã thanh toán đủ cọc');

// CHƯA BÁN — đang trong kho, chưa bán
ibwh.run(2026,'Kho NQ Đà Nẵng - Khu A','A002',
  'Indian Pepper Corp','BL-BWH-2026-003','CHƯA BÁN',
  null,null,'13x40HC',6500,
  263.25,257.5,'India','Tiêu đen nguyên hạt',
  3.10,'INV-BWH-003','Nhập kho 2026-05-08',
  '2026-05-10','Phạm Thị Mai',264.0,257.5,
  30000.00,'2026-04-20',15000.00,'2026-05-10','Còn lại 15,000 USD');

ibwh.run(2026,'Kho NQ HCM - Khu B','B002',
  'Brazil Coffee Export SA','BL-BWH-2026-004','CHƯA BÁN',
  null,null,'10x40HC',5000,
  202.5,200.0,'Brazil','Cà phê nhân xanh',
  2.80,'INV-BWH-004','Nhập kho 2026-04-25',
  '2026-04-27','Phạm Thị Mai',203.0,200.0,
  18000.00,'2026-04-15',18000.00,'2026-04-20','Đã thanh toán đủ');

ibwh.run(2026,'Kho NQ Đà Nẵng - Khu C','C001',
  'Tanzania Coffee Board','BL-BWH-2026-005','CHƯA BÁN',
  null,null,'9x40HC',4500,
  182.25,178.5,'Tanzania','Cà phê Arabica',
  3.05,'INV-BWH-005','Nhập kho 2026-03-10',
  '2026-03-12','Phạm Thị Mai',183.0,178.5,
  12000.00,'2026-03-01',12000.00,'2026-03-08','Đã TT đủ');

// ĐÃ BÁN — đã bán nhưng chưa xuất
ibwh.run(2026,'Kho NQ Đà Nẵng - Khu A','A003',
  'Ivory Coast Cashew Ltd','BL-BWH-2026-006','ĐÃ BÁN',
  null,null,'20x40HC',10000,
  510.0,500.0,'Ivory Coast','Hạt điều thô',
  1.90,'INV-BWH-006','Đã bán cho Saigon Nut Co.',
  '2026-02-15','Phạm Thị Mai',511.0,500.0,
  25000.00,'2026-01-20',25000.00,'2026-02-10','Đã TT đủ');

ibwh.run(2026,'Kho NQ HCM - Khu B','B003',
  'Papua New Guinea Cocoa','BL-BWH-2026-007','ĐÃ BÁN',
  null,null,'8x40HC',4000,
  162.0,157.5,'Papua New Guinea','Hạt ca cao',
  2.90,'INV-BWH-007','Đã bán cho Marou Chocolate',
  '2026-01-20','Phạm Thị Mai',163.0,157.5,
  16000.00,'2026-01-05',16000.00,'2026-01-15','Đã TT đủ');

// ĐÃ XUẤT KHO
ibwh.run(2026,'Kho NQ Đà Nẵng - Khu C','C002',
  'India Spice Export Board','BL-BWH-2026-008','ĐÃ XUẤT KHO',
  null,null,'6x40HC',3000,
  121.5,118.5,'India','Tiêu đen xay',
  3.20,'INV-BWH-008','Xuất kho giao Việt Thái Sơn 2026-04-20',
  '2026-03-25','Phạm Thị Mai',122.0,118.5,
  10000.00,'2026-03-10',10000.00,'2026-03-20','Đã TT đủ');

console.log('✅ bwh_records:', db.prepare('SELECT COUNT(*) as n FROM bwh_records').get().n);

// ─────────────────────────────────────────────
// EXPENSES — thêm với danh mục mới + bl_number
// ─────────────────────────────────────────────
// Giữ lại data cũ, chỉ thêm mới với categories mới
const iex = db.prepare(`
  INSERT INTO expenses (type,category,amount,currency,date,description,bl_number,submitted_by,approved_by,status)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);

// Xe
iex.run('expense','xe',450000,'VND','2026-05-20','Taxi ra cảng Đà Nẵng nhận lô BL-IMP-2026-001','BL-IMP-2026-001',2,1,'approved');
iex.run('expense','xe',680000,'VND','2026-06-01','Grab đi cảng + về văn phòng kiểm tra lô BL-IMP-2026-004','BL-IMP-2026-004',3,1,'approved');
iex.run('expense','xe',1200000,'VND','2026-05-28','Thuê xe 16 chỗ đón đoàn đối tác Nhật khảo sát kho','BL-BWH-2026-003',2,null,'pending');
iex.run('expense','xe',380000,'VND','2026-06-02','Taxi sân bay Tân Sơn Nhất - khách sạn',null,5,null,'pending');

// Khách sạn
iex.run('expense','khach_san',2400000,'VND','2026-05-22','Khách sạn Mường Thanh ĐN 2 đêm - tiếp đối tác Ghana','BL-BWH-2026-002',2,1,'paid');
iex.run('expense','khach_san',3600000,'VND','2026-05-30','Khách sạn Liberty HCM 3 đêm - đàm phán HĐ nhập cà phê Brazil',null,3,1,'approved');
iex.run('expense','khach_san',1800000,'VND','2026-06-01','Nhà nghỉ Vũng Tàu 1 đêm - theo dõi tàu cập cảng','BL-BWH-2026-001',5,null,'pending');

// Ăn trưa
iex.run('expense','an_trua',850000,'VND','2026-05-25','Cơm văn phòng tuần 4 tháng 5 cho 5 người',null,5,1,'paid');
iex.run('expense','an_trua',2200000,'VND','2026-05-28','Tiếp khách ăn trưa đại diện CMA CGM Vietnam tại Nhà hàng Indochine',null,2,1,'approved');
iex.run('expense','an_trua',650000,'VND','2026-06-02','Ăn trưa làm việc với SGS Vietnam thảo luận kiểm định',null,3,null,'pending');
iex.run('expense','an_trua',480000,'VND','2026-06-03','Cà phê & báo cáo buổi sáng với team kinh doanh',null,5,null,'pending');

// Khác + thu nhập
iex.run('expense','other',9600000,'VND','2026-05-20','Phí kiểm định SGS cho lô IMP-2026-004','BL-IMP-2026-004',1,1,'paid');
iex.run('expense','other',4500000,'VND','2026-05-25','Phí lưu container kho NQ Đà Nẵng tháng 5',null,1,1,'approved');
iex.run('income','other',85000000,'VND','2026-05-30','Thu hoa hồng môi giới lô EXP-2026-001 từ Kafferöst','BL-IMP-2026-001',1,1,'approved');
iex.run('income','other',62000000,'VND','2026-06-01','Thu dịch vụ logistics lô EXP-2026-002 - Yokohama Rubber',null,1,1,'approved');
iex.run('income','other',38000000,'VND','2026-05-15','Thu phí giám định chất lượng Quý 1/2026',null,1,1,'paid');

console.log('✅ expenses added:', db.prepare('SELECT COUNT(*) as n FROM expenses').get().n);

// ─────────────────────────────────────────────
console.log('\n🎉 Dashboard seed complete!');
console.log('   export_records:', db.prepare('SELECT COUNT(*) as n FROM export_records').get().n);
console.log('   import_records:', db.prepare('SELECT COUNT(*) as n FROM import_records').get().n);
console.log('   bwh_records:   ', db.prepare('SELECT COUNT(*) as n FROM bwh_records').get().n);
console.log('   buyers:        ', db.prepare('SELECT COUNT(*) as n FROM buyers').get().n);
console.log('   expenses:      ', db.prepare('SELECT COUNT(*) as n FROM expenses').get().n);
