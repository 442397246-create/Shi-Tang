class CanteenDB {
    constructor() {
        this.initData();
    }

    initData() {
        if (!localStorage.getItem('ingredients')) {
            const ingredients = [
                { id: 'ING001', name: '土豆', category: '蔬菜', price: 4.0, yield_rate: 0.8, stock: 20, stock_low: 30, stock_high: 200, unit: 'kg', supplier_ids: ['SUP001'], status: 'enabled' },
                { id: 'ING002', name: '西红柿', category: '蔬菜', price: 6.0, yield_rate: 0.9, stock: 50, stock_low: 20, stock_high: 150, unit: 'kg', expire_date: '2026-05-21', supplier_ids: ['SUP001'], status: 'enabled' },
                { id: 'ING003', name: '鸡蛋', category: '蛋类', price: 10.0, yield_rate: 0.88, stock: 30, stock_low: 20, stock_high: 100, unit: 'kg', expire_date: '2026-05-20', supplier_ids: ['SUP002'], status: 'enabled' },
                { id: 'ING004', name: '五花肉', category: '肉类', price: 28.0, yield_rate: 0.95, stock: 40, stock_low: 15, stock_high: 80, unit: 'kg', supplier_ids: ['SUP002'], status: 'enabled' },
                { id: 'ING005', name: '鸡腿肉', category: '肉类', price: 16.0, yield_rate: 0.85, stock: 35, stock_low: 10, stock_high: 60, unit: 'kg', supplier_ids: ['SUP002'], status: 'enabled' },
                { id: 'ING006', name: '鹌鹑蛋', category: '蛋类', price: 18.0, yield_rate: 1.0, stock: 15, stock_low: 5, stock_high: 30, unit: 'kg', supplier_ids: ['SUP002'], status: 'enabled' },
                { id: 'ING007', name: '大米', category: '粮油', price: 5.5, yield_rate: 1.0, stock: 200, stock_low: 50, stock_high: 500, unit: 'kg', supplier_ids: ['SUP003'], status: 'enabled' },
                { id: 'ING008', name: '食用油', category: '粮油', price: 12.0, yield_rate: 1.0, stock: 80, stock_low: 20, stock_high: 200, unit: 'L', supplier_ids: ['SUP003'], status: 'enabled' },
                { id: 'ING009', name: '冻鸡翅', category: '冷冻品', price: 22.0, yield_rate: 0.8, stock: 25, stock_low: 10, stock_high: 60, unit: 'kg', supplier_ids: ['SUP004'], status: 'enabled' },
                { id: 'ING010', name: '冻虾仁', category: '冷冻品', price: 45.0, yield_rate: 0.75, stock: 10, stock_low: 5, stock_high: 30, unit: 'kg', supplier_ids: ['SUP004'], status: 'enabled' },
            ];
            localStorage.setItem('ingredients', JSON.stringify(ingredients));
        }

        if (!localStorage.getItem('dishes')) {
            const dishes = [
                { 
                    id: 'DISH001', 
                    name: '红烧肉鹌鹑蛋', 
                    category: '大荤', 
                    price: 18, 
                    cooking_time: 45, 
                    ingredients: [
                        { ingredient_id: 'ING001', name: '土豆', weight: 92 },
                        { ingredient_id: 'ING002', name: '西红柿', weight: 141 },
                        { ingredient_id: 'ING004', name: '五花肉', weight: 64 },
                        { ingredient_id: 'ING006', name: '鹌鹑蛋', weight: 60 },
                    ],
                    weight_per_person: 357,
                    status: 'enabled',
                    sales: 1250,
                    leftover_rate: 0.08
                },
                { 
                    id: 'DISH002', 
                    name: '西红柿炒鸡蛋', 
                    category: '小荤', 
                    price: 8, 
                    cooking_time: 15, 
                    ingredients: [
                        { ingredient_id: 'ING002', name: '西红柿', weight: 150 },
                        { ingredient_id: 'ING003', name: '鸡蛋', weight: 102 },
                    ],
                    weight_per_person: 252,
                    status: 'enabled',
                    sales: 2100,
                    leftover_rate: 0.05
                },
                { 
                    id: 'DISH003', 
                    name: '酸辣土豆丝', 
                    category: '素菜', 
                    price: 4, 
                    cooking_time: 10, 
                    ingredients: [
                        { ingredient_id: 'ING001', name: '土豆', weight: 115 },
                    ],
                    weight_per_person: 115,
                    status: 'enabled',
                    sales: 1800,
                    leftover_rate: 0.06
                },
            ];
            localStorage.setItem('dishes', JSON.stringify(dishes));
        }

        if (!localStorage.getItem('suppliers')) {
            const suppliers = [
                { id: 'SUP001', name: '李四农业', category: ['蔬菜'], payment_cycle: 'weekly', contact: '张三', phone: '13800138001', score: 4.5, status: 'enabled' },
                { id: 'SUP002', name: '张三生鲜', category: ['肉类', '蛋类'], payment_cycle: 'monthly', contact: '李四', phone: '13800138002', score: 4.2, status: 'enabled' },
                { id: 'SUP003', name: '王五粮油', category: ['粮油', '辅料'], payment_cycle: 'biweekly', contact: '王五', phone: '13800138003', score: 4.8, status: 'enabled' },
                { id: 'SUP004', name: '赵六冻品', category: ['冷冻品'], payment_cycle: 'monthly', contact: '赵六', phone: '13800138004', score: 3.8, status: 'enabled' },
            ];
            localStorage.setItem('suppliers', JSON.stringify(suppliers));
        }

        if (!localStorage.getItem('weekly_menus')) {
            const today = new Date();
            const menus = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - today.getDay() + i);
                const dateStr = date.toISOString().split('T')[0];
                
                menus.push({
                    id: `MENU${dateStr.replace(/-/g, '')}`,
                    date: dateStr,
                    week_day: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
                    meals: {
                        breakfast: [
                            { dish_id: 'DISH003', name: '酸辣土豆丝', estimated_diners: 200 }
                        ],
                        lunch: [
                            { dish_id: 'DISH001', name: '红烧肉鹌鹑蛋', estimated_diners: 350 },
                            { dish_id: 'DISH002', name: '西红柿炒鸡蛋', estimated_diners: 350 },
                            { dish_id: 'DISH003', name: '酸辣土豆丝', estimated_diners: 350 },
                        ],
                        dinner: [
                            { dish_id: 'DISH002', name: '西红柿炒鸡蛋', estimated_diners: 200 },
                            { dish_id: 'DISH003', name: '酸辣土豆丝', estimated_diners: 200 },
                        ]
                    },
                    total_diners: 1650,
                    status: 'published',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }
            localStorage.setItem('weekly_menus', JSON.stringify(menus));
        }

        if (!localStorage.getItem('purchase_orders')) {
            const purchaseOrders = [
                {
                    id: 'CG202605190001',
                    supplier_id: 'SUP001',
                    supplier_name: '李四农业',
                    date: '2026-05-19',
                    expect_arrive_date: '2026-05-20',
                    items: [
                        { ingredient_id: 'ING001', name: '土豆', quantity: 50, price: 4.0, amount: 200, received_quantity: 0 },
                        { ingredient_id: 'ING002', name: '西红柿', quantity: 180, price: 6.0, amount: 1080, received_quantity: 0 },
                    ],
                    total_amount: 1280,
                    status: 'pending_approval',
                    creator: '管理员',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: 'CG202605190002',
                    supplier_id: 'SUP002',
                    supplier_name: '张三生鲜',
                    date: '2026-05-19',
                    expect_arrive_date: '2026-05-20',
                    items: [
                        { ingredient_id: 'ING003', name: '鸡蛋', quantity: 30, price: 10.0, amount: 300, received_quantity: 30 },
                        { ingredient_id: 'ING004', name: '五花肉', quantity: 21.09, price: 28.0, amount: 590.5, received_quantity: 21.09 },
                    ],
                    total_amount: 890.5,
                    status: 'completed',
                    creator: '管理员',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: 'CG202605180001',
                    supplier_id: 'SUP003',
                    supplier_name: '王五粮油',
                    date: '2026-05-18',
                    expect_arrive_date: '2026-05-19',
                    items: [
                        { ingredient_id: 'ING005', name: '鸡腿肉', quantity: 50, price: 16.0, amount: 800, received_quantity: 50 },
                        { ingredient_id: 'ING006', name: '鹌鹑蛋', quantity: 27.78, price: 18.0, amount: 500, received_quantity: 27.78 },
                    ],
                    total_amount: 2450,
                    status: 'paid',
                    creator: '管理员',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];
            localStorage.setItem('purchase_orders', JSON.stringify(purchaseOrders));
        }

        if (!localStorage.getItem('settlements')) {
            const settlements = [
                {
                    id: 'JS202605150001',
                    supplier_id: 'SUP001',
                    supplier_name: '李四农业',
                    period_start: '2026-05-08',
                    period_end: '2026-05-14',
                    total_purchase: 8920,
                    deduction: 0,
                    actual_amount: 8920,
                    status: 'paid',
                    creator: '财务'
                },
                {
                    id: 'JS202605150002',
                    supplier_id: 'SUP002',
                    supplier_name: '张三生鲜',
                    period_start: '2026-05-01',
                    period_end: '2026-05-14',
                    total_purchase: 12560,
                    deduction: 260,
                    actual_amount: 12300,
                    status: 'pending_approval',
                    creator: '财务'
                }
            ];
            localStorage.setItem('settlements', JSON.stringify(settlements));
        }

        if (!localStorage.getItem('stock_flows')) {
            const stockFlows = [
                {
                    id: 'STK20260519001',
                    ingredient_id: 'ING003',
                    ingredient_name: '鸡蛋',
                    type: 'in',
                    quantity: 30,
                    before_stock: 0,
                    after_stock: 30,
                    related_order_id: 'CG202605190002',
                    remark: '采购入库',
                    operator: '管理员',
                    created_at: '2026-05-19T10:30:00.000Z'
                },
                {
                    id: 'STK20260519002',
                    ingredient_id: 'ING004',
                    ingredient_name: '五花肉',
                    type: 'in',
                    quantity: 21.09,
                    before_stock: 18.91,
                    after_stock: 40,
                    related_order_id: 'CG202605190002',
                    remark: '采购入库',
                    operator: '管理员',
                    created_at: '2026-05-19T10:30:00.000Z'
                },
                {
                    id: 'STK20260519003',
                    ingredient_id: 'ING001',
                    ingredient_name: '土豆',
                    type: 'out',
                    quantity: 20,
                    before_stock: 40,
                    after_stock: 20,
                    related_order_id: 'MENU20260519',
                    remark: '生产消耗',
                    operator: '厨师',
                    created_at: '2026-05-19T08:30:00.000Z'
                },
                {
                    id: 'STK20260519004',
                    ingredient_id: 'ING002',
                    ingredient_name: '西红柿',
                    type: 'out',
                    quantity: 50,
                    before_stock: 100,
                    after_stock: 50,
                    related_order_id: 'MENU20260519',
                    remark: '生产消耗',
                    operator: '厨师',
                    created_at: '2026-05-19T08:30:00.000Z'
                }
            ];
            localStorage.setItem('stock_flows', JSON.stringify(stockFlows));
        }

        if (!localStorage.getItem('inventory_records')) {
            const records = [
                {
                    id: 'RK202605190001',
                    type: 'in',
                    related_id: 'CG202605190002',
                    supplier_name: '张三生鲜',
                    items: [
                        { ingredient_id: 'ING003', name: '鸡蛋', quantity: 30, batch: '20260519001', expire_date: '2026-05-26', price: 10.0 },
                        { ingredient_id: 'ING004', name: '五花肉', quantity: 21.09, batch: '20260519002', expire_date: '2026-05-26', price: 28.0 },
                    ],
                    operator: '采购',
                    date: '2026-05-19 10:30:00'
                },
                {
                    id: 'CK202605190001',
                    type: 'out',
                    related_id: 'MENU20260519',
                    operator: '厨师',
                    items: [
                        { ingredient_id: 'ING001', name: '土豆', quantity: 20, batch: '20260515001', price: 4.0 },
                        { ingredient_id: 'ING002', name: '西红柿', quantity: 50, batch: '20260515002', price: 6.0 },
                    ],
                    date: '2026-05-19 08:30:00'
                }
            ];
            localStorage.setItem('inventory_records', JSON.stringify(records));
        }

        if (!localStorage.getItem('users')) {
            const users = [
                { id: 'USER001', name: '管理员', username: 'admin', password: this.hashPassword('123456'), role: 'admin', phone: '13800138000', status: 'enabled' },
                { id: 'USER002', name: '王厨师', username: 'chef', password: this.hashPassword('123456'), role: 'chef', phone: '13800138001', status: 'enabled' },
                { id: 'USER003', name: '李采购', username: 'purchase', password: this.hashPassword('123456'), role: 'purchase', phone: '13800138002', status: 'enabled' },
                { id: 'USER004', name: '张财务', username: 'finance', password: this.hashPassword('123456'), role: 'finance', phone: '13800138003', status: 'enabled' },
            ];
            localStorage.setItem('users', JSON.stringify(users));
        }

        if (!localStorage.getItem('settings')) {
            const settings = {
                canteen_name: '公司食堂',
                low_stock_threshold: 100,
                expire_alert_days: 7,
                cost_alert_threshold: 10,
                data_retention_days: 1095,
                auto_backup_time: '02:00',
                ingredient_categories: ['蔬菜', '肉类', '蛋类', '水产', '粮油', '辅料', '调料', '冷冻品', '其他'],
                supplier_categories: ['蔬菜', '肉类', '蛋类', '水产', '粮油', '辅料', '调料', '冷冻品', '其他'],
                units: ['kg', '斤', 'L', '个', '包', '箱', '瓶', '桶', 'g', 'ml']
            };
            localStorage.setItem('settings', JSON.stringify(settings));
        }
    }

    hashPassword(pwd) {
        let hash = 0;
        for (let i = 0; i < pwd.length; i++) {
            const char = pwd.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'h_' + Math.abs(hash).toString(36);
    }

    checkPassword(pwd, hashed) {
        return this.hashPassword(pwd) === hashed;
    }

    get(key) {
        const data = localStorage.getItem(key);
        if (!data) {
            if (key === 'settings') return {};
            return [];
        }
        return JSON.parse(data);
    }

    set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    add(key, item) {
        const data = this.get(key);
        data.push(item);
        this.set(key, data);
        return item;
    }

    update(key, id, item, idKey = 'id') {
        const data = this.get(key);
        const index = data.findIndex(d => d[idKey] === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...item };
            this.set(key, data);
            return true;
        }
        return false;
    }

    upsert(key, item, idKey = 'id') {
        const data = this.get(key);
        const index = data.findIndex(d => d[idKey] === item[idKey]);
        if (index !== -1) {
            data[index] = { ...data[index], ...item };
        } else {
            data.push(item);
        }
        this.set(key, data);
        return true;
    }

    delete(key, id, idKey = 'id') {
        const data = this.get(key);
        const newData = data.filter(d => d[idKey] !== id);
        this.set(key, newData);
        return newData.length !== data.length;
    }
}

const db = new CanteenDB();

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function openModal(title, content, confirmCallback = null) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    const modal = document.getElementById('common-modal');
    modal.classList.remove('hidden');
    
    var dialog = modal.querySelector('.bg-white');
    if (dialog) {
        dialog.style.display = 'flex';
        dialog.style.flexDirection = 'column';
        dialog.style.maxHeight = '90vh';
        dialog.style.overflow = 'hidden';
    }
    
    var contentEl = document.getElementById('modal-content');
    if (contentEl) {
        contentEl.style.overflowY = 'auto';
        contentEl.style.flex = '1';
        contentEl.style.minHeight = '0';
    }
    
    const confirmBtn = document.getElementById('modal-confirm-btn');
    confirmBtn.style.display = '';
    confirmBtn.onclick = function() {
        if (confirmCallback) {
            var result = confirmCallback();
            if (result === false) {
                return;
            }
        }
        closeModal();
    };
}

