using System;
using System.Collections.Generic;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetUserDelegations;

public record GetUserDelegationsQuery(Guid UserId) : IRequest<List<UserDelegationDto>>;
