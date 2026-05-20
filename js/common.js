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
    confirmBtn.onclick = async function() {
        if (confirmCallback) {
            var result = await confirmCallback();
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

function toggleUserDropdown() {
    var dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

document.addEventListener('click', function(e) {
    var container = document.getElementById('user-dropdown-container');
    var dropdown = document.getElementById('user-dropdown');
    if (container && dropdown && !container.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

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

    async getInventoryAlertCount() {
        const ingredients = await db.get('ingredients');
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

    async getPendingApprovalCount() {
        const purchaseOrders = await db.get('purchase_orders');
        const settlements = await db.get('settlements');
        
        const pendingPurchase = purchaseOrders.filter(p => p.status === 'pending_accept' || p.status === 'pending_approval').length;
        const pendingSettlement = settlements.filter(s => s.status === 'pending_approval').length;
        
        return pendingPurchase + pendingSettlement;
    },

    async calculatePurchaseBudget(menu) {
        const ingredients = await db.get('ingredients');
        const allDishes = await db.get('dishes');
        const budget = {};
        
        Object.values(menu.meals).forEach(meal => {
            meal.forEach(dish => {
                const dishData = allDishes.find(d => d.id === dish.dish_id);
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

    async generatePurchaseOrdersBySupplier(menuId) {
        const weeklyMenus = await db.get('weekly_menus');
        const menu = weeklyMenus.find(m => m.id === menuId);
        if (!menu) return [];
        
        const budget = await this.calculatePurchaseBudget(menu);
        const suppliers = await db.get('suppliers');
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

document.addEventListener('DOMContentLoaded', async function() {
    if (typeof checkAuth === 'function') checkAuth();

    const currentPath = window.location.pathname;
    const menuItems = document.querySelectorAll('aside a');
    menuItems.forEach(item => {
        if (item.getAttribute('href') === currentPath.split('/').pop()) {
            item.classList.add('bg-blue-50', 'text-blue-700');
            item.classList.remove('text-gray-700', 'hover:bg-gray-50');
        }
    });

    var user = getUser();
    if (user && document.getElementById('current-user')) {
        document.getElementById('current-user').textContent = user.name || user.username || '用户';
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
