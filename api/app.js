const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'canteen_secret_key_2026_change_in_production';

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Canteen@2026!',
    database: 'canteen',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未登录' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: '登录已过期' });
        req.user = user;
        next();
    });
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: '请输入用户名和密码' });
        }
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ? AND status = ?', [username, 'enabled']);
        if (rows.length === 0) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, org_id: user.org_id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({
            token,
            user: { id: user.id, name: user.name, username: user.username, role: user.role, org_id: user.org_id }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '服务器错误' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, username, password, phone, org_name } = req.body;
        if (!username || !password || !name) {
            return res.status(400).json({ error: '请填写必要信息' });
        }
        const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ error: '用户名已存在' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const [orgResult] = await pool.execute('INSERT INTO organizations (name) VALUES (?)', [org_name || name + '的食堂']);
        const org_id = orgResult.insertId;
        const [result] = await pool.execute(
            'INSERT INTO users (name, username, password, role, phone, org_id) VALUES (?, ?, ?, ?, ?, ?)',
            [name, username, hashedPassword, 'admin', phone || '', org_id]
        );
        const token = jwt.sign(
            { id: result.insertId, username, role: 'admin', org_id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({
            token,
            user: { id: result.insertId, name, username, role: 'admin', org_id }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '服务器错误' });
    }
});

function createCrudRoutes(tableName, idField = 'id') {
    const router = express.Router();

    router.get('/', authenticateToken, async (req, res) => {
        try {
            const [rows] = await pool.execute(`SELECT * FROM ${tableName} WHERE org_id = ? ORDER BY created_at DESC`, [req.user.org_id]);
            res.json(rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: '服务器错误' });
        }
    });

    router.get('/:id', authenticateToken, async (req, res) => {
        try {
            const [rows] = await pool.execute(`SELECT * FROM ${tableName} WHERE ${idField} = ? AND org_id = ?`, [req.params.id, req.user.org_id]);
            if (rows.length === 0) return res.status(404).json({ error: '未找到' });
            res.json(rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: '服务器错误' });
        }
    });

    router.post('/', authenticateToken, async (req, res) => {
        try {
            const data = { ...req.body, org_id: req.user.org_id, created_at: new Date(), updated_at: new Date() };
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => '?').join(',');
            const [result] = await pool.execute(
                `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`,
                values
            );
            data[idField] = result.insertId;
            res.json(data);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: '服务器错误' });
        }
    });

    router.put('/:id', authenticateToken, async (req, res) => {
        try {
            const data = { ...req.body, updated_at: new Date() };
            delete data[idField];
            delete data.org_id;
            const keys = Object.keys(data);
            const values = Object.values(data);
            const setClause = keys.map(k => `${k} = ?`).join(',');
            values.push(req.params.id);
            values.push(req.user.org_id);
            await pool.execute(
                `UPDATE ${tableName} SET ${setClause} WHERE ${idField} = ? AND org_id = ?`,
                values
            );
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: '服务器错误' });
        }
    });

    router.delete('/:id', authenticateToken, async (req, res) => {
        try {
            await pool.execute(`DELETE FROM ${tableName} WHERE ${idField} = ? AND org_id = ?`, [req.params.id, req.user.org_id]);
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: '服务器错误' });
        }
    });

    return router;
}

app.use('/api/ingredients', createCrudRoutes('ingredients'));
app.use('/api/dishes', createCrudRoutes('dishes'));
app.use('/api/suppliers', createCrudRoutes('suppliers'));
app.use('/api/menus', createCrudRoutes('weekly_menus', 'id'));
app.use('/api/purchase-orders', createCrudRoutes('purchase_orders'));
app.use('/api/settlements', createCrudRoutes('settlements'));
app.use('/api/stock-flows', createCrudRoutes('stock_flows'));
app.use('/api/users', createCrudRoutes('users'));

