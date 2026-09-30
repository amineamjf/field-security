// سيرفر بسيط: Express + ملف JSON. للإنتاج: HTTPS + قاعدة بيانات حقيقية.
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123'; // غيّرها
// سجل الأجهزة: لكل جهاز سرّ خاص للتوقيع
const DEVICES = {
  'dev-001': { name: 'عامل 1', secret: 'change-me-001' },
  'dev-002': { name: 'عامل 2', secret: 'change-me-002' },
};

const DATA = path.join(__dirname, 'data.json');
const UP = path.join(__dirname, 'uploads');
fs.mkdirSync(UP, { recursive: true });
const db = fs.existsSync(DATA)
  ? JSON.parse(fs.readFileSync(DATA, 'utf8'))
  : { records: [], commands: {}, seen: {} };
const save = () => fs.writeFileSync(DATA, JSON.stringify(db));

const hmac = (secret, msg) => crypto.createHmac('sha256', secret).update(msg).digest('hex');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const cmdFor = (id) => db.commands[id] || { state: 'running', mode: 'invoices' };

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => { res.set('Access-Control-Allow-Origin', '*'); res.set('Access-Control-Allow-Headers', '*'); if (req.method === 'OPTIONS') return res.sendStatus(204); next(); });
app.use('/uploads', express.static(UP));
app.use('/worker', express.static(path.join(__dirname, '../worker-app')));
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));

const admin = (req, res, next) => (req.get('x-admin-key') === ADMIN_KEY ? next() : res.sendStatus(401));

// نبضة: الجهاز يثبت وجوده ويستلم الأمر الحالي
app.post('/api/heartbeat', (req, res) => {
  const { deviceId, ts, lat, lng, battery, sig } = req.body;
  const d = DEVICES[deviceId];
  if (!d || !safeEq(String(sig), hmac(d.secret, `${deviceId}|${ts}`))) return res.sendStatus(401);
  db.seen[deviceId] = { at: Date.now(), deviceTs: ts, lat, lng, battery };
  save();
  res.json({ command: cmdFor(deviceId), serverTime: Date.now() });
});

// مزامنة السجلات المخزنة أوفلاين
app.post('/api/sync', (req, res) => {
  const { deviceId, records = [] } = req.body;
  const d = DEVICES[deviceId];
  if (!d) return res.sendStatus(401);
  const accepted = [];
  for (const r of records) {
    const imgHash = sha256(r.image || '');
    const expected = hmac(d.secret, `${r.id}|${r.ts}|${r.lat}|${r.lng}|${imgHash}`);
    if (!safeEq(String(r.sig), expected)) continue; // توقيع غير صالح = رفض
    if (!db.records.some((x) => x.id === r.id)) {
      const file = `${crypto.randomUUID()}.jpg`;
      fs.writeFileSync(path.join(UP, file), Buffer.from(r.image.split(',')[1], 'base64'));
      const flags = [];
      if (r.ts > Date.now() + 120000) flags.push('future_ts');
      if (r.lat == null) flags.push('no_gps');
      db.records.push({ id: r.id, deviceId, ts: r.ts, lat: r.lat, lng: r.lng, acc: r.acc, mode: r.mode, img: `/uploads/${file}`, receivedAt: Date.now(), flags });
    }
    accepted.push(r.id); // يشمل المكرر كي يحذفه الجهاز من طابوره
  }
  save();
  res.json({ accepted, command: cmdFor(deviceId), serverTime: Date.now() });
});

// واجهات المدير
app.get('/api/records', admin, (req, res) => res.json(db.records.slice(-Number(req.query.limit || 200)).reverse()));
app.get('/api/devices', admin, (req, res) =>
  res.json(Object.entries(DEVICES).map(([id, d]) => ({ id, name: d.name, seen: db.seen[id] || null, command: cmdFor(id) }))));
app.post('/api/command', admin, (req, res) => {
  const { deviceId, state, mode } = req.body;
  if (!DEVICES[deviceId]) return res.sendStatus(404);
  db.commands[deviceId] = { ...cmdFor(deviceId), ...(state && { state }), ...(mode && { mode }) };
  save();
  res.json(db.commands[deviceId]);
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}/dashboard  |  /worker`));
