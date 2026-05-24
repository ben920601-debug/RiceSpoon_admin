// js/auth.js

(function() {
    // ⚠️ 請確保這裏是你最新部署、能撈取「人事名冊」分頁的 GAS 網址！
    const AUTH_GAS_URL = "https://script.google.com/macros/s/AKfycbyj0LZVFv9e7cp8Fn8guntnYNy78Dw7USlZ8gM3fJLag_ERtghpNlvNu9x6EtBfBDsB/exec";

    let globalStaffData = []; // 儲存從雲端下載的職員包

    // 取得目前身處的 HTML 檔名
    const currentFile = window.location.pathname.split("/").pop();

    // ==================== 🛡️ 防火牆一：全域非法偷跑攔截機制 ====================
    window.checkSystemAccessAuth = function() {
        const loggedInUser = localStorage.getItem("current_cashier_code");
        
        if (currentFile === "index.html" || currentFile === "") {
            if (loggedInUser) {
                window.location.href = "dashboard.html";
            }
            return;
        }

        // 💡 核心防線：如果不是在登入頁，且發現 localStorage 是空的（未登入），立刻強制踢回首頁
        if (!loggedInUser) {
            alert("🔒 偵測到未授權存取！請先進行員工身分驗證。");
            window.location.href = "index.html";
        }
    }

    // ==================== 🌐 登入頁：主動去雲端載入員工選單 ====================
    function loadStaffSelectOptions() {
        const selectElement = document.getElementById("login-staff-select");
        if (!selectElement) return; // 如果在收銀頁，就不用抓選單了

        fetch(`${AUTH_GAS_URL}?action=get_staff`)
        .then(res => res.json())
        .then(data => {
            if (data.error || !Array.isArray(data)) {
                selectElement.innerHTML = `<option value="" disabled>❌ 雲端名冊載入異常</option>`;
                return;
            }

            globalStaffData = data;
            
            // 填入下拉選單
            selectElement.innerHTML = `<option value="" disabled selected>👤 請指派您的員工身分...</option>` + 
                data.map(s => `<option value="${s.code}">[${s.code}] ${s.name} - (${s.role})</option>`).join('');
        })
        .catch(err => {
            console.error("人事名冊拉取失敗:", err);
            if (selectElement) {
                selectElement.innerHTML = `<option value="" disabled>❌ 網路連線失敗</option>`;
            }
        });
    }

    // ==================== 🔑 登入頁：點擊按鈕執行驗證 ====================
    window.handleLoginExecute = function(event) {
        event.preventDefault();

        const selectElement = document.getElementById("login-staff-select");
        const passwordInput = document.getElementById("login-password");
        const errorMsg = document.getElementById("login-error-msg");
        const submitBtn = document.getElementById("login-submit-btn");

        if (!selectElement.value || !passwordInput.value.trim()) return;

        const selectedCode = selectElement.value;
        const enteredPassword = passwordInput.value.trim();

        // 尋找對應的職員
        const matchedStaff = globalStaffData.find(s => s.code === selectedCode);

        if (matchedStaff && matchedStaff.password === enteredPassword) {
            // 💡 驗證通過：將登入狀態永久封裝進瀏覽器 localStorage
            localStorage.setItem("current_cashier_code", matchedStaff.code);
            localStorage.setItem("current_cashier_name", matchedStaff.name);
            localStorage.setItem("current_cashier_role", matchedStaff.role);

            if (errorMsg) errorMsg.style.display = "none";
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 授權成功，正在解鎖主機...`;

            // 💡 核心跳轉：順暢導向到點餐首頁！
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 500);

        } else {
            // 驗證失敗
            if (errorMsg) {
                errorMsg.style.display = "flex";
                passwordInput.value = ""; // 清空密碼
                passwordInput.focus();
            }
        }
    }

    // ==================== 🚪 全系統通用：員工登出鎖定機制 ====================
    window.handleLogout = function() {
        if (confirm("確定要登出系統並鎖定收銀主機嗎？")) {
            // 清除所有的本地快取狀態
            localStorage.removeItem("current_cashier_code");
            localStorage.removeItem("current_cashier_name");
            localStorage.removeItem("current_cashier_role");
            
            // 💡 踢回獨立登入頁
            window.location.href = "index.html";
        }
    }

    // 🚀 一開機就啟動安全過濾網
    window.checkSystemAccessAuth();
    
    document.addEventListener("DOMContentLoaded", () => {
        loadStaffSelectOptions();
        
        // 順便同步秀出右上角的人名（如果在後台收銀各頁面的話）
        const nameDisplay = document.getElementById("cashier-name");
        if (nameDisplay) {
            const code = localStorage.getItem("current_cashier_code");
            const name = localStorage.getItem("current_cashier_name");
            const role = localStorage.getItem("current_cashier_role");
            nameDisplay.innerText = `${role}：[${code}] ${name}`;
        }
    });

})();