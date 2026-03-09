using System.ComponentModel.DataAnnotations;

namespace FormfleksBaseApp.Application.Auth.Dtos;

public class AdLoginRequest
{
    [Required]
    public string Username { get; set; } = default!;

    [Required]
    public string Password { get; set; } = default!;
}
