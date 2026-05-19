let currentTab = 'weekly';
let currentWeekStart = new Date();
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());

document.addEventListener('DOMContentLoaded', function() {
    loadWeeklyMenu();
    loadDishList();
    updateWeekText();
});

function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    document.getElementById(`tab-${tab}`).classList.add('border-blue-500', 'text-blue-600');
    document.getElementById(`tab-${tab}`).classList.remove('border-transparent', 'text-gray-500');
    
    document.querySelectorAll('[id^="content-"]').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`content-${tab}`).classList.remove('hidden');
}

function updateWeekText() {
    const year = currentWeekStart.getFullYear();
    const month = currentWeekStart.getMonth() + 1;
    const weekNumber = Math.ceil(currentWeekStart.getDate() / 7);
    document.getElementById('current-week-text').textContent = `${year}年${month}月第${weekNumber}周`;
}

function previousWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateWeekText();
    loadWeeklyMenu();
}

function nextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateWeekText();
    loadWeeklyMenu();
}

function loadWeeklyMenu() {
    const weeklyMenus = db.get('weekly_menus');
    const tableBody = document.getElementById('weekly-menu-table');
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        weekDays.push({
            date: date,
            dateStr: utils.formatDate(date),
            weekDay: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
        });
    }
    
    if (weeklyMenus.length === 0) {
        tableBody.innerHTML = generateEmptyWeekMenu(weekDays);
        return;
    }

    let html = '';
    weekDays.forEach(day => {
        const menu = weeklyMenus.find(m => m.date === day.dateStr);
        
        const getMealDishes = (meal) => {
            if (!menu || !menu.meals[meal] || menu.meals[meal].length === 0) {
                return '<span class="text-gray-400">未设置</span>';
            }
            return menu.meals[meal].map(d => escapeHtml(d.name)).join('、');
        };

        const totalCost = menu ? calculateMenuTotalCost(menu) : 0;
        
        let statusBadge = '';
        if (menu) {
            statusBadge = menu.status === 'published' 
                ? '<span class="status-badge status-success">已发布</span>' 
                : '<span class="status-badge status-gray">草稿</span>';
        } else {
            statusBadge = '<span class="status-badge status-gray">未创建</span>';
        }
        
        const today = utils.formatDate(new Date());
        const rowClass = day.dateStr === today ? 'bg-blue-50' : '';
        
        html += `
            <tr class="${rowClass}">
                <td class="px-6 py-4 whitespace-nowrap">
                    ${menu ? '<input type="checkbox" class="menu-checkbox rounded text-blue-600" data-menu-id="' + escapeHtml(menu.id) + '" onchange="updateBatchButton()">' : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(day.weekDay)}</div>
                    ${day.dateStr === today ? '<span class="text-xs text-blue-600">今日</span>' : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${escapeHtml(day.dateStr)}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${getMealDishes('breakfast')}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${getMealDishes('lunch')}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${getMealDishes('dinner')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${menu ? menu.total_diners + ' 人' : '<span class="text-gray-400">-</span>'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    ${totalCost > 0 ? utils.formatMoney(totalCost) : '<span class="text-gray-400">-</span>'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    ${menu ? `
                        <button onclick="editMenu('${escapeHtml(menu.id)}')" class="text-blue-600 hover:text-blue-900 mr-3">编辑</button>
                        <button onclick="viewMenuDetail('${escapeHtml(menu.id)}')" class="text-gray-600 hover:text-gray-900 mr-3">查看</button>
                        <button onclick="generatePurchaseBudget('${escapeHtml(menu.id)}')" class="text-green-600 hover:text-green-900 mr-3">采购</button>
                        <button onclick="deleteMenu('${escapeHtml(menu.id)}', '${escapeHtml(day.dateStr)}', '${escapeHtml(day.weekDay)}')" class="text-red-600 hover:text-red-900">删除</button>
                    ` : `
                        <button onclick="createMenu('${escapeHtml(day.dateStr)}', '${escapeHtml(day.weekDay)}')" class="text-blue-600 hover:text-blue-900">创建</button>
                    `}
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
    updateBatchButton();
}

function updateBatchButton() {
    var checkboxes = document.querySelectorAll('.menu-checkbox');
    var checked = document.querySelectorAll('.menu-checkbox:checked');
    var purchaseBtn = document.getElementById('batch-purchase-btn');
    var deleteBtn = document.getElementById('batch-delete-btn');
    
    if (checked.length > 0) {
        if (purchaseBtn) {
            purchaseBtn.disabled = false;
            purchaseBtn.className = 'px-4 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700';
        }
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.className = 'px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700';
        }
    } else {
        if (purchaseBtn) {
            purchaseBtn.disabled = true;
            purchaseBtn.className = 'px-4 py-2 bg-gray-300 text-gray-500 rounded-md text-sm cursor-not-allowed';
        }
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.className = 'px-4 py-2 bg-gray-300 text-gray-500 rounded-md text-sm cursor-not-allowed';
        }
    }
    
    var selectAll = document.getElementById('select-all-menu');
    if (selectAll) {
        selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    }
}

function toggleSelectAll(el) {
    document.querySelectorAll('.menu-checkbox').forEach(function(cb) {
        cb.checked = el.checked;
    });
    updateBatchButton();
}

function batchDeleteMenu() {
    var checked = document.querySelectorAll('.menu-checkbox:checked');
    if (checked.length === 0) {
        utils.showMessage('请先勾选要删除的菜谱', 'warning');
        return;
    }
    
    var menuIds = [];
    var menuLabels = [];
    checked.forEach(function(cb) {
        menuIds.push(cb.dataset.menuId);
        var row = cb.closest('tr');
        var dateCell = row ? row.cells[2] : null;
        var weekCell = row ? row.cells[1] : null;
        var dateText = dateCell ? dateCell.textContent.trim() : cb.dataset.menuId;
        var weekText = weekCell ? weekCell.textContent.trim().replace('今日', '').trim() : '';
        menuLabels.push(weekText + ' ' + dateText);
    });
    
    var content = '<div class="space-y-3">' +
        '<p class="text-sm">确定要删除以下 <strong class="text-red-600">' + menuIds.length + '</strong> 天的菜谱吗？此操作不可恢复。</p>' +
        '<div class="bg-red-50 rounded-md p-3">' +
            '<p class="text-xs text-red-600 font-medium mb-2">即将删除：</p>' +
            '<p class="text-sm text-red-700">' + menuLabels.map(function(l) { return escapeHtml(l); }).join('、') + '</p>' +
        '</div>' +
        '<p class="text-xs text-gray-500">关联的采购单不会被自动删除</p>' +
    '</div>';
    
    openModal('确认批量删除', content, function() {
        var deleted = 0;
        menuIds.forEach(function(id) {
            if (db.delete('weekly_menus', id)) deleted++;
        });
        
        document.querySelectorAll('.menu-checkbox').forEach(function(cb) { cb.checked = false; });
        var selectAll = document.getElementById('select-all-menu');
        if (selectAll) selectAll.checked = false;
        updateBatchButton();
        
        utils.showMessage('已删除 ' + deleted + ' 天菜谱');
        loadWeeklyMenu();
    });
}

function batchGeneratePurchase() {
    var checked = document.querySelectorAll('.menu-checkbox:checked');
    if (checked.length === 0) {
        utils.showMessage('请先选择菜谱', 'warning');
        return;
    }
    
    var menuIds = [];
    checked.forEach(function(cb) { menuIds.push(cb.dataset.menuId); });
    
    var allBudget = [];
    var menuNames = [];
    menuIds.forEach(function(menuId) {
        var menu = db.get('weekly_menus').find(function(m) { return m.id === menuId; });
        if (menu) {
            var budget = utils.calculatePurchaseBudget(menu);
            var needItems = budget.filter(function(item) { return item.need_purchase > 0; });
            allBudget = allBudget.concat(needItems);
            menuNames.push(menu.date + '(' + menu.week_day + ')');
        }
    });
    
    if (allBudget.length === 0) {
        utils.showMessage('所选菜谱无需采购的食材', 'warning');
        return;
    }
    
    var suppliers = db.get('suppliers');
    var supplierGroups = {};
    var noSupplierItems = [];
    
    allBudget.forEach(function(item) {
        var key = item.ingredient_id + '_' + item.name;
        if (item.supplier_ids && item.supplier_ids.length > 0) {
            var primarySupplierId = item.supplier_ids[0];
            if (!supplierGroups[primarySupplierId]) supplierGroups[primarySupplierId] = {};
            if (supplierGroups[primarySupplierId][key]) {
                supplierGroups[primarySupplierId][key].need_purchase += item.need_purchase;
                supplierGroups[primarySupplierId][key].amount += item.amount;
            } else {
                supplierGroups[primarySupplierId][key] = Object.assign({}, item);
            }
        } else {
            if (noSupplierItems[key]) {
                noSupplierItems[key].need_purchase += item.need_purchase;
                noSupplierItems[key].amount += item.amount;
            } else {
                noSupplierItems[key] = Object.assign({}, item);
            }
        }
    });
    
    Object.keys(supplierGroups).forEach(function(sid) {
        supplierGroups[sid] = Object.values(supplierGroups[sid]);
    });
    noSupplierItems = Object.values(noSupplierItems);
    
    var previewHtml = '';
    var totalAll = 0;
    
    Object.keys(supplierGroups).forEach(function(supplierId) {
        var supplier = suppliers.find(function(s) { return s.id === supplierId; });
        var items = supplierGroups[supplierId];
        var groupTotal = items.reduce(function(sum, i) { return sum + i.amount; }, 0);
        totalAll += groupTotal;
        
        previewHtml += '<div class="border rounded-md p-3 mb-3">' +
            '<div class="flex justify-between items-center mb-2">' +
                '<span class="font-medium text-sm"><i class="fas fa-truck mr-1 text-blue-500"></i>' + (supplier ? escapeHtml(supplier.name) : '未知供应商') + '</span>' +
                '<span class="text-sm text-red-600 font-medium">' + utils.formatMoney(groupTotal) + '</span>' +
            '</div>' +
            '<table class="w-full text-xs"><thead><tr class="text-gray-500"><th class="text-left py-1">食材</th><th class="text-right py-1">采购量</th><th class="text-right py-1">单价</th><th class="text-right py-1">金额</th></tr></thead>' +
            '<tbody>' + items.map(function(item) {
                return '<tr><td class="py-1">' + escapeHtml(item.name) + '</td><td class="text-right py-1">' + item.need_purchase.toFixed(2) + ' ' + (item.unit || 'kg') + '</td><td class="text-right py-1">¥' + item.price.toFixed(2) + '</td><td class="text-right py-1">¥' + item.amount.toFixed(2) + '</td></tr>';
            }).join('') + '</tbody></table></div>';
    });
    
    if (noSupplierItems.length > 0) {
        var noSupTotal = noSupplierItems.reduce(function(sum, i) { return sum + i.amount; }, 0);
        totalAll += noSupTotal;
        previewHtml += '<div class="border border-yellow-300 rounded-md p-3 mb-3 bg-yellow-50">' +
            '<div class="flex justify-between items-center mb-2">' +
                '<span class="font-medium text-sm text-yellow-700"><i class="fas fa-exclamation-triangle mr-1"></i>未关联供应商</span>' +
                '<span class="text-sm text-red-600 font-medium">' + utils.formatMoney(noSupTotal) + '</span>' +
            '</div>' +
            '<table class="w-full text-xs"><thead><tr class="text-gray-500"><th class="text-left py-1">食材</th><th class="text-right py-1">采购量</th><th class="text-right py-1">单价</th><th class="text-right py-1">金额</th></tr></thead>' +
            '<tbody>' + noSupplierItems.map(function(item) {
                return '<tr><td class="py-1">' + escapeHtml(item.name) + '</td><td class="text-right py-1">' + item.need_purchase.toFixed(2) + ' ' + (item.unit || 'kg') + '</td><td class="text-right py-1">¥' + item.price.toFixed(2) + '</td><td class="text-right py-1">¥' + item.amount.toFixed(2) + '</td></tr>';
            }).join('') + '</tbody></table>' +
            '<p class="text-xs text-yellow-600 mt-2">请先在食材库中为这些食材关联供应商</p></div>';
    }
    
    var content = '<div class="space-y-4">' +
        '<div class="flex justify-between items-center">' +
            '<h4 class="font-medium">批量生成采购单</h4>' +
            '<span class="text-sm">合计：<span class="text-red-600 font-bold">' + utils.formatMoney(totalAll) + '</span></span>' +
        '</div>' +
        '<p class="text-xs text-gray-500">已选择 ' + menuIds.length + ' 天菜谱：' + menuNames.map(function(n) { return escapeHtml(n); }).join('、') + '</p>' +
        '<p class="text-xs text-gray-500">系统根据食材关联的供应商自动分组，将生成 ' + Object.keys(supplierGroups).length + ' 张采购单</p>' +
        previewHtml +
    '</div>';
    
    openModal('批量生成采购单', content, function() {
        var createdCount = 0;
        
        Object.keys(supplierGroups).forEach(function(supplierId) {
            var supplier = suppliers.find(function(s) { return s.id === supplierId; });
            if (!supplier) return;
            
            var items = supplierGroups[supplierId].map(function(item) {
                return {
                    ingredient_id: item.ingredient_id,
                    name: item.name,
                    quantity: item.need_purchase,
                    price: item.price,
                    amount: item.amount,
                    received_quantity: 0
                };
            });
            
            db.add('purchase_orders', {
                id: utils.generateId('CG'),
                supplier_id: supplierId,
                supplier_name: supplier.name,
                date: utils.formatDate(new Date()),
                expect_arrive_date: utils.formatDate(new Date(Date.now() + 86400000)),
                items: items,
                total_amount: items.reduce(function(sum, i) { return sum + i.amount; }, 0),
                status: 'pending_approval',
                creator: '管理员',
                related_menu_id: menuIds.join(','),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            createdCount++;
        });
        
        if (noSupplierItems.length > 0) {
            db.add('purchase_orders', {
                id: utils.generateId('CG'),
                supplier_id: '',
                supplier_name: '未指定供应商',
                date: utils.formatDate(new Date()),
                expect_arrive_date: utils.formatDate(new Date(Date.now() + 86400000)),
                items: noSupplierItems.map(function(item) {
                    return { ingredient_id: item.ingredient_id, name: item.name, quantity: item.need_purchase, price: item.price, amount: item.amount, received_quantity: 0 };
                }),
                total_amount: noSupplierItems.reduce(function(sum, i) { return sum + i.amount; }, 0),
                status: 'pending_approval',
                creator: '管理员',
                related_menu_id: menuIds.join(','),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            createdCount++;
        }
        
        document.querySelectorAll('.menu-checkbox').forEach(function(cb) { cb.checked = false; });
        var selectAll = document.getElementById('select-all-menu');
        if (selectAll) selectAll.checked = false;
        updateBatchButton();
        
        utils.showMessage('已按供应商自动生成 ' + createdCount + ' 张采购单，请前往采购管理查看');
    });
}

function generateEmptyWeekMenu(weekDays) {
    let html = '';
    weekDays.forEach(day => {
        const today = utils.formatDate(new Date());
        const rowClass = day.dateStr === today ? 'bg-blue-50' : '';
        
        html += `
            <tr class="${rowClass}">
                <td class="px-6 py-4 whitespace-nowrap"></td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(day.weekDay)}</div>
                    ${day.dateStr === today ? '<span class="text-xs text-blue-600">今日</span>' : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${escapeHtml(day.dateStr)}</td>
                <td class="px-6 py-4 text-sm text-gray-400">未设置</td>
                <td class="px-6 py-4 text-sm text-gray-400">未设置</td>
                <td class="px-6 py-4 text-sm text-gray-400">未设置</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge status-gray">未创建</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="createMenu('${escapeHtml(day.dateStr)}', '${escapeHtml(day.weekDay)}')" class="text-blue-600 hover:text-blue-900">创建</button>
                </td>
            </tr>
        `;
    });
    return html;
}

function createMenu(date, weekDay) {
    const dishes = db.get('dishes').filter(d => d.status === 'enabled');
    const dishOptions = dishes.map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join('');
    
    const content = `
        <form id="menu-form">
            <input type="hidden" name="date" value="${escapeHtml(date)}">
            <input type="hidden" name="week_day" value="${escapeHtml(weekDay)}">
            
            <div class="space-y-6">
                <div>
                    <label class="form-label">预计总就餐人数</label>
                    <input type="number" name="total_diners" class="form-input" value="1650" required>
                </div>
                
                <div>
                    <h4 class="font-medium mb-3">早餐设置</h4>
                    <div id="breakfast-meals">
                        <div class="grid grid-cols-2 gap-3 mb-3">
                            <select name="breakfast_dish[]" class="form-select">
                                <option value="">请选择菜品</option>
                                ${dishOptions}
                            </select>
                            <input type="number" name="breakfast_diners[]" class="form-input" placeholder="就餐人数" value="200">
                        </div>
                    </div>
                    <button type="button" onclick="addMealItem('breakfast')" class="text-sm text-blue-600">+ 添加菜品</button>
                </div>
                
                <div>
                    <h4 class="font-medium mb-3">午餐设置</h4>
                    <div id="lunch-meals">
                        <div class="grid grid-cols-2 gap-3 mb-3">
                            <select name="lunch_dish[]" class="form-select">
                                <option value="">请选择菜品</option>
                                ${dishOptions}
                            </select>
                            <input type="number" name="lunch_diners[]" class="form-input" placeholder="就餐人数" value="350">
                        </div>
                        <div class="grid grid-cols-2 gap-3 mb-3">
                            <select name="lunch_dish[]" class="form-select">
                                <option value="">请选择菜品</option>
                                ${dishOptions}
                            </select>
                            <input type="number" name="lunch_diners[]" class="form-input" placeholder="就餐人数" value="350">
                        </div>
                    </div>
                    <button type="button" onclick="addMealItem('lunch')" class="text-sm text-blue-600">+ 添加菜品</button>
                </div>
                
                <div>
                    <h4 class="font-medium mb-3">晚餐设置</h4>
                    <div id="dinner-meals">
                        <div class="grid grid-cols-2 gap-3 mb-3">
                            <select name="dinner_dish[]" class="form-select">
                                <option value="">请选择菜品</option>
                                ${dishOptions}
                            </select>
                            <input type="number" name="dinner_diners[]" class="form-input" placeholder="就餐人数" value="200">
                        </div>
                    </div>
                    <button type="button" onclick="addMealItem('dinner')" class="text-sm text-blue-600">+ 添加菜品</button>
                </div>
            </div>
        </form>
    `;
    
    openModal(`创建${escapeHtml(weekDay)}菜谱`, content, function() {
        saveMenu();
    });
}

function addMealItem(mealType) {
    const dishes = db.get('dishes').filter(d => d.status === 'enabled');
    const dishOptions = dishes.map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join('');
    
    const container = document.getElementById(`${mealType}-meals`);
    const item = document.createElement('div');
    item.className = 'grid grid-cols-2 gap-3 mb-3';
    item.innerHTML = `
        <select name="${mealType}_dish[]" class="form-select">
            <option value="">请选择菜品</option>
            ${dishOptions}
        </select>
        <div class="flex space-x-2">
            <input type="number" name="${mealType}_diners[]" class="form-input flex-1" placeholder="就餐人数">
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="px-2 py-1 bg-red-600 text-white rounded text-xs">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(item);
}

function saveMenu() {
    const form = document.getElementById('menu-form');
    if (!form) return false;
    const formData = new FormData(form);
    
    const menu = {
        id: `MENU${formData.get('date').replace(/-/g, '')}`,
        date: formData.get('date'),
        week_day: formData.get('week_day'),
        total_diners: parseInt(formData.get('total_diners')) || 0,
        meals: {
            breakfast: [],
            lunch: [],
            dinner: []
        },
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const breakfastDishes = formData.getAll('breakfast_dish[]');
    const breakfastDiners = formData.getAll('breakfast_diners[]');
    breakfastDishes.forEach((dishId, index) => {
        if (dishId && breakfastDiners[index]) {
            const dish = db.get('dishes').find(d => d.id === dishId);
            if (dish) {
                menu.meals.breakfast.push({
                    dish_id: dishId,
                    name: dish.name,
                    estimated_diners: parseInt(breakfastDiners[index])
                });
            }
        }
    });
    
    const lunchDishes = formData.getAll('lunch_dish[]');
    const lunchDiners = formData.getAll('lunch_diners[]');
    lunchDishes.forEach((dishId, index) => {
        if (dishId && lunchDiners[index]) {
            const dish = db.get('dishes').find(d => d.id === dishId);
            if (dish) {
                menu.meals.lunch.push({
                    dish_id: dishId,
                    name: dish.name,
                    estimated_diners: parseInt(lunchDiners[index])
                });
            }
        }
    });
    
    const dinnerDishes = formData.getAll('dinner_dish[]');
    const dinnerDiners = formData.getAll('dinner_diners[]');
    dinnerDishes.forEach((dishId, index) => {
        if (dishId && dinnerDiners[index]) {
            const dish = db.get('dishes').find(d => d.id === dishId);
            if (dish) {
                menu.meals.dinner.push({
                    dish_id: dishId,
                    name: dish.name,
                    estimated_diners: parseInt(dinnerDiners[index])
                });
            }
        }
    });

    const existing = db.get('weekly_menus').find(m => m.id === menu.id);
    if (existing) {
        db.update('weekly_menus', menu.id, {
            meals: menu.meals,
            total_diners: menu.total_diners,
            status: menu.status,
            updated_at: menu.updated_at
        });
    } else {
        db.add('weekly_menus', menu);
    }
    utils.showMessage('菜谱创建成功');
    loadWeeklyMenu();
}

function generateWeeklyMenu() {
    var dishes = db.get('dishes').filter(function(d) { return d.status === 'enabled'; });
    var categories = [];
    dishes.forEach(function(d) {
        if (categories.indexOf(d.category) === -1) categories.push(d.category);
    });
    
    var catCheckboxes = categories.map(function(c) {
        var count = dishes.filter(function(d) { return d.category === c; }).length;
        return '<label class="flex items-center space-x-2 mr-4 mb-2"><input type="checkbox" name="include_categories" value="' + c + '" checked class="rounded text-blue-600"><span class="text-sm">' + c + ' <span class="text-xs text-gray-400">(' + count + '个菜品)</span></span></label>';
    }).join('');
    
    var content = '<form id="generate-menu-form" class="space-y-5">' +
        '<div><label class="form-label">预计每日就餐人数</label><input type="number" name="total_diners" class="form-input" value="1650" min="1" required></div>' +
        '<div><label class="form-label">午餐菜品数量</label><div class="grid grid-cols-3 gap-4">' +
            '<div><label class="text-sm text-gray-600">大荤</label><input type="number" name="lunch_main" class="form-input" value="1" min="0" max="5"></div>' +
            '<div><label class="text-sm text-gray-600">小荤</label><input type="number" name="lunch_sub" class="form-input" value="2" min="0" max="5"></div>' +
            '<div><label class="text-sm text-gray-600">素菜</label><input type="number" name="lunch_veg" class="form-input" value="2" min="0" max="5"></div>' +
        '</div></div>' +
        '<div><label class="form-label">晚餐菜品数量</label><div class="grid grid-cols-3 gap-4">' +
            '<div><label class="text-sm text-gray-600">大荤</label><input type="number" name="dinner_main" class="form-input" value="1" min="0" max="5"></div>' +
            '<div><label class="text-sm text-gray-600">小荤</label><input type="number" name="dinner_sub" class="form-input" value="1" min="0" max="5"></div>' +
            '<div><label class="text-sm text-gray-600">素菜</label><input type="number" name="dinner_veg" class="form-input" value="2" min="0" max="5"></div>' +
        '</div></div>' +
        '<div><label class="form-label">早餐菜品数量</label><input type="number" name="breakfast_count" class="form-input" value="2" min="0" max="5" style="width:120px"></div>' +
        '<div><label class="form-label">包含菜品分类</label><div class="flex flex-wrap mt-1">' + (catCheckboxes || '<span class="text-sm text-gray-400">暂无菜品</span>') + '</div><p class="text-xs text-gray-400 mt-1">取消勾选的分类不会出现在生成的菜谱中</p></div>' +
        '<div><label class="form-label">生成选项</label><div class="space-y-2 mt-1">' +
            '<label class="flex items-center space-x-2"><input type="checkbox" name="avoid_repeat" value="1" checked class="rounded text-blue-600"><span class="text-sm">同一天内不重复菜品</span></label>' +
            '<label class="flex items-center space-x-2"><input type="checkbox" name="prefer_high_sales" value="1" checked class="rounded text-blue-600"><span class="text-sm">优先选择高销量菜品</span></label>' +
            '<label class="flex items-center space-x-2"><input type="checkbox" name="prefer_expiring" value="1" class="rounded text-blue-600"><span class="text-sm">优先消耗临期食材</span></label>' +
        '</div></div>' +
    '</form>';
    
    openModal('智能生成周菜谱', content, function() {
        var form = document.getElementById('generate-menu-form');
        var fd = new FormData(form);
        var options = {
            totalDiners: parseInt(fd.get('total_diners')) || 1650,
            lunchMain: parseInt(fd.get('lunch_main')) || 0,
            lunchSub: parseInt(fd.get('lunch_sub')) || 0,
            lunchVeg: parseInt(fd.get('lunch_veg')) || 0,
            dinnerMain: parseInt(fd.get('dinner_main')) || 0,
            dinnerSub: parseInt(fd.get('dinner_sub')) || 0,
            dinnerVeg: parseInt(fd.get('dinner_veg')) || 0,
            breakfastCount: parseInt(fd.get('breakfast_count')) || 0,
            includeCategories: Array.from(form.querySelectorAll('input[name="include_categories"]:checked')).map(function(cb) { return cb.value; }),
            avoidRepeat: !!fd.get('avoid_repeat'),
            preferHighSales: !!fd.get('prefer_high_sales'),
            preferExpiring: !!fd.get('prefer_expiring')
        };
        previewGeneratedMenu(options);
    });
}

function previewGeneratedMenu(options) {
    var generatedMenus = buildWeeklyMenus(options);
    if (!generatedMenus || generatedMenus.length === 0) {
        utils.showMessage('无法生成菜谱，请检查菜品数据', 'error');
        return false;
    }
    
    var totalDiners = 0;
    var totalCost = 0;
    generatedMenus.forEach(function(menu) {
        totalDiners += menu.total_diners || 0;
        totalCost += calculateMenuTotalCost(menu);
    });
    
    var previewHtml = generatedMenus.map(function(menu) {
        var mealHtml = function(meal, label) {
            if (!meal || meal.length === 0) return '';
            return '<div class="mb-2"><span class="text-xs font-medium text-gray-500">' + label + '：</span>' +
                meal.map(function(d) { return '<span class="inline-block px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded mr-1 mb-1">' + escapeHtml(d.name) + ' <span class="text-blue-400">' + d.estimated_diners + '人</span></span>'; }).join('') +
            '</div>';
        };
        return '<div class="border rounded-md p-3 mb-2">' +
            '<div class="flex justify-between items-center mb-2">' +
                '<span class="font-medium text-sm">' + escapeHtml(menu.week_day) + ' <span class="text-gray-400 font-normal">' + escapeHtml(menu.date) + '</span></span>' +
                '<span class="text-xs text-gray-500">' + menu.total_diners + '人</span>' +
            '</div>' +
            mealHtml(menu.meals.breakfast, '早餐') +
            mealHtml(menu.meals.lunch, '午餐') +
            mealHtml(menu.meals.dinner, '晚餐') +
        '</div>';
    }).join('');
    
    var content = '<div class="space-y-4">' +
        '<div class="flex justify-between items-center bg-gray-50 rounded-md p-3">' +
            '<div class="text-sm"><span class="text-gray-500">总就餐人次：</span><span class="font-medium">' + totalDiners + '</span></div>' +
            '<div class="text-sm"><span class="text-gray-500">预计采购金额：</span><span class="font-medium text-red-600">' + utils.formatMoney(totalCost) + '</span></div>' +
        '</div>' +
        '<div class="text-sm text-gray-500 mb-2">以下为系统智能生成的菜谱，确认后将保存为草稿状态</div>' +
        '<div style="max-height:400px;overflow-y:auto">' + previewHtml + '</div>' +
    '</div>';
    
    openModal('预览生成结果', content, function() {
        generatedMenus.forEach(function(menu) {
            var existing = db.get('weekly_menus').find(function(m) { return m.id === menu.id; });
            if (existing) {
                db.update('weekly_menus', menu.id, {
                    meals: menu.meals,
                    total_diners: menu.total_diners,
                    status: 'draft',
                    updated_at: menu.updated_at
                });
            } else {
                db.add('weekly_menus', menu);
            }
        });
        utils.showMessage('周菜谱生成成功');
        loadWeeklyMenu();
    });
}

function buildWeeklyMenus(options) {
    var allDishes = db.get('dishes').filter(function(d) { return d.status === 'enabled'; });
    
    if (allDishes.length === 0) return [];
    
    var dishes = options.includeCategories.length > 0
        ? allDishes.filter(function(d) { return options.includeCategories.indexOf(d.category) !== -1; })
        : allDishes;
    
    if (dishes.length === 0) return [];
    
    var ingredients = db.get('ingredients');
    
    var scoredDishes = dishes.map(function(dish) {
        var score = 50;
        
        if (options.preferHighSales) {
            var maxSales = Math.max.apply(null, dishes.map(function(d) { return d.sales || 0; }).concat([1]));
            score += ((dish.sales || 0) / maxSales) * 30;
        }
        
        if (options.preferExpiring && dish.ingredients) {
            dish.ingredients.forEach(function(ing) {
                var ingredient = ingredients.find(function(i) { return i.id === ing.ingredient_id; });
                if (ingredient && ingredient.expire_date) {
                    var diffDays = Math.ceil((new Date(ingredient.expire_date).getTime() - Date.now()) / 86400000);
                    if (diffDays > 0 && diffDays <= 7) score += 10;
                    if (diffDays <= 0) score += 15;
                }
            });
        }
        
        return Object.assign({}, dish, { score: score });
    }).sort(function(a, b) { return b.score - a.score; });
    
    var dishesByCategory = {};
    scoredDishes.forEach(function(d) {
        if (!dishesByCategory[d.category]) dishesByCategory[d.category] = [];
        dishesByCategory[d.category].push(d);
    });
    
    var mainCat = Object.keys(dishesByCategory).find(function(c) { return c.indexOf('荤') !== -1 && c.indexOf('小') === -1 && c.indexOf('半') === -1; }) || Object.keys(dishesByCategory)[0];
    var subCat = Object.keys(dishesByCategory).find(function(c) { return c.indexOf('小荤') !== -1 || c.indexOf('半荤') !== -1; }) || mainCat;
    var vegCat = Object.keys(dishesByCategory).find(function(c) { return c.indexOf('素') !== -1 || c.indexOf('蔬') !== -1; }) || Object.keys(dishesByCategory)[Object.keys(dishesByCategory).length - 1];
    
    var weekDays = [];
    for (var i = 0; i < 7; i++) {
        var date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        weekDays.push({
            dateStr: utils.formatDate(date),
            weekDay: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
        });
    }
    
    var weeklyMenus = [];
    
    weekDays.forEach(function(day) {
        var dailyDiners = Math.round(options.totalDiners / 7);
        var usedDishes = new Set();
        
        var selectedDishes = { breakfast: [], lunch: [], dinner: [] };
        
        function pickDish(cat, dinersRatio) {
            var pool = dishesByCategory[cat];
            if (!pool || pool.length === 0) return null;
            var available = options.avoidRepeat ? pool.filter(function(d) { return !usedDishes.has(d.id); }) : pool;
            if (available.length === 0) available = pool;
            var idx = Math.floor(Math.random() * Math.min(3, available.length));
            var dish = available[idx];
            if (dish) usedDishes.add(dish.id);
            return dish ? { dish_id: dish.id, name: dish.name, estimated_diners: Math.round(dailyDiners * dinersRatio) } : null;
        }
        
        for (var i = 0; i < options.lunchMain; i++) { var d = pickDish(mainCat, 0.6); if (d) selectedDishes.lunch.push(d); }
        for (var i = 0; i < options.lunchSub; i++) { var d = pickDish(subCat, 0.7); if (d) selectedDishes.lunch.push(d); }
        for (var i = 0; i < options.lunchVeg; i++) { var d = pickDish(vegCat, 0.8); if (d) selectedDishes.lunch.push(d); }
        for (var i = 0; i < options.dinnerMain; i++) { var d = pickDish(mainCat, 0.4); if (d) selectedDishes.dinner.push(d); }
        for (var i = 0; i < options.dinnerSub; i++) { var d = pickDish(subCat, 0.45); if (d) selectedDishes.dinner.push(d); }
        for (var i = 0; i < options.dinnerVeg; i++) { var d = pickDish(vegCat, 0.5); if (d) selectedDishes.dinner.push(d); }
        for (var i = 0; i < options.breakfastCount; i++) { var d = pickDish(vegCat, 0.3); if (d) selectedDishes.breakfast.push(d); }
        
        weeklyMenus.push({
            id: 'MENU' + day.dateStr.replace(/-/g, ''),
            date: day.dateStr,
            week_day: day.weekDay,
            meals: selectedDishes,
            total_diners: dailyDiners,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    });
    
    return weeklyMenus;
}

function getRandomDish(dishes, usedDishes) {
    const unusedDishes = dishes.filter(d => !usedDishes.has(d.id));
    if (unusedDishes.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(5, unusedDishes.length));
        return unusedDishes[randomIndex];
    } else if (dishes.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(5, dishes.length));
        return dishes[randomIndex];
    }
    return null;
}

function publishWeekMenu() {
    const confirmContent = '<p>确定要发布本周菜谱吗？发布后菜谱将无法修改。</p>';
    
    openModal('确认发布', confirmContent, function() {
        const weeklyMenus = db.get('weekly_menus');
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(currentWeekStart);
            date.setDate(currentWeekStart.getDate() + i);
            const dateStr = utils.formatDate(date);
            
            const menu = weeklyMenus.find(m => m.date === dateStr);
            if (menu) {
                db.update('weekly_menus', menu.id, {
                    status: 'published',
                    updated_at: new Date().toISOString()
                });
            }
        }
        
        utils.showMessage('本周菜谱发布成功');
        loadWeeklyMenu();
    });
}

function copyPreviousWeekMenu() {
    var currentMenus = db.get('weekly_menus');
    var weekDays = [];
    for (var i = 0; i < 7; i++) {
        var date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        var dateStr = utils.formatDate(date);
        var weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
        var menu = currentMenus.find(function(m) { return m.date === dateStr; });
        weekDays.push({ dateStr: dateStr, weekDay: weekDay, menu: menu });
    }
    
    var existingMenus = weekDays.filter(function(d) { return d.menu; });
    if (existingMenus.length === 0) {
        utils.showMessage('当前周没有已创建的菜谱可复制', 'warning');
        return false;
    }
    
    var sourceOptions = existingMenus.map(function(d) {
        var mealCount = (d.menu.meals.breakfast ? d.menu.meals.breakfast.length : 0) +
            (d.menu.meals.lunch ? d.menu.meals.lunch.length : 0) +
            (d.menu.meals.dinner ? d.menu.meals.dinner.length : 0);
        return '<option value="' + escapeHtml(d.dateStr) + '">' + escapeHtml(d.weekDay) + ' ' + escapeHtml(d.dateStr) + ' (' + mealCount + '个菜品, ' + d.menu.total_diners + '人)</option>';
    }).join('');
    
    var targetCheckboxes = weekDays.map(function(d) {
        var hasMenu = !!d.menu;
        return '<label class="flex items-center space-x-2 mr-4 mb-2 ' + (hasMenu ? 'text-gray-400' : '') + '">' +
            '<input type="checkbox" name="target_days" value="' + escapeHtml(d.dateStr) + '"' + (hasMenu ? ' disabled' : '') + ' class="rounded text-blue-600">' +
            '<span class="text-sm">' + escapeHtml(d.weekDay) + ' ' + escapeHtml(d.dateStr) + (hasMenu ? ' (已有菜谱)' : '') + '</span></label>';
    }).join('');
    
    var content = '<div class="space-y-4">' +
        '<div><label class="form-label">选择源菜谱</label><select id="copy-source" class="form-select">' + sourceOptions + '</select></div>' +
        '<div><label class="form-label">复制到（多选）</label><div class="flex flex-wrap mt-1">' + targetCheckboxes + '</div><p class="text-xs text-gray-400 mt-1">已有菜谱的日期不可覆盖，如需覆盖请先删除</p></div>' +
    '</div>';
    
    openModal('同步菜谱', content, function() {
        var sourceDate = document.getElementById('copy-source').value;
        var sourceMenu = currentMenus.find(function(m) { return m.date === sourceDate; });
        if (!sourceMenu) { utils.showMessage('请选择源菜谱', 'error'); return false; }
        
        var form = document.querySelector('#common-modal');
        var targets = Array.from(form.querySelectorAll('input[name="target_days"]:checked')).map(function(cb) { return cb.value; });
        if (targets.length === 0) { utils.showMessage('请选择至少一个目标日期', 'error'); return false; }
        
        var copied = 0;
        targets.forEach(function(dateStr) {
            var dayInfo = weekDays.find(function(d) { return d.dateStr === dateStr; });
            if (!dayInfo) return;
            
            var newMenu = JSON.parse(JSON.stringify(sourceMenu));
            newMenu.id = 'MENU' + dateStr.replace(/-/g, '');
            newMenu.date = dateStr;
            newMenu.week_day = dayInfo.weekDay;
            newMenu.status = 'draft';
            newMenu.created_at = new Date().toISOString();
            newMenu.updated_at = new Date().toISOString();
            
            db.add('weekly_menus', newMenu);
            copied++;
        });
        
        utils.showMessage('已复制菜谱到 ' + copied + ' 天');
        loadWeeklyMenu();
    });
}

function generatePurchaseBudget(menuId) {
    const menu = db.get('weekly_menus').find(m => m.id === menuId);
    if (!menu) {
        utils.showMessage('菜谱不存在', 'error');
        return false;
    }
    
    const budget = utils.calculatePurchaseBudget(menu);
    const needPurchaseItems = budget.filter(item => item.need_purchase > 0);
    
    if (needPurchaseItems.length === 0) {
        utils.showMessage('该菜谱无需采购的食材', 'warning');
        return false;
    }
    
    const suppliers = db.get('suppliers');
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
    
    let previewHtml = '';
    let totalAll = 0;
    
    Object.keys(supplierGroups).forEach(supplierId => {
        const supplier = suppliers.find(s => s.id === supplierId);
        const items = supplierGroups[supplierId];
        const groupTotal = items.reduce((sum, i) => sum + i.amount, 0);
        totalAll += groupTotal;
        
        previewHtml += `
            <div class="border rounded-md p-3 mb-3">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium text-sm"><i class="fas fa-truck mr-1 text-blue-500"></i>${supplier ? escapeHtml(supplier.name) : '未知供应商'}</span>
                    <span class="text-sm text-red-600 font-medium">${utils.formatMoney(groupTotal)}</span>
                </div>
                <table class="w-full text-xs">
                    <thead><tr class="text-gray-500"><th class="text-left py-1">食材</th><th class="text-right py-1">采购量</th><th class="text-right py-1">单价</th><th class="text-right py-1">金额</th></tr></thead>
                    <tbody>${items.map(item => `<tr><td class="py-1">${escapeHtml(item.name)}</td><td class="text-right py-1">${item.need_purchase.toFixed(2)} ${item.unit || 'kg'}</td><td class="text-right py-1">¥${item.price.toFixed(2)}</td><td class="text-right py-1">¥${item.amount.toFixed(2)}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        `;
    });
    
    if (noSupplierItems.length > 0) {
        const noSupTotal = noSupplierItems.reduce((sum, i) => sum + i.amount, 0);
        totalAll += noSupTotal;
        previewHtml += `
            <div class="border border-yellow-300 rounded-md p-3 mb-3 bg-yellow-50">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium text-sm text-yellow-700"><i class="fas fa-exclamation-triangle mr-1"></i>未关联供应商</span>
                    <span class="text-sm text-red-600 font-medium">${utils.formatMoney(noSupTotal)}</span>
                </div>
                <table class="w-full text-xs">
                    <thead><tr class="text-gray-500"><th class="text-left py-1">食材</th><th class="text-right py-1">采购量</th><th class="text-right py-1">单价</th><th class="text-right py-1">金额</th></tr></thead>
                    <tbody>${noSupplierItems.map(item => `<tr><td class="py-1">${escapeHtml(item.name)}</td><td class="text-right py-1">${item.need_purchase.toFixed(2)} ${item.unit || 'kg'}</td><td class="text-right py-1">¥${item.price.toFixed(2)}</td><td class="text-right py-1">¥${item.amount.toFixed(2)}</td></tr>`).join('')}</tbody>
                </table>
                <p class="text-xs text-yellow-600 mt-2">请先在食材库中为这些食材关联供应商</p>
            </div>
        `;
    }
    
    const content = `
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <h4 class="font-medium">按供应商自动分组</h4>
                <span class="text-sm">合计：<span class="text-red-600 font-bold">${utils.formatMoney(totalAll)}</span></span>
            </div>
            <p class="text-xs text-gray-500">系统根据食材关联的供应商自动分组，将生成 ${Object.keys(supplierGroups).length} 张采购单</p>
            ${previewHtml}
        </div>
    `;
    
    openModal('生成采购单', content, function() {
        Object.keys(supplierGroups).forEach(supplierId => {
            const supplier = suppliers.find(s => s.id === supplierId);
            if (!supplier) return;
            
            const items = supplierGroups[supplierId].map(item => ({
                ingredient_id: item.ingredient_id,
                name: item.name,
                quantity: item.need_purchase,
                price: item.price,
                amount: item.amount,
                received_quantity: 0
            }));
            
            db.add('purchase_orders', {
                id: utils.generateId('CG'),
                supplier_id: supplierId,
                supplier_name: supplier.name,
                date: utils.formatDate(new Date()),
                expect_arrive_date: utils.formatDate(new Date(Date.now() + 86400000)),
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
            db.add('purchase_orders', {
                id: utils.generateId('CG'),
                supplier_id: '',
                supplier_name: '未指定供应商',
                date: utils.formatDate(new Date()),
                expect_arrive_date: utils.formatDate(new Date(Date.now() + 86400000)),
                items: noSupplierItems.map(item => ({
                    ingredient_id: item.ingredient_id,
                    name: item.name,
                    quantity: item.need_purchase,
                    price: item.price,
                    amount: item.amount,
                    received_quantity: 0
                })),
                total_amount: noSupplierItems.reduce((sum, i) => sum + i.amount, 0),
                status: 'pending_approval',
                creator: '管理员',
                related_menu_id: menuId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        
        utils.showMessage('已按供应商自动生成 ' + (Object.keys(supplierGroups).length + (noSupplierItems.length > 0 ? 1 : 0)) + ' 张采购单，请前往采购管理查看');
    });
}

function loadDishList() {
    const dishes = db.get('dishes');
    const tableBody = document.getElementById('dish-table');
    
    if (dishes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-utensils text-3xl mb-2"></i>
                    <p>暂无菜品数据，点击右上角"新增菜品"添加</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    dishes.forEach(dish => {
        const ingredientsText = dish.ingredients.map(ing => `${escapeHtml(ing.name)}(${ing.weight}g)`).join('、');
        
        const statusBadge = dish.status === 'enabled' 
            ? '<span class="status-badge status-success">启用</span>'
            : '<span class="status-badge status-gray">禁用</span>';
        
        let leftoverClass = 'status-success';
        if (dish.leftover_rate > 0.2) leftoverClass = 'status-warning';
        if (dish.leftover_rate > 0.3) leftoverClass = 'status-danger';
        
        html += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(dish.id)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(dish.name)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge ${getCategoryClass(dish.category)}">${escapeHtml(dish.category)}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${dish.price.toFixed(2)} 元
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${dish.cooking_time} 分钟
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${dish.weight_per_person} g/人
                </td>
                <td class="px-6 py-4 max-w-xs truncate text-sm text-gray-500" title="${escapeHtml(ingredientsText)}">
                    ${escapeHtml(ingredientsText)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${dish.sales} 份
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge ${leftoverClass}">${(dish.leftover_rate * 100).toFixed(1)}%</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${statusBadge}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editDish('${escapeHtml(dish.id)}')" class="text-blue-600 hover:text-blue-900 mr-3">编辑</button>
                    <button onclick="deleteDish('${escapeHtml(dish.id)}', '${escapeHtml(dish.name)}')" class="text-red-600 hover:text-red-900">删除</button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function getCategoryClass(category) {
    const classMap = {
        '大荤': 'bg-red-100 text-red-800',
        '小荤': 'bg-orange-100 text-orange-800',
        '素菜': 'bg-green-100 text-green-800',
        '汤品': 'bg-blue-100 text-blue-800',
        '主食': 'bg-yellow-100 text-yellow-800',
        '蔬菜': 'bg-green-100 text-green-800',
        '肉类': 'bg-red-100 text-red-800',
        '蛋类': 'bg-yellow-100 text-yellow-800',
        '粮油': 'bg-amber-100 text-amber-800',
        '辅料': 'bg-purple-100 text-purple-800',
        '冷冻品': 'bg-blue-100 text-blue-800'
    };
    return classMap[category] || 'bg-gray-100 text-gray-800';
}

function searchDishes() {
    const keyword = document.getElementById('dish-search').value.toLowerCase().trim();
    const category = document.getElementById('dish-category').value;
    const status = document.getElementById('dish-status').value;
    
    let dishes = db.get('dishes');
    
    if (keyword) {
        dishes = dishes.filter(d => d.name.toLowerCase().includes(keyword));
    }
    if (category) {
        dishes = dishes.filter(d => d.category === category);
    }
    if (status) {
        dishes = dishes.filter(d => d.status === status);
    }
    
    const tableBody = document.getElementById('dish-table');
    if (dishes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-utensils text-3xl mb-2"></i>
                    <p>没有找到匹配的菜品</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    dishes.forEach(dish => {
        const ingredientsText = dish.ingredients.map(ing => `${escapeHtml(ing.name)}(${ing.weight}g)`).join('、');
        const statusBadge = dish.status === 'enabled' 
            ? '<span class="status-badge status-success">启用</span>'
            : '<span class="status-badge status-gray">禁用</span>';
        let leftoverClass = 'status-success';
        if (dish.leftover_rate > 0.2) leftoverClass = 'status-warning';
        if (dish.leftover_rate > 0.3) leftoverClass = 'status-danger';
        
        html += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${escapeHtml(dish.id)}</div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${escapeHtml(dish.name)}</div></td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="status-badge ${getCategoryClass(dish.category)}">${escapeHtml(dish.category)}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${dish.price.toFixed(2)} 元</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${dish.cooking_time} 分钟</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${dish.weight_per_person} g/人</td>
                <td class="px-6 py-4 max-w-xs truncate text-sm text-gray-500" title="${escapeHtml(ingredientsText)}">${escapeHtml(ingredientsText)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${dish.sales} 份</td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="status-badge ${leftoverClass}">${(dish.leftover_rate * 100).toFixed(1)}%</span></td>
                <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editDish('${escapeHtml(dish.id)}')" class="text-blue-600 hover:text-blue-900 mr-3">编辑</button>
                    <button onclick="deleteDish('${escapeHtml(dish.id)}', '${escapeHtml(dish.name)}')" class="text-red-600 hover:text-red-900">删除</button>
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML = html;
}

function addDish() {
    const ingredients = db.get('ingredients').filter(i => i.status === 'enabled');
    const ingredientOptions = ingredients.map(i => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.name)}</option>`).join('');
    
    const content = `
        <form id="dish-form">
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="form-label">菜品名称</label>
                        <input type="text" name="name" class="form-input" required>
                    </div>
                    <div>
                        <label class="form-label">菜品分类</label>
                        <select name="category" class="form-select" required>
                            <option value="">请选择分类</option>
                            <option value="大荤">大荤</option>
                            <option value="小荤">小荤</option>
                            <option value="素菜">素菜</option>
                            <option value="汤品">汤品</option>
                            <option value="主食">主食</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">售价（元）</label>
                        <input type="number" name="price" step="0.01" min="0" class="form-input" required>
                    </div>
                    <div>
                        <label class="form-label">烹饪时长（分钟）</label>
                        <input type="number" name="cooking_time" min="1" class="form-input" required>
                    </div>
                    <div>
                        <label class="form-label">单人份量（g）</label>
                        <input type="number" name="weight_per_person" min="1" class="form-input" required>
                    </div>
                    <div>
                        <label class="form-label">初始销量</label>
                        <input type="number" name="sales" value="0" min="0" class="form-input">
                    </div>
                </div>
                
                <div>
                    <label class="form-label">食材配方</label>
                    <div id="dish-ingredients" class="space-y-3">
                        <div class="grid grid-cols-2 gap-3">
                            <select name="ingredient_id[]" class="form-select" required>
                                <option value="">请选择食材</option>
                                ${ingredientOptions}
                            </select>
                            <div class="flex space-x-2">
                                <input type="number" name="ingredient_weight[]" class="form-input flex-1" placeholder="重量（g）" required>
                                <button type="button" onclick="this.parentElement.parentElement.remove()" class="px-2 py-1 bg-red-600 text-white rounded text-xs">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <button type="button" onclick="addIngredientRow()" class="text-sm text-blue-600 mt-2">+ 添加食材</button>
                </div>
            </div>
        </form>
    `;
    
    openModal('新增菜品', content, function() {
        const form = document.getElementById('dish-form');
        const formData = new FormData(form);
        
        const ingredientIds = formData.getAll('ingredient_id[]').filter(id => id);
        const ingredientWeights = formData.getAll('ingredient_weight[]').map(w => parseFloat(w)).filter(w => !isNaN(w) && w > 0);
        
        if (ingredientIds.length === 0 || ingredientIds.length !== ingredientWeights.length) {
            utils.showMessage('请正确填写食材配方', 'error');
            return false;
        }
        
        const ingredients = ingredientIds.map((id, index) => {
            const ing = db.get('ingredients').find(i => i.id === id);
            return {
                ingredient_id: id,
                name: ing ? ing.name : '',
                weight: ingredientWeights[index]
            };
        });
        
        const dish = {
            id: utils.generateId('DISH'),
            name: formData.get('name'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            cooking_time: parseInt(formData.get('cooking_time')),
            weight_per_person: parseInt(formData.get('weight_per_person')) || ingredients.reduce((sum, i) => sum + i.weight, 0),
            ingredients: ingredients,
            status: 'enabled',
            sales: parseInt(formData.get('sales')) || 0,
            leftover_rate: 0.05
        };
        
        db.add('dishes', dish);
        utils.showMessage('菜品新增成功');
        loadDishList();
    });
}

function addIngredientRow() {
    const ingredients = db.get('ingredients').filter(i => i.status === 'enabled');
    const ingredientOptions = ingredients.map(i => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.name)}</option>`).join('');
    
    const container = document.getElementById('dish-ingredients');
    const item = document.createElement('div');
    item.className = 'grid grid-cols-2 gap-3';
    item.innerHTML = `
        <select name="ingredient_id[]" class="form-select" required>
            <option value="">请选择食材</option>
            ${ingredientOptions}
        </select>
        <div class="flex space-x-2">
            <input type="number" name="ingredient_weight[]" class="form-input flex-1" placeholder="重量（g）" required>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="px-2 py-1 bg-red-600 text-white rounded text-xs">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(item);
}

function editDish(dishId) {
    const dish = db.get('dishes').find(d => d.id === dishId);
    if (!dish) return;
    
    const ingredients = db.get('ingredients').filter(i => i.status === 'enabled');
    const ingredientOptions = ingredients.map(i => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.name)}</option>`).join('');
    
    let ingredientsHtml = '';
    dish.ingredients.forEach(ing => {
        ingredientsHtml += `
            <div class="grid grid-cols-2 gap-3 mb-3">
                <select name="ingredient_id[]" class="form-select" required>
                    <option value="">请选择食材</option>
                    ${ingredients.map(i => `<option value="${escapeHtml(i.id)}" ${i.id === ing.ingredient_id ? 'selected' : ''}>${escapeHtml(i.name)}</option>`).join('')}
                </select>
                <div class="flex space-x-2">
                    <input type="number" name="ingredient_weight[]" class="form-input flex-1" placeholder="重量（g）" value="${ing.weight}" required>
                    <button type="button" onclick="this.parentElement.parentElement.remove()" class="px-2 py-1 bg-red-600 text-white rounded text-xs">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    const content = `
        <form id="edit-dish-form">
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="form-label">菜品名称</label>
                        <input type="text" name="name" class="form-input" value="${escapeHtml(dish.name)}" required>
                    </div>
                    <div>
                        <label class="form-label">菜品分类</label>
                        <select name="category" class="form-select" required>
                            <option value="大荤" ${dish.category === '大荤' ? 'selected' : ''}>大荤</option>
                            <option value="小荤" ${dish.category === '小荤' ? 'selected' : ''}>小荤</option>
                            <option value="素菜" ${dish.category === '素菜' ? 'selected' : ''}>素菜</option>
                            <option value="汤品" ${dish.category === '汤品' ? 'selected' : ''}>汤品</option>
                            <option value="主食" ${dish.category === '主食' ? 'selected' : ''}>主食</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">售价（元）</label>
                        <input type="number" name="price" step="0.01" min="0" class="form-input" value="${dish.price}" required>
                    </div>
                    <div>
                        <label class="form-label">烹饪时长（分钟）</label>
                        <input type="number" name="cooking_time" min="1" class="form-input" value="${dish.cooking_time}" required>
                    </div>
                    <div>
                        <label class="form-label">单人份量（g）</label>
                        <input type="number" name="weight_per_person" min="1" class="form-input" value="${dish.weight_per_person}" required>
                    </div>
                    <div>
                        <label class="form-label">状态</label>
                        <select name="status" class="form-select">
                            <option value="enabled" ${dish.status === 'enabled' ? 'selected' : ''}>启用</option>
                            <option value="disabled" ${dish.status === 'disabled' ? 'selected' : ''}>禁用</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label class="form-label">食材配方</label>
                    <div id="edit-dish-ingredients" class="space-y-3">
                        ${ingredientsHtml}
                    </div>
                    <button type="button" onclick="addEditIngredientRow()" class="text-sm text-blue-600 mt-2">+ 添加食材</button>
                </div>
            </div>
        </form>
    `;
    
    openModal('编辑菜品', content, function() {
        const form = document.getElementById('edit-dish-form');
        const formData = new FormData(form);
        
        const ingredientIds = formData.getAll('ingredient_id[]').filter(id => id);
        const ingredientWeights = formData.getAll('ingredient_weight[]').map(w => parseFloat(w)).filter(w => !isNaN(w) && w > 0);
        
        if (ingredientIds.length === 0 || ingredientIds.length !== ingredientWeights.length) {
            utils.showMessage('请正确填写食材配方', 'error');
            return false;
        }
        
        const newIngredients = ingredientIds.map((id, index) => {
            const ing = db.get('ingredients').find(i => i.id === id);
            return {
                ingredient_id: id,
                name: ing ? ing.name : '',
                weight: ingredientWeights[index]
            };
        });
        
        db.update('dishes', dishId, {
            name: formData.get('name'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            cooking_time: parseInt(formData.get('cooking_time')),
            weight_per_person: parseInt(formData.get('weight_per_person')) || newIngredients.reduce((sum, i) => sum + i.weight, 0),
            ingredients: newIngredients,
            status: formData.get('status')
        });
        
        utils.showMessage('菜品更新成功');
        loadDishList();
    });
}

function addEditIngredientRow() {
    const ingredients = db.get('ingredients').filter(i => i.status === 'enabled');
    const ingredientOptions = ingredients.map(i => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.name)}</option>`).join('');
    
    const container = document.getElementById('edit-dish-ingredients');
    const item = document.createElement('div');
    item.className = 'grid grid-cols-2 gap-3 mb-3';
    item.innerHTML = `
        <select name="ingredient_id[]" class="form-select" required>
            <option value="">请选择食材</option>
            ${ingredientOptions}
        </select>
        <div class="flex space-x-2">
            <input type="number" name="ingredient_weight[]" class="form-input flex-1" placeholder="重量（g）" required>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="px-2 py-1 bg-red-600 text-white rounded text-xs">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(item);
}

function deleteDish(dishId, dishName) {
    const content = `<p>确定要删除菜品 <strong>${escapeHtml(dishName)}</strong> 吗？此操作不可恢复。</p>`;
    openModal('确认删除', content, function() {
        db.delete('dishes', dishId);
        utils.showMessage('菜品已删除');
        loadDishList();
    });
}

function deleteMenu(menuId, dateStr, weekDay) {
    const content = `<p>确定要删除 <strong>${escapeHtml(weekDay)}（${escapeHtml(dateStr)}）</strong> 的菜谱吗？</p><p class="mt-2 text-sm text-gray-500">删除后可以重新创建，但关联的采购单不会自动删除。</p>`;
    openModal('确认删除菜谱', content, function() {
        db.delete('weekly_menus', menuId);
        utils.showMessage('菜谱已删除');
        loadWeeklyMenu();
    });
}

function editMenu(menuId) {
    const menu = db.get('weekly_menus').find(m => m.id === menuId);
    if (!menu) return;
    
    const dishes = db.get('dishes').filter(d => d.status === 'enabled');
    
    const getDishOptions = (selectedId) => {
        return dishes.map(d => `<option value="${escapeHtml(d.id)}" ${d.id === selectedId ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('');
    };
    
    const generateMealHtml = (mealType) => {
        const mealDishes = menu.meals[mealType] || [];
        let html = '';
        mealDishes.forEach(dish => {
            html += `
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <select name="${mealType}_dish[]" class="form-select">
                        <option value="">请选择菜品</option>
                        ${getDishOptions(dish.dish_id)}
                    </select>
                    <div class="flex space-x-2">
                        <input type="number" name="${mealType}_diners[]" class="form-input flex-1" placeholder="就餐人数" value="${dish.estimated_diners}">
                        <button type="button" onclick="this.parentElement.parentElement.remove()" class="px-2 py-1 bg-red-600 text-white rounded text-xs">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        return html;
    };

    const content = `<form id="edit-menu-form" class="space-y-6">
        <div><label class="form-label">预计总就餐人数</label><input type="number" name="total_diners" class="form-input" value="${menu.total_diners}" required></div>
        <div><h4 class="font-medium mb-3">早餐</h4><div id="edit-breakfast-container" class="space-y-3">${generateMealHtml('breakfast')}</div><button type="button" onclick="addMealRow('edit-breakfast-container','breakfast')" class="text-sm text-blue-600 mt-2">+ 添加菜品</button></div>
        <div><h4 class="font-medium mb-3">午餐</h4><div id="edit-lunch-container" class="space-y-3">${generateMealHtml('lunch')}</div><button type="button" onclick="addMealRow('edit-lunch-container','lunch')" class="text-sm text-blue-600 mt-2">+ 添加菜品</button></div>
        <div><h4 class="font-medium mb-3">晚餐</h4><div id="edit-dinner-container" class="space-y-3">${generateMealHtml('dinner')}</div><button type="button" onclick="addMealRow('edit-dinner-container','dinner')" class="text-sm text-blue-600 mt-2">+ 添加菜品</button></div>
    </form>`;

    openModal('编辑菜谱 - ' + escapeHtml(menu.date), content, function() { saveMenuEdit(menuId); });
}

function saveMenuEdit(menuId) {
    var form = document.getElementById('edit-menu-form');
    var fd = new FormData(form);
    var menu = { meals: { breakfast: [], lunch: [], dinner: [] }, total_diners: parseInt(fd.get('total_diners')) || 0, status: 'draft' };
    ['breakfast','lunch','dinner'].forEach(function(mealType) {
        var dishes = fd.getAll(mealType + '_dish[]');
        var diners = fd.getAll(mealType + '_diners[]');
        dishes.forEach(function(id, i) {
            if (id && diners[i]) {
                var dish = db.get('dishes').find(function(d) { return d.id === id; });
                if (dish) {
                    menu.meals[mealType].push({ dish_id: id, name: dish.name, estimated_diners: parseInt(diners[i]) });
                }
            }
        });
    });
    menu.updated_at = new Date().toISOString();
    db.update('weekly_menus', menuId, {
        meals: menu.meals,
        total_diners: menu.total_diners,
        status: 'draft',
        updated_at: menu.updated_at
    });
    utils.showMessage('菜谱更新成功');
    loadWeeklyMenu();
}

function addMealRow(containerId, mealType) {
    var dishes = db.get('dishes').filter(function(d) { return d.status === 'enabled'; });
    var opts = dishes.map(function(d) { return '<option value="' + escapeHtml(d.id) + '">' + escapeHtml(d.name) + '</option>'; }).join('');
    var html = '<div class="grid grid-cols-2 gap-3 mb-3"><select name="' + mealType + '_dish[]" class="form-select"><option value="">请选择菜品</option>' + opts + '</select><div class="flex space-x-2"><input type="number" name="' + mealType + '_diners[]" class="form-input flex-1" placeholder="就餐人数"><button type="button" onclick="this.parentElement.parentElement.remove()" class="px-2 py-1 bg-red-600 text-white rounded text-xs"><i class="fas fa-times"></i></button></div></div>';
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

function viewMenuDetail(menuId) {
    const menu = db.get('weekly_menus').find(m => m.id === menuId);
    if (!menu) return;

    let content = `
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <h4 class="text-lg font-medium">${escapeHtml(menu.date)}（${escapeHtml(menu.week_day)}）菜谱详情</h4>
                <span class="status-badge ${menu.status === 'published' ? 'status-success' : 'status-gray'}">
                    ${menu.status === 'published' ? '已发布' : '草稿'}
                </span>
            </div>
            
            <div class="border-t border-gray-200 pt-4">
                <h5 class="font-medium mb-3">早餐</h5>
                <div class="grid grid-cols-2 gap-3">
                    ${menu.meals.breakfast?.map(dish => `
                        <div class="bg-gray-50 p-3 rounded-md">
                            <div class="font-medium">${escapeHtml(dish.name)}</div>
                            <div class="text-sm text-gray-500">预计就餐：${dish.estimated_diners} 人</div>
                        </div>
                    `).join('') || '<span class="text-gray-400">未设置</span>'}
                </div>
            </div>

            <div class="border-t border-gray-200 pt-4">
                <h5 class="font-medium mb-3">午餐</h5>
                <div class="grid grid-cols-2 gap-3">
                    ${menu.meals.lunch?.map(dish => `
                        <div class="bg-gray-50 p-3 rounded-md">
                            <div class="font-medium">${escapeHtml(dish.name)}</div>
                            <div class="text-sm text-gray-500">预计就餐：${dish.estimated_diners} 人</div>
                        </div>
                    `).join('') || '<span class="text-gray-400">未设置</span>'}
                </div>
            </div>

            <div class="border-t border-gray-200 pt-4">
                <h5 class="font-medium mb-3">晚餐</h5>
                <div class="grid grid-cols-2 gap-3">
                    ${menu.meals.dinner?.map(dish => `
                        <div class="bg-gray-50 p-3 rounded-md">
                            <div class="font-medium">${escapeHtml(dish.name)}</div>
                            <div class="text-sm text-gray-500">预计就餐：${dish.estimated_diners} 人</div>
                        </div>
                    `).join('') || '<span class="text-gray-400">未设置</span>'}
                </div>
            </div>

            <div class="border-t border-gray-200 pt-4">
                <div class="text-sm text-gray-600">
                    <div class="flex justify-between">
                        <span>总就餐人数：</span>
                        <span>${menu.total_diners} 人</span>
                    </div>
                    <div class="flex justify-between mt-1">
                        <span>预计采购金额：</span>
                        <span class="font-medium text-red-600">${utils.formatMoney(calculateMenuTotalCost(menu))}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    openModal('菜谱详情', content, null);
}

function calculateMenuTotalCost(menu) {
    const budget = utils.calculatePurchaseBudget(menu);
    return budget.reduce((sum, item) => sum + item.amount, 0);
}
