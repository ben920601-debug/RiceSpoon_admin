// js/dashboard.js
// 🌾 飯匙 POS 系統 - 管理後台控制中心 (前後台功能全解鎖完美對接版)

(function() {
    // 本地資料暫存庫
    let localOrdersList = [];
    let localStaffList = [];
    let localProductsList = [];

    // ==================== 🛡️ 權限與登入狀態防線 ====================
    window.checkSystemAccessAuth = function() {
        const loggedInUser = localStorage.getItem("current_cashier_code");
        const loggedInRole = localStorage.getItem("current_cashier_role");
        
        if (!loggedInUser) {
            alert("🔒 偵測到未授權存取！請先進行員工身分驗證。");
            window.location.href = "index.html";
            return;
        }

        if (loggedInRole === "店員") {
            alert("⚠️ 權限不足！此管理系統僅限【店長】存取。");
            localStorage.removeItem("current_cashier_code");
            localStorage.removeItem("current_cashier_name");
            localStorage.removeItem("current_cashier_role");
            window.location.href = "index.html";
            return; 
        }
    }

    function syncAdminHeaderName() {
        const nameDisplay = document.getElementById("cashier-name");
        if (nameDisplay) {
            const code = localStorage.getItem("current_cashier_code");
            const name = localStorage.getItem("current_cashier_name");
            const role = localStorage.getItem("current_cashier_role");
            nameDisplay.innerText = `管理者：[${code}] ${name} (${role})`;
        }
    }

    // ==================== 📊 模組一：今日明細 (Orders) ====================
    window.fetchCloudOrders = function() {
        const tableBody = document.getElementById("orders-table-body");
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> 正在拉取交易看板...</td></tr>`;

        fetch(`${API_BASE_URL}/orders`)
        .then(res => { if (!res.ok) throw new Error("讀取訂單失敗"); return res.json(); })
        .then(data => {
            localOrdersList = Array.isArray(data) ? data : [];
            renderOrdersTable();
            calculateKpiSummary(); 
        })
        .catch(error => {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:20px;">❌ 無法同步交易明細</td></tr>`;
        });
    }

    function renderOrdersTable() {
        const tableBody = document.getElementById("orders-table-body");
        if (!tableBody) return;

        if (localOrdersList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:50px;">📭 今日目前尚無任何交易紀錄</td></tr>`;
            return;
        }

        tableBody.innerHTML = localOrdersList.map(order => {
            let displayTime = order.orderTime || order.OrderTime || "未知時間";
            if (typeof displayTime === "string") displayTime = displayTime.replace("T", " ").substring(0, 19);
            return `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="color: var(--text-muted); font-size: 0.85rem; font-family: monospace;">${displayTime}</td>
                    <td style="font-weight: 600; font-family: monospace;">${order.orderId || order.OrderId}</td>
                    <td style="color: #4b5563;"><i class="fa-regular fa-user" style="font-size:0.85rem; margin-right:4px; color: var(--primary);"></i> ${order.cashier || order.Cashier || order.CashierName || '系統端'}</td>
                    <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${order.details || order.Details || '點擊查閱明細'}</td>
                    <td style="font-weight: 700; color: var(--primary); font-size: 1.05rem; font-family: monospace; text-align: right; padding-right: 20px;">$${order.totalAmount ?? order.TotalAmount ?? 0}</td>
                </tr>
            `;
        }).join('');
    }

    // ==================== 👥 模組二：人事管理 (Personnel) ====================
    window.fetchCloudStaff = function() {
        const tableBody = document.getElementById("staff-table-body");
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> 讀取最新人事名冊...</td></tr>`;

        fetch(`${API_BASE_URL}/staff`)
        .then(res => { if (!res.ok) throw new Error("讀取人事失敗"); return res.json(); })
        .then(data => {
            localStaffList = Array.isArray(data) ? data : [];
            renderStaffTable();
            calculateKpiSummary();
        })
        .catch(() => {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:20px;">❌ 人事資料拉取失敗</td></tr>`;
        });
    }

    function renderStaffTable() {
        const tableBody = document.getElementById("staff-table-body");
        if (!tableBody) return;

        if (localStaffList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:40px;">📭 目前無員工資料</td></tr>`;
            return;
        }

        tableBody.innerHTML = localStaffList.map(staff => {
            const sCode = staff.staffCode || staff.StaffCode || staff.code || '';
            const sName = staff.staffName || staff.StaffName || staff.name || '';
            const sRole = staff.role || staff.Role || '店員';
            
            // 💡 為了相容修正與傳輸，將密碼也帶出來，沒有就預設空字串
            const sPwd = staff.password || staff.Password || ''; 

            return `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="font-weight: 600; color: var(--primary); font-family: monospace;">${sCode}</td>
                    <td style="font-weight: 500;">${sName}</td>
                    <td><span style="background: #f3f4f6; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">${sRole}</span></td>
                    <td style="color: var(--text-muted); font-family: monospace;">•••••</td>
                    <td style="text-align: center;">
                        <button onclick="openEditStaffModal('${sCode}', '${sName}', '${sPwd}', '${sRole}')" style="background: transparent; border: none; color: #3b82f6; cursor: pointer; font-size: 1.05rem; margin-right: 12px;" title="修正員工資料">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="handleDeleteStaffExecute('${sCode}')" style="background: transparent; border: none; color: var(--danger); cursor: pointer; font-size: 1.05rem;" title="註銷員工">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 💡 完美解鎖：實作「新增與修正員工」表單提交動作 (對齊後端 POST api/Admin/staff)
    window.handleCreateStaff = function(event) {
        event.preventDefault();

        const codeInput = document.getElementById("staff-code");
        const nameInput = document.getElementById("staff-name");
        const passwordInput = document.getElementById("staff-password");
        const roleSelect = document.getElementById("staff-role");
        const btn = document.getElementById("add-staff-btn");

        if (!codeInput || !nameInput || !passwordInput || !codeInput.value.trim() || !nameInput.value.trim() || !passwordInput.value.trim()) {
            alert("⚠️ 欄位皆為必填項目！");
            return;
        }

        if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 儲存中...`; }

        const payload = {
            StaffCode: codeInput.value.trim(),
            StaffName: nameInput.value.trim(),
            Password: passwordInput.value.trim(),
            Role: roleSelect ? roleSelect.value : "店員"
        };

        fetch(`${API_BASE_URL}/staff`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => { if (!res.ok) throw new Error("後端資料庫拒絕處理"); return res.json(); })
        .then(() => {
            alert("🎉 員工名冊更新成功！");
            window.closeAddModal();
            window.fetchCloudStaff(); // 即時重整人事
        })
        .catch(err => alert(`❌ 儲存失敗：${err.message}`))
        .finally(() => {
            if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-plus"></i> 加入員工`; }
        });
    }

    // 💡 完美解鎖：實作「修正員工」時的資料帶入與彈窗開啟
    window.openEditStaffModal = function(code, name, pwd, role) {
        window.openAddModal();
        
        const codeInput = document.getElementById("staff-code");
        const nameInput = document.getElementById("staff-name");
        const passwordInput = document.getElementById("staff-password");
        const roleSelect = document.getElementById("staff-role");

        if (codeInput) { codeInput.value = code; codeInput.readOnly = true; style = "background:#f3f4f6;"; } // 修正時代碼限制唯讀
        if (nameInput) nameInput.value = name;
        if (passwordInput) passwordInput.value = pwd;
        if (roleSelect) roleSelect.value = role;
        
        const btn = document.getElementById("add-staff-btn");
        if (btn) btn.innerHTML = `<i class="fa-solid fa-check"></i> 確認修改`;
    }

    // 💡 完美解鎖：實作「註銷員工」 (對齊後端 DELETE api/Admin/staff/{code})
    window.handleDeleteStaffExecute = function(code) {
        if (!confirm(`⚠️ 確定要從資料庫完全註銷編號為 [ ${code} ] 的員工嗎？`)) return;

        fetch(`${API_BASE_URL}/staff/${code}`, { method: "DELETE" })
        .then(res => { if (!res.ok) throw new Error("後端拒絕註銷"); return res.json(); })
        .then(() => {
            alert("🗑️ 員工已順利註銷移除！");
            window.fetchCloudStaff();
        })
        .catch(err => alert(`❌ 註銷失敗：${err.message}`));
    }


    // ==================== 🛒 模組三：商品管理 (Products) ====================
    window.fetchManagerProductsSelf = function() {
        const tableBody = document.getElementById("manager-product-table");
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> 正在拉取雲端菜單...</td></tr>`;

        fetch(`${API_BASE_URL}/products`)
        .then(res => { if (!res.ok) throw new Error("無法讀取商品"); return res.json(); })
        .then(data => {
            localProductsList = Array.isArray(data) ? data : [];
            renderProductsUI();
        })
        .catch(err => {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--danger); padding:20px;">❌ 無法同步商品清單 (${err.message})</td></tr>`;
        });
    }

    function renderProductsUI() {
        const tableBody = document.getElementById("manager-product-table");
        if (!tableBody) return;

        if (localProductsList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:40px;">📭 目前無任何上架商品</td></tr>`;
            return;
        }

        tableBody.innerHTML = localProductsList.map(prod => {
            const pId = prod.id ?? prod.Id ?? '??';
            const pName = prod.name || prod.Name || '未命名品項';
            const pPrice = prod.price ?? prod.Price ?? 0;
            return `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="font-family: monospace; color: var(--text-muted); padding: 14px 10px;">#${pId}</td>
                    <td style="font-weight: 600; padding: 14px 10px;">${pName}</td>
                    <td style="font-weight: 700; color: var(--primary); font-family: monospace; padding: 14px 10px;">$${pPrice}</td>
                    <td style="text-align: center; padding: 14px 10px;">
                        <button onclick="handleDeleteProductExecute('${pId}')" style="background: transparent; border: none; color: var(--danger); cursor: pointer;" title="下架移除商品">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 💡 完美解鎖：實作「商品下架刪除」 (對齊後端 DELETE api/Admin/products/{id})
    window.handleDeleteProductExecute = function(id) {
        if (!confirm(`確定要將代碼為 [ #${id} ] 的品項從選單永久下架移除嗎？`)) return;

        fetch(`${API_BASE_URL}/products/${id}`, { method: "DELETE" })
        .then(res => { if (!res.ok) throw new Error("下架失敗"); return res.json(); })
        .then(() => {
            alert("🗑️ 商品已成功下架！");
            window.fetchManagerProductsSelf(); // 即時重整商品
        })
        .catch(err => alert(`❌ 移除失敗：${err.message}`));
    }

    // 新增商品表單提交事件
    window.handleCreateProduct = function(event) {
        event.preventDefault();

        const nameInput = document.getElementById("new-prod-name");
        const priceInput = document.getElementById("new-prod-price");

        if (!nameInput || !priceInput || !nameInput.value.trim() || !priceInput.value.trim()) {
            alert("⚠️ 商品名稱與價格為必填欄位！");
            return;
        }

        const btn = document.getElementById("add-product-btn");
        if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 寫入中...`; }

        const payload = {
            Name: nameInput.value.trim(),
            name: nameInput.value.trim(),
            Price: parseFloat(priceInput.value),
            price: parseFloat(priceInput.value),
            Category: "一般商品"
        };

        fetch(`${API_BASE_URL}/products`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) throw new Error("後端伺服器拒絕新增品項");
            return res.json();
        })
        .then(() => {
            alert("🎉 商品已成功上架！");
            nameInput.value = ""; 
            priceInput.value = "";
            window.fetchManagerProductsSelf(); 
        })
        .catch(err => {
            alert(`❌ 新增商品失敗：${err.message}`);
        })
        .finally(() => {
            if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-plus"></i> 加入商品`; }
        });
    }

    // Modal 彈窗控制
    window.openAddModal = function() { document.getElementById("addModal").classList.add("active"); }
    window.closeAddModal = function() { 
        document.getElementById("addModal").classList.remove("active"); 
        // 關閉時重製員工表單狀態
        const codeInput = document.getElementById("staff-code");
        if (codeInput) { codeInput.value = ""; codeInput.readOnly = false; codeInput.style = ""; }
        if (document.getElementById("staff-name")) document.getElementById("staff-name").value = "";
        if (document.getElementById("staff-password")) document.getElementById("staff-password").value = "";
        const btn = document.getElementById("add-staff-btn");
        if (btn) btn.innerHTML = `<i class="fa-solid fa-plus"></i> 加入員工`;
    }

    // ==================== 🔄 模組四：同步中心 ====================
    window.refreshDashboardData = function() {
        const refreshBtnIcon = document.querySelector(".btn-refresh-trigger i");
        if (refreshBtnIcon) refreshBtnIcon.classList.add("fa-spin");

        window.fetchCloudOrders();
        window.fetchCloudStaff();
        window.fetchManagerProductsSelf();

        setTimeout(() => { if (refreshBtnIcon) refreshBtnIcon.classList.remove("fa-spin"); }, 1200);
    }

    function calculateKpiSummary() {
        let totalRevenue = 0;
        localOrdersList.forEach(order => { totalRevenue += (Number(order.totalAmount || order.TotalAmount) || 0); });
        
        const revenueElement = document.getElementById("kpi-revenue");
        const ordersElement = document.getElementById("kpi-orders");
        const staffElement = document.getElementById("kpi-staff");
        
        if (revenueElement) revenueElement.innerText = `$${totalRevenue}`;
        if (ordersElement) ordersElement.innerText = `${localOrdersList.length} 單`;
        if (staffElement) staffElement.innerText = `${localStaffList.length} 人`;
    }

    window.handleLogout = function() {
        if (confirm("確定要登出管理系統嗎？")) {
            localStorage.removeItem("current_cashier_code");
            localStorage.removeItem("current_cashier_name");
            localStorage.removeItem("current_cashier_role");
            window.location.href = "index.html";
        }
    }

    // ==================== 🚀 開機程序 ====================
    window.checkSystemAccessAuth();

    document.addEventListener("DOMContentLoaded", () => {
        syncAdminHeaderName();
        window.fetchCloudOrders();
        window.fetchCloudStaff();
        window.fetchManagerProductsSelf();

        // 💡 完美解鎖：動態幫「新增/修正員工」表單綁定 submit 攔截事件
        const staffForm = document.getElementById("staff-form") || document.querySelector("#addModal form");
        if (staffForm) {
            staffForm.addEventListener("submit", window.handleCreateStaff);
        }
    });
})();