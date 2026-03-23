using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;
using FormfleksBaseApp.Application.Integrations.Oracle.QdmsPersonel;
using FormfleksBaseApp.Domain.Entities.Admin;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.SyncQdmsPersonel;

public sealed class SyncQdmsPersonelCommandHandler : IRequestHandler<SyncQdmsPersonelCommand, SyncQdmsPersonelResponseDto>
{
    private readonly IDynamicFormsDbContext _context;
    private readonly IQdmsPersonelAktarimRepository _oracleRepository;
    private readonly IAdminUserRepository _adminUserRepository;

    public SyncQdmsPersonelCommandHandler(
        IDynamicFormsDbContext context,
        IQdmsPersonelAktarimRepository oracleRepository,
        IAdminUserRepository adminUserRepository)
    {
        _context = context;
        _oracleRepository = oracleRepository;
        _adminUserRepository = adminUserRepository;
    }

    public async Task<SyncQdmsPersonelResponseDto> Handle(SyncQdmsPersonelCommand request, CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;
        var currentUserId = request.ActorUserId != Guid.Empty ? request.ActorUserId : Guid.Empty;

        // 1. Fetch from Oracle
        var oracleData = await _oracleRepository.GetAllActivePersonnelAsync(cancellationToken);
        if (oracleData == null || !oracleData.Any())
        {
            return new SyncQdmsPersonelResponseDto { Success = false, Message = "Oracle view'inden veri alınamadı veya boş döndü." };
        }

        var distinctOracleData = oracleData
            .Where(x => !string.IsNullOrWhiteSpace(x.Sicil_No))
            .GroupBy(x => x.Sicil_No)
            .Select(g => g.First())
            .ToList();

        // 2. Fetch from Local DB
        var localData = await _context.QdmsPersoneller.ToListAsync(cancellationToken);
        var localDict = localData.ToDictionary(x => x.Sicil_No);
        var localUsers = await _adminUserRepository.GetAllUsersWithRolesAsync(cancellationToken);

        // Helper to consistently map JDMS records to active Users
        Guid? ResolveLinkedUserId(string emailAddress)
        {
            if (string.IsNullOrWhiteSpace(emailAddress)) return null;
            
            // Priority 1: Exact complete email address match
            var exactMatch = localUsers.FirstOrDefault(u => string.Equals(u.Email, emailAddress, StringComparison.OrdinalIgnoreCase));
            if (exactMatch != null) return exactMatch.Id;
            
            // Priority 2: Local-part prefix matching (e.g., murat.buyuran@ -> matches murat.buyuran@... )
            var localPart = emailAddress.Split('@').FirstOrDefault()?.ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(localPart))
            {
                var prefixMatches = localUsers.Where(u => u.Email != null && u.Email.ToLowerInvariant().StartsWith(localPart + "@")).ToList();
                if (prefixMatches.Count == 1) return prefixMatches.First().Id;
            }
            
            return null;
        }

        int inserted = 0, updated = 0, deactivated = 0;

        foreach (var p in distinctOracleData)
        {
            if (localDict.TryGetValue(p.Sicil_No, out var existing))
            {
                // Update
                existing.Sirket = p.Sirket;
                existing.Isyeri_Kodu = p.isyeri_kodu;
                existing.Isyeri_Tanimi = p.Isyeri_Tanimi;
                existing.Grup_Kodu = p.grup_kodu;
                existing.Grup_Kodu_Aciklama = p.grup_kodu_aciklama;
                existing.Adi = p.Adi;
                existing.Soyadi = p.Soyadi;
                existing.Email = p.Email;
                existing.Pozisyon_Kodu = p.Pozisyon_Kodu;
                existing.Pozisyon_Aciklamasi = p.Pozisyon_Aciklamasi;
                existing.Ust_Pozisyon_Kodu = p.Ust_Pozisyon_Kodu;
                existing.Departman_Kodu = p.Departman_Kodu;
                existing.Departman_Adi = p.Departman_Adi;
                existing.IsActive = true;
                existing.LastSyncDate = startTime;
                
                // AUTO-HEAL ALGORITHM: Always recalculate to repair broken/orphaned links
                var targetGuid = ResolveLinkedUserId(p.Email);
                if (targetGuid.HasValue && existing.LinkedUserId != targetGuid.Value)
                {
                    existing.LinkedUserId = targetGuid.Value;
                }
                
                updated++;
                localDict.Remove(p.Sicil_No);
            }
            else
            {
                // Insert
                var newRec = new QdmsPersonelAktarim
                {
                    Id = Guid.NewGuid(),
                    Sirket = p.Sirket,
                    Isyeri_Kodu = p.isyeri_kodu,
                    Isyeri_Tanimi = p.Isyeri_Tanimi,
                    Grup_Kodu = p.grup_kodu,
                    Grup_Kodu_Aciklama = p.grup_kodu_aciklama,
                    Sicil_No = p.Sicil_No,
                    Adi = p.Adi,
                    Soyadi = p.Soyadi,
                    Email = p.Email,
                    Pozisyon_Kodu = p.Pozisyon_Kodu,
                    Pozisyon_Aciklamasi = p.Pozisyon_Aciklamasi,
                    Ust_Pozisyon_Kodu = p.Ust_Pozisyon_Kodu,
                    Departman_Kodu = p.Departman_Kodu,
                    Departman_Adi = p.Departman_Adi,
                    IsActive = true,
                    LastSyncDate = startTime,
                    LinkedUserId = ResolveLinkedUserId(p.Email)
                };
                
                _context.QdmsPersoneller.Add(newRec);
                inserted++;
            }
        }

        // Deactivate missing
        foreach (var remaining in localDict.Values)
        {
            if (remaining.IsActive)
            {
                remaining.IsActive = false;
                deactivated++;
            }
        }

        // Write to SyncLog
        var log = new QdmsPersonelSyncLog
        {
            Id = Guid.NewGuid(),
            TriggeredByUserId = currentUserId,
            StartTime = startTime,
            EndTime = DateTime.UtcNow,
            InsertedCount = inserted,
            UpdatedCount = updated,
            DeactivatedCount = deactivated
        };
        _context.QdmsPersonelSyncLogs.Add(log);

        await _context.SaveChangesAsync(cancellationToken);

        return new SyncQdmsPersonelResponseDto { Success = true, Message = $"Senkronizasyon tamamlandı: {inserted} Eklendi, {updated} Güncellendi, {deactivated} Pasife Alındı." };
    }
}
