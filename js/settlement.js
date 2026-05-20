let currentPage = 1, pageSize = 10, filteredSettlements = [];

document.addEventListener('DOMContentLoaded', async function() {
    loadSidebar('settlement.html');
    await loadList();
    document.getElementById('search-input').addEventListener('input', debounce(loadList, 300));
    document.getElementById('status-filter').addEventListener('change', loadList);
    document.getElementById('create-settlement-btn').addEventListener('click', openCreateModal);
    document.getElementById('prev-page').addEventListener('click', function() { if (currentPage > 1) { currentPage--; renderList(); } });
    document.getElementById('next-page').addEventListener('click', function() { var tp = Math.ceil(filteredSettlements.length / pageSize) || 1; if (currentPage < tp) { currentPage++; renderList(); } });
    var alertEl = document.getElementById('alert-count');
    if (alertEl) alertEl.textContent = (await utils.getInventoryAlertCount()) + (await utils.getPendingApprovalCount());
    var userEl = document.getElementById('current-user');
    if (userEl) {
        var users = await db.get('users');
        userEl.textContent = (users.length > 0 ? users[0].name : '管理员');
    }
});

async function loadList() {
    var settlements = await db.get('settlements');
    var kw = document.getElementById('search-input').value.toLowerCase();
    var st = document.getElementById('status-filter').value;
    filteredSettlements = settlements.filter(function(s) {
        var matchSearch = s.supplier_name.toLowerCase().includes(kw) || s.id.toLowerCase().includes(kw);
        var matchStatus = st ? s.status === st : true;
        return matchSearch && matchStatus;
    });
    currentPage = 1;
    renderList();
}

function renderList() {
    var tbody = document.getElementById('settlement-list');
    var total = filteredSettlements.length;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    var start = (currentPage - 1) * pageSize;
    var pageData = filteredSettlements.slice(start, start + pageSize);

    document.getElementById('total-count').textContent = total;
    document.getElementById('page-info').textContent = '第 ' + currentPage + ' / ' + totalPages + ' 页';
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;

    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-12 text-center text-gray-400"><i class="fas fa-file-invoice-dollar text-4xl mb-3 block"></i>暂无结算单</td></tr>';
        return;
    }

    var statusMap = {
        pending_approval: { text: '待审批', cls: 'bg-yellow-100 text-yellow-700' },
        approved: { text: '已审批', cls: 'bg-blue-100 text-blue-700' },
        paid: { text: '已付款', cls: 'bg-green-100 text-green-700' },
        cancelled: { text: '已取消', cls: 'bg-gray-100 text-gray-700' }
    };

    tbody.innerHTML = pageData.map(function(s) {
        var st = statusMap[s.status] || { text: s.status, cls: 'bg-gray-100' };
        return '<tr class="hover:bg-gray-50">' +
            '<td class="px-6 py-4 text-sm text-blue-600 font-medium">' + escapeHtml(s.id) + '</td>' +
            '<td class="px-6 py-4 text-sm font-medium">' + escapeHtml(s.supplier_name) + '</td>' +
            '<td class="px-6 py-4 text-sm text-gray-600">' + escapeHtml(s.period_start) + ' ~ ' + escapeHtml(s.period_end) + '</td>' +
            '<td class="px-6 py-4 text-sm text-gray-900">' + utils.formatMoney(s.total_purchase) + '</td>' +
            '<td class="px-6 py-4 text-sm text-red-600">' + (s.deduction > 0 ? '-' + utils.formatMoney(s.deduction) : '¥0.00') + '</td>' +
            '<td class="px-6 py-4 text-sm font-semibold text-gray-900">' + utils.formatMoney(s.actual_amount) + '</td>' +
            '<td class="px-6 py-4"><span class="px-2 py-0.5 text-xs font-medium rounded-full ' + st.cls + '">' + st.text + '</span></td>' +
            '<td class="px-6 py-4 text-sm space-x-2">' +
                '<button onclick="viewSettlement(\'' + escapeHtml(s.id) + '\')" class="text-blue-600 hover:text-blue-800"><i class="fas fa-eye"></i> 查看</button>' +
                (s.status === 'pending_approval' ? '<button onclick="approveSettlement(\'' + escapeHtml(s.id) + '\')" class="text-green-600 hover:text-green-800"><i class="fas fa-check"></i> 审批</button>' : '') +
                (s.status === 'approved' ? '<button onclick="paySettlement(\'' + escapeHtml(s.id) + '\')" class="text-indigo-600 hover:text-indigo-800"><i class="fas fa-money-bill-wave"></i> 付款</button>' : '') +
            '</td></tr>';
    }).join('');
}

