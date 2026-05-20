document.addEventListener('DOMContentLoaded', async function() {
    loadSidebar('settings.html');
    await loadSettings();
    await loadCategoryList();
    await loadUserList();
    bindEvents();
});

function bindEvents() {
    document.querySelectorAll('#settings-tabs .tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#settings-tabs .tab-btn').forEach(function(b) {
                b.className = 'px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 tab-btn';
            });
            this.className = 'px-6 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600 tab-btn';
            document.querySelectorAll('.tab-content').forEach(function(tc) { tc.classList.add('hidden'); });
            document.getElementById('tab-' + this.dataset.tab).classList.remove('hidden');
        });
    });

    document.getElementById('general-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        var fd = new FormData(this);
        var settings = {};
        fd.forEach(function(v, k) { settings[k] = k === 'cost_alert_threshold' || k === 'low_stock_threshold' || k === 'expire_alert_days' || k === 'data_retention_days' ? parseInt(v) : v; });
        try {
            await db.set('settings', settings);
            utils.showMessage('设置保存成功');
        } catch(err) {
            utils.showMessage('设置保存失败', 'error');
        }
    });

    document.getElementById('add-user-btn').addEventListener('click', openAddUserModal);

    document.getElementById('backup-btn').addEventListener('click', function() {
        var data = {};
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            try { data[key] = JSON.parse(localStorage.getItem(key)); } catch(e) { data[key] = localStorage.getItem(key); }
        }
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'canteen_backup_' + utils.formatDate(new Date()) + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        utils.showMessage('数据备份成功');
    });

    var restoreFile = document.getElementById('restore-file');
    var restoreBtn = document.getElementById('restore-btn');
    restoreFile.addEventListener('change', function() {
        if (this.files.length > 0) { restoreBtn.disabled = false; restoreBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer'; }
        else { restoreBtn.disabled = true; restoreBtn.className = 'bg-gray-300 text-gray-700 px-4 py-2 rounded-md cursor-not-allowed'; }
    });
    restoreBtn.addEventListener('click', function() {
        if (!restoreFile.files[0]) return;
        openModal('确认恢复', '<p>恢复数据将覆盖当前所有数据，确定继续？</p>', function() {
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var data = JSON.parse(e.target.result);
                    Object.keys(data).forEach(function(key) { localStorage.setItem(key, JSON.stringify(data[key])); });
                    utils.showMessage('数据恢复成功，即将刷新页面');
                    setTimeout(function() { location.reload(); }, 1500);
                } catch(err) {
                    utils.showMessage('文件格式错误', 'error');
                }
            };
            reader.readAsText(restoreFile.files[0]);
        });
    });

    document.getElementById('init-demo-btn').addEventListener('click', function() {
        openModal('确认初始化', '<p>初始化演示数据将清除当前所有数据并生成新的演示数据，确定继续？</p>', function() {
            localStorage.clear();
            db.initData();
            utils.showMessage('演示数据初始化成功，即将刷新页面');
            setTimeout(function() { location.reload(); }, 1500);
        });
    });

    document.getElementById('clear-all-btn').addEventListener('click', function() {
        openModal('⚠️ 危险操作', '<p class="text-red-600 font-medium">此操作将永久删除所有数据且不可恢复！</p><p class="mt-2">确定要清除所有数据吗？</p>', function() {
            localStorage.clear();
            utils.showMessage('所有数据已清除');
            setTimeout(function() { location.reload(); }, 1000);
        });
    });
}

async function loadSettings() {
    var settings = await db.get('settings');
    var form = document.getElementById('general-form');
    form.querySelector('[name="canteen_name"]').value = settings.canteen_name || '';
    form.querySelector('[name="cost_alert_threshold"]').value = settings.cost_alert_threshold || 10;
    form.querySelector('[name="low_stock_threshold"]').value = settings.low_stock_threshold || 100;
    form.querySelector('[name="expire_alert_days"]').value = settings.expire_alert_days || 7;
    form.querySelector('[name="data_retention_days"]').value = settings.data_retention_days || 1095;
    form.querySelector('[name="auto_backup_time"]').value = settings.auto_backup_time || '02:00';
}

