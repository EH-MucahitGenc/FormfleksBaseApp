using System.ComponentModel.DataAnnotations;

namespace FormfleksBaseApp.Application.Auth.Dtos;

public class RegisterRequest
{
    [Required, EmailAddress, MaxLength(320)]
    public string Email { get; set; } = default!;

    [Required, MinLength(6), MaxLength(100)]
    public string Password { get; set; } = default!;
}
