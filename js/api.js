var API_BASE = window.location.origin + '/api';

var _cache = {};

function getToken() {
    return localStorage.getItem('canteen_token');
}

function setToken(token) {
    localStorage.setItem('canteen_token', token);
}

function removeToken() {
    localStorage.removeItem('canteen_token');
}

function getUser() {
    var data = localStorage.getItem('canteen_user');
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

function setUser(user) {
    localStorage.setItem('canteen_user', JSON.stringify(user));
}

function checkAuth() {
    if (!getToken()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

async function apiRequest(method, path, body) {
    var headers = {
        'Content-Type': 'application/json'
    };
    var token = getToken();
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    var options = {
        method: method,
        headers: headers
    };
    if (body !== undefined && body !== null) {
        options.body = JSON.stringify(body);
    }
    var response = await fetch(API_BASE + path, options);
    if (response.status === 401) {
        removeToken();
        localStorage.removeItem('canteen_user');
        window.location.href = 'login.html';
        return;
    }
    if (!response.ok) {
        var errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { message: '请求失败: ' + response.status };
        }
        throw new Error(errorData.message || '请求失败');
    }
    if (response.status === 204) {
        return null;
    }
    return await response.json();
}

function mapKey(key) {
    var mapping = {
        'weekly_menus': 'menus',
        'purchase_orders': 'purchase-orders',
        'stock_flows': 'stock-flows'
    };
    return mapping[key] || key;
}

function serializeItem(key, item) {
    if (!item || typeof item !== 'object') return item;
    var cloned = JSON.parse(JSON.stringify(item));
    var jsonFields = ['ingredients', 'meals', 'items', 'category', 'supplier_ids', 'approval_history', 'stock_in_history'];
    jsonFields.forEach(function (field) {
        if (cloned[field] !== undefined && cloned[field] !== null && typeof cloned[field] !== 'string') {
            cloned[field] = JSON.stringify(cloned[field]);
        }
    });
    return cloned;
}

var db = {
    _cacheTTL: 5000,

    async get(key) {
        var now = Date.now();
        if (_cache[key] && (now - _cache[key].timestamp) < this._cacheTTL) {
            return _cache[key].data;
        }
        var apiPath = '/' + mapKey(key);
        var result = await apiRequest('GET', apiPath);
        if (key === 'settings') {
            _cache[key] = { data: result || {}, timestamp: now };
            return result || {};
        }
        var data = Array.isArray(result) ? result : (result && result.data ? result.data : []);
        _cache[key] = { data: data, timestamp: now };
        return data;
    },

    async add(key, item) {
        _cache = {};
        var serialized = serializeItem(key, item);
        var apiPath = '/' + mapKey(key);
        var result = await apiRequest('POST', apiPath, serialized);
        return result;
    },

    async update(key, id, item) {
        _cache = {};
        var serialized = serializeItem(key, item);
        var apiPath = '/' + mapKey(key) + '/' + id;
        var result = await apiRequest('PUT', apiPath, serialized);
        return result;
    },

    async delete(key, id) {
        _cache = {};
        var apiPath = '/' + mapKey(key) + '/' + id;
        var result = await apiRequest('DELETE', apiPath);
        return result;
    },

    async set(key, data) {
        _cache = {};
        var apiPath = '/' + mapKey(key);
        var result = await apiRequest('PUT', apiPath, data);
        return result;
    },

    hashPassword(pwd) {
        var hash = 0;
        for (var i = 0; i < pwd.length; i++) {
            var char = pwd.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'h_' + Math.abs(hash).toString(36);
    },

    async initData() {
    }
};

function logout() {
    if (confirm('确定要退出登录吗？')) {
        removeToken();
        localStorage.removeItem('canteen_user');
        window.location.href = 'login.html';
    }
}