app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM settings WHERE org_id = ?', [req.user.org_id]);
        if (rows.length === 0) {
            const defaultSettings = {
                org_id: req.user.org_id,
                canteen_name: '公司食堂',
                low_stock_threshold: 100,
                expire_alert_days: 7,
                cost_alert_threshold: 10,
                data_retention_days: 1095,
                auto_backup_time: '02:00',
                ingredient_categories: JSON.stringify(['蔬菜', '肉类', '蛋类', '水产', '粮油', '辅料', '调料', '冷冻品', '其他']),
                supplier_categories: JSON.stringify(['蔬菜', '肉类', '蛋类', '水产', '粮油', '辅料', '调料', '冷冻品', '其他']),
                units: JSON.stringify(['kg', '斤', 'L', '个', '包', '箱', '瓶', '桶', 'g', 'ml'])
            };
            const sKeys = Object.keys(defaultSettings);
            const sVals = sKeys.map(k => defaultSettings[k]);
            await pool.execute(`INSERT INTO settings (${sKeys.join(',')}) VALUES (${sKeys.map(()=>'?').join(',')})`, sVals);
            defaultSettings.ingredient_categories = JSON.parse(defaultSettings.ingredient_categories);
            defaultSettings.supplier_categories = JSON.parse(defaultSettings.supplier_categories);
            defaultSettings.units = JSON.parse(defaultSettings.units);
            return res.json(defaultSettings);
        }
        const settings = rows[0];
        if (typeof settings.ingredient_categories === 'string') settings.ingredient_categories = JSON.parse(settings.ingredient_categories);
        if (typeof settings.supplier_categories === 'string') settings.supplier_categories = JSON.parse(settings.supplier_categories);
        if (typeof settings.units === 'string') settings.units = JSON.parse(settings.units);
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '服务器错误' });
    }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
    try {
        const data = { ...req.body, updated_at: new Date() };
        delete data.id;
        delete data.org_id;
        if (Array.isArray(data.ingredient_categories)) data.ingredient_categories = JSON.stringify(data.ingredient_categories);
        if (Array.isArray(data.supplier_categories)) data.supplier_categories = JSON.stringify(data.supplier_categories);
        if (Array.isArray(data.units)) data.units = JSON.stringify(data.units);
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(k => `${k} = ?`).join(',');
        values.push(req.user.org_id);
        await pool.execute(`UPDATE settings SET ${setClause} WHERE org_id = ?`, values);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '服务器错误' });
    }
});

app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const org_id = req.user.org_id;
        const [[{dish_count}]] = await pool.execute('SELECT COUNT(*) as dish_count FROM dishes WHERE org_id = ?', [org_id]);
        const [[{ingredient_count}]] = await pool.execute('SELECT COUNT(*) as ingredient_count FROM ingredients WHERE org_id = ?', [org_id]);
        const [[{low_stock_count}]] = await pool.execute('SELECT COUNT(*) as low_stock_count FROM ingredients WHERE org_id = ? AND stock <= stock_low', [org_id]);
        const [[{pending_count}]] = await pool.execute("SELECT COUNT(*) as pending_count FROM purchase_orders WHERE org_id = ? AND status IN ('pending_approval','pending_accept')", [org_id]);
        const [todayRows] = await pool.execute('SELECT id FROM weekly_menus WHERE org_id = ? AND date = CURDATE()', [org_id]);
        const today_menu = todayRows.length > 0 ? todayRows[0].id : null;
        res.json({
            dish_count,
            ingredient_count,
            low_stock_count,
            pending_purchase_count: pending_count,
            has_today_menu: !!today_menu
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '服务器错误' });
    }
});

