// js/auth.js
// 🌾 飯匙 POS 系統 - 前端認證模組 (手動輸入代號 + 詳細資料庫錯誤回報版)

(function() {
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

        if (!loggedInUser) {
            alert("🔒 偵測到未授權存取！請先進行店長身分驗證。");
            window.location.href = "index.html";
        }
    }

    // ==================== 🔑 登入頁：點擊按鈕執行驗證 ====================
    window.handleLoginExecute = function(event) {
        event.preventDefault();

        // 💡 精確抓取改版後的文字輸入框 (login-staff-code)
        const codeInput = document.getElementById("login-staff-code");
        const passwordInput = document.getElementById("login-password");
        const errorMsg = document.getElementById("login-error-msg");
        const submitBtn = document.getElementById("login-submit-btn");

        if (!codeInput || !passwordInput || !codeInput.value.trim() || !passwordInput.value.trim()) {
            alert("請填寫員工代號與密碼");
            return;
        }

        const enteredCode = codeInput.value.trim();
        const enteredPassword = passwordInput.value.trim();

        if (errorMsg) {
            errorMsg.style.display = "none";
            errorMsg.style.whiteSpace = "pre-line"; // 讓 C# 回傳的換行 \n 能在網頁上正常換行
        }

        // 💡 呼叫 C# 後端 AdminController 的 login 路由 (自動抓取 config.js 的 /api/Admin)
        fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                StaffCode: enteredCode,
                Password: enteredPassword
            })
        })
        .then(async res => {
            const contentType = res.headers.get("content-type");
            let errorDetail = "";

            // 判斷後端回傳的是 JSON 錯誤訊息，還是整頁崩潰的 HTML 網頁
            if (contentType && contentType.includes("application/json")) {
                const errData = await res.json();
                errorDetail = errData.message || errData.Message || "未知的內部錯誤";
            } else {
                const rawText = await res.text();
                errorDetail = `系統回傳非安全格式 (可能是 C# 端路由錯誤或 404 網頁)。\n摘要: ${rawText.substring(0, 120)}...`;
            }

            if (res.ok) {
                // 成功的話，把正確的 user 資料往下一層 .then 傳遞
                return JSON.parse(JSON.stringify(errorDetail === "" ? {} : errorDetail));
            }

            // 狀態碼不是 200 時（如 401, 403, 500），拋出剛才抓到的詳細錯誤
            throw new Error(errorDetail);
        })
        .then(user => {
            // 驗證通過：將登入狀態寫入 localStorage 快取
            localStorage.setItem("current_cashier_code", user.staffCode || enteredCode);
            localStorage.setItem("current_cashier_name", user.name || "管理者");
            localStorage.setItem("current_cashier_role", user.role || "店長");

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 授權成功，正在解鎖主機...`;
            }

            // 順暢導向到管理後台
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 500);
        })
        .catch(err => {
            console.error("[飯匙系統登入失敗日誌]:", err);
            if (errorMsg) {
                errorMsg.style.display = "flex";
                // 💡 把詳細的資料庫或連線錯誤直接噴在紅色提示框內
                errorMsg.innerText = err.message;
            }
        });
    }

    // ==================== 🚪 全系統通用：員工登出鎖定機制 ====================
    window.handleLogout = function() {
        if (confirm("確定要登出系統並鎖定收銀主機嗎？")) {
            localStorage.removeItem("current_cashier_code");
            localStorage.removeItem("current_cashier_name");
            localStorage.removeItem("current_cashier_role");
            window.location.href = "index.html";
        }
    }

    // 🚀 啟動安全過濾網
    window.checkSystemAccessAuth();

})();