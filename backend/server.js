const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHmac } = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ตั้งค่าเชื่อมต่อ PostgreSQL (ผ่าน Docker พอร์ต 5433)
// const pool = new Pool({
//     user: 'postgres',
//     host: 'localhost',
//     database: 'user_login_db',
//     password: 'secretpassword', // รหัสผ่านที่ตั้งไว้ใน docker-compose.yml
//     port: 5433,
// });

// ตั้งค่าเชื่อมต่อ: รองรับทั้งบน Cloud (Supabase) และ Local
// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
// });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase's hosted PostgreSQL requires TLS. The pooler URL is recommended
  // for serverless deployments because each function instance has few connections.
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000,
  // Vercel instances are short-lived; keep the per-instance client pool small.
  max: 1
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

function hashIdCard(idCard) {
    const secret = process.env.ID_CARD_HMAC_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('ID_CARD_HMAC_SECRET must be set to a secret of at least 32 characters');
    }
    const normalized = String(idCard || '').trim();
    if (!/^\d{13}$/.test(normalized)) {
        throw new Error('ID card must contain exactly 13 digits');
    }
    return createHmac('sha256', secret).update(`id-card:${normalized}`).digest('hex');
}

const maskIdCard = (lastFour) => lastFour ? `*********${lastFour}` : 'ปกปิด';

// Local disk is persistent for local development. Vercel only allows writes
// to /tmp, which is temporary and must not be used as permanent file storage.
const uploadDir = process.env.VERCEL
    ? path.join(os.tmpdir(), 'backup_filework')
    : path.join(__dirname, 'backup_filework');
fs.mkdirSync(uploadDir, { recursive: true });

const safeFilenamePart = (value, fallback = '') =>
    String(value || fallback)
        .trim()
        .replace(/[^\p{L}\p{N}-]+/gu, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60) || fallback;

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (req, _file, cb) => {
        const { prefix, first_name, last_name, moo } = req.body || {};
        const now = new Date();
        const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}_(${now.getHours()}-${now.getMinutes()}-${now.getSeconds()})`;
        const uniqueSuffix = `${now.getMilliseconds()}-${Math.random().toString(36).slice(2, 8)}`;
        const filename = [
            safeFilenamePart(prefix, 'ไม่ระบุคำนำหน้า'),
            safeFilenamePart(first_name, 'ไม่ระบุชื่อ'),
            safeFilenamePart(last_name, 'ไม่ระบุนามสกุล'),
            `หมู่ที่${safeFilenamePart(moo, '0')}`,
            dateStr,
            uniqueSuffix
        ].join('_') + '.pdf';
        cb(null, filename);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') return cb(null, true);
        cb(new Error('อนุญาตให้อัปโหลดเฉพาะไฟล์ PDF เท่านั้น'));
    }
});

// 1. API Login ด้วยเลข 13 หลัก
app.post('/api/login', async (req, res) => {
    const { id_card } = req.body || {};

    if (!/^\d{13}$/.test(String(id_card || ''))) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง' });
    }

    if (!process.env.DATABASE_URL || !process.env.ID_CARD_HMAC_SECRET) {
        console.error('Login unavailable: database or ID card HMAC configuration is missing');
        return res.status(503).json({
            success: false,
            message: 'ระบบยังไม่ได้ตั้งค่าการเชื่อมต่อหรือความปลอดภัยของฐานข้อมูล'
        });
    }

    try {
        const query = 'SELECT * FROM users WHERE id_card = $1';
        const result = await pool.query(query, [hashIdCard(id_card)]);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'ไม่พบเลขบัตรประชาชนนี้ในระบบ' });
        }

        const user = result.rows[0];

        // ตรวจสอบสถานะการทำงาน (INACTIVE = ไม่ได้ทำงานแล้ว)
        if (user.status === 'INACTIVE') {
            return res.status(403).json({ success: false, message: 'สถานะของคุณถูกระงับ (ไม่ได้ทำงานแล้ว)' });
        }

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            user: {
                user_id: user.user_id,
                // The submitted ID is returned only to this user's current client session.
                id_card: String(id_card).trim(),
                prefix: user.prefix,
                first_name: user.first_name,
                last_name: user.last_name,
                fullname: `${user.prefix} ${user.first_name} ${user.last_name}`,
                birth_date: user.birth_date,
                moo: user.moo,
                subdistrict: user.subdistrict,
                district: user.district,
                province: user.province,
                position: user.position,
                status: user.status,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login database error:', {
            code: err.code,
            message: err.message
        });

        const isDnsError = err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN';
        res.status(500).json({
            success: false,
            message: isDnsError
                ? 'ไม่พบ host ฐานข้อมูล กรุณาตั้ง DATABASE_URL เป็น Supabase Transaction Pooler URL สำหรับ Vercel'
                : 'เกิดข้อผิดพลาดในการเชื่อมต่อหรือค้นหาข้อมูล'
        });
    }
});

// Upload a PDF report and store its metadata in PostgreSQL.
app.post('/api/upload-report', upload.single('pdf_file'), async (req, res) => {
    const file = req.file;
    try {
        if (!file) {
            return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ PDF ที่ต้องการส่ง' });
        }

        const { id_card, prefix, first_name, last_name, moo, position } = req.body || {};
        if (!/^\d{13}$/.test(String(id_card || ''))) {
            await fs.promises.unlink(file.path).catch(() => {});
            return res.status(400).json({ success: false, message: 'เลขบัตรประชาชนไม่ถูกต้อง' });
        }
        const file_url = `/backup_filework/${encodeURIComponent(file.filename)}`;
        const query = `
            INSERT INTO file_submissions
                (id_card, id_card_last4, prefix, first_name, last_name, moo, position, file_name, file_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        await pool.query(query, [hashIdCard(id_card), String(id_card).slice(-4), prefix, first_name, last_name, moo, position, file.filename, file_url]);

        return res.json({ success: true, message: 'ส่งรายงานสำเร็จ', filename: file.filename, file_url });
    } catch (err) {
        if (file) {
            await fs.promises.unlink(file.path).catch(() => {});
        }
        console.error('Report upload error:', { code: err.code, message: err.message });
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' });
    }
});

