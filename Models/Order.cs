using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RiceSpoon_Admin.Models
{
    [Table("Orders")] // 確保對齊資料庫的表名
    public class Order
    {
        [Key]
        [Column("OrderId")] // 對齊資料庫欄位：OrderId (資料庫實體為 VarChar 型態)
        public string OrderId { get; set; } // 💡 關鍵修正：將 int 改為 string

        [Column("TransactionTime")] // 對齊資料庫的 TransactionTime
        public DateTime OrderTime { get; set; }

        [Column("CashierName")] // 對齊 CashierName
        public string Cashier { get; set; }

        [Column("TotalAmount")] // 對齊資料庫欄位：TotalAmount
        public decimal TotalAmount { get; set; }

        [NotMapped] 
        public string Details { get; set; } = "點擊查閱明細";
    }
}