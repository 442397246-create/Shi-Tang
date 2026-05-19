document.addEventListener('DOMContentLoaded', function() {
    loadSidebar('index.html');
    loadDashboardData();
    loadWeeklyMenu();
});

function loadDashboardData() {
    const purchaseOrders = db.get('purchase_orders');
    const today = utils.formatDate(new Date());
    const todayPurchase = purchaseOrders
        .filter(p => p.date === today)
        .reduce((sum, p) => sum + p.total_amount, 0);
    document.getElementById('today-purchase').textContent = todayPurchase.toFixed(2);

    const weeklyMenus = db.get('weekly_menus');
    const todayMenu = weeklyMenus.find(m => m.date === today);
    const todayDiners = todayMenu ? todayMenu.total_diners : 0;
    document.getElementById('today-diners').textContent = todayDiners;

    const alertCount = utils.getInventoryAlertCount();
    document.getElementById('inventory-alert').textContent = alertCount;

    const pendingCount = utils.getPendingApprovalCount();
    document.getElementById('pending-approval').textContent = pendingCount;
    
    const alertEl = document.getElementById('alert-count');
    if (alertEl) alertEl.textContent = alertCount + pendingCount;
}

function loadWeeklyMenu() {
    const weeklyMenus = db.get('weekly_menus');
    const tableBody = document.getElementById('weekly-menu-table');
    
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const weekMenus = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = utils.formatDate(date);
        const menu = weeklyMenus.find(m => m.date === dateStr);
        if (menu) weekMenus.push(menu);
    }
    
    if (weekMenus.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    暂无本周菜谱数据
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    weekMenus.forEach(menu => {
        const getMealDishes = (meal) => {
            if (!menu.meals[meal] || menu.meals[meal].length === 0) {
                return '<span class="text-gray-400">未设置</span>';
            }
            return menu.meals[meal].map(d => escapeHtml(d.name)).join('、');
        };

        const todayStr = utils.formatDate(new Date());
        const rowClass = menu.date === todayStr ? 'bg-blue-50' : '';
        
        html += `
            <tr class="${rowClass}">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(menu.date)}</div>
                    ${menu.date === todayStr ? '<span class="text-xs text-blue-600">今日</span>' : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${escapeHtml(menu.week_day)}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${getMealDishes('breakfast')}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${getMealDishes('lunch')}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${getMealDishes('dinner')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${menu.total_diners} 人</td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}
