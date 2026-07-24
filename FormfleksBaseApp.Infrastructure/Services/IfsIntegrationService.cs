using System;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

using FormfleksBaseApp.Application.Common.Models;

namespace FormfleksBaseApp.Infrastructure.Services;

public class IfsIntegrationService : IIfsIntegrationService
{
    private readonly IConfiguration _config;
    private readonly ILogger<IfsIntegrationService> _logger;
    private readonly ISystemSettingsService _systemSettingsService;

    public IfsIntegrationService(IConfiguration config, ILogger<IfsIntegrationService> logger, ISystemSettingsService systemSettingsService)
    {
        _config = config;
        _logger = logger;
        _systemSettingsService = systemSettingsService;
    }

    public async Task SendProbationApprovalSignatureAsync(string systemUsageType, string sicilNo, Guid formRequestId, CancellationToken cancellationToken = default)
    {
        try
        {
            var connectionString = _config.GetConnectionString("IfsTransactionDb");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                _logger.LogWarning("IfsTransactionDb connection string is missing. Skipping IFS integration.");
                return;
            }

            int licenseId = 0;
            if (systemUsageType == "2_AY_DENEME")
            {
                licenseId = 10;
            }
            else if (systemUsageType == "6_AY_DENEME")
            {
                licenseId = 20;
            }
            else
            {
                _logger.LogWarning($"SystemUsageType '{systemUsageType}' is not supported for IFS Probation Integration.");
                return;
            }

            var appSettings = _systemSettingsService.GetSetting<AppSettings>("AppSettings", new AppSettings 
            { 
                SiteUrl = _config["FrontendBaseUrl"] ?? "http://localhost:3001" 
            });
            
            string baseUrl = (appSettings?.SiteUrl ?? "http://localhost:3001").TrimEnd('/');
            string licenseInfo = $"{baseUrl}/forms/{formRequestId}";

            string arguments = $"!\n$PERSON_ID={sicilNo}\n$LICENSE_ID={licenseId}\n$LICENSE_INFO={licenseInfo}";

            using var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync(cancellationToken);

            string sql = @"
                INSERT INTO ifs_transaction.""IFSTrans"" 
                (""Id"", ""SystemKey"", ""TransactionCode"", ""Arguments"", ""SendState"", ""ExceptionMessage"", ""CreatedAt"", ""UpdatedAt"")
                VALUES 
                (@Id, @SystemKey, @TransactionCode, @Arguments, @SendState, @ExceptionMessage, @CreatedAt, @UpdatedAt)";

            using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("Id", Guid.NewGuid());
            cmd.Parameters.AddWithValue("SystemKey", "12");
            cmd.Parameters.AddWithValue("TransactionCode", "PER_CERT_NEW");
            cmd.Parameters.AddWithValue("Arguments", arguments);
            cmd.Parameters.AddWithValue("SendState", false);
            cmd.Parameters.AddWithValue("ExceptionMessage", "Kurumsal Onaydan Gönderildi");
            cmd.Parameters.AddWithValue("CreatedAt", DateTime.Now);
            cmd.Parameters.AddWithValue("UpdatedAt", DateTime.Now);

            await cmd.ExecuteNonQueryAsync(cancellationToken);
            _logger.LogInformation($"Successfully sent probation approval signature to IFS for Sicil No: {sicilNo}, License ID: {licenseId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error while sending probation approval signature to IFS for form request {formRequestId}");
        }
    }
}
