using Microsoft.EntityFrameworkCore;
using RiceSpoon_Admin.Models;

// 🚀 關鍵修正：確保 100% 引入了剛才新結構的 Models 命名空間
using RiceSpoon_Admin_API.Models;

namespace RiceSpoon_Admin_API.Data
{
    public class AdminDbContext : DbContext
    {
        public AdminDbContext(DbContextOptions<AdminDbContext> options) : base(options) { }

        public DbSet<Staff> Staffs { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Order> Orders { get; set; } // 👈 這樣編譯器就能完美找到 Order 了！
    }
}