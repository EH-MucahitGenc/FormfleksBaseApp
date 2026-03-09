using System.ComponentModel.DataAnnotations;

namespace FormfleksBaseApp.Application.Auth.Dtos;

public class RefreshRequest
{
    [Required]
    public string RefreshToken { get; set; } = default!;
}
