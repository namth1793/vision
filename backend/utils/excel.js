const XLSX = require('xlsx');

function titleCase(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Header format: "Nhãn tiếng Việt [field_key]" — bracket suffix is the
// authoritative match key on import, so re-ordering/renaming columns or
// editing labels never breaks the round-trip. Fields without a hand-written
// label (e.g. DB columns not bound to any input yet) fall back to a
// title-cased version of the field key.
function buildTemplateBuffer(fields, labels, sheetName = 'Data') {
  const headers = ['ID (để trống nếu tạo mới) [id]', ...fields.map(f => `${labels[f] || titleCase(f)} [${f}]`)];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  ws['!cols'] = headers.map(() => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function parseUploadBuffer(buffer, fields) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  const fieldSet = new Set(fields);
  return raw
    .map(row => {
      const rec = {};
      for (const header of Object.keys(row)) {
        const bracket = header.match(/\[(\w+)\]\s*$/);
        const key = bracket ? bracket[1] : null;
        if (key && (key === 'id' || fieldSet.has(key))) {
          const val = row[header];
          rec[key] = val === '' ? null : val;
        }
      }
      return rec;
    })
    .filter(r => Object.keys(r).some(k => k !== 'id' && r[k] != null && r[k] !== ''));
}

// Insert or update rows in bulk: rows with a matching existing `id` are
// updated, everything else is inserted as a new record.
function bulkUpsert(db, table, fields, rows, userId) {
  const insertStmt = db.prepare(
    `INSERT INTO ${table} (${fields.join(',')}, created_by) VALUES (${fields.map(() => '?').join(',')}, ?)`
  );
  const updateStmt = db.prepare(
    `UPDATE ${table} SET ${fields.map(f => `${f}=?`).join(',')}, updated_at=datetime('now','localtime') WHERE id=?`
  );
  const findStmt = db.prepare(`SELECT id FROM ${table} WHERE id=?`);

  let created = 0, updated = 0;
  const errors = [];

  rows.forEach((row, idx) => {
    try {
      const vals = fields.map(f => (row[f] === undefined || row[f] === '') ? null : row[f]);
      if (row.id && findStmt.get(row.id)) {
        updateStmt.run(...vals, row.id);
        updated++;
      } else {
        insertStmt.run(...vals, userId);
        created++;
      }
    } catch (e) {
      errors.push({ row: idx + 2, error: e.message });
    }
  });

  return { created, updated, errors };
}

module.exports = { buildTemplateBuffer, parseUploadBuffer, bulkUpsert };
