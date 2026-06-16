using System;

namespace FormfleksBaseApp.Application.Common.Exceptions;

public class MaintenanceException : Exception
{
    public MaintenanceException() : base("Sistem şu anda planlı bakım aşamasındadır. Lütfen daha sonra tekrar deneyiniz.")
    {
    }
}
