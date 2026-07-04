using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using RiceSpoon_Admin.Data;
using RiceSpoon_Admin.Models;

namespace RiceSpoon_Admin.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly AdminDbContext _context;

        public AdminController(AdminDbContext context)
        {
            _context = context;
        }

        // ==================== 🔑 模組一：身分驗證與登入 ====================
        [HttpPost("login")]
        public async Task<IActionResult> AdminLogin([FromBody] Staff loginInfo)
        {
            try
            {
                if (_context.Database.GetDbConnection() == null)
                {
                    return StatusCode(500, new { Message = "❌ 資料庫設定異常：無法建立連接物件。" });
                }

                var user = await _context.Staffs.FirstOrDefaultAsync(s => 
                    s.StaffCode == loginInfo.StaffCode && s.Password == loginInfo.Password);

                if (user == null) 
                {
                    return Unauthorized(new { Message = "❌ 認證失敗：帳號或密碼錯誤。" });
                }
                
                if (user.Role != "店長") 
                {
                    return StatusCode(403, new { Message = $"⛔ 權限拒絕：本系統僅限【店長】登入。" });
                }

                return Ok(user);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"💥 資料庫讀取失敗！錯誤原因: {ex.Message}" });
            }
        }

        // ==================== 👥 模組二：人事管理 (Staffs) ====================
        [HttpGet("staff")]
        public async Task<IActionResult> GetStaffs()
        {
            try
            {
                var staffs = await _context.Staffs.ToListAsync();
                return Ok(staffs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"👥 讀取人事名冊失敗: {ex.Message}" });
            }
        }

        [HttpPost("staff")]
        public async Task<IActionResult> SaveOrUpdateStaff([FromBody] Staff staffInfo)
        {
            try
            {
                if (string.IsNullOrEmpty(staffInfo.StaffCode)) return BadRequest(new { Message = "員工編號為必填！" });

                var existingStaff = await _context.Staffs.FirstOrDefaultAsync(s => s.StaffCode == staffInfo.StaffCode);
                if (existingStaff != null)
                {
                    existingStaff.StaffName = staffInfo.StaffName;
                    existingStaff.Password = staffInfo.Password;
                    existingStaff.Role = staffInfo.Role;
                    _context.Staffs.Update(existingStaff);
                }
                else
                {
                    _context.Staffs.Add(staffInfo);
                }

                await _context.SaveChangesAsync();
                return Ok(staffInfo);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"❌ 儲存員工失敗: {ex.Message}" });
            }
        }

        [HttpDelete("staff/{code}")]
        public async Task<IActionResult> DeleteStaff(string code)
        {
            try
            {
                var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.StaffCode == code);
                if (staff == null) return NotFound(new { Message = "找不到該員工" });

                _context.Staffs.Remove(staff);
                await _context.SaveChangesAsync();
                return Ok(new { Success = true, Message = "員工已成功註銷" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"❌ 註銷員工失敗: {ex.Message}" });
            }
        }

        // ==================== 🍕 模組三：商品菜單管理 (Products) ====================

        // 🟢 獲取完整商品清單
        [HttpGet("products")]
        public async Task<IActionResult> GetProducts()
        {
            try
            {
                // 💡 由於 Product.cs 的 Id 改成了 string，Entity Framework 的對接對映就不會再因型態衝突崩潰了！
                var prods = await _context.Products.ToListAsync();
                return Ok(prods);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"🍕 讀取商品列表失敗: {ex.Message}" });
            }
        }

        // 🟢 新增商品
        [HttpPost("products")]
        public async Task<IActionResult> AddProduct([FromBody] Product prod)
        {
            try
            {
                // 💡 自動生成防呆字串 ID（如前台商品有特定規則，可在此串接，此處預設使用 GUID 縮短字串）
                if (string.IsNullOrEmpty(prod.Id))
                {
                    prod.Id = "P" + Guid.NewGuid().ToString().Substring(0, 5).ToUpper();
                }

                _context.Products.Add(prod);
                await _context.SaveChangesAsync();
                return Ok(prod);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"❌ 新增商品失敗: {ex.Message}" });
            }
        }

        // 🟢 刪除/下架商品
        [HttpDelete("products/{id}")]
        public async Task<IActionResult> DeleteProduct(string id) // 💡 關鍵修正：全面改為接收 string id
        {
            try
            {
                var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id);
                if (product == null) return NotFound(new { Message = "找不到該商品項目" });

                _context.Products.Remove(product);
                await _context.SaveChangesAsync();
                return Ok(new { Success = true, Message = "商品已成功下架移除" });
            }
            catch (Exception ex) {
                return StatusCode(500, new { Message = $"❌ 下架商品失敗: {ex.Message}" });
            }
        }

        // ==================== 📊 模組四：交易明細與報表 ====================
        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders()
        {
            try
            {
                var orders = await _context.Orders.OrderByDescending(o => o.OrderTime).ToListAsync();
                return Ok(orders);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"🛒 讀取訂單清單失敗: {ex.Message}" });
            }
        }
    }
}