function closeModal() {
    document.getElementById('common-modal').classList.add('hidden');
}

function debounce(fn, delay) {
    let timer;
    return function() {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, arguments), delay);
    };
}

function loadSidebar(currentPage) {
    var items = [
        { href: 'index.html', icon: 'tachometer-alt', label: '仪表盘' },
        { href: 'menu.html', icon: 'book-open', label: '菜单管理' },
        { href: 'purchase.html', icon: 'shopping-cart', label: '采购管理' },
        { href: 'inventory.html', icon: 'warehouse', label: '库存管理' },
        { href: 'supplier.html', icon: 'truck', label: '供应商管理' },
        { href: 'settlement.html', icon: 'file-invoice-dollar', label: '结算管理' },
        { href: 'report.html', icon: 'chart-line', label: '经营分析' },
        { href: 'settings.html', icon: 'cog', label: '系统设置' }
    ];
    var navEl = document.getElementById('sidebar-nav');
    if (!navEl) return;
    var html = '';
    items.forEach(function(item) {
        var isActive = item.href === currentPage;
        html += '<a href="' + item.href + '" class="flex items-center px-4 py-3 rounded-md ' + (isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50') + '"><i class="fas fa-' + item.icon + ' w-6"></i><span>' + item.label + '</span></a>';
    });
    navEl.innerHTML = html;
}

const utils = {
    formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        const minute = String(d.getMinutes()).padStart(2, '0');
        const second = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hour)
            .replace('mm', minute)
            .replace('ss', second);
    },

    formatDateTime(date) {
        return utils.formatDate(date, 'YYYY-MM-DD HH:mm:ss');
    },

    formatMoney(amount, decimals = 2) {
        return `¥${Number(amount).toFixed(decimals)}`;
    },

    formatMoneyValue(amount, decimals = 2) {
        return Number(amount).toFixed(decimals);
    },

    generateId(prefix = '') {
        const date = new Date();
        const timestamp = date.getTime().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${timestamp.slice(-4)}${random.slice(-4)}`;
    },

    getInventoryAlertCount() {
        const ingredients = db.get('ingredients');
        const today = new Date();
        let count = 0;
        
        ingredients.forEach(ing => {
            if (ing.stock <= ing.stock_low) {
                count++;
            }
            if (ing.expire_date) {
                const expireDate = new Date(ing.expire_date);
                const diffTime = expireDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 7 && diffDays > 0) {
                    count++;
                }
                if (diffDays <= 0) {
                    count++;
                }
            }
        });
        
        return count;
    },

    getPendingApprovalCount() {
        const purchaseOrders = db.get('purchase_orders');
        const settlements = db.get('settlements');
        
        const pendingPurchase = purchaseOrders.filter(p => p.status === 'pending_accept' || p.status === 'pending_approval').length;
        const pendingSettlement = settlements.filter(s => s.status === 'pending_approval').length;
        
        return pendingPurchase + pendingSettlement;
    },

    calculatePurchaseBudget(menu) {
        const ingredients = db.get('ingredients');
        const budget = {};
        
        Object.values(menu.meals).forEach(meal => {
            meal.forEach(dish => {
                const dishData = db.get('dishes').find(d => d.id === dish.dish_id);
                if (dishData) {
                    dishData.ingredients.forEach(ing => {
                        const totalWeight = ing.weight * dish.estimated_diners / 1000;
                        if (!budget[ing.ingredient_id]) {
                            budget[ing.ingredient_id] = {
                                ingredient_id: ing.ingredient_id,
                                name: ing.name,
                                total_net: 0,
                                price: 0
                            };
                        }
                        budget[ing.ingredient_id].total_net += totalWeight;
                        const ingData = ingredients.find(i => i.id === ing.ingredient_id);
                        if (ingData) {
                            budget[ing.ingredient_id].price = ingData.price;
                        }
                    });
                }
            });
        });
        
        return Object.values(budget).map(item => {
            const ingData = ingredients.find(i => i.id === item.ingredient_id);
            const yieldRate = ingData ? ingData.yield_rate : 0.8;
            const purchaseGross = item.total_net / yieldRate;
            const amount = purchaseGross * item.price;
            
            return {
                ...item,
                purchase_gross: purchaseGross,
                amount: amount,
                current_stock: ingData ? ingData.stock : 0,
                need_purchase: Math.max(0, purchaseGross - (ingData ? ingData.stock : 0)),
                supplier_ids: ingData ? (ingData.supplier_ids || []) : [],
                unit: ingData ? ingData.unit : 'kg'
            };
        });
    },

    generatePurchaseOrdersBySupplier(menuId) {
        const menu = db.get('weekly_menus').find(m => m.id === menuId);
        if (!menu) return [];
        
        const budget = this.calculatePurchaseBudget(menu);
        const suppliers = db.get('suppliers');
        const needPurchaseItems = budget.filter(item => item.need_purchase > 0);
        
        const supplierGroups = {};
        const noSupplierItems = [];
        
        needPurchaseItems.forEach(item => {
            if (item.supplier_ids && item.supplier_ids.length > 0) {
                const primarySupplierId = item.supplier_ids[0];
                if (!supplierGroups[primarySupplierId]) {
                    supplierGroups[primarySupplierId] = [];
                }
                supplierGroups[primarySupplierId].push(item);
            } else {
                noSupplierItems.push(item);
            }
        });
        
        const orders = [];
        
        Object.keys(supplierGroups).forEach(supplierId => {
            const supplier = suppliers.find(s => s.id === supplierId);
            if (!supplier) return;
            
            const items = supplierGroups[supplierId].map(item => ({
                ingredient_id: item.ingredient_id,
                name: item.name,
                quantity: item.need_purchase,
                price: item.price,
                amount: item.need_purchase * item.price,
                received_quantity: 0
            }));
            
            orders.push({
                id: this.generateId('CG'),
                supplier_id: supplierId,
                supplier_name: supplier.name,
                date: this.formatDate(new Date()),
                expect_arrive_date: this.formatDate(new Date(Date.now() + 86400000)),
                items: items,
                total_amount: items.reduce((sum, i) => sum + i.amount, 0),
                status: 'pending_approval',
                creator: '管理员',
                related_menu_id: menuId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        });
        
        if (noSupplierItems.length > 0) {
            orders.push({
                id: this.generateId('CG'),
                supplier_id: '',
                supplier_name: '未指定供应商',
                date: this.formatDate(new Date()),
                expect_arrive_date: this.formatDate(new Date(Date.now() + 86400000)),
                items: noSupplierItems.map(item => ({
                    ingredient_id: item.ingredient_id,
                    name: item.name,
                    quantity: item.need_purchase,
                    price: item.price,
                    amount: item.need_purchase * item.price,
                    received_quantity: 0
                })),
                total_amount: noSupplierItems.reduce((sum, i) => sum + i.need_purchase * i.price, 0),
                status: 'pending_approval',
                creator: '管理员',
                related_menu_id: menuId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        
        return orders;
    },

    showMessage(message, type = 'success') {
        const messageEl = document.createElement('div');
        messageEl.className = `fixed top-4 right-4 z-[9999] px-6 py-3 rounded-md shadow-lg flex items-center space-x-2 ${
            type === 'success' ? 'bg-green-50 text-green-800' : 
            type === 'error' ? 'bg-red-50 text-red-800' : 
            type === 'warning' ? 'bg-yellow-50 text-yellow-800' : 'bg-blue-50 text-blue-800'
        }`;
        
        messageEl.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${escapeHtml(message)}</span>
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.classList.add('opacity-0', 'transition-opacity', 'duration-300');
            setTimeout(() => {
                if (messageEl.parentNode) document.body.removeChild(messageEl);
            }, 300);
        }, 3000);
    },

    exportToExcel(data, filename = 'export') {
        const BOM = '\uFEFF';
        const csv = data.map(row => 
            Object.values(row).map(val => {
                const str = String(val == null ? '' : val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            }).join(',')
        ).join('\n');
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}_${utils.formatDate(new Date())}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const menuItems = document.querySelectorAll('aside a');
    menuItems.forEach(item => {
        if (item.getAttribute('href') === currentPath.split('/').pop()) {
            item.classList.add('bg-blue-50', 'text-blue-700');
            item.classList.remove('text-gray-700', 'hover:bg-gray-50');
        }
    });

    const users = db.get('users');
    const currentUser = users.length > 0 ? users[0] : null;
    if (currentUser && document.getElementById('current-user')) {
        document.getElementById('current-user').textContent = currentUser.name;
    }

    const modal = document.getElementById('common-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }

    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'INPUT' && e.target.type === 'date') {
            e.target.showPicker();
        }
    });
});
