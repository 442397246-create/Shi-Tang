var periodDays = 7;

document.addEventListener('DOMContentLoaded', async function() {
    loadSidebar('report.html');
    document.getElementById('period-select').addEventListener('change', async function() {
        periodDays = parseInt(this.value);
        try { await refreshAll(); } catch(err) { utils.showMessage('刷新失败', 'error'); }
    });
    document.getElementById('refresh-btn').addEventListener('click', async function() {
        try { await refreshAll(); } catch(err) { utils.showMessage('刷新失败', 'error'); }
    });
    document.getElementById('export-btn').addEventListener('click', async function() {
        try { await exportReport(); } catch(err) { utils.showMessage('导出失败', 'error'); }
    });
    var userEl = document.getElementById('current-user');
    if (userEl) {
        var users = await db.get('users');
        userEl.textContent = (users.length > 0 ? users[0].name : '管理员');
    }
    await refreshAll();
});

async function refreshAll() {
    await renderStatsCards();
    await drawRevenueChart();
    await drawCategoryChart();
    await drawTopDishes();
    await drawCostChart();
    await drawSupplierStats();
}

function getDateRange() {
    var end = new Date();
    var start = new Date();
    start.setDate(start.getDate() - periodDays);
    return { start: start, end: end };
}

async function renderStatsCards() {
    var range = getDateRange();
    var startStr = utils.formatDate(range.start);
    var endStr = utils.formatDate(range.end);

    var menus = (await db.get('weekly_menus')).filter(function(m) { return m.date >= startStr && m.date <= endStr; });
    var totalDiners = menus.reduce(function(s, m) { return s + (m.total_diners || 0); }, 0);

    var dishes = await db.get('dishes');
    var totalSales = 0;
    menus.forEach(function(m) {
        Object.values(m.meals).forEach(function(meal) {
            meal.forEach(function(d) {
                var dish = dishes.find(function(dd) { return dd.id === d.dish_id; });
                if (dish) totalSales += dish.price * (d.estimated_diners || 0);
            });
        });
    });

    var orders = (await db.get('purchase_orders')).filter(function(p) { return p.date >= startStr && p.date <= endStr && (p.status === 'paid' || p.status === 'completed'); });
    var totalCost = orders.reduce(function(s, p) { return s + p.total_amount; }, 0);

    var settlements = (await db.get('settlements')).filter(function(s) { return s.period_start >= startStr && s.period_end <= endStr && s.status === 'paid'; });
    var totalSettled = settlements.reduce(function(s, st) { return s + st.actual_amount; }, 0);

    var profit = totalSales - totalCost;

    var cards = [
        { label: '就餐人次', value: totalDiners.toLocaleString(), icon: 'users', color: 'blue' },
        { label: '营业额', value: utils.formatMoney(totalSales), icon: 'dollar-sign', color: 'green' },
        { label: '采购成本', value: utils.formatMoney(totalCost), icon: 'shopping-cart', color: 'orange' },
        { label: '预估利润', value: utils.formatMoney(profit), icon: 'chart-line', color: profit >= 0 ? 'green' : 'red' }
    ];

    document.getElementById('stats-cards').innerHTML = cards.map(function(c) {
        return '<div class="bg-white rounded-lg shadow-sm p-4"><div class="flex items-center justify-between"><div><p class="text-sm text-gray-500">' + c.label + '</p><p class="text-2xl font-bold text-' + c.color + '-600 mt-1">' + c.value + '</p></div><div class="w-12 h-12 bg-' + c.color + '-100 rounded-full flex items-center justify-center"><i class="fas fa-' + c.icon + ' text-' + c.color + '-600 text-xl"></i></div></div></div>';
    }).join('');
}

