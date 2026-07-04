using System.ComponentModel.DataAnnotations;

namespace RiceSpoon_Admin.Models
{
    public class Staff
    {
        [Key]
        public string StaffCode { get; set; } = string.Empty; // 員工編號（如 A01）
        public string StaffName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // 店長 / 店員
    }
}