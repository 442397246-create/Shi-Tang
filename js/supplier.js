let currentPage = 1;
const pageSize = 10;
let filteredSuppliers = [];

document.addEventListener('DOMContentLoaded', async function() {
    await loadSupplierList();
    bindEvents();
    var alertEl = document.getElementById('alert-count');
    if (alertEl) alertEl.textContent = (await utils.getInventoryAlertCount()) + (await utils.getPendingApprovalCount());
});

function bindEvents() {
    document.getElementById('search-input').addEventListener('input', debounce(loadSupplierList, 300));
    document.getElementById('category-filter').addEventListener('change', loadSupplierList);
    document.getElementById('status-filter').addEventListener('change', loadSupplierList);
    document.getElementById('add-supplier-btn').addEventListener('click', openAddModal);
    document.getElementById('prev-page').addEventListener('click', function() {
        if (currentPage > 1) { currentPage--; renderList(); }
    });
    document.getElementById('next-page').addEventListener('click', function() {
        var totalPages = Math.ceil(filteredSuppliers.length / pageSize) || 1;
        if (currentPage < totalPages) { currentPage++; renderList(); }
    });
}

async function loadSupplierList() {
    var suppliers = await db.get('suppliers');
    var settings = await db.get('settings');
    var supCats = settings.supplier_categories || [];
    var catSelect = document.getElementById('category-filter');
    if (catSelect && catSelect.options.length <= 1) {
        supCats.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            catSelect.appendChild(opt);
        });
    }
    var kw = document.getElementById('search-input').value.toLowerCase();
    var cat = document.getElementById('category-filter').value;
    var st = document.getElementById('status-filter').value;

    filteredSuppliers = suppliers.filter(function(s) {
        var matchSearch = s.name.toLowerCase().includes(kw) || s.contact.toLowerCase().includes(kw) || s.phone.includes(kw);
        var matchCat = cat ? s.category.includes(cat) : true;
        var matchSt = st ? s.status === st : true;
        return matchSearch && matchCat && matchSt;
    });
    currentPage = 1;
    renderList();
}

