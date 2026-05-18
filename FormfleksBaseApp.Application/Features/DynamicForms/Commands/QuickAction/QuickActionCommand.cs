using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.QuickAction;

/// <summary>
/// E-posta içerisindeki butonlardan gelen Onay/Red/İade (Magic Link) isteklerini karşılayan komut nesnesi.
/// İşlemin güvenliği, içerisinde gömülü olan kriptografik Token ile sağlanmaktadır.
/// </summary>
public sealed record QuickActionCommand(
    string Token,
    string ActionType, // "approve", "reject", "return"
    string? Comment
) : IRequest<bool>;
