document.addEventListener('DOMContentLoaded', function() {
    loadSidebar('purchase.html');
    loadPurchaseStats();
    loadSupplierFilter();
    loadPurchaseList();
});

function loadPurchaseStats() {
    const purchaseOrders = db.get('purchase_orders');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthOrders = purchaseOrders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    
    const monthAmount = monthOrders.reduce((sum, order) => sum + order.total_amount, 0);
    
    const pendingCount = purchaseOrders.filter(order => order.status === 'pending_approval').length;
    
    const inboundCount = purchaseOrders.filter(order => 
        order.status === 'approved' || order.status === 'in_transit' || order.status === 'partial_received'
    ).length;
    
    document.getElementById('stat-month-count').textContent = monthOrders.length;
    document.getElementById('stat-month-amount').textContent = utils.formatMoney(monthAmount);
    document.getElementById('stat-pending-count').textContent = pendingCount;
    document.getElementById('stat-inbound-count').textContent = inboundCount;
}

function loadSupplierFilter() {
    const suppliers = db.get('suppliers').filter(s => s.status === 'enabled');
    const select = document.getElementById('filter-supplier');
    
    select.innerHTML = '<option value="all">全部供应商</option>';
    
    suppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = supplier.name;
        select.appendChild(option);
    });
}

function loadPurchaseList() {
    let purchaseOrders = [...db.get('purchase_orders')];
    const tableBody = document.getElementById('purchase-table');
    
    const statusFilter = document.getElementById('filter-status').value;
    const supplierFilter = document.getElementById('filter-supplier').value;
    const dateStart = document.getElementById('filter-date-start').value;
    const dateEnd = document.getElementById('filter-date-end').value;
    const keyword = document.getElementById('search-keyword').value.toLowerCase().trim();
    
    if (statusFilter !== 'all') {
        purchaseOrders = purchaseOrders.filter(order => order.status === statusFilter);
    }
    
    if (supplierFilter !== 'all') {
        purchaseOrders = purchaseOrders.filter(order => order.supplier_id === supplierFilter);
    }
    
    if (dateStart) {
        purchaseOrders = purchaseOrders.filter(order => order.date >= dateStart);
    }
    if (dateEnd) {
        purchaseOrders = purchaseOrders.filter(order => order.date <= dateEnd);
    }
    
    if (keyword) {
        purchaseOrders = purchaseOrders.filter(order => 
            order.id.toLowerCase().includes(keyword) || 
            order.supplier_name.toLowerCase().includes(keyword) ||
            order.related_menu_id?.toLowerCase().includes(keyword)
        );
    }
    
    purchaseOrders.sort((a, b) => {
        const dateA = a.created_at || a.date;
        const dateB = b.created_at || b.date;
        return new Date(dateB) - new Date(dateA);
    });
    
    document.getElementById('purchase-total').textContent = purchaseOrders.length;
    
    if (purchaseOrders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-file-text-o text-4xl mb-3"></i>
                    <p class="text-lg">暂无采购单数据</p>
                    <p class="text-sm mt-1">从菜谱管理页面生成采购单后将在这里显示</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    purchaseOrders.forEach(order => {
        const statusInfo = getStatusInfo(order.status);
        
        html += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(order.id)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${escapeHtml(order.supplier_name)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${escapeHtml(order.date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${escapeHtml(order.expect_arrive_date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${order.related_menu_id ? `<a href="menu.html" class="text-blue-600 hover:underline">${escapeHtml(order.related_menu_id)}</a>` : '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    ${utils.formatMoney(order.total_amount)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${escapeHtml(order.creator || '系统')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="viewPurchaseDetail('${escapeHtml(order.id)}')" class="text-blue-600 hover:text-blue-900 mr-3">查看</button>
                    ${getActionButtons(order)}
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function getStatusInfo(status) {
    const statusMap = {
        'pending_approval': { text: '待审批', class: 'bg-yellow-100 text-yellow-800' },
        'pending_accept': { text: '待审批', class: 'bg-yellow-100 text-yellow-800' },
        'approved': { text: '已审批', class: 'bg-blue-100 text-blue-800' },
        'accepted': { text: '已审批', class: 'bg-blue-100 text-blue-800' },
        'rejected': { text: '已驳回', class: 'bg-red-100 text-red-800' },
        'in_transit': { text: '配送中', class: 'bg-purple-100 text-purple-800' },
        'partial_received': { text: '部分入库', class: 'bg-orange-100 text-orange-800' },
        'completed': { text: '已完成', class: 'bg-green-100 text-green-800' },
        'cancelled': { text: '已取消', class: 'bg-gray-100 text-gray-800' },
        'paid': { text: '已付款', class: 'bg-green-100 text-green-800' }
    };
    return statusMap[status] || { text: status || '未知', class: 'bg-gray-100 text-gray-800' };
}

function getActionButtons(order) {
    let buttons = '';
    
    switch (order.status) {
        case 'pending_approval':
            buttons += `
                <button onclick="approvePurchase('${escapeHtml(order.id)}')" class="text-green-600 hover:text-green-900 mr-3">审批</button>
                <button onclick="cancelPurchase('${escapeHtml(order.id)}')" class="text-red-600 hover:text-red-900">取消</button>
            `;
            break;
        case 'approved':
            buttons += `
                <button onclick="markAsInTransit('${escapeHtml(order.id)}')" class="text-purple-600 hover:text-purple-900 mr-3">标记配送</button>
                <button onclick="cancelPurchase('${escapeHtml(order.id)}')" class="text-red-600 hover:text-red-900">取消</button>
            `;
            break;
        case 'in_transit':
        case 'partial_received':
            buttons += `
                <button onclick="stockInPurchase('${escapeHtml(order.id)}')" class="text-green-600 hover:text-green-900">入库登记</button>
            `;
            break;
        case 'completed':
            buttons += `
                <button onclick="printPurchase('${escapeHtml(order.id)}')" class="text-gray-600 hover:text-gray-900">打印</button>
            `;
            break;
        case 'rejected':
        case 'cancelled':
            buttons += `
                <button onclick="deletePurchase('${escapeHtml(order.id)}')" class="text-red-600 hover:text-red-900">删除</button>
            `;
            break;
    }
    
    return buttons;
}

function viewPurchaseDetail(orderId) {
    const order = db.get('purchase_orders').find(o => o.id === orderId);
    if (!order) return;
    
    const statusInfo = getStatusInfo(order.status);
    
    let itemsHtml = order.items.map(item => {
        const received = item.received_quantity || 0;
        const pending = item.quantity - received;
        return `
            <tr>
                <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">${escapeHtml(item.name)}</td>
                <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">${item.quantity.toFixed(2)} kg</td>
                <td class="px-3 py-2 whitespace-nowrap text-sm text-green-600 text-right font-medium">${received.toFixed(2)} kg</td>
                <td class="px-3 py-2 whitespace-nowrap text-sm text-red-600 text-right font-medium">${pending.toFixed(2)} kg</td>
                <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">¥${item.price.toFixed(2)}</td>
                <td class="px-3 py-2 whitespace-nowrap text-sm text-red-600 text-right font-medium">¥${item.amount.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    let approvalHtml = '';
    if (order.approval_history && order.approval_history.length > 0) {
        approvalHtml = '<div><h4 class="text-sm font-medium text-gray-900 mb-3">审批记录</h4><div class="space-y-3">' +
            order.approval_history.map(record => `
                <div class="flex items-start">
                    <div class="flex-shrink-0"><i class="fas fa-user-circle text-gray-400 text-xl"></i></div>
                    <div class="ml-3">
                        <p class="text-sm text-gray-900"><span class="font-medium">${escapeHtml(record.approver)}</span><span class="text-gray-500 ml-2">${escapeHtml(record.time)}</span></p>
                        <p class="text-sm text-gray-600 mt-1">${record.result === 'approve' ? '✅ 审批通过' : '❌ 已驳回'}：${escapeHtml(record.comment || '无')}</p>
                    </div>
                </div>
            `).join('') +
        '</div></div>';
    }
    
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-gray-900">采购单详情</h3>
                <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div><p class="text-sm text-gray-500 mb-1">采购单编号</p><p class="text-sm font-medium text-gray-900">${escapeHtml(order.id)}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">供应商</p><p class="text-sm font-medium text-gray-900">${escapeHtml(order.supplier_name)}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">创建日期</p><p class="text-sm font-medium text-gray-900">${escapeHtml(order.date)}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">预计到货日期</p><p class="text-sm font-medium text-gray-900">${escapeHtml(order.expect_arrive_date)}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">关联菜谱</p><p class="text-sm font-medium text-gray-900">${escapeHtml(order.related_menu_id || '-')}</p></div>
                <div><p class="text-sm text-gray-500 mb-1">创建人</p><p class="text-sm font-medium text-gray-900">${escapeHtml(order.creator || '系统')}</p></div>
            </div>
            
            <div>
                <h4 class="text-sm font-medium text-gray-900 mb-3">采购商品清单</h4>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">食材名称</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">采购数量</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">已入库数量</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">待入库数量</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">采购单价</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">金额</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">${itemsHtml}</tbody>
                        <tfoot class="bg-gray-50">
                            <tr>
                                <td colspan="5" class="px-3 py-2 text-right text-sm font-medium text-gray-900">合计</td>
                                <td class="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-red-600">${utils.formatMoney(order.total_amount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
            ${order.remark ? '<div><h4 class="text-sm font-medium text-gray-900 mb-2">备注信息</h4><div class="bg-gray-50 rounded-md p-3 text-sm text-gray-700">' + escapeHtml(order.remark) + '</div></div>' : ''}
            
            ${approvalHtml}
        </div>
    `;
    
    openModal('采购单详情', content, null);
}

function approvePurchase(orderId) {
    const order = db.get('purchase_orders').find(o => o.id === orderId);
    if (!order) return;
    
    const content = `
        <div class="space-y-4">
            <div><p class="text-sm text-gray-500 mb-1">采购单编号</p><p class="text-sm font-medium text-gray-900">${escapeHtml(order.id)}</p></div>
            <div><p class="text-sm text-gray-500 mb-1">供应商</p><p class="text-sm font-medium text-gray-900">${escapeHtml(order.supplier_name)}</p></div>
            <div><p class="text-sm text-gray-500 mb-1">采购金额</p><p class="text-sm font-medium text-red-600">${utils.formatMoney(order.total_amount)}</p></div>
            <div>
                <label class="form-label">审批结果</label>
                <select id="approval-result" class="form-select">
                    <option value="approve">通过</option>
                    <option value="reject">驳回</option>
                </select>
            </div>
            <div>
                <label class="form-label">审批意见</label>
                <textarea id="approval-comment" class="form-textarea" rows="3" placeholder="请输入审批意见（选填）"></textarea>
            </div>
        </div>
    `;
    
    openModal('审批采购单', content, function() {
        submitApproval(orderId);
    });
}

function submitApproval(orderId) {
    const order = db.get('purchase_orders').find(o => o.id === orderId);
    if (!order) return false;
    
    const result = document.getElementById('approval-result').value;
    const comment = document.getElementById('approval-comment').value;
    
    if (!order.approval_history) {
        order.approval_history = [];
    }
    order.approval_history.unshift({
        approver: '管理员',
        time: utils.formatDateTime(new Date()),
        result: result,
        comment: comment
    });
    
    if (result === 'approve') {
        utils.showMessage('采购单审批通过');
    } else {
        utils.showMessage('采购单已驳回', 'warning');
    }
    
    db.update('purchase_orders', orderId, {
        status: result === 'approve' ? 'approved' : 'rejected',
        approval_history: order.approval_history,
        updated_at: new Date().toISOString()
    });
    
    loadPurchaseStats();
    loadPurchaseList();
}

function markAsInTransit(orderId) {
    const confirmContent = '<p>确定要将该采购单标记为配送中吗？</p>';
    
    openModal('确认操作', confirmContent, function() {
        db.update('purchase_orders', orderId, {
            status: 'in_transit',
            updated_at: new Date().toISOString()
        });
        
        utils.showMessage('采购单已标记为配送中');
        loadPurchaseStats();
        loadPurchaseList();
    });
}

function stockInPurchase(orderId) {
    const order = db.get('purchase_orders').find(o => o.id === orderId);
    if (!order) return;
    
    let itemsHtml = order.items.map((item, index) => {
        const received = item.received_quantity || 0;
        const remaining = item.quantity - received;
        if (remaining <= 0) return '';
        
        return `
            <div class="grid grid-cols-2 gap-3 items-center">
                <div>
                    <p class="text-sm font-medium text-gray-900">${escapeHtml(item.name)}</p>
                    <p class="text-xs text-gray-500">待入库：${remaining.toFixed(2)} kg</p>
                </div>
                <div>
                    <input type="hidden" name="item-index[]" value="${index}">
                    <input type="number" name="stock-in-quantity[]" class="form-input" step="0.01" min="0" max="${remaining}" placeholder="请输入入库数量" value="${remaining.toFixed(2)}" required>
                </div>
            </div>
        `;
    }).join('');
    
    const content = `
        <div class="space-y-4">
            <div><p class="text-sm text-gray-500 mb-1">采购单编号</p><p class="text-sm font-medium text-gray-900">${escapeHtml(order.id)}</p></div>
            <div><p class="text-sm text-gray-500 mb-1">供应商</p><p class="text-sm font-medium text-gray-900">${escapeHtml(order.supplier_name)}</p></div>
            <form id="stock-in-form">
                <h4 class="text-sm font-medium text-gray-900">本次入库商品</h4>
                ${itemsHtml}
                <div>
                    <label class="form-label">入库备注</label>
                    <textarea id="stock-in-remark" class="form-textarea" rows="2" placeholder="请输入入库备注（选填）"></textarea>
                </div>
            </form>
        </div>
    `;
    
    openModal('入库登记', content, function() {
        submitStockIn(orderId);
    });
}

function submitStockIn(orderId) {
    const order = db.get('purchase_orders').find(o => o.id === orderId);
    if (!order) return false;
    
    const form = document.getElementById('stock-in-form');
    const formData = new FormData(form);
    
    const indices = formData.getAll('item-index[]');
    const quantities = formData.getAll('stock-in-quantity[]');
    const remark = document.getElementById('stock-in-remark').value;
    
    let allReceived = true;
    
    indices.forEach((indexStr, i) => {
        const index = parseInt(indexStr);
        const quantity = parseFloat(quantities[i]);
        if (isNaN(quantity) || quantity <= 0) return;
        const item = order.items[index];
        
        if (!item.received_quantity) {
            item.received_quantity = 0;
        }
        item.received_quantity += quantity;
        
        if (item.received_quantity < item.quantity) {
            allReceived = false;
        }
        
        const ingredients = db.get('ingredients');
        const ingredient = ingredients.find(ing => ing.id === item.ingredient_id);
        if (ingredient) {
            const beforeStock = ingredient.stock;
            const afterStock = beforeStock + quantity;
            db.update('ingredients', ingredient.id, { stock: afterStock });
            
            const stockFlow = {
                id: utils.generateId('STK'),
                ingredient_id: ingredient.id,
                ingredient_name: ingredient.name,
                type: 'in',
                quantity: quantity,
                before_stock: beforeStock,
                after_stock: afterStock,
                related_order_id: order.id,
                remark: remark || '采购入库',
                operator: '管理员',
                created_at: new Date().toISOString()
            };
            db.add('stock_flows', stockFlow);
        }
    });
    
    if (!order.stock_in_history) {
        order.stock_in_history = [];
    }
    order.stock_in_history.push({
        time: utils.formatDateTime(new Date()),
        operator: '管理员',
        remark: remark,
        items: indices.map((indexStr, i) => {
            const index = parseInt(indexStr);
            return {
                name: order.items[index].name,
                quantity: parseFloat(quantities[i])
            };
        })
    });
    
    db.update('purchase_orders', orderId, {
        items: order.items,
        status: allReceived ? 'completed' : 'partial_received',
        updated_at: new Date().toISOString(),
        stock_in_history: order.stock_in_history
    });
    
    if (allReceived) {
        utils.showMessage('全部商品已入库，采购单已完成');
    } else {
        utils.showMessage('部分商品已入库');
    }
    
    loadPurchaseStats();
    loadPurchaseList();
}

function cancelPurchase(orderId) {
    const confirmContent = '<p>确定要取消该采购单吗？取消后无法恢复。</p>';
    
    openModal('确认取消', confirmContent, function() {
        db.update('purchase_orders', orderId, {
            status: 'cancelled',
            updated_at: new Date().toISOString()
        });
        
        utils.showMessage('采购单已取消');
        loadPurchaseStats();
        loadPurchaseList();
    });
}

function deletePurchase(orderId) {
    const confirmContent = '<p>确定要删除该采购单吗？删除后无法恢复。</p>';
    
    openModal('确认删除', confirmContent, function() {
        db.delete('purchase_orders', orderId);
        utils.showMessage('采购单已删除');
        loadPurchaseStats();
        loadPurchaseList();
    });
}

function printPurchase(orderId) {
    utils.showMessage('打印功能开发中...', 'info');
}

function exportPurchaseData() {
    utils.showMessage('导出功能开发中...', 'info');
}

function resetFilters() {
    document.getElementById('filter-status').value = 'all';
    document.getElementById('filter-supplier').value = 'all';
    document.getElementById('filter-date-start').value = '';
    document.getElementById('filter-date-end').value = '';
    document.getElementById('search-keyword').value = '';
    loadPurchaseList();
}
