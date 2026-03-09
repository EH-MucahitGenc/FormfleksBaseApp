using System.ComponentModel.DataAnnotations;

namespace FormfleksBaseApp.Application.Auth.Dtos;

public class LoginRequest
{
    [Required, EmailAddress, MaxLength(320)]
    public string Email { get; set; } = default!;

    [Required]
    public string Password { get; set; } = default!;
}