function renderList() {
    var tbody = document.getElementById('supplier-list');
    var total = filteredSuppliers.length;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    var start = (currentPage - 1) * pageSize;
    var pageData = filteredSuppliers.slice(start, start + pageSize);

    document.getElementById('total-count').textContent = total;
    document.getElementById('page-info').textContent = '第 ' + currentPage + ' / ' + totalPages + ' 页';
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;

    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-12 text-center text-gray-400"><i class="fas fa-truck text-4xl mb-3 block"></i>暂无供应商数据</td></tr>';
        return;
    }

    var pcMap = { weekly: '周结', biweekly: '双周结', monthly: '月结', quarterly: '季度结' };

    tbody.innerHTML = pageData.map(function(s) {
        var stars = '';
        for (var i = 0; i < Math.floor(s.score); i++) stars += '<i class="fas fa-star text-yellow-400 text-xs"></i>';
        if (s.score % 1 >= 0.5) stars += '<i class="fas fa-star-half-alt text-yellow-400 text-xs"></i>';

        return '<tr class="hover:bg-gray-50">' +
            '<td class="px-6 py-4 text-sm text-gray-500">' + escapeHtml(s.id) + '</td>' +
            '<td class="px-6 py-4"><span class="text-sm font-medium text-gray-900">' + escapeHtml(s.name) + '</span></td>' +
            '<td class="px-6 py-4">' + s.category.map(function(c) { return '<span class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full mr-1">' + escapeHtml(c) + '</span>'; }).join('') + '</td>' +
            '<td class="px-6 py-4 text-sm text-gray-700">' + (pcMap[s.payment_cycle] || escapeHtml(s.payment_cycle)) + '</td>' +
            '<td class="px-6 py-4 text-sm text-gray-700">' + escapeHtml(s.contact) + '</td>' +
            '<td class="px-6 py-4 text-sm text-gray-700">' + escapeHtml(s.phone) + '</td>' +
            '<td class="px-6 py-4"><span class="text-sm text-yellow-600 font-medium">' + s.score.toFixed(1) + '</span> ' + stars + '</td>' +
            '<td class="px-6 py-4"><span class="px-2 py-0.5 text-xs font-medium rounded-full ' + (s.status === 'enabled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') + '">' + (s.status === 'enabled' ? '合作中' : '已停用') + '</span></td>' +
            '<td class="px-6 py-4">' +
                '<button onclick="viewSupplier(\'' + escapeHtml(s.id) + '\')" class="text-blue-600 hover:text-blue-800 text-xs mr-2"><i class="fas fa-eye"></i> 查看</button>' +
                '<button onclick="editSupplier(\'' + escapeHtml(s.id) + '\')" class="text-indigo-600 hover:text-indigo-800 text-xs mr-2"><i class="fas fa-edit"></i> 编辑</button>' +
                '<button onclick="toggleStatus(\'' + escapeHtml(s.id) + '\')" class="' + (s.status === 'enabled' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800') + ' text-xs mr-2"><i class="fas fa-' + (s.status === 'enabled' ? 'ban' : 'check') + '"></i> ' + (s.status === 'enabled' ? '停用' : '启用') + '</button>' +
                '<button onclick="deleteSupplier(\'' + escapeHtml(s.id) + '\')" class="text-gray-500 hover:text-red-600 text-xs"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('');
}

async function getFormHTML(supplier) {
    var isEdit = !!supplier;
    var data = supplier || {};
    var settings = await db.get('settings');
    var catOpts = settings.supplier_categories || ['蔬菜', '肉类', '蛋类', '粮油', '辅料', '冷冻品'];
    return '<form id="supplier-form" class="space-y-4">' +
        '<div class="grid grid-cols-2 gap-4">' +
        '<div><label class="block text-sm text-gray-600 mb-1">名称 <span class="text-red-500">*</span></label><input type="text" name="name" value="' + escapeHtml(data.name || '') + '" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">结算周期 <span class="text-red-500">*</span></label><select name="payment_cycle" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">' +
            '<option value="weekly"' + (data.payment_cycle === 'weekly' ? ' selected' : '') + '>周结</option>' +
            '<option value="biweekly"' + (data.payment_cycle === 'biweekly' ? ' selected' : '') + '>双周结</option>' +
            '<option value="monthly"' + (data.payment_cycle === 'monthly' ? ' selected' : '') + '>月结</option>' +
            '<option value="quarterly"' + (data.payment_cycle === 'quarterly' ? ' selected' : '') + '>季度结</option>' +
        '</select></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">联系人 <span class="text-red-500">*</span></label><input type="text" name="contact" value="' + escapeHtml(data.contact || '') + '" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">电话 <span class="text-red-500">*</span></label><input type="tel" name="phone" value="' + escapeHtml(data.phone || '') + '" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">评分</label><input type="number" name="score" min="0" max="5" step="0.1" value="' + (data.score || '3.0') + '" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">状态</label><select name="status" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">' +
            '<option value="enabled"' + (data.status === 'enabled' ? ' selected' : '') + '>合作中</option>' +
            '<option value="disabled"' + (data.status === 'disabled' ? ' selected' : '') + '>已停用</option>' +
        '</select></div></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">供应分类 <span class="text-red-500">*</span></label><div class="flex flex-wrap gap-3">' +
            catOpts.map(function(c) {
                var checked = data.category && data.category.includes(c);
                return '<label class="flex items-center space-x-1"><input type="checkbox" name="category" value="' + c + '"' + (checked ? ' checked' : '') + ' class="rounded text-blue-600"> <span class="text-sm">' + c + '</span></label>';
            }).join('') +
        '</div></div></form>';
}

async function openAddModal() {
    var html = await getFormHTML(null);
    openModal('新增供应商', html, async function() {
        await saveSupplier(null);
    });
}

async function editSupplier(id) {
    try {
        var suppliers = await db.get('suppliers');
        var supplier = suppliers.find(function(s) { return s.id === id; });
        if (!supplier) return;
        var html = await getFormHTML(supplier);
        openModal('编辑供应商', html, async function() {
            await saveSupplier(id);
        });
    } catch (e) {
        utils.showMessage('操作失败：' + e.message, 'error');
    }
}

async function saveSupplier(editId) {
    var form = document.getElementById('supplier-form');
    var fd = new FormData(form);
    var category = Array.from(form.querySelectorAll('input[name="category"]:checked')).map(function(cb) { return cb.value; });
    if (category.length === 0) { utils.showMessage('请选择供应分类', 'error'); return false; }
    if (!fd.get('name') || !fd.get('contact') || !fd.get('phone')) { utils.showMessage('请填写必填项', 'error'); return false; }

    if (editId) {
        await db.update('suppliers', editId, {
            name: fd.get('name'), category: category, payment_cycle: fd.get('payment_cycle'),
            contact: fd.get('contact'), phone: fd.get('phone'),
            score: parseFloat(fd.get('score')), status: fd.get('status')
        });
        utils.showMessage('供应商更新成功');
    } else {
        await db.add('suppliers', {
            id: utils.generateId('SUP'), name: fd.get('name'), category: category,
            payment_cycle: fd.get('payment_cycle'), contact: fd.get('contact'),
            phone: fd.get('phone'), score: parseFloat(fd.get('score')), status: fd.get('status')
        });
        utils.showMessage('供应商新增成功');
    }
    await loadSupplierList();
}

async function viewSupplier(id) {
    try {
        var suppliers = await db.get('suppliers');
        var s = suppliers.find(function(x) { return x.id === id; });
        if (!s) return;
        var orders = (await db.get('purchase_orders')).filter(function(p) { return p.supplier_id === id; });
        var totalPurchase = orders.reduce(function(sum, p) { return sum + p.total_amount; }, 0);
        var pendingCount = orders.filter(function(p) { return p.status !== 'paid' && p.status !== 'completed'; }).length;

        var pcMap = { weekly: '周结', biweekly: '双周结', monthly: '月结', quarterly: '季度结' };
        var content = '<div class="space-y-4">' +
            '<div class="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">' +
                '<div><span class="text-gray-500">供应商ID：</span><span class="font-medium">' + escapeHtml(s.id) + '</span></div>' +
                '<div><span class="text-gray-500">名称：</span><span class="font-medium">' + escapeHtml(s.name) + '</span></div>' +
                '<div><span class="text-gray-500">分类：</span><span class="font-medium">' + s.category.map(function(c) { return escapeHtml(c); }).join('、') + '</span></div>' +
                '<div><span class="text-gray-500">结算周期：</span><span class="font-medium">' + (pcMap[s.payment_cycle] || '') + '</span></div>' +
                '<div><span class="text-gray-500">联系人：</span><span class="font-medium">' + escapeHtml(s.contact) + '</span></div>' +
                '<div><span class="text-gray-500">电话：</span><span class="font-medium">' + escapeHtml(s.phone) + '</span></div>' +
                '<div><span class="text-gray-500">评分：</span><span class="font-medium text-yellow-600">' + s.score.toFixed(1) + '</span></div>' +
                '<div><span class="text-gray-500">状态：</span><span class="font-medium">' + (s.status === 'enabled' ? '合作中' : '已停用') + '</span></div>' +
            '</div>' +
            '<div class="border-t pt-4">' +
            '<h4 class="text-sm font-semibold mb-3">合作统计</h4>' +
            '<div class="grid grid-cols-3 gap-4">' +
                '<div class="bg-blue-50 rounded-lg p-3 text-center"><div class="text-2xl font-bold text-blue-600">' + orders.length + '</div><div class="text-xs text-gray-500 mt-1">总订单数</div></div>' +
                '<div class="bg-green-50 rounded-lg p-3 text-center"><div class="text-xl font-bold text-green-600">' + utils.formatMoney(totalPurchase) + '</div><div class="text-xs text-gray-500 mt-1">累计采购额</div></div>' +
                '<div class="bg-yellow-50 rounded-lg p-3 text-center"><div class="text-2xl font-bold text-yellow-600">' + pendingCount + '</div><div class="text-xs text-gray-500 mt-1">待处理订单</div></div>' +
            '</div></div>' +
            '<div class="border-t pt-4"><h4 class="text-sm font-semibold mb-3">供应分类标签</h4><div class="flex flex-wrap gap-2">' +
                s.category.map(function(c) { return '<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">' + escapeHtml(c) + '</span>'; }).join('') +
            '</div></div></div>';

        openModal('供应商详情 - ' + escapeHtml(s.name), content);
    } catch (e) {
        utils.showMessage('操作失败：' + e.message, 'error');
    }
}

async function toggleStatus(id) {
    try {
        var suppliers = await db.get('suppliers');
        var s = suppliers.find(function(x) { return x.id === id; });
        if (!s) return;
        var newStatus = s.status === 'enabled' ? 'disabled' : 'enabled';
        openModal('确认操作', '<p>确定' + (newStatus === 'disabled' ? '停用' : '启用') + '该供应商吗？</p>', async function() {
            await db.update('suppliers', id, { status: newStatus });
            utils.showMessage(newStatus === 'enabled' ? '供应商已启用' : '供应商已停用');
            await loadSupplierList();
        });
    } catch (e) {
        utils.showMessage('操作失败：' + e.message, 'error');
    }
}

async function deleteSupplier(id) {
    try {
        var suppliers = await db.get('suppliers');
        var s = suppliers.find(function(x) { return x.id === id; });
        if (!s) return;
        var orders = (await db.get('purchase_orders')).filter(function(p) { return p.supplier_id === id; });
        if (orders.length > 0) {
            utils.showMessage('该供应商有 ' + orders.length + ' 条采购记录，无法删除', 'error');
            return false;
        }
        openModal('确认删除', '<p>确定删除供应商 <strong>' + escapeHtml(s.name) + '</strong> 吗？此操作不可恢复。</p>', async function() {
            await db.delete('suppliers', id);
            utils.showMessage('供应商已删除');
            await loadSupplierList();
        });
    } catch (e) {
        utils.showMessage('操作失败：' + e.message, 'error');
    }
}