async function drawRevenueChart() {
    var canvas = document.getElementById('revenue-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var width = canvas.parentElement.clientWidth - 48;
    var height = 220;
    canvas.width = width; canvas.height = height;

    var range = getDateRange();
    var startStr = utils.formatDate(range.start);
    var endStr = utils.formatDate(range.end);
    var menus = (await db.get('weekly_menus')).filter(function(m) { return m.date >= startStr && m.date <= endStr; });

    var dishes = await db.get('dishes');
    var dateMap = {};
    menus.forEach(function(m) {
        var revenue = 0;
        Object.values(m.meals).forEach(function(meal) {
            meal.forEach(function(d) {
                var dish = dishes.find(function(dd) { return dd.id === d.dish_id; });
                if (dish) revenue += dish.price * (d.estimated_diners || 0);
            });
        });
        dateMap[m.date] = revenue;
    });

    var dates = Object.keys(dateMap).sort();
    var revenues = dates.map(function(d) { return dateMap[d]; });
    var maxVal = Math.max.apply(null, revenues.concat([1]));

    var pad = { top: 20, right: 20, bottom: 40, left: 70 };
    var chartW = width - pad.left - pad.right;
    var chartH = height - pad.top - pad.bottom;

    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
        var y = pad.top + (chartH * i / 4);
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
        ctx.fillStyle = '#999'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('¥' + Math.round(maxVal * (4 - i) / 4).toLocaleString(), pad.left - 8, y + 4);
    }
    ctx.textAlign = 'center';
    dates.forEach(function(d, i) {
        var x = pad.left + (chartW * i / Math.max(1, dates.length - 1));
        ctx.fillStyle = '#666'; ctx.fillText(d.slice(5), x, height - 10);
    });
    if (dates.length > 0) {
        ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 2;
        ctx.beginPath();
        dates.forEach(function(d, i) {
            var x = pad.left + (chartW * i / Math.max(1, dates.length - 1));
            var y = pad.top + chartH - (revenues[i] / maxVal * chartH);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.fillStyle = '#3B82F6';
        dates.forEach(function(d, i) {
            var x = pad.left + (chartW * i / Math.max(1, dates.length - 1));
            var y = pad.top + chartH - (revenues[i] / maxVal * chartH);
            ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        });
    }
}

async function drawCategoryChart() {
    var canvas = document.getElementById('category-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var width = canvas.parentElement.clientWidth - 48;
    var height = 220;
    canvas.width = width; canvas.height = height;

    var dishes = await db.get('dishes');
    var range = getDateRange();
    var startStr = utils.formatDate(range.start);
    var endStr = utils.formatDate(range.end);
    var menus = (await db.get('weekly_menus')).filter(function(m) { return m.date >= startStr && m.date <= endStr; });

    var catCount = {};
    menus.forEach(function(m) {
        Object.values(m.meals).forEach(function(meal) {
            meal.forEach(function(d) {
                var dish = dishes.find(function(dd) { return dd.id === d.dish_id; });
                if (dish) {
                    catCount[dish.category] = (catCount[dish.category] || 0) + (d.estimated_diners || 0);
                }
            });
        });
    });

    var categories = Object.keys(catCount);
    var values = categories.map(function(c) { return catCount[c]; });
    var total = values.reduce(function(s, v) { return s + v; }, 0) || 1;
    var colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    var cx = width * 0.35, cy = height / 2, r = Math.min(cx - 20, cy - 20);
    var startAngle = -Math.PI / 2;

    if (categories.length === 0) {
        ctx.fillStyle = '#999'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        return;
    }

    categories.forEach(function(cat, i) {
        var sliceAngle = (values[i] / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length]; ctx.fill();
        startAngle += sliceAngle;
    });

    var legendX = cx + r + 30;
    categories.forEach(function(cat, i) {
        var y = 30 + i * 25;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(legendX, y, 12, 12);
        ctx.fillStyle = '#333'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(cat + ' (' + Math.round(values[i] / total * 100) + '%)', legendX + 18, y + 10);
    });
}

async function drawTopDishes() {
    var dishes = await db.get('dishes');
    var sorted = dishes.slice().sort(function(a, b) { return (b.sales || 0) - (a.sales || 0); }).slice(0, 10);
    var tbody = document.getElementById('top-dishes');

    tbody.innerHTML = sorted.map(function(d, i) {
        var revenue = d.price * (d.sales || 0);
        return '<tr class="border-t hover:bg-gray-50"><td class="px-4 py-2 font-medium text-gray-500">' + (i + 1) + '</td><td class="px-4 py-2">' + escapeHtml(d.name) + '</td><td class="px-4 py-2"><span class="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">' + escapeHtml(d.category) + '</span></td><td class="px-4 py-2 text-right">' + (d.sales || 0).toLocaleString() + '</td><td class="px-4 py-2 text-right font-medium">' + utils.formatMoney(revenue) + '</td></tr>';
    }).join('');
}

async function drawCostChart() {
    var canvas = document.getElementById('cost-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var width = canvas.parentElement.clientWidth - 48;
    var height = 220;
    canvas.width = width; canvas.height = height;

    var range = getDateRange();
    var startStr = utils.formatDate(range.start);
    var endStr = utils.formatDate(range.end);
    var orders = (await db.get('purchase_orders')).filter(function(p) { return p.date >= startStr && p.date <= endStr; });

    var dateMap = {};
    orders.forEach(function(o) {
        dateMap[o.date] = (dateMap[o.date] || 0) + o.total_amount;
    });

    var dates = Object.keys(dateMap).sort();
    var costs = dates.map(function(d) { return dateMap[d]; });
    var maxVal = Math.max.apply(null, costs.concat([1]));

    var pad = { top: 20, right: 20, bottom: 40, left: 70 };
    var chartW = width - pad.left - pad.right;
    var chartH = height - pad.top - pad.bottom;

    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);

    for (var i = 0; i <= 4; i++) {
        var y = pad.top + (chartH * i / 4);
        ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
        ctx.fillStyle = '#999'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('¥' + Math.round(maxVal * (4 - i) / 4).toLocaleString(), pad.left - 8, y + 4);
    }

    if (dates.length > 0) {
        var barW = Math.min(40, chartW / dates.length - 4);
        dates.forEach(function(d, i) {
            var x = pad.left + (chartW * i / Math.max(1, dates.length - 1)) - barW / 2;
            var barH = (costs[i] / maxVal) * chartH;
            var y = pad.top + chartH - barH;
            var gradient = ctx.createLinearGradient(0, y, 0, pad.top + chartH);
            gradient.addColorStop(0, '#F59E0B'); gradient.addColorStop(1, '#EF4444');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barW, barH);
            ctx.fillStyle = '#666'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(d.slice(5), x + barW / 2, height - 10);
        });
    }
}

async function drawSupplierStats() {
    var range = getDateRange();
    var startStr = utils.formatDate(range.start);
    var endStr = utils.formatDate(range.end);
    var orders = (await db.get('purchase_orders')).filter(function(p) { return p.date >= startStr && p.date <= endStr; });

    var supMap = {};
    orders.forEach(function(o) {
        if (!supMap[o.supplier_name]) supMap[o.supplier_name] = { orders: 0, amount: 0 };
        supMap[o.supplier_name].orders++;
        supMap[o.supplier_name].amount += o.total_amount;
    });

    var suppliers = Object.keys(supMap);
    var totalAmount = Object.values(supMap).reduce(function(s, v) { return s + v.amount; }, 0) || 1;

    var tbody = document.getElementById('supplier-stats');
    tbody.innerHTML = suppliers.map(function(name) {
        var d = supMap[name];
        var pct = (d.amount / totalAmount * 100).toFixed(1);
        return '<tr class="border-t hover:bg-gray-50"><td class="px-4 py-2 font-medium">' + escapeHtml(name) + '</td><td class="px-4 py-2 text-right">' + d.orders + '</td><td class="px-4 py-2 text-right">' + utils.formatMoney(d.amount) + '</td><td class="px-4 py-2 text-right"><div class="inline-block w-16 bg-gray-200 rounded-full h-2 mr-2 align-middle"><div class="bg-blue-600 rounded-full h-2" style="width:' + pct + '%"></div></div><span class="text-xs">' + pct + '%</span></td></tr>';
    }).join('');

    var canvas = document.getElementById('supplier-chart');
    if (!canvas || suppliers.length === 0) return;
    var ctx = canvas.getContext('2d');
    var width = canvas.parentElement.clientWidth - 48;
    var height = 200;
    canvas.width = width; canvas.height = height;

    var colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    var cx = width / 2, cy = height / 2, r = Math.min(cx - 10, cy - 10);
    var startAngle = -Math.PI / 2;

    suppliers.forEach(function(name, i) {
        var sliceAngle = (supMap[name].amount / totalAmount) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length]; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        startAngle += sliceAngle;
    });
}

async function exportReport() {
    var range = getDateRange();
    var data = [];
    data.push({ '指标': '统计周期', '数值': utils.formatDate(range.start) + ' ~ ' + utils.formatDate(range.end) });

    var menus = (await db.get('weekly_menus')).filter(function(m) { return m.date >= utils.formatDate(range.start) && m.date <= utils.formatDate(range.end); });
    var totalDiners = menus.reduce(function(s, m) { return s + (m.total_diners || 0); }, 0);
    var dishes = await db.get('dishes');
    var totalSales = 0;
    menus.forEach(function(m) {
        Object.values(m.meals).forEach(function(meal) {
            meal.forEach(function(d) {
                var dish = dishes.find(function(dd) { return dd.id === d.dish_id; });
                if (dish) totalSales += dish.price * (d.estimated_diners || 0);
            });
        });
    });
    var orders = (await db.get('purchase_orders')).filter(function(p) { return p.date >= utils.formatDate(range.start) && p.date <= utils.formatDate(range.end); });
    var totalCost = orders.reduce(function(s, p) { return s + p.total_amount; }, 0);

    data.push({ '指标': '就餐总人次', '数值': totalDiners });
    data.push({ '指标': '总营业额', '数值': totalSales.toFixed(2) });
    data.push({ '指标': '总采购成本', '数值': totalCost.toFixed(2) });
    data.push({ '指标': '利润', '数值': (totalSales - totalCost).toFixed(2) });
    data.push({ '指标': '人均消费', '数值': totalDiners > 0 ? (totalSales / totalDiners).toFixed(2) : '0' });

    utils.exportToExcel(data, '经营分析报表');
    utils.showMessage('报表已导出');
}