async function openCreateModal() {
    var suppliers = (await db.get('suppliers')).filter(function(s) { return s.status === 'enabled'; });
    var supplierOpts = suppliers.map(function(s) {
        return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>';
    }).join('');

    var today = utils.formatDate(new Date());
    var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    var weekAgoStr = utils.formatDate(weekAgo);

    var content = '<form id="settlement-form" class="space-y-4">' +
        '<div class="grid grid-cols-2 gap-4">' +
        '<div><label class="block text-sm text-gray-600 mb-1">供应商 <span class="text-red-500">*</span></label><select name="supplier_id" id="settlement-supplier" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"><option value="">请选择</option>' + supplierOpts + '</select></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">结算周期开始 <span class="text-red-500">*</span></label><input type="date" name="period_start" value="' + weekAgoStr + '" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">结算周期结束 <span class="text-red-500">*</span></label><input type="date" name="period_end" value="' + today + '" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">扣款金额</label><input type="number" name="deduction" value="0" min="0" step="0.01" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"></div>' +
        '</div>' +
        '<div id="settlement-preview" class="bg-gray-50 rounded-lg p-4 mt-4"><p class="text-sm text-gray-500">选择供应商和日期范围后，系统将自动计算采购金额</p></div>' +
        '</form>';

    openModal('生成结算单', content, async function() { await createSettlement(); });

    document.getElementById('settlement-supplier').addEventListener('change', previewSettlement);
    document.querySelector('[name="period_start"]').addEventListener('change', previewSettlement);
    document.querySelector('[name="period_end"]').addEventListener('change', previewSettlement);
}

async function previewSettlement() {
    var supplierId = document.getElementById('settlement-supplier').value;
    var periodStart = document.querySelector('[name="period_start"]').value;
    var periodEnd = document.querySelector('[name="period_end"]').value;

    if (!supplierId || !periodStart || !periodEnd) return;

    var orders = (await db.get('purchase_orders')).filter(function(p) {
        return p.supplier_id === supplierId && p.date >= periodStart && p.date <= periodEnd && (p.status === 'paid' || p.status === 'completed');
    });

    var totalAmount = orders.reduce(function(sum, p) { return sum + p.total_amount; }, 0);
    var preview = document.getElementById('settlement-preview');

    if (orders.length === 0) {
        preview.innerHTML = '<div class="text-center py-4"><i class="fas fa-info-circle text-yellow-500 text-xl mb-2 block"></i><p class="text-sm text-yellow-600">该时段内没有已完成的采购订单</p></div>';
    } else {
        preview.innerHTML = '<h4 class="text-sm font-semibold mb-2">结算预览</h4>' +
            '<div class="text-sm text-gray-600">关联订单数：<span class="font-medium">' + orders.length + ' 单</span></div>' +
            '<div class="text-sm text-gray-600 mt-1">采购总额：<span class="font-semibold text-blue-600">' + utils.formatMoney(totalAmount) + '</span></div>' +
            '<div class="mt-2 border-t pt-2 text-xs text-gray-500">' +
                orders.map(function(o) { return '<div class="flex justify-between"><span>' + escapeHtml(o.id) + '</span><span>' + utils.formatMoney(o.total_amount) + '</span></div>'; }).join('') +
            '</div>';
    }
}

