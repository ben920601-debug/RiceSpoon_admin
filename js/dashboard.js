// js/dashboard.js
// 🌾 飯匙雲端POS系統 - 獨立管理後台專用核心控制中心 (電鍋工作室研發)

(function() {
    // ⚠️ 請精準替換成你目前最新部署好的 GAS 網址（尾巴必須有 /exec）！
    const ADMIN_GAS_URL = "https://script.google.com/macros/s/AKfycbyj0LZVFv9e7cp8Fn8guntnYNy78Dw7USlZ8gM3fJLag_ERtghpNlvNu9x6EtBfBDsB/exec";

    // 本地資料暫存庫，用來即時統計頂部 KPI 指標
    let localOrdersList = [];
    let localProductsList = [];
    let localStaffList = [];

    // ==================== 🛡️ 權限與登入狀態防線 ====================
    window.checkSystemAccessAuth = function() {
        const loggedInUser = localStorage.getItem("current_cashier_code");
        const loggedInRole = localStorage.getItem("current_cashier_role");
        
        // 核心防線一：未授權登入直接踢回首頁
        if (!loggedInUser) {
            alert("🔒 偵測到未授權存取！請先進行員工身分驗證。");
            window.location.href = "index.html";
            return;
        }

        // 核心防線二：最高權限控管，若是「店員」意圖強行進入，清除狀態、強制登出並遣返登入首頁
        if (loggedInRole === "店員") {
            alert("⚠️ 權限不足！此管理系統僅限【店長】存取。");
            
            // 💡 關鍵安全防線：精準清除瀏覽器中儲存的員工登入狀態快取
            localStorage.removeItem("current_cashier_code");
            localStorage.removeItem("current_cashier_name");
            localStorage.removeItem("current_cashier_role");
            
            // 踢回最獨立的登入畫面
            window.location.href = "index.html";
            return; 
        }
    }

    // 同步顯示右上角正在登入的管理店長姓名
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

        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> 正在連線雲端資料庫，拉取最新交易看板...</td></tr>`;

        fetch(`${ADMIN_GAS_URL}?action=get_orders`)
        .then(response => response.json())
        .then(data => {
            if (data && data.error) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:20px;">❌ 雲端異常: ${data.error}</td></tr>`;
                return;
            }
            // 最新結帳的明細排序在最上面
            localOrdersList = Array.isArray(data) ? data.reverse() : [];
            renderOrdersTable();
            calculateKpiSummary(); // 聯動計算 KPI
        })
        .catch(error => {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:20px;">❌ 無法同步雲端交易明細</td></tr>`;
        });
    }

    function renderOrdersTable() {
        const tableBody = document.getElementById("orders-table-body");
        if (!tableBody) return;

        if (localOrdersList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:50px;">📭 今日目前尚無任何交易扣款紀錄</td></tr>`;
            return;
        }

        tableBody.innerHTML = localOrdersList.map(order => {
            let displayTime = order.timestamp;
            if (typeof order.timestamp === "string") {
                displayTime = order.timestamp.replace("T", " ").replace(".000Z", "");
            }
            return `
                <tr style="border-bottom: 1px solid var(--border); transition: background 0.15s;">
                    <td style="color: var(--text-muted); font-size: 0.85rem; font-family: monospace;">${displayTime}</td>
                    <td style="font-weight: 600; font-family: monospace;">${order.id}</td>
                    <td style="color: #4b5563;"><i class="fa-regular fa-user" style="font-size:0.85rem; margin-right:4px; color: var(--primary);"></i> ${order.cashier}</td>
                    <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${order.details}">${order.details}</td>
                    <td style="font-weight: 700; color: var(--primary); font-size: 1.05rem; font-family: monospace; text-align: right; padding-right: 20px;">$${order.total}</td>
                </tr>
            `;
        }).join('');
    }

    // ==================== 📦 模組二：商品管理 (Products) ====================
    window.fetchManagerProductsSelf = function() {
        const tableBody = document.getElementById("manager-product-table");
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> 正在自主連線雲端菜單...</td></tr>`;

        fetch(`${ADMIN_GAS_URL}?action=get_products`)
        .then(response => response.json())
        .then(data => {
            localProductsList = Array.isArray(data) ? data : [];
            renderProductsTable();
        })
        .catch(error => {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--danger); padding:20px;">❌ 無法同步雲端菜單數據</td></tr>`;
        });
    }

    function renderProductsTable() {
        const tableBody = document.getElementById("manager-product-table");
        if (!tableBody) return;

        if (localProductsList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:40px;">📭 目前雲端試算表菜單無任何商品</td></tr>`;
            return;
        }

        tableBody.innerHTML = localProductsList.map(p => `
            <tr style="border-bottom: 1px solid var(--border); transition: background 0.15s;">
                <td style="color: var(--text-muted); font-family: monospace;">#${String(p.id).padStart(3, '0')}</td>
                <td style="font-weight: 500;">${p.name}</td>
                <td style="color: var(--primary); font-weight: 600;">$${p.price}</td>
                <td style="text-align: center;">
                    <button onclick="handleDeleteProduct(${p.id})" style="background: transparent; border: none; color: var(--danger); cursor: pointer; font-size: 1.05rem;" title="將此品項從雲端刪除">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    window.handleCreateProduct = function(event) {
        event.preventDefault();
        const nameInput = document.getElementById("new-prod-name");
        const priceInput = document.getElementById("new-prod-price");
        const submitBtn = document.getElementById("add-product-btn"); 

        if (!nameInput || !priceInput || !submitBtn) return;
        const nextId = localProductsList.length > 0 ? Math.max(...localProductsList.map(p => p.id)) + 1 : 1;

        const payload = { action: "add_product", id: nextId, name: nameInput.value.trim(), price: parseInt(priceInput.value) };

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 上傳中...`;

        fetch(ADMIN_GAS_URL, { method: "POST", mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(() => {
            alert(`🎉 商品【${payload.name}】已成功上架！`);
            nameInput.value = ""; priceInput.value = "";
            window.fetchManagerProductsSelf(); 
        })
        .catch(() => alert("❌ 連線傳輸中斷"))
        .finally(() => { submitBtn.disabled = false; submitBtn.innerHTML = `<i class="fa-solid fa-plus"></i> 加入商品`; });
    }

    window.handleDeleteProduct = function(productId) {
        const prod = localProductsList.find(p => p.id === productId);
        if (!prod) return;

        if (confirm(`確定要將【${prod.name}】從 Google 試算表菜單中永久移除嗎？`)) {
            fetch(ADMIN_GAS_URL, { method: "POST", mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "delete_product", id: productId }) })
            .then(() => {
                alert("🗑️ 商品已從雲端刪除！");
                window.fetchManagerProductsSelf(); 
            });
        }
    }

    // ==================== 👥 模組三：人事管理 (Personnel) ====================
    window.fetchCloudStaff = function() {
        const tableBody = document.getElementById("staff-table-body");
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> 正在連線雲端資料庫，讀取最新人事名冊...</td></tr>`;

        fetch(`${ADMIN_GAS_URL}?action=get_staff`)
        .then(response => response.json())
        .then(data => {
            localStaffList = Array.isArray(data) ? data : [];
            renderStaffTable();
            calculateKpiSummary(); // 聯動計算 KPI
        })
        .catch(() => {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:20px;">❌ 無法連線到雲端資料庫</td></tr>`;
        });
    }

    function renderStaffTable() {
        const tableBody = document.getElementById("staff-table-body");
        if (!tableBody) return;

        if (localStaffList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:40px;">📭 目前雲端無任何員工資料</td></tr>`;
            return;
        }

        tableBody.innerHTML = localStaffList.map(staff => `
            <tr style="border-bottom: 1px solid var(--border); transition: background 0.15s;">
                <td style="font-weight: 600; color: var(--primary); font-family: monospace;">${staff.code}</td>
                <td style="font-weight: 500;">${staff.name}</td>
                <td><span style="background: #f3f4f6; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">${staff.role}</span></td>
                <td style="color: var(--text-muted); font-family: monospace;">•••••</td>
                <td style="text-align: center;">
                    <button onclick="handleDeleteStaff('${staff.code}', '${staff.name}')" style="background: transparent; border: none; color: var(--danger); cursor: pointer; font-size: 1.05rem;" title="註銷此員工帳號">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    window.submitStaffFormAction = function() {
        const code = document.getElementById("staff-code").value.trim().toUpperCase();
        const name = document.getElementById("staff-name").value.trim();
        const password = document.getElementById("staff-password").value.trim();
        const role = document.getElementById("staff-role").value;

        if (!code || !name || !password) {
            alert("⚠️ 所有欄位皆為必填！");
            return;
        }

        const btn = document.getElementById("staff-submit-btn");
        btn.disabled = true; btn.innerHTML = "寫入雲端中...";

        const payload = { action: "add_staff", code, name, password, role };

        fetch(ADMIN_GAS_URL, { method: "POST", mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(() => {
            alert(`🎉 員工【${payload.code}】已成功加入！`);
            window.closeAddModal();   
            window.fetchCloudStaff();
        })
        .finally(() => { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-check"></i> 確認`; });
    };

    window.handleDeleteStaff = function(staffCode, staffName) {
        if (localStorage.getItem("current_cashier_code") === staffCode) {
            alert("❌ 系統防呆：您目前正以此帳號登入管理中，無法進行自我註銷！");
            return;
        }

        if (confirm(`⚠️ 警告！確定要將員工【${staffName}】從名冊中永久移除嗎？`)) {
            fetch(ADMIN_GAS_URL, { method: "POST", mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "delete_staff", code: staffCode }) })
            .then(() => {
                alert(`🗑️ 員工帳號【${staffCode}】已註銷！`);
                window.fetchCloudStaff();
            });
        }
    }

    window.openAddModal = function() { document.getElementById("addModal").classList.add("active"); }
    window.closeAddModal = function() {
        document.getElementById("addModal").classList.remove("active");
        document.getElementById("staff-code").value = "";
        document.getElementById("staff-name").value = "";
        document.getElementById("staff-password").value = "";
    }

    // ==================== 🔄 模組四：全數據統計與強制同步中心 ====================
    window.refreshDashboardData = function() {
        const refreshBtnIcon = document.querySelector(".btn-refresh-trigger i");
        if (refreshBtnIcon) refreshBtnIcon.classList.add("fa-spin");

        const marqueeElement = document.getElementById("system-marquee");
        if (marqueeElement) {
            marqueeElement.innerHTML = `<i class="fa-solid fa-cloud-arrow-down" style="color:#3b82f6;"></i> 正在繞過本地緩衝，向 Google 試算表請求最高權限最新資料...`;
        }

        // 同步發送三個分流請求
        window.fetchCloudOrders();
        window.fetchManagerProductsSelf();
        window.fetchCloudStaff();

        setTimeout(() => {
            if (refreshBtnIcon) refreshBtnIcon.classList.remove("fa-spin");
            if (marqueeElement) {
                marqueeElement.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> ⚡️ 雲端核心數據同步完成！全系統本地儀表板快取已校正歸位。`;
            }
        }, 1200);
    }

    // 💡 精準動態加總：利用本地載入的陣列，快速運算出頂部 KPI 看板數據
    function calculateKpiSummary() {
        // 1. 統計營業總額與單數
        let totalRevenue = 0;
        localOrdersList.forEach(order => {
            totalRevenue += (Number(order.total) || 0);
        });
        document.getElementById("kpi-revenue").innerText = `$${totalRevenue}`;
        document.getElementById("kpi-orders").innerText = `${localOrdersList.length} 單`;

        // 2. 統計在職人數
        document.getElementById("kpi-staff").innerText = `${localStaffList.length} 人`;
    }

    // 全系統安全登出鎖定
    window.handleLogout = function() {
        if (confirm("確定要登出管理系統嗎？")) {
            localStorage.removeItem("current_cashier_code");
            localStorage.removeItem("current_cashier_name");
            localStorage.removeItem("current_cashier_role");
            window.location.href = "index.html";
        }
    }

    // ==================== 🚀 頁面初始化開機程序 ====================
    window.checkSystemAccessAuth();

    document.addEventListener("DOMContentLoaded", () => {
        syncAdminHeaderName();
        
        // 第一次開機自動加載雲端全數據
        window.fetchCloudOrders();
        window.fetchManagerProductsSelf();
        window.fetchCloudStaff();
    });
})();