// Admin: list submissions, optionally filtered by the supplied search term.
app.get('/api/admin/submissions', async (req, res) => {
    const search = String(req.query.search || '').trim();
    try {
        const idCardHash = /^\d{13}$/.test(search) ? hashIdCard(search) : null;
        const result = search
            ? await pool.query(
                `SELECT * FROM file_submissions
                 WHERE ($1::text IS NOT NULL AND id_card = $1)
                    OR first_name ILIKE $2 OR last_name ILIKE $2 OR moo ILIKE $2 OR position ILIKE $2
                 ORDER BY created_at DESC`,
                [idCardHash, `%${search}%`]
            )
            : await pool.query('SELECT * FROM file_submissions ORDER BY created_at DESC');
        res.json(result.rows.map(({ id_card_last4, ...row }) => ({
            ...row,
            id_card: maskIdCard(id_card_last4)
        })));
    } catch (err) {
        console.error('Submission list error:', { code: err.code, message: err.message });
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// 2. API สำหรับ Admin: ดึงรายชื่อผู้ใช้ทั้งหมด
app.get('/api/admin/users', async (req, res) => {
    try {
        const query = `
            SELECT user_id, id_card_last4, prefix, first_name, last_name,
                   birth_date, moo, subdistrict, district, province, 
                   position, status, role 
            FROM users 
            ORDER BY user_id ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows.map(({ id_card_last4, ...row }) => ({
            ...row,
            id_card: maskIdCard(id_card_last4)
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// 3. API สำหรับ Admin: เพิ่มผู้ใช้งานใหม่ (Generate User)
app.post('/api/admin/users', async (req, res) => {
    const {
        id_card, prefix, first_name, last_name, birth_date,
        moo, subdistrict, district, province,
        position, status, role
    } = req.body;

    try {
        const idCardHash = hashIdCard(id_card);
        const query = `
            INSERT INTO users (
                id_card, id_card_last4, prefix, first_name, last_name, birth_date,
                moo, subdistrict, district, province, 
                position, status, role
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `;
        await pool.query(query, [
            idCardHash,
            String(id_card).trim().slice(-4),
            prefix,
            first_name,
            last_name,
            birth_date,
            moo || '',
            subdistrict,
            district,
            province,
            position,
            status || 'ACTIVE',
            role || 'user'
        ]);

        res.json({ success: true, message: 'เพิ่มผู้ใช้งานสำเร็จ' });
    } catch (err) {
        if (err.code === '23505') { // Error code สำหรับ Duplicate key ใน PostgreSQL
            return res.status(400).json({ success: false, message: 'เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว' });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// 4. API สำหรับ Admin: แก้ไขข้อมูลผู้ใช้งาน (Update)
app.put('/api/admin/users/:id', async (req, res) => {
    const userId = req.params.id;
    const {
        id_card, prefix, first_name, last_name, birth_date,
        moo, subdistrict, district, province,
        position, status, role
    } = req.body;

    try {
        const idCardHash = id_card ? hashIdCard(id_card) : null;
        const idCardLast4 = id_card ? String(id_card).trim().slice(-4) : null;
        const query = `
            UPDATE users 
            SET id_card = COALESCE($1, id_card), id_card_last4 = COALESCE($2, id_card_last4),
                prefix = $3, first_name = $4, last_name = $5, birth_date = $6,
                moo = $7, subdistrict = $8, district = $9, province = $10,
                position = $11, status = $12, role = $13
            WHERE user_id = $14
        `;
        await pool.query(query, [
            idCardHash, idCardLast4, prefix, first_name, last_name, birth_date,
            moo || '', subdistrict, district, province,
            position, status, role, userId
        ]);

        res.json({ success: true, message: 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: 'เลขบัตรประชาชนนี้ซ้ำกับผู้ใช้อื่นในระบบ' });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// 5. API สำหรับ Admin: ลบผู้ใช้งาน (Delete)
app.delete('/api/admin/users/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
        res.json({ success: true, message: 'ลบผู้ใช้งานสำเร็จ' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Serve uploaded files (durable only when using persistent local storage).
app.use('/backup_filework', express.static(uploadDir));

// Convert Multer errors (invalid type / size limit) to a JSON API response.
app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'ไฟล์มีขนาดเกิน 10 MB'
            : 'ไม่สามารถอัปโหลดไฟล์ได้';
        return res.status(400).json({ success: false, message });
    }
    if (err.message === 'อนุญาตให้อัปโหลดเฉพาะไฟล์ PDF เท่านั้น') {
        return res.status(400).json({ success: false, message: err.message });
    }
    console.error('Unhandled API error:', err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ' });
});

// Vercel imports the Express app as a serverless function. Keep listen() for
// local development only.
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
