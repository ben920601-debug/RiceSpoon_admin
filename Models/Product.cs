using System.ComponentModel.DataAnnotations;

namespace RiceSpoon_Admin.Models
{
    public class Product
    {
        public string Id { get; set; } = string.Empty;    // 商品 ID
        public string Name { get; set; } = string.Empty;  // 商品名稱
        public decimal Price { get; set; }                // 單價
    }
}