async function initDatabase() {
    const conn = await pool.getConnection();
    try {
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS organizations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                org_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                username VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'staff',
                phone VARCHAR(20) DEFAULT '',
                status VARCHAR(20) DEFAULT 'enabled',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_org (org_id),
                INDEX idx_username (username)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                org_id INT NOT NULL UNIQUE,
                canteen_name VARCHAR(255) DEFAULT '公司食堂',
                low_stock_threshold INT DEFAULT 100,
                expire_alert_days INT DEFAULT 7,
                cost_alert_threshold INT DEFAULT 10,
                data_retention_days INT DEFAULT 1095,
                auto_backup_time VARCHAR(10) DEFAULT '02:00',
                ingredient_categories TEXT,
                supplier_categories TEXT,
                units TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_org (org_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS ingredients (
                id VARCHAR(50) PRIMARY KEY,
                org_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) DEFAULT '',
                price DECIMAL(10,2) DEFAULT 0,
                yield_rate DECIMAL(5,4) DEFAULT 1.0,
                stock DECIMAL(10,2) DEFAULT 0,
                stock_low DECIMAL(10,2) DEFAULT 0,
                stock_high DECIMAL(10,2) DEFAULT 0,
                unit VARCHAR(20) DEFAULT 'kg',
                expire_date DATE DEFAULT NULL,
                supplier_ids TEXT,
                status VARCHAR(20) DEFAULT 'enabled',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_org (org_id),
                INDEX idx_category (category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS dishes (
                id VARCHAR(50) PRIMARY KEY,
                org_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) DEFAULT '',
                price DECIMAL(10,2) DEFAULT 0,
                cooking_time INT DEFAULT 0,
                ingredients JSON,
                weight_per_person INT DEFAULT 0,
                status VARCHAR(20) DEFAULT 'enabled',
                sales INT DEFAULT 0,
                leftover_rate DECIMAL(5,4) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_org (org_id),
                INDEX idx_category (category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id VARCHAR(50) PRIMARY KEY,
                org_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                category JSON,
                payment_cycle VARCHAR(50) DEFAULT 'monthly',
                contact VARCHAR(100) DEFAULT '',
                phone VARCHAR(20) DEFAULT '',
                score DECIMAL(3,1) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'enabled',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_org (org_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS weekly_menus (
                id VARCHAR(50) PRIMARY KEY,
                org_id INT NOT NULL,
                date DATE NOT NULL,
                week_day VARCHAR(10) DEFAULT '',
                meals JSON,
                total_diners INT DEFAULT 0,
                status VARCHAR(20) DEFAULT 'draft',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_org (org_id),
                INDEX idx_date (date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id VARCHAR(50) PRIMARY KEY,
                org_id INT NOT NULL,
                supplier_id VARCHAR(50) DEFAULT '',
                supplier_name VARCHAR(100) DEFAULT '',
                date DATE DEFAULT NULL,
                expect_arrive_date DATE DEFAULT NULL,
                items JSON,
                total_amount DECIMAL(12,2) DEFAULT 0,
                status VARCHAR(30) DEFAULT 'pending_approval',
                creator VARCHAR(100) DEFAULT '',
                related_menu_id VARCHAR(50) DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_org (org_id),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS settlements (
                id VARCHAR(50) PRIMARY KEY,
                org_id INT NOT NULL,
                supplier_id VARCHAR(50) DEFAULT '',
                supplier_name VARCHAR(100) DEFAULT '',
                period_start DATE DEFAULT NULL,
                period_end DATE DEFAULT NULL,
                total_purchase DECIMAL(12,2) DEFAULT 0,
                deduction DECIMAL(12,2) DEFAULT 0,
                actual_amount DECIMAL(12,2) DEFAULT 0,
                status VARCHAR(30) DEFAULT 'pending_approval',
                creator VARCHAR(100) DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_org (org_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS stock_flows (
                id VARCHAR(50) PRIMARY KEY,
                org_id INT NOT NULL,
                ingredient_id VARCHAR(50) DEFAULT '',
                ingredient_name VARCHAR(100) DEFAULT '',
                type VARCHAR(10) NOT NULL,
                quantity DECIMAL(10,2) DEFAULT 0,
                before_stock DECIMAL(10,2) DEFAULT 0,
                after_stock DECIMAL(10,2) DEFAULT 0,
                related_order_id VARCHAR(50) DEFAULT '',
                remark VARCHAR(255) DEFAULT '',
                operator VARCHAR(100) DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_org (org_id),
                INDEX idx_ingredient (ingredient_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS memberships (
                id INT AUTO_INCREMENT PRIMARY KEY,
                org_id INT NOT NULL,
                plan VARCHAR(50) DEFAULT 'free',
                start_date DATE DEFAULT NULL,
                end_date DATE DEFAULT NULL,
                amount DECIMAL(10,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active',
                payment_method VARCHAR(50) DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_org (org_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        console.log('✅ 数据库表初始化完成');
    } finally {
        conn.release();
    }
}

initDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 服务器运行在 http://0.0.0.0:${PORT}`);
    });
}).catch(err => {
    console.error('❌ 数据库初始化失败:', err);
    process.exit(1);
});
