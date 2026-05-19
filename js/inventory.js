let currentTab = 'ingredient';

document.addEventListener('DOMContentLoaded', function() {
    loadIngredientList();
    loadInventoryStats();
    loadInventoryList();
    loadStockFlowList();
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
    
    if (tab === 'ingredient') {
        loadIngredientList();
    } else if (tab === 'stock') {
        loadInventoryStats();
        loadInventoryList();
    } else if (tab === 'flow') {
        loadStockFlowList();
    }
}

function loadIngredientList() {
    var ingredients = db.get('ingredients');
    var suppliers = db.get('suppliers');
    var settings = db.get('settings');
    var categories = settings.ingredient_categories || [];
    var keyword = (document.getElementById('search-ingredient-keyword')?.value || '').toLowerCase().trim();
    var category = document.getElementById('filter-ingredient-category')?.value || '';
    var status = document.getElementById('filter-ingredient-status')?.value || '';
    
    var catSelect = document.getElementById('filter-ingredient-category');
    if (catSelect && catSelect.options.length <= 1) {
        categories.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            catSelect.appendChild(opt);
        });
    }
    
    if (keyword) {
        ingredients = ingredients.filter(function(ing) { return ing.name.toLowerCase().includes(keyword); });
    }
    if (category) {
        ingredients = ingredients.filter(function(ing) { return ing.category === category; });
    }
    if (status) {
        ingredients = ingredients.filter(function(ing) { return ing.status === status; });
    }
    
    var totalEl = document.getElementById('ingredient-total');
    if (totalEl) totalEl.textContent = ingredients.length;
    
    var tbody = document.getElementById('ingredient-table');
    if (!tbody) return;
    
    if (ingredients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="px-6 py-12 text-center text-gray-500"><i class="fas fa-carrot text-4xl mb-3 block"></i>暂无食材数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = ingredients.map(function(ing) {
        var supplierNames = (ing.supplier_ids || []).map(function(sid) {
            var s = suppliers.find(function(x) { return x.id === sid; });
            return s ? s.name : sid;
        });
        var supplierHtml = supplierNames.length > 0
            ? supplierNames.map(function(n) { return '<span class="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full mr-1 mb-1">' + escapeHtml(n) + '</span>'; }).join('')
            : '<span class="text-xs text-gray-400">未关联</span>';
        
        var statusBadge = ing.status === 'enabled'
            ? '<span class="status-badge status-success">启用</span>'
            : '<span class="status-badge status-gray">禁用</span>';
        
        return '<tr class="hover:bg-gray-50">' +
            '<td class="px-4 py-3 text-sm font-medium text-gray-900">' + escapeHtml(ing.name) + '</td>' +
            '<td class="px-4 py-3"><span class="status-badge ' + getCategoryClass(ing.category) + '">' + escapeHtml(ing.category) + '</span></td>' +
            '<td class="px-4 py-3 text-sm text-gray-700">' + escapeHtml(ing.unit) + '</td>' +
            '<td class="px-4 py-3 text-sm text-gray-900">¥' + (ing.price || 0).toFixed(2) + '</td>' +
            '<td class="px-4 py-3 text-sm text-gray-700">' + ((ing.yield_rate || 1) * 100).toFixed(0) + '%</td>' +
            '<td class="px-4 py-3 text-sm text-gray-700">' + (ing.stock_low || 0) + '</td>' +
            '<td class="px-4 py-3 text-sm text-gray-700">' + (ing.stock_high || '-') + '</td>' +
            '<td class="px-4 py-3">' + supplierHtml + '</td>' +
            '<td class="px-4 py-3">' + statusBadge + '</td>' +
            '<td class="px-4 py-3 text-sm space-x-2">' +
                '<button onclick="editIngredient(\'' + escapeHtml(ing.id) + '\')" class="text-blue-600 hover:text-blue-800"><i class="fas fa-edit"></i> 编辑</button>' +
                '<button onclick="deleteIngredient(\'' + escapeHtml(ing.id) + '\', \'' + escapeHtml(ing.name) + '\')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('');
}

function getIngredientForm(data) {
    var isEdit = !!data;
    var d = data || {};
    var suppliers = db.get('suppliers').filter(function(s) { return s.status === 'enabled'; });
    var settings = db.get('settings');
    var categories = settings.ingredient_categories || ['蔬菜', '肉类', '蛋类', '水产', '粮油', '辅料', '调料', '冷冻品', '其他'];
    var units = settings.units || ['kg', '斤', 'L', '个', '包', '箱', '瓶', '桶'];
    
    var catOpts = categories.map(function(c) {
        return '<option value="' + c + '"' + (d.category === c ? ' selected' : '') + '>' + c + '</option>';
    }).join('');
    
    var unitOpts = units.map(function(u) {
        return '<option value="' + u + '"' + (d.unit === u ? ' selected' : '') + '>' + u + '</option>';
    }).join('');
    
    var supplierCheckboxes = suppliers.map(function(s) {
        var checked = d.supplier_ids && d.supplier_ids.indexOf(s.id) !== -1;
        return '<label class="flex items-center space-x-2 mr-4 mb-2"><input type="checkbox" name="supplier_ids" value="' + escapeHtml(s.id) + '"' + (checked ? ' checked' : '') + ' class="rounded text-blue-600"><span class="text-sm">' + escapeHtml(s.name) + ' <span class="text-xs text-gray-400">(' + s.category.join('、') + ')</span></span></label>';
    }).join('');
    
    return '<form id="ingredient-form" class="space-y-4">' +
        '<div class="grid grid-cols-2 gap-4">' +
        '<div><label class="form-label">食材名称 <span class="text-red-500">*</span></label><input type="text" name="name" value="' + escapeHtml(d.name || '') + '" required class="form-input"></div>' +
        '<div><label class="form-label">分类 <span class="text-red-500">*</span></label><select name="category" class="form-select" required><option value="">请选择</option>' + catOpts + '</select></div>' +
        '<div><label class="form-label">单位 <span class="text-red-500">*</span></label><select name="unit" class="form-select" required>' + unitOpts + '</select></div>' +
        '<div><label class="form-label">采购单价（元）<span class="text-red-500">*</span></label><input type="number" name="price" step="0.01" min="0" value="' + (d.price || '') + '" required class="form-input"></div>' +
        '<div><label class="form-label">出成率</label><input type="number" name="yield_rate" step="0.01" min="0" max="1" value="' + (d.yield_rate || 1) + '" class="form-input"><p class="text-xs text-gray-400 mt-1">0~1之间，如0.8表示80%</p></div>' +
        '<div><label class="form-label">库存下限</label><input type="number" name="stock_low" min="0" value="' + (d.stock_low || 0) + '" class="form-input"></div>' +
        '<div><label class="form-label">库存上限</label><input type="number" name="stock_high" min="0" value="' + (d.stock_high || '') + '" class="form-input"></div>' +
        '<div><label class="form-label">状态</label><select name="status" class="form-select"><option value="enabled"' + (d.status === 'enabled' || !d.status ? ' selected' : '') + '>启用</option><option value="disabled"' + (d.status === 'disabled' ? ' selected' : '') + '>禁用</option></select></div>' +
        '</div>' +
        '<div><label class="form-label">关联供应商</label><div class="flex flex-wrap mt-1">' + (supplierCheckboxes || '<span class="text-sm text-gray-400">暂无启用的供应商，请先在供应商管理中添加</span>') + '</div></div>' +
        '</form>';
}

function addIngredient() {
    openModal('新增食材', getIngredientForm(null), function() {
        var form = document.getElementById('ingredient-form');
        var fd = new FormData(form);
        var name = fd.get('name');
        if (!name) { utils.showMessage('请输入食材名称', 'error'); return false; }
        
        var supplierIds = Array.from(form.querySelectorAll('input[name="supplier_ids"]:checked')).map(function(cb) { return cb.value; });
        
        db.add('ingredients', {
            id: utils.generateId('ING'),
            name: name,
            category: fd.get('category'),
            unit: fd.get('unit'),
            price: parseFloat(fd.get('price')) || 0,
            yield_rate: parseFloat(fd.get('yield_rate')) || 1,
            stock: 0,
            stock_low: parseFloat(fd.get('stock_low')) || 0,
            stock_high: fd.get('stock_high') ? parseFloat(fd.get('stock_high')) : null,
            supplier_ids: supplierIds,
            status: fd.get('status')
        });
        
        utils.showMessage('食材新增成功');
        loadIngredientList();
    });
}

function editIngredient(id) {
    var ing = db.get('ingredients').find(function(i) { return i.id === id; });
    if (!ing) return;
    
    openModal('编辑食材', getIngredientForm(ing), function() {
        var form = document.getElementById('ingredient-form');
        var fd = new FormData(form);
        var name = fd.get('name');
        if (!name) { utils.showMessage('请输入食材名称', 'error'); return false; }
        
        var supplierIds = Array.from(form.querySelectorAll('input[name="supplier_ids"]:checked')).map(function(cb) { return cb.value; });
        
        db.update('ingredients', id, {
            name: name,
            category: fd.get('category'),
            unit: fd.get('unit'),
            price: parseFloat(fd.get('price')) || 0,
            yield_rate: parseFloat(fd.get('yield_rate')) || 1,
            stock_low: parseFloat(fd.get('stock_low')) || 0,
            stock_high: fd.get('stock_high') ? parseFloat(fd.get('stock_high')) : null,
            supplier_ids: supplierIds,
            status: fd.get('status')
        });
        
        utils.showMessage('食材更新成功');
        loadIngredientList();
    });
}

function deleteIngredient(id, name) {
    var dishes = db.get('dishes').filter(function(d) {
        return d.ingredients && d.ingredients.some(function(i) { return i.ingredient_id === id; });
    });
    if (dishes.length > 0) {
        utils.showMessage('该食材被 ' + dishes.length + ' 个菜品使用，无法删除', 'error');
        return false;
    }
    openModal('确认删除', '<p>确定删除食材 <strong>' + escapeHtml(name) + '</strong> 吗？此操作不可恢复。</p>', function() {
        db.delete('ingredients', id);
        utils.showMessage('食材已删除');
        loadIngredientList();
        loadInventoryStats();
        loadInventoryList();
    });
}

function loadInventoryStats() {
    const ingredients = db.get('ingredients');
    const now = new Date();
    
    const totalItems = ingredients.length;
    
    const lowStockCount = ingredients.filter(ing => ing.stock <= ing.stock_low).length;
    
    const nearExpireCount = ingredients.filter(ing => {
        if (!ing.expire_date) return false;
        const expireDate = new Date(ing.expire_date);
        const diffTime = expireDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 7;
    }).length;
    
    const totalValue = ingredients.reduce((sum, ing) => sum + ing.stock * ing.price, 0);
    
    document.getElementById('stat-total-items').textContent = totalItems;
    document.getElementById('stat-low-stock').textContent = lowStockCount;
    document.getElementById('stat-near-expire').textContent = nearExpireCount;
    document.getElementById('stat-total-value').textContent = utils.formatMoney(totalValue);
}

function loadInventoryList() {
    let ingredients = [...db.get('ingredients')];
    const tableBody = document.getElementById('inventory-table');
    const now = new Date();
    
    var settings = db.get('settings');
    var categories = settings.ingredient_categories || [];
    var catSelect = document.getElementById('filter-category');
    if (catSelect && catSelect.options.length <= 1) {
        categories.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            catSelect.appendChild(opt);
        });
    }
    
    const categoryFilter = document.getElementById('filter-category')?.value;
    const statusFilter = document.getElementById('filter-status')?.value;
    const expireFilter = document.getElementById('filter-expire')?.value;
    const keyword = document.getElementById('search-keyword')?.value?.toLowerCase().trim();
    
    if (categoryFilter && categoryFilter !== 'all') {
        ingredients = ingredients.filter(ing => ing.category === categoryFilter);
    }
    
    if (statusFilter && statusFilter !== 'all') {
        ingredients = ingredients.filter(ing => {
            const status = getIngredientStatus(ing);
            return status.value === statusFilter;
        });
    }
    
    if (expireFilter && expireFilter !== 'all') {
        const days = parseInt(expireFilter);
        ingredients = ingredients.filter(ing => {
            if (!ing.expire_date) return false;
            const expireDate = new Date(ing.expire_date);
            const diffTime = expireDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 && diffDays <= days;
        });
    }
    
    if (keyword) {
        ingredients = ingredients.filter(ing => 
            ing.name.toLowerCase().includes(keyword) || 
            ing.pinyin?.toLowerCase().includes(keyword)
        );
    }
    
    ingredients.sort((a, b) => {
        const statusA = getIngredientStatus(a);
        const statusB = getIngredientStatus(b);
        const priority = { expired: 4, near_expire: 3, low: 2, overstock: 1, normal: 0 };
        return priority[statusB.value] - priority[statusA.value];
    });
    
    const totalEl = document.getElementById('inventory-total');
    if (totalEl) totalEl.textContent = ingredients.length;
    
    if (ingredients.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-cubes text-4xl mb-3"></i>
                    <p class="text-lg">暂无库存数据</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    ingredients.forEach(ingredient => {
        const status = getIngredientStatus(ingredient);
        const stockValue = ingredient.stock * ingredient.price;
        
        let expireText = '-';
        if (ingredient.expire_date) {
            const expireDate = new Date(ingredient.expire_date);
            const diffTime = expireDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            expireText = escapeHtml(ingredient.expire_date);
            if (diffDays <= 0) {
                expireText = `<span class="text-red-600 font-medium">已过期</span>`;
            } else if (diffDays <= 7) {
                expireText = `<span class="text-yellow-600 font-medium">${escapeHtml(ingredient.expire_date)} (${diffDays}天后过期)</span>`;
            }
        }
        
        html += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(ingredient.name)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge ${getCategoryClass(ingredient.category)}">${escapeHtml(ingredient.category)}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span class="${ingredient.stock <= ingredient.stock_low ? 'text-red-600 font-medium' : ''}">
                        ${ingredient.stock.toFixed(2)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${ingredient.stock_low.toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${ingredient.stock_high ? ingredient.stock_high.toFixed(2) : '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${escapeHtml(ingredient.unit)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ¥${ingredient.price.toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    ${utils.formatMoney(stockValue)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${expireText}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge ${status.class}">${status.text}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="viewIngredientDetail('${escapeHtml(ingredient.id)}')" class="text-blue-600 hover:text-blue-900 mr-3">详情</button>
                    <button onclick="openStockIn('${escapeHtml(ingredient.id)}')" class="text-green-600 hover:text-green-900 mr-3">入库</button>
                    <button onclick="openStockOut('${escapeHtml(ingredient.id)}')" class="text-orange-600 hover:text-orange-900">出库</button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function getIngredientStatus(ingredient) {
    const now = new Date();
    
    if (ingredient.expire_date) {
        const expireDate = new Date(ingredient.expire_date);
        if (expireDate < now) {
            return { value: 'expired', text: '已过期', class: 'bg-red-100 text-red-800' };
        }
        const diffTime = expireDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
            return { value: 'near_expire', text: '即将过期', class: 'bg-yellow-100 text-yellow-800' };
        }
    }
    
    if (ingredient.stock <= ingredient.stock_low) {
        return { value: 'low', text: '库存不足', class: 'bg-red-100 text-red-800' };
    }
    
    if (ingredient.stock_high && ingredient.stock >= ingredient.stock_high) {
        return { value: 'overstock', text: '库存积压', class: 'bg-yellow-100 text-yellow-800' };
    }
    
    return { value: 'normal', text: '正常', class: 'bg-green-100 text-green-800' };
}

function getCategoryClass(category) {
    const classMap = {
        '蔬菜': 'bg-green-100 text-green-800',
        '肉类': 'bg-red-100 text-red-800',
        '蛋类': 'bg-yellow-100 text-yellow-800',
        '水产': 'bg-blue-100 text-blue-800',
        '粮油': 'bg-amber-100 text-amber-800',
        '辅料': 'bg-purple-100 text-purple-800',
        '调料': 'bg-purple-100 text-purple-800',
        '冷冻品': 'bg-blue-100 text-blue-800',
        '其他': 'bg-gray-100 text-gray-800'
    };
    return classMap[category] || 'bg-gray-100 text-gray-800';
}

function loadStockFlowList() {
    let stockFlows = [...db.get('stock_flows')];
    const tableBody = document.getElementById('stock-flow-table');
    
    if (!tableBody) return;
    
    const typeFilter = document.getElementById('filter-flow-type')?.value;
    const dateStart = document.getElementById('filter-date-start')?.value;
    const dateEnd = document.getElementById('filter-date-end')?.value;
    const keyword = document.getElementById('search-flow-keyword')?.value?.toLowerCase().trim();
    
    if (typeFilter && typeFilter !== 'all') {
        stockFlows = stockFlows.filter(flow => flow.type === typeFilter);
    }
    
    if (dateStart) {
        stockFlows = stockFlows.filter(flow => flow.created_at.slice(0, 10) >= dateStart);
    }
    if (dateEnd) {
        stockFlows = stockFlows.filter(flow => flow.created_at.slice(0, 10) <= dateEnd);
    }
    
    if (keyword) {
        stockFlows = stockFlows.filter(flow => 
            flow.ingredient_name.toLowerCase().includes(keyword) || 
            flow.id.toLowerCase().includes(keyword) ||
            flow.related_order_id?.toLowerCase().includes(keyword)
        );
    }
    
    stockFlows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const totalEl = document.getElementById('flow-total');
    if (totalEl) totalEl.textContent = stockFlows.length;
    
    if (stockFlows.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-exchange text-4xl mb-3"></i>
                    <p class="text-lg">暂无出入库记录</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    stockFlows.forEach(flow => {
        const typeInfo = getFlowTypeInfo(flow.type);
        const time = utils.formatDateTime(flow.created_at);
        
        html += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(flow.id)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${escapeHtml(time)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge ${typeInfo.class}">${typeInfo.text}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${escapeHtml(flow.ingredient_name)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${flow.type === 'in' ? 'text-green-600' : 'text-red-600'}">
                    ${flow.type === 'in' ? '+' : '-'}${flow.quantity.toFixed(2)} kg
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${flow.before_stock.toFixed(2)} kg
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${flow.after_stock.toFixed(2)} kg
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${escapeHtml(flow.related_order_id || '-')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${escapeHtml(flow.operator || '-')}
                </td>
                <td class="px-6 py-4 max-w-xs truncate text-sm text-gray-500" title="${escapeHtml(flow.remark || '')}">
                    ${escapeHtml(flow.remark || '-')}
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function getFlowTypeInfo(type) {
    const typeMap = {
        'in': { text: '入库', class: 'bg-green-100 text-green-800' },
        'out': { text: '出库', class: 'bg-red-100 text-red-800' },
        'check': { text: '盘点调整', class: 'bg-blue-100 text-blue-800' }
    };
    return typeMap[type] || { text: '未知', class: 'bg-gray-100 text-gray-800' };
}

function viewIngredientDetail(ingredientId) {
    const ingredient = db.get('ingredients').find(ing => ing.id === ingredientId);
    if (!ingredient) return;
    
    const status = getIngredientStatus(ingredient);
    
    const recentFlows = getRecentFlows(ingredient.id);
    let flowsHtml = '';
    if (recentFlows.length === 0) {
        flowsHtml = '<tr><td colspan="5" class="px-3 py-4 text-center text-gray-400 text-xs">暂无记录</td></tr>';
    } else {
        recentFlows.forEach(flow => {
            const typeInfo = getFlowTypeInfo(flow.type);
            const time = utils.formatDateTime(flow.created_at);
            flowsHtml += `
                <tr>
                    <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-500">${escapeHtml(time)}</td>
                    <td class="px-3 py-2 whitespace-nowrap"><span class="status-badge ${typeInfo.class} text-xs">${typeInfo.text}</span></td>
                    <td class="px-3 py-2 whitespace-nowrap text-right text-xs font-medium ${flow.type === 'in' ? 'text-green-600' : 'text-red-600'}">${flow.type === 'in' ? '+' : '-'}${flow.quantity.toFixed(2)}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-right text-xs text-gray-900">${flow.after_stock.toFixed(2)}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-500">${escapeHtml(flow.operator || '-')}</td>
                </tr>
            `;
        });
    }
    
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-gray-900">食材详情</h3>
                <span class="status-badge ${status.class}">${status.text}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div><p class="text-sm text-gray-500 mb-1">食材名称</p><p class="text-sm font-medium text-gray-900">${escapeHtml(ingredient.name)}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">食材分类</p><p class="text-sm font-medium text-gray-900">${escapeHtml(ingredient.category)}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">当前库存</p><p class="text-sm font-medium ${ingredient.stock <= ingredient.stock_low ? 'text-red-600' : 'text-gray-900'}">${ingredient.stock.toFixed(2)} ${escapeHtml(ingredient.unit)}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">库存下限</p><p class="text-sm font-medium text-gray-900">${ingredient.stock_low.toFixed(2)} ${escapeHtml(ingredient.unit)}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">库存上限</p><p class="text-sm font-medium text-gray-900">${ingredient.stock_high ? ingredient.stock_high.toFixed(2) + ' ' + escapeHtml(ingredient.unit) : '-'}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">采购单价</p><p class="text-sm font-medium text-gray-900">¥${ingredient.price.toFixed(2)}/${escapeHtml(ingredient.unit)}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">库存价值</p><p class="text-sm font-medium text-red-600">${utils.formatMoney(ingredient.stock * ingredient.price)}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">有效期</p><p class="text-sm font-medium text-gray-900">${ingredient.expire_date || '-'}</p></div>
            </div>
            
            <div>
                <h4 class="text-sm font-medium text-gray-900 mb-3">最近出入库记录</h4>
                <div class="overflow-x-auto max-h-60 overflow-y-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">数量</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">变动后库存</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">操作人</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">${flowsHtml}</tbody>
                    </table>
                </div>
            </div>
            
            <div class="flex justify-end space-x-3">
                <button type="button" onclick="openStockIn('${escapeHtml(ingredient.id)}')" class="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">入库</button>
                <button type="button" onclick="openStockOut('${escapeHtml(ingredient.id)}')" class="px-4 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700">出库</button>
                <button type="button" onclick="closeModal()" class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50">关闭</button>
            </div>
        </div>
    `;
    
    openModal('食材详情', content, null);
}

function getRecentFlows(ingredientId, limit = 10) {
    return db.get('stock_flows')
        .filter(flow => flow.ingredient_id === ingredientId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
}

function openStockIn(ingredientId = null) {
    const ingredients = db.get('ingredients').filter(ing => ing.status === 'enabled');
    const ingredientOptions = ingredients.map(ing => 
        `<option value="${escapeHtml(ing.id)}" ${ing.id === ingredientId ? 'selected' : ''}>${escapeHtml(ing.name)} (当前库存: ${ing.stock.toFixed(2)} ${escapeHtml(ing.unit)})</option>`
    ).join('');
    
    const content = `
        <form id="stock-in-form">
            <div class="space-y-4">
                <div>
                    <label class="form-label">选择食材</label>
                    <select id="stock-in-ingredient" class="form-select" required>
                        <option value="">请选择食材</option>
                        ${ingredientOptions}
                    </select>
                </div>
                <div>
                    <label class="form-label">入库数量</label>
                    <input type="number" id="stock-in-quantity" class="form-input" step="0.01" min="0.01" placeholder="请输入入库数量" required>
                </div>
                <div>
                    <label class="form-label">入库单价（元）</label>
                    <input type="number" id="stock-in-price" class="form-input" step="0.01" min="0" placeholder="如留空则使用当前单价">
                </div>
                <div>
                    <label class="form-label">新有效期</label>
                    <input type="date" id="stock-in-expire" class="form-input">
                </div>
                <div>
                    <label class="form-label">入库备注</label>
                    <textarea id="stock-in-remark" class="form-textarea" rows="2" placeholder="请输入入库备注（选填）"></textarea>
                </div>
            </div>
        </form>
    `;
    
    openModal('入库登记', content, function() {
        submitStockIn();
    });
}

function submitStockIn() {
    const ingredientId = document.getElementById('stock-in-ingredient').value;
    const quantity = parseFloat(document.getElementById('stock-in-quantity').value);
    const price = document.getElementById('stock-in-price').value ? parseFloat(document.getElementById('stock-in-price').value) : null;
    const expireDate = document.getElementById('stock-in-expire').value;
    const remark = document.getElementById('stock-in-remark').value;
    
    if (!ingredientId || isNaN(quantity) || quantity <= 0) {
        utils.showMessage('请选择食材并输入有效的入库数量', 'error');
        return false;
    }
    
    const ingredients = db.get('ingredients');
    const ingredient = ingredients.find(ing => ing.id === ingredientId);
    if (!ingredient) {
        utils.showMessage('未找到该食材', 'error');
        return false;
    }
    
    const beforeStock = ingredient.stock;
    const afterStock = beforeStock + quantity;
    
    const updateData = {
        stock: afterStock,
        updated_at: new Date().toISOString()
    };
    
    if (price !== null) {
        updateData.price = price;
    }
    
    if (expireDate) {
        updateData.expire_date = expireDate;
    }
    
    const updateResult = db.update('ingredients', ingredientId, updateData);
    if (!updateResult) {
        utils.showMessage('更新库存失败', 'error');
        return false;
    }
    
    const stockFlow = {
        id: utils.generateId('STK'),
        ingredient_id: ingredientId,
        ingredient_name: ingredient.name,
        type: 'in',
        quantity: quantity,
        before_stock: beforeStock,
        after_stock: afterStock,
        related_order_id: null,
        remark: remark || '手动入库',
        operator: '管理员',
        created_at: new Date().toISOString()
    };
    db.add('stock_flows', stockFlow);
    
    utils.showMessage('入库成功');
    loadInventoryStats();
    loadInventoryList();
    loadStockFlowList();
}

function openStockOut(ingredientId = null) {
    const ingredients = db.get('ingredients').filter(ing => ing.status === 'enabled' && ing.stock > 0);
    const ingredientOptions = ingredients.map(ing => 
        `<option value="${escapeHtml(ing.id)}" ${ing.id === ingredientId ? 'selected' : ''}>${escapeHtml(ing.name)} (当前库存: ${ing.stock.toFixed(2)} ${escapeHtml(ing.unit)})</option>`
    ).join('');
    
    const content = `
        <form id="stock-out-form">
            <div class="space-y-4">
                <div>
                    <label class="form-label">选择食材</label>
                    <select id="stock-out-ingredient" class="form-select" required>
                        <option value="">请选择食材</option>
                        ${ingredientOptions}
                    </select>
                </div>
                <div>
                    <label class="form-label">出库数量</label>
                    <input type="number" id="stock-out-quantity" class="form-input" step="0.01" min="0.01" placeholder="请输入出库数量" required>
                </div>
                <div>
                    <label class="form-label">出库类型</label>
                    <select id="stock-out-type" class="form-select" required>
                        <option value="consume">生产消耗</option>
                        <option value="loss">报损</option>
                        <option value="return">退货</option>
                        <option value="other">其他</option>
                    </select>
                </div>
                <div>
                    <label class="form-label">出库备注</label>
                    <textarea id="stock-out-remark" class="form-textarea" rows="2" placeholder="请输入出库备注（选填）"></textarea>
                </div>
            </div>
        </form>
    `;
    
    openModal('出库登记', content, function() {
        submitStockOut();
    });
}

function submitStockOut() {
    const ingredientId = document.getElementById('stock-out-ingredient').value;
    const quantity = parseFloat(document.getElementById('stock-out-quantity').value);
    const outType = document.getElementById('stock-out-type').value;
    const remark = document.getElementById('stock-out-remark').value;
    
    if (!ingredientId || isNaN(quantity) || quantity <= 0) {
        utils.showMessage('请选择食材并输入有效的出库数量', 'error');
        return false;
    }
    
    const ingredients = db.get('ingredients');
    const ingredient = ingredients.find(ing => ing.id === ingredientId);
    if (!ingredient) {
        utils.showMessage('未找到该食材', 'error');
        return false;
    }
    
    if (quantity > ingredient.stock) {
        utils.showMessage(`出库数量不能大于当前库存(${ingredient.stock.toFixed(2)} ${ingredient.unit})`, 'error');
        return false;
    }
    
    const beforeStock = ingredient.stock;
    const afterStock = beforeStock - quantity;
    
    const updateData = {
        stock: afterStock,
        updated_at: new Date().toISOString()
    };
    
    const updateResult = db.update('ingredients', ingredientId, updateData);
    if (!updateResult) {
        utils.showMessage('更新库存失败', 'error');
        return false;
    }
    
    let fullRemark = remark || '';
    const typeMap = {
        'consume': '生产消耗',
        'loss': '报损',
        'return': '退货',
        'other': '其他'
    };
    if (!fullRemark) {
        fullRemark = typeMap[outType];
    } else {
        fullRemark = `${typeMap[outType]}: ${fullRemark}`;
    }
    
    const stockFlow = {
        id: utils.generateId('STK'),
        ingredient_id: ingredientId,
        ingredient_name: ingredient.name,
        type: 'out',
        quantity: quantity,
        before_stock: beforeStock,
        after_stock: afterStock,
        related_order_id: null,
        remark: fullRemark,
        operator: '管理员',
        created_at: new Date().toISOString()
    };
    db.add('stock_flows', stockFlow);
    
    utils.showMessage('出库成功');
    loadInventoryStats();
    loadInventoryList();
    loadStockFlowList();
}
