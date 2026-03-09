using FluentValidation;

namespace FormfleksBaseApp.Application.Features.OracleCompanyPersons.Queries.GetAll;

public sealed class OracleCompanyPersonsGetAllQueryValidator : AbstractValidator<OracleCompanyPersonsGetAllQuery>
{
    public OracleCompanyPersonsGetAllQueryValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(1);

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 200);

        RuleFor(x => x.Search)
            .MaximumLength(100);
    }
}
