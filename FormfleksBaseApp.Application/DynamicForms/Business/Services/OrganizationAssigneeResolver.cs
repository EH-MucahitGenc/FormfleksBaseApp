using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Constants;
using FormfleksBaseApp.Domain.Entities.Admin;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FormfleksBaseApp.Application.DynamicForms.Business.Services;

public sealed class OrganizationAssigneeResolver : IOrganizationAssigneeResolver
{
    private const int MaximumHierarchyDepth = 20;
    private readonly IDynamicFormsDbContext _db;
    private readonly ILogger<OrganizationAssigneeResolver> _logger;

    public OrganizationAssigneeResolver(
        IDynamicFormsDbContext db,
        ILogger<OrganizationAssigneeResolver> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<OrganizationAssigneeResolution> ResolveManagerLevelAsync(
        QdmsPersonelAktarim subject,
        int eligibleManagerLevel,
        CancellationToken cancellationToken)
    {
        if (eligibleManagerLevel < 1)
            throw new ArgumentOutOfRangeException(nameof(eligibleManagerLevel));

        var positionCode = NormalizeCode(subject.Ust_Pozisyon_Kodu);
        if (positionCode is null)
            return Failure("Personelin üst pozisyon kodu bulunamadı.");

        var visitedPositions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var eligibleLevel = 0;

        for (var depth = 0; depth < MaximumHierarchyDepth; depth++)
        {
            if (!visitedPositions.Add(positionCode))
                return Failure($"Organizasyon hiyerarşisinde döngü tespit edildi: {positionCode}.");

            var occupants = await _db.QdmsPersoneller
                .AsNoTracking()
                .Where(p => p.IsActive && p.Pozisyon_Kodu == positionCode)
                .ToListAsync(cancellationToken);

            if (occupants.Count == 0)
                return Failure($"{positionCode} pozisyonunda aktif personel bulunamadı.");

            var grayCount = occupants.Count(IsGrayCollar);
            if (grayCount > 0 && grayCount != occupants.Count)
                return Failure($"{positionCode} pozisyonunda gri yaka ve uygun yönetici kayıtları birlikte bulunuyor.");

            if (grayCount == 0)
            {
                eligibleLevel++;
                if (eligibleLevel == eligibleManagerLevel)
                {
                    var candidates = occupants
                        .Select(p => new OrganizationAssigneeCandidate(
                            p.Id,
                            p.LinkedUserId,
                            $"{p.Adi} {p.Soyadi}".Trim(),
                            p.Email))
                        .GroupBy(x => x.UserId.HasValue ? $"u:{x.UserId}" : $"p:{x.PersonnelId}")
                        .Select(g => g.First())
                        .ToList();

                    return new OrganizationAssigneeResolution(candidates, null);
                }
            }

            var upperPositions = occupants
                .Select(p => NormalizeCode(p.Ust_Pozisyon_Kodu))
                .Where(x => x is not null)
                .Cast<string>()
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (upperPositions.Count != 1)
                return Failure($"{positionCode} pozisyonu tek bir üst pozisyona bağlanmıyor.");

            positionCode = upperPositions[0];
        }

        return Failure($"Organizasyon hiyerarşisi {MaximumHierarchyDepth} kademe içinde çözümlenemedi.");
    }

    public async Task<bool> IsEligibleAssigneeAsync(Guid userId, CancellationToken cancellationToken)
    {
        var groupDescriptions = await _db.QdmsPersoneller
            .AsNoTracking()
            .Where(p => p.IsActive && p.LinkedUserId == userId)
            .Select(p => p.Grup_Kodu_Aciklama)
            .ToListAsync(cancellationToken);

        return !groupDescriptions.Any(ProbationFormConstants.IsGrayCollar);
    }

    private OrganizationAssigneeResolution Failure(string reason)
    {
        _logger.LogWarning("Organization assignee resolution failed: {Reason}", reason);
        return new OrganizationAssigneeResolution([], reason);
    }

    private static bool IsGrayCollar(QdmsPersonelAktarim person)
    {
        return ProbationFormConstants.IsGrayCollar(person.Grup_Kodu_Aciklama);
    }

    private static string? NormalizeCode(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
