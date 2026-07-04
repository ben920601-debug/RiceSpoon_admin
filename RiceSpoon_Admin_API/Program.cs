using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.FileProviders;
using System;
using System.IO;
using RiceSpoon_Admin.Data;

var frontendRoot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), ".."));
var wwwrootRoot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
var compositeProvider = new CompositeFileProvider(
    new PhysicalFileProvider(frontendRoot),
    new PhysicalFileProvider(wwwrootRoot));

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = Directory.GetCurrentDirectory(),
    WebRootPath = frontendRoot
});

// ==========================================
// 1. 設定 Linux 伺服器 MySQL 連線字串 (直連 POS 系統的 RiceSpoon 資料庫)
// ==========================================
string mySqlConnectionStr = "Server=192.168.0.176;Port=3306;Database=RiceSpoon;Uid=buddy;Pwd=buddy1220;AllowUserVariables=True";

builder.Services.AddDbContext<AdminDbContext>(options =>
    options.UseMySql(mySqlConnectionStr, ServerVersion.AutoDetect(mySqlConnectionStr)));

builder.Services.AddControllers()
    .AddJsonOptions(options => { options.JsonSerializerOptions.PropertyNamingPolicy = null; });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAdminFrontend", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

// ==========================================
// 2. 自動初始化資料庫（若連不上會拋出友善提示）
// ==========================================
using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
        dbContext.Database.EnsureCreated();
        Console.WriteLine("🚀 Linux MySQL 管理後台資料庫咬合成功，資料表已就緒！");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ 無法連線至 Linux MySQL 伺服器: {ex.Message}");
    }
}

// ==========================================
// 3. 設定中間件黃金管線順序 (HTTPS 頂置防衝突)
// ==========================================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection(); // 👈 頂置 HTTPS 轉向，拒絕混合內容卡死

app.UseDefaultFiles(new DefaultFilesOptions
{
    FileProvider = compositeProvider,
    RequestPath = ""
});
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = compositeProvider,
    RequestPath = ""
});

app.UseCors("AllowAdminFrontend");
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();