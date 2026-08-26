using FluentValidation;
using System;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.CreateCampaign;

public class CreateCampaignCommandValidator : AbstractValidator<CreateCampaignCommand>
{
    public CreateCampaignCommandValidator()
    {
        RuleFor(x => x.CampaignName)
            .NotEmpty().WithMessage("Kampanya adı boş bırakılamaz.")
            .MaximumLength(200).WithMessage("Kampanya adı en fazla 200 karakter olabilir.");

        RuleFor(x => x.StartDate)
            .NotEmpty().WithMessage("Başlangıç tarihi belirtilmelidir.");

        RuleFor(x => x.EndDate)
            .NotEmpty().WithMessage("Bitiş tarihi belirtilmelidir.")
            .GreaterThan(x => x.StartDate).WithMessage("Bitiş tarihi başlangıç tarihinden sonra olmalıdır.");

        RuleFor(x => x.TemplateId)
            .NotEmpty().WithMessage("Şablon seçilmelidir.");

        RuleFor(x => x.AudienceDefinition)
            .NotNull().WithMessage("Hedef kitle tanımı (AudienceDefinition) boş olamaz.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Açıklama en fazla 500 karakter olabilir.");
    }
}
