const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const path = require('path');

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
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  max: 5
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

// ตรวจสอบการเชื่อมต่อโดยไม่เปิด Client ค้างไว้
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Connected to PostgreSQL successfully');
  })
  .catch((err) => {
    console.error('PostgreSQL connection failed:', {
      code: err.code,
      message: err.message
    });
  });

pool.connect((err) => {
    if (err) {
        console.error('Database connection error', err.stack);
    } else {
        console.log('Connected to PostgreSQL Database successfully.');
    }
});

// pool.connect((err) => {
//     if (err) {
//         console.error('Database connection error', err.stack);
//     } else {
//         console.log('Connected to PostgreSQL Database via Docker.');
//     }
// });

// 1. API Login ด้วยเลข 13 หลัก
app.post('/api/login', async (req, res) => {
    const { id_card } = req.body;

    if (!id_card || id_card.length !== 13) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง' });
    }

    try {
        const query = 'SELECT * FROM users WHERE id_card = $1';
        const result = await pool.query(query, [id_card]);

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
                id_card: user.id_card,
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

        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเชื่อมต่อหรือค้นหาข้อมูล'
        });
    }
});

// 2. API สำหรับ Admin: ดึงรายชื่อผู้ใช้ทั้งหมด
app.get('/api/admin/users', async (req, res) => {
    try {
        const query = `
            SELECT user_id, id_card, prefix, first_name, last_name, 
                   birth_date, moo, subdistrict, district, province, 
                   position, status, role 
            FROM users 
            ORDER BY user_id ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
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
        const query = `
            INSERT INTO users (
                id_card, prefix, first_name, last_name, birth_date, 
                moo, subdistrict, district, province, 
                position, status, role
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
        await pool.query(query, [
            id_card,
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
        const query = `
            UPDATE users 
            SET id_card = $1, prefix = $2, first_name = $3, last_name = $4, birth_date = $5, 
                moo = $6, subdistrict = $7, district = $8, province = $9, 
                position = $10, status = $11, role = $12
            WHERE user_id = $13
        `;
        await pool.query(query, [
            id_card, prefix, first_name, last_name, birth_date,
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

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});