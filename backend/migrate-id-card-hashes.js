const { createHmac } = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

const secret = process.env.ID_CARD_HMAC_SECRET;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!secret || secret.length < 32) {
    throw new Error('Set ID_CARD_HMAC_SECRET to a stable secret of at least 32 characters');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1
});

function hashIdCard(value) {
    const normalized = String(value || '').trim();
    if (!/^\d{13}$/.test(normalized)) {
        throw new Error('Found a stored ID card value that is not exactly 13 digits; migration stopped without printing it');
    }
    return createHmac('sha256', secret).update(`id-card:${normalized}`).digest('hex');
}

async function migrateTable(client, tableName) {
    const tableCheck = await client.query('SELECT to_regclass($1) AS table_name', [`public.${tableName}`]);
    if (!tableCheck.rows[0].table_name) {
        console.log(`Skipped ${tableName}: table does not exist`);
        return 0;
    }

    await client.query(`ALTER TABLE public.${tableName} ADD COLUMN IF NOT EXISTS id_card_last4 TEXT`);
    await client.query(`ALTER TABLE public.${tableName} ALTER COLUMN id_card TYPE TEXT USING id_card::text`);
    const { rows } = await client.query(`SELECT ctid::text AS row_key, id_card, id_card_last4 FROM public.${tableName}`);
    let updated = 0;

    for (const row of rows) {
        const value = String(row.id_card || '').trim();
        if (/^[a-f0-9]{64}$/i.test(value)) continue;
        const digest = hashIdCard(value);
        await client.query(
            `UPDATE public.${tableName} SET id_card = $1, id_card_last4 = $2 WHERE ctid = $3::tid`,
            [digest, value.slice(-4), row.row_key]
        );
        updated += 1;
    }

    console.log(`${tableName}: ${updated} record(s) would be updated`);
    return updated;
}

async function main() {
    const apply = process.argv.includes('--apply');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const usersCount = await migrateTable(client, 'users');
        const submissionsCount = await migrateTable(client, 'file_submissions');

        if (apply) {
            await client.query('COMMIT');
            console.log(`Migration applied. Updated ${usersCount + submissionsCount} record(s).`);
        } else {
            await client.query('ROLLBACK');
            console.log('Dry run only; no changes were saved. Re-run with --apply after taking a database backup.');
        }
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((err) => {
    console.error('ID card migration failed:', err.message);
    process.exitCode = 1;
});
