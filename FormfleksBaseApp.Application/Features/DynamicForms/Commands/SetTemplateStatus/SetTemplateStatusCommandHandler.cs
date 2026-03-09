using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.SetTemplateStatus;

public sealed class SetTemplateStatusCommandHandler : IRequestHandler<SetTemplateStatusCommand, FormTemplateSummaryDto>
{
    private readonly IDynamicFormsDbContext _db;

    public SetTemplateStatusCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<FormTemplateSummaryDto> Handle(SetTemplateStatusCommand request, CancellationToken ct)
    {
        var formType = await _db.FormTypes.FirstOrDefaultAsync(x => x.Id == request.FormTypeId, ct);
        if (formType is null) throw new BusinessException("Şablon bulunamadı.");

        formType.Active = request.Active;
        await _db.SaveChangesAsync(ct);
        
        return new FormTemplateSummaryDto(); 
    }
}