async function createSettlement() {
    var form = document.getElementById('settlement-form');
    var fd = new FormData(form);
    var supplierId = fd.get('supplier_id');
    var periodStart = fd.get('period_start');
    var periodEnd = fd.get('period_end');
    var deduction = parseFloat(fd.get('deduction')) || 0;

    if (!supplierId || !periodStart || !periodEnd) { utils.showMessage('请填写所有必填项', 'error'); return false; }

    var supplier = (await db.get('suppliers')).find(function(s) { return s.id === supplierId; });
    var orders = (await db.get('purchase_orders')).filter(function(p) {
        return p.supplier_id === supplierId && p.date >= periodStart && p.date <= periodEnd && (p.status === 'paid' || p.status === 'completed');
    });

    if (orders.length === 0) { utils.showMessage('该时段内没有已完成的采购订单', 'error'); return false; }

    var totalPurchase = orders.reduce(function(sum, p) { return sum + p.total_amount; }, 0);

    await db.add('settlements', {
        id: utils.generateId('JS'),
        supplier_id: supplierId, supplier_name: supplier.name,
        period_start: periodStart, period_end: periodEnd,
        total_purchase: totalPurchase, deduction: deduction,
        actual_amount: totalPurchase - deduction,
        status: 'pending_approval', creator: '管理员'
    });

    utils.showMessage('结算单生成成功，等待审批');
    await loadList();
}

async function viewSettlement(id) {
    try {
        var s = (await db.get('settlements')).find(function(x) { return x.id === id; });
        if (!s) return;

        var orders = (await db.get('purchase_orders')).filter(function(p) {
            return p.supplier_id === s.supplier_id && p.date >= s.period_start && p.date <= s.period_end;
        });

        var statusMap = { pending_approval: '待审批', approved: '已审批', paid: '已付款', cancelled: '已取消' };

        var content = '<div class="space-y-4">' +
            '<div class="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">' +
                '<div><span class="text-gray-500">结算单号：</span><span class="font-medium text-blue-600">' + escapeHtml(s.id) + '</span></div>' +
                '<div><span class="text-gray-500">供应商：</span><span class="font-medium">' + escapeHtml(s.supplier_name) + '</span></div>' +
                '<div><span class="text-gray-500">结算周期：</span><span class="font-medium">' + escapeHtml(s.period_start) + ' ~ ' + escapeHtml(s.period_end) + '</span></div>' +
                '<div><span class="text-gray-500">状态：</span><span class="font-medium">' + (statusMap[s.status] || s.status) + '</span></div>' +
                '<div><span class="text-gray-500">采购总额：</span><span class="font-medium">' + utils.formatMoney(s.total_purchase) + '</span></div>' +
                '<div><span class="text-gray-500">扣款：</span><span class="font-medium text-red-600">' + utils.formatMoney(s.deduction) + '</span></div>' +
                '<div><span class="text-gray-500">实付金额：</span><span class="font-semibold text-green-600 text-lg">' + utils.formatMoney(s.actual_amount) + '</span></div>' +
                '<div><span class="text-gray-500">创建人：</span><span class="font-medium">' + escapeHtml(s.creator || '管理员') + '</span></div>' +
            '</div>' +
            '<div class="border-t pt-4"><h4 class="text-sm font-semibold mb-3">关联采购订单（' + orders.length + ' 单）</h4>' +
            '<table class="min-w-full text-sm"><thead class="bg-gray-50"><tr><th class="px-4 py-2 text-left">订单号</th><th class="px-4 py-2 text-left">日期</th><th class="px-4 py-2 text-right">金额</th><th class="px-4 py-2 text-left">状态</th></tr></thead><tbody>' +
                orders.map(function(o) { return '<tr class="border-t"><td class="px-4 py-2">' + escapeHtml(o.id) + '</td><td class="px-4 py-2">' + escapeHtml(o.date) + '</td><td class="px-4 py-2 text-right">' + utils.formatMoney(o.total_amount) + '</td><td class="px-4 py-2"><span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">已完成</span></td></tr>'; }).join('') +
            '</tbody></table></div></div>';

        openModal('结算单详情 - ' + escapeHtml(s.id), content, null);
    } catch (e) {
        utils.showMessage('查看结算单失败：' + e.message, 'error');
    }
}

function approveSettlement(id) {
    openModal('确认审批', '<p>确定审批通过该结算单吗？</p>', async function() {
        try {
            await db.update('settlements', id, { status: 'approved' });
            utils.showMessage('结算单审批通过');
            await loadList();
        } catch (e) {
            utils.showMessage('审批失败：' + e.message, 'error');
        }
    });
}

function paySettlement(id) {
    openModal('确认付款', '<p>确定执行付款吗？付款后不可撤销。</p>', async function() {
        try {
            await db.update('settlements', id, { status: 'paid' });
            utils.showMessage('付款成功');
            await loadList();
        } catch (e) {
            utils.showMessage('付款失败：' + e.message, 'error');
        }
    });
}