async function loadUserList() {
    var users = await db.get('users');
    var tbody = document.getElementById('user-list');
    var roleMap = { admin: '管理员', chef: '厨师', purchase: '采购', finance: '财务' };

    tbody.innerHTML = users.map(function(u) {
        return '<tr class="hover:bg-gray-50">' +
            '<td class="px-6 py-4 text-sm text-gray-500">' + escapeHtml(u.id) + '</td>' +
            '<td class="px-6 py-4 text-sm font-medium">' + escapeHtml(u.name) + '</td>' +
            '<td class="px-6 py-4 text-sm">' + escapeHtml(u.username) + '</td>' +
            '<td class="px-6 py-4"><span class="px-2 py-0.5 text-xs rounded-full ' +
                (u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                 u.role === 'chef' ? 'bg-blue-100 text-blue-700' :
                 u.role === 'purchase' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700') +
                '">' + (roleMap[u.role] || u.role) + '</span></td>' +
            '<td class="px-6 py-4 text-sm text-gray-600">' + escapeHtml(u.phone || '-') + '</td>' +
            '<td class="px-6 py-4"><span class="px-2 py-0.5 text-xs rounded-full ' + (u.status === 'enabled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') + '">' + (u.status === 'enabled' ? '正常' : '禁用') + '</span></td>' +
            '<td class="px-6 py-4 text-sm space-x-2">' +
                '<button onclick="editUser(\'' + escapeHtml(u.id) + '\')" class="text-blue-600 hover:text-blue-800"><i class="fas fa-edit"></i> 编辑</button>' +
                '<button onclick="resetPassword(\'' + escapeHtml(u.id) + '\')" class="text-yellow-600 hover:text-yellow-800"><i class="fas fa-key"></i> 重置密码</button>' +
                '<button onclick="deleteUser(\'' + escapeHtml(u.id) + '\')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('');
}

function getUserForm(user) {
    var isEdit = !!user;
    var data = user || {};
    return '<form id="user-form" class="space-y-4">' +
        '<div class="grid grid-cols-2 gap-4">' +
        '<div><label class="block text-sm text-gray-600 mb-1">姓名 <span class="text-red-500">*</span></label><input type="text" name="name" value="' + escapeHtml(data.name || '') + '" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">用户名 <span class="text-red-500">*</span></label><input type="text" name="username" value="' + escapeHtml(data.username || '') + '" ' + (isEdit ? 'readonly' : '') + ' required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ' + (isEdit ? 'bg-gray-100' : '') + '"></div>' +
        (!isEdit ? '<div><label class="block text-sm text-gray-600 mb-1">密码 <span class="text-red-500">*</span></label><input type="password" name="password" value="123456" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"></div>' : '') +
        '<div><label class="block text-sm text-gray-600 mb-1">电话</label><input type="tel" name="phone" value="' + escapeHtml(data.phone || '') + '" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">角色</label><select name="role" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">' +
            '<option value="admin"' + (data.role === 'admin' ? ' selected' : '') + '>管理员</option>' +
            '<option value="chef"' + (data.role === 'chef' ? ' selected' : '') + '>厨师</option>' +
            '<option value="purchase"' + (data.role === 'purchase' ? ' selected' : '') + '>采购</option>' +
            '<option value="finance"' + (data.role === 'finance' ? ' selected' : '') + '>财务</option>' +
        '</select></div>' +
        '<div><label class="block text-sm text-gray-600 mb-1">状态</label><select name="status" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">' +
            '<option value="enabled"' + (data.status === 'enabled' ? ' selected' : '') + '>正常</option>' +
            '<option value="disabled"' + (data.status === 'disabled' ? ' selected' : '') + '>禁用</option>' +
        '</select></div>' +
        '</div></form>';
}

function openAddUserModal() {
    openModal('新增用户', getUserForm(null), async function() {
        try {
            var form = document.getElementById('user-form');
            var fd = new FormData(form);
            var username = fd.get('username');
            var users = await db.get('users');
            if (users.some(function(u) { return u.username === username; })) {
                utils.showMessage('用户名已存在', 'error'); return false;
            }
            await db.add('users', {
                id: utils.generateId('USER'), name: fd.get('name'), username: username,
                password: db.hashPassword(fd.get('password')), phone: fd.get('phone'),
                role: fd.get('role'), status: fd.get('status')
            });
            utils.showMessage('用户新增成功');
            await loadUserList();
        } catch(err) {
            utils.showMessage('操作失败', 'error');
        }
    });
}

async function editUser(id) {
    try {
        var users = await db.get('users');
        var user = users.find(function(u) { return u.id === id; });
        if (!user) return;
        openModal('编辑用户', getUserForm(user), async function() {
            try {
                var form = document.getElementById('user-form');
                var fd = new FormData(form);
                await db.update('users', id, {
                    name: fd.get('name'), phone: fd.get('phone'),
                    role: fd.get('role'), status: fd.get('status')
                });
                utils.showMessage('用户更新成功');
                await loadUserList();
            } catch(err) {
                utils.showMessage('操作失败', 'error');
            }
        });
    } catch(err) {
        utils.showMessage('操作失败', 'error');
    }
}

function resetPassword(id) {
    openModal('重置密码', '<p>确定重置该用户密码为 123456 吗？</p>', async function() {
        try {
            await db.update('users', id, { password: db.hashPassword('123456') });
            utils.showMessage('密码已重置为 123456');
        } catch(err) {
            utils.showMessage('操作失败', 'error');
        }
    });
}

async function deleteUser(id) {
    try {
        var users = await db.get('users');
        if (users.length <= 1) { utils.showMessage('至少保留一个用户', 'error'); return false; }
        var user = users.find(function(u) { return u.id === id; });
        if (!user) return false;
        if (user.username === 'admin') { utils.showMessage('不能删除超级管理员', 'error'); return false; }
        openModal('确认删除', '<p>确定删除用户 <strong>' + escapeHtml(user.name) + '</strong> 吗？</p>', async function() {
            try {
                await db.delete('users', id);
                utils.showMessage('用户已删除');
                await loadUserList();
            } catch(err) {
                utils.showMessage('操作失败', 'error');
            }
        });
    } catch(err) {
        utils.showMessage('操作失败', 'error');
    }
}

async function loadCategoryList() {
    var settings = await db.get('settings');
    var ingCats = settings.ingredient_categories || [];
    var supCats = settings.supplier_categories || [];
    var units = settings.units || [];

    var ingEl = document.getElementById('ingredient-category-list');
    var supEl = document.getElementById('supplier-category-list');
    var unitEl = document.getElementById('unit-list');

    if (ingEl) {
        ingEl.innerHTML = ingCats.map(function(cat, i) {
            return '<div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">' +
                '<span class="text-sm">' + escapeHtml(cat) + '</span>' +
                '<div class="flex items-center space-x-2">' +
                    (i > 0 ? '<button onclick="moveCategory(\'ingredient\',' + i + ',-1)" class="text-gray-400 hover:text-gray-600 text-xs"><i class="fas fa-arrow-up"></i></button>' : '<span class="w-4"></span>') +
                    (i < ingCats.length - 1 ? '<button onclick="moveCategory(\'ingredient\',' + i + ',1)" class="text-gray-400 hover:text-gray-600 text-xs"><i class="fas fa-arrow-down"></i></button>' : '<span class="w-4"></span>') +
                    '<button onclick="editCategory(\'ingredient\',' + i + ')" class="text-blue-600 hover:text-blue-800 text-xs"><i class="fas fa-edit"></i></button>' +
                    '<button onclick="deleteCategory(\'ingredient\',' + i + ')" class="text-red-600 hover:text-red-800 text-xs"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        }).join('') || '<p class="text-sm text-gray-400">暂无分类</p>';
    }

    if (supEl) {
        supEl.innerHTML = supCats.map(function(cat, i) {
            return '<div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">' +
                '<span class="text-sm">' + escapeHtml(cat) + '</span>' +
                '<div class="flex items-center space-x-2">' +
                    (i > 0 ? '<button onclick="moveCategory(\'supplier\',' + i + ',-1)" class="text-gray-400 hover:text-gray-600 text-xs"><i class="fas fa-arrow-up"></i></button>' : '<span class="w-4"></span>') +
                    (i < supCats.length - 1 ? '<button onclick="moveCategory(\'supplier\',' + i + ',1)" class="text-gray-400 hover:text-gray-600 text-xs"><i class="fas fa-arrow-down"></i></button>' : '<span class="w-4"></span>') +
                    '<button onclick="editCategory(\'supplier\',' + i + ')" class="text-blue-600 hover:text-blue-800 text-xs"><i class="fas fa-edit"></i></button>' +
                    '<button onclick="deleteCategory(\'supplier\',' + i + ')" class="text-red-600 hover:text-red-800 text-xs"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        }).join('') || '<p class="text-sm text-gray-400">暂无分类</p>';
    }

    if (unitEl) {
        unitEl.innerHTML = units.map(function(unit, i) {
            return '<div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">' +
                '<span class="text-sm">' + escapeHtml(unit) + '</span>' +
                '<div class="flex items-center space-x-2">' +
                    (i > 0 ? '<button onclick="moveCategory(\'unit\',' + i + ',-1)" class="text-gray-400 hover:text-gray-600 text-xs"><i class="fas fa-arrow-up"></i></button>' : '<span class="w-4"></span>') +
                    (i < units.length - 1 ? '<button onclick="moveCategory(\'unit\',' + i + ',1)" class="text-gray-400 hover:text-gray-600 text-xs"><i class="fas fa-arrow-down"></i></button>' : '<span class="w-4"></span>') +
                    '<button onclick="editCategory(\'unit\',' + i + ')" class="text-blue-600 hover:text-blue-800 text-xs"><i class="fas fa-edit"></i></button>' +
                    '<button onclick="deleteCategory(\'unit\',' + i + ')" class="text-red-600 hover:text-red-800 text-xs"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        }).join('') || '<p class="text-sm text-gray-400">暂无单位</p>';
    }
}

function addCategory(type) {
    var label = type === 'ingredient' ? '食材分类' : type === 'supplier' ? '供应商分类' : '计量单位';
    var content = '<form id="category-form"><div><label class="form-label">' + label + '名称</label><input type="text" name="name" class="form-input" required placeholder="请输入' + label + '名称"></div></form>';
    openModal('添加' + label, content, async function() {
        try {
            var name = document.querySelector('#category-form [name="name"]').value.trim();
            if (!name) { utils.showMessage('请输入名称', 'error'); return false; }
            var settings = await db.get('settings');
            var key = type === 'ingredient' ? 'ingredient_categories' : type === 'supplier' ? 'supplier_categories' : 'units';
            if (!settings[key]) settings[key] = [];
            if (settings[key].indexOf(name) !== -1) { utils.showMessage('该' + label + '已存在', 'error'); return false; }
            settings[key].push(name);
            await db.set('settings', settings);
            utils.showMessage(label + '添加成功');
            await loadCategoryList();
        } catch(err) {
            utils.showMessage('操作失败', 'error');
        }
    });
}

async function editCategory(type, index) {
    try {
        var settings = await db.get('settings');
        var key = type === 'ingredient' ? 'ingredient_categories' : type === 'supplier' ? 'supplier_categories' : 'units';
        var list = settings[key] || [];
        var oldName = list[index];
        var label = type === 'ingredient' ? '食材分类' : type === 'supplier' ? '供应商分类' : '计量单位';
        var content = '<form id="category-form"><div><label class="form-label">' + label + '名称</label><input type="text" name="name" class="form-input" required value="' + escapeHtml(oldName) + '"></div></form>';
        openModal('编辑' + label, content, async function() {
            try {
                var name = document.querySelector('#category-form [name="name"]').value.trim();
                if (!name) { utils.showMessage('请输入名称', 'error'); return false; }
                if (name !== oldName && list.indexOf(name) !== -1) { utils.showMessage('该' + label + '已存在', 'error'); return false; }
                settings[key][index] = name;
                await db.set('settings', settings);
                if (name !== oldName) {
                    await updateCategoryReferences(type, oldName, name);
                }
                utils.showMessage(label + '更新成功');
                await loadCategoryList();
            } catch(err) {
                utils.showMessage('操作失败', 'error');
            }
        });
    } catch(err) {
        utils.showMessage('操作失败', 'error');
    }
}

async function deleteCategory(type, index) {
    try {
        var settings = await db.get('settings');
        var key = type === 'ingredient' ? 'ingredient_categories' : type === 'supplier' ? 'supplier_categories' : 'units';
        var list = settings[key] || [];
        var name = list[index];
        var label = type === 'ingredient' ? '食材分类' : type === 'supplier' ? '供应商分类' : '计量单位';

        if (type === 'ingredient') {
            var ingredients = await db.get('ingredients');
            var usedCount = ingredients.filter(function(ing) { return ing.category === name; }).length;
            if (usedCount > 0) { utils.showMessage('该分类被 ' + usedCount + ' 个食材使用，无法删除', 'error'); return false; }
        } else if (type === 'supplier') {
            var suppliers = await db.get('suppliers');
            var usedCount = suppliers.filter(function(s) { return s.category && s.category.indexOf(name) !== -1; }).length;
            if (usedCount > 0) { utils.showMessage('该分类被 ' + usedCount + ' 个供应商使用，无法删除', 'error'); return false; }
        } else if (type === 'unit') {
            var ingredients = await db.get('ingredients');
            var usedCount = ingredients.filter(function(ing) { return ing.unit === name; }).length;
            if (usedCount > 0) { utils.showMessage('该单位被 ' + usedCount + ' 个食材使用，无法删除', 'error'); return false; }
        }

        openModal('确认删除', '<p>确定删除' + label + ' <strong>' + escapeHtml(name) + '</strong> 吗？</p>', async function() {
            try {
                settings[key].splice(index, 1);
                await db.set('settings', settings);
                utils.showMessage(label + '已删除');
                await loadCategoryList();
            } catch(err) {
                utils.showMessage('操作失败', 'error');
            }
        });
    } catch(err) {
        utils.showMessage('操作失败', 'error');
    }
}

async function moveCategory(type, index, direction) {
    try {
        var settings = await db.get('settings');
        var key = type === 'ingredient' ? 'ingredient_categories' : type === 'supplier' ? 'supplier_categories' : 'units';
        var list = settings[key] || [];
        var newIndex = index + direction;
        if (newIndex < 0 || newIndex >= list.length) return;
        var temp = list[index];
        list[index] = list[newIndex];
        list[newIndex] = temp;
        await db.set('settings', settings);
        await loadCategoryList();
    } catch(err) {
        utils.showMessage('操作失败', 'error');
    }
}

async function updateCategoryReferences(type, oldName, newName) {
    if (type === 'ingredient') {
        var ingredients = await db.get('ingredients');
        var changed = false;
        ingredients.forEach(function(ing) {
            if (ing.category === oldName) {
                ing.category = newName;
                changed = true;
            }
        });
        if (changed) await db.set('ingredients', ingredients);
    } else if (type === 'supplier') {
        var suppliers = await db.get('suppliers');
        var changed = false;
        suppliers.forEach(function(s) {
            if (s.category) {
                var idx = s.category.indexOf(oldName);
                if (idx !== -1) {
                    s.category[idx] = newName;
                    changed = true;
                }
            }
        });
        if (changed) await db.set('suppliers', suppliers);
    } else if (type === 'unit') {
        var ingredients = await db.get('ingredients');
        var changed = false;
        ingredients.forEach(function(ing) {
            if (ing.unit === oldName) {
                ing.unit = newName;
                changed = true;
            }
        });
        if (changed) await db.set('ingredients', ingredients);
    }
}
