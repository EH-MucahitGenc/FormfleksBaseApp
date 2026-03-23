using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using FormfleksBaseApp.Infrastructure.Persistence;
using FormfleksBaseApp.Domain.Entities.DynamicForms;

var optionsBuilder = new DbContextOptionsBuilder<DynamicFormsDbContext>();
optionsBuilder.UseNpgsql("Host=localhost;Database=formfleks_db;Username=postgres;Password=postgres");
using var db = new DynamicFormsDbContext(optionsBuilder.Options);

var ft = db.FormTypes.FirstOrDefault(f => f.Code == "BUROCELO");
if (ft != null) {
    var fields = db.FormFields.Where(f => f.FormTypeId == ft.Id).ToList();
    Console.WriteLine($"Form 'BUROCELO' has {fields.Count} fields in DB!");
    foreach(var f in fields) {
        Console.WriteLine($"	- {f.FieldKey} ({f.Label}) [Active: {f.Active}]");
    }
} else {
    Console.WriteLine("Form 'BUROCELO' not found in DB!");
}
