using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Common.Models;
using FormfleksBaseApp.DynamicForms.Business.Queries.GetRequestDetailed;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace FormfleksBaseApp.Infrastructure.Services;

public class PdfGeneratorService : IPdfGeneratorService
{
    private readonly IDynamicFormsDbContext _db;
    private readonly ISender _sender;

    public PdfGeneratorService(IDynamicFormsDbContext db, ISender sender)
    {
        _db = db;
        _sender = sender;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public async Task<EmailAttachment> GenerateFormPdfAsync(Guid formRequestId, CancellationToken cancellationToken = default)
    {
        var request = await _db.FormRequests
            .FirstOrDefaultAsync(r => r.Id == formRequestId, cancellationToken);

        if (request == null)
            throw new Exception("Form request not found.");

        // UI'daki ile birebir aynı detayları (tarih çevirimleri, Grid verileri, İş akışı isimleri) 
        // çekebilmek için uygulamanın kendi Query'sini çağırıyoruz.
        var dto = await _sender.Send(new GetRequestDetailedQuery(formRequestId, request.RequestorUserId), cancellationToken);

        if (dto == null)
            throw new Exception("Form request detailed could not be loaded.");

        bool isErkurt = dto.RequesterCompany.Contains("ERKURT", StringComparison.OrdinalIgnoreCase);

        string getStatusText(int status) => status switch
        {
            1 => "TASLAK",
            2 => "ONAYA SUNULDU",
            3 => "ONAY AŞAMASINDA",
            4 => "ONAYLANDI",
            5 => "REDDEDİLDİ",
            6 => "İPTAL EDİLDİ",
            7 => "REVİZYONA İADE EDİLDİ",
            _ => "BİLİNMİYOR"
        };

        string getWorkflowStatusText(string status) => status switch
        {
            "Approved" => "ONAYLANDI",
            "Rejected" => "REDDEDİLDİ",
            "ReturnedForRevision" => "İADE EDİLDİ",
            "Pending" => "BEKLİYOR",
            "Future" => "SIRADA",
            "Submitted" => "TALEBİ AÇTI",
            _ => status.ToUpper()
        };

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.5f, QuestPDF.Infrastructure.Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9).FontFamily(Fonts.Arial).FontColor(Colors.Black));

                page.Header().Element(compose => 
                {
                    compose.Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3); // Logo
                            columns.RelativeColumn(6); // Title
                            columns.RelativeColumn(4); // Meta
                        });

                        var logoFileName = isErkurt ? "erkurtlogo.png" : "logo.png";
                        var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", logoFileName);
                        if (File.Exists(logoPath))
                        {
                            table.Cell().Border(1).BorderColor(Colors.Black).Padding(10).AlignCenter().AlignMiddle().Image(logoPath).FitArea();
                        }
                        else
                        {
                            table.Cell().Border(1).BorderColor(Colors.Black).Padding(5).AlignCenter().AlignMiddle().Text(isErkurt ? "ERKURT HOLDİNG" : "FORMFLEKS").FontSize(16).Bold().FontFamily(Fonts.Arial);
                        }
                        
                        table.Cell().Border(1).BorderColor(Colors.Black).Padding(10).AlignCenter().AlignMiddle().Column(col => 
                        {
                            col.Item().Text(dto.FormTypeName?.ToUpper() ?? "FORM").FontSize(14).Bold();
                            col.Item().Text("KURUMSAL FORM VE ONAY BELGESİ").FontSize(8).Bold();
                        });

                        table.Cell().Border(1).BorderColor(Colors.Black).Padding(5).AlignMiddle().Column(col => 
                        {
                            col.Item().Text(text => { text.Span("DOKÜMAN TİPİ: ").Bold(); text.Span("GENEL"); });
                            col.Item().Text(text => { text.Span("KAYIT NO: ").Bold(); text.Span(dto.RequestNo); });
                            col.Item().Text(text => { text.Span("ÇIKTI TARİHİ: ").Bold(); text.Span(DateTime.Now.ToString("dd.MM.yyyy")); });
                        });
                    });
                });

                page.Content().PaddingVertical(10).Column(col =>
                {
                    // Status Box
                    col.Item().PaddingBottom(15).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(7);
                        });

                        table.Cell().Border(1).BorderColor(Colors.Black).Padding(5).Column(c => 
                        {
                            c.Item().Text("ONAY DURUMU").FontSize(7).Bold();
                            c.Item().Border(1).BorderColor(Colors.Black).Padding(4).AlignCenter().Text(getStatusText((int)dto.Status)).Bold();
                        });

                        table.Cell().Border(1).BorderColor(Colors.Black).Padding(5).Column(c => 
                        {
                            c.Item().Text("TALEP İÇERİK BİLGİSİ (SİSTEM LOG)").FontSize(7).Bold();
                            c.Item().Text("Talebiniz kayda alınmış ve işleme başlanmıştır. Sistem üzerindeki dijital izler ve onay kayıtları bu belgenin ayrılmaz bir parçasıdır.").FontSize(8);
                        });
                    });

                    // Values Section
                    col.Item().Background(Colors.Black).Padding(4).Text("1. FORM İÇERİK BİLGİLERİ").FontColor(Colors.White).Bold();
                    col.Item().PaddingBottom(15).Table(table => 
                    {
                        table.ColumnsDefinition(columns => 
                        {
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(7);
                        });

                        table.Header(header => 
                        {
                            header.Cell().Border(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten3).Padding(4).Text("VERİ ALANI").FontSize(8).Bold();
                            header.Cell().Border(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten3).Padding(4).Text("SİSTEME GİRİLEN DEĞER").FontSize(8).Bold();
                        });

                        if (dto.Values == null || !dto.Values.Any())
                        {
                            table.Cell().ColumnSpan(2).Border(1).BorderColor(Colors.Black).Padding(10).AlignCenter().Text("Form verisi bulunamadı.").Italic().FontColor(Colors.Grey.Darken1);
                        }
                        else
                        {
                            foreach (var field in dto.Values)
                            {
                                if (field.FieldType == 11 && !string.IsNullOrWhiteSpace(field.ValueText)) // Grid
                                {
                                    table.Cell().ColumnSpan(2).Border(1).BorderColor(Colors.Black).Padding(0).Column(c => 
                                    {
                                        c.Item().Background(Colors.Grey.Lighten3).Padding(4).Text($"{field.Label} (Liste Verisi)").Bold();
                                        
                                        try
                                        {
                                            var jsonArray = JsonNode.Parse(field.ValueText) as JsonArray;
                                            if (jsonArray != null)
                                            {
                                                var columnMap = new Dictionary<string, string>();
                                                if (!string.IsNullOrWhiteSpace(field.OptionsJson))
                                                {
                                                    var options = JsonNode.Parse(field.OptionsJson);
                                                    var cols = options is JsonObject jo && jo.ContainsKey("columns") ? jo["columns"] as JsonArray : options as JsonArray;
                                                    if (cols != null)
                                                    {
                                                        foreach (var col in cols)
                                                        {
                                                            var dField = col?["dataField"]?.ToString() ?? col?["name"]?.ToString();
                                                            var cCaption = col?["caption"]?.ToString() ?? col?["label"]?.ToString();
                                                            if (!string.IsNullOrWhiteSpace(dField))
                                                            {
                                                                columnMap[dField] = string.IsNullOrWhiteSpace(cCaption) ? dField : cCaption;
                                                            }
                                                        }
                                                    }
                                                }

                                                var firstItem = jsonArray.FirstOrDefault() as JsonObject;
                                                var rawKeys = firstItem?.Select(x => x.Key).Where(k => !k.Contains("KEY")).ToList() ?? new List<string>();

                                                c.Item().Table(innerTable => 
                                                {
                                                    innerTable.ColumnsDefinition(ic => 
                                                    {
                                                        ic.ConstantColumn(20);
                                                        foreach (var key in rawKeys) ic.RelativeColumn();
                                                    });

                                                    innerTable.Header(ih => 
                                                    {
                                                        ih.Cell().BorderBottom(1).BorderRight(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten4).Padding(2).Text("#").FontSize(8).Bold().AlignCenter();
                                                        foreach (var key in rawKeys)
                                                        {
                                                            string headerCaption = columnMap.ContainsKey(key) ? columnMap[key] : key;
                                                            ih.Cell().BorderBottom(1).BorderRight(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten4).Padding(2).Text(headerCaption).FontSize(8).Bold();
                                                        }
                                                    });

                                                    if (jsonArray.Count == 0)
                                                    {
                                                        innerTable.Cell().ColumnSpan((uint)(rawKeys.Count + 1)).Padding(4).AlignCenter().Text("Veri girilmemiş").Italic().FontColor(Colors.Grey.Darken1);
                                                    }
                                                    else
                                                    {
                                                        int rowIndex = 1;
                                                        foreach (var rowItem in jsonArray)
                                                        {
                                                            var obj = rowItem as JsonObject;
                                                            innerTable.Cell().BorderBottom(1).BorderRight(1).BorderColor(Colors.Black).Padding(2).Text(rowIndex.ToString()).FontSize(8).AlignCenter();
                                                            foreach (var key in rawKeys)
                                                            {
                                                                var valNode = obj?[key];
                                                                string val = "-";
                                                                if (valNode != null)
                                                                {
                                                                    if (valNode.GetValueKind() == JsonValueKind.True) val = "Evet";
                                                                    else if (valNode.GetValueKind() == JsonValueKind.False) val = "Hayır";
                                                                    else val = valNode.ToString();
                                                                }
                                                                
                                                                innerTable.Cell().BorderBottom(1).BorderRight(1).BorderColor(Colors.Black).Padding(2).Text(val).FontSize(8);
                                                            }
                                                            rowIndex++;
                                                        }
                                                    }
                                                });
                                            }
                                        }
                                        catch
                                        {
                                            c.Item().Padding(4).Text("[Tablo Verisi Çözümlenemedi]");
                                        }
                                    });
                                }
                                else if (field.FieldType == 10 && !string.IsNullOrWhiteSpace(field.ValueText)) // File
                                {
                                    table.Cell().Border(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten4).Padding(4).Text(field.Label).Bold();
                                    table.Cell().Border(1).BorderColor(Colors.Black).Padding(4).Text($"[Eklenmiş Dosya: {Path.GetFileName(field.ValueText)}]").Italic().FontColor(Colors.Grey.Darken3);
                                }
                                else
                                {
                                    table.Cell().Border(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten4).Padding(4).Text(field.Label).Bold();
                                    table.Cell().Border(1).BorderColor(Colors.Black).Padding(4).Text(string.IsNullOrWhiteSpace(field.ValueText) ? "-" : field.ValueText);
                                }
                            }
                        }
                    });

                    // Approval History Section
                    col.Item().Background(Colors.Black).Padding(4).Text("2. ONAY / RED TARİHÇESİ VE DİJİTAL İZLER").FontColor(Colors.White).Bold();
                    col.Item().PaddingBottom(15).Table(table => 
                    {
                        table.ColumnsDefinition(columns => 
                        {
                            columns.RelativeColumn(2); // İŞLEM TARİHİ
                            columns.RelativeColumn(3); // AŞAMA / DURUM
                            columns.RelativeColumn(3); // İŞLEM YAPAN
                            columns.RelativeColumn(4); // SİSTEM NOTU / YORUM
                        });

                        table.Header(header => 
                        {
                            header.Cell().Border(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten3).Padding(4).Text("İŞLEM TARİHİ").FontSize(8).Bold();
                            header.Cell().Border(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten3).Padding(4).Text("AŞAMA / DURUM").FontSize(8).Bold();
                            header.Cell().Border(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten3).Padding(4).Text("İŞLEM YAPAN").FontSize(8).Bold();
                            header.Cell().Border(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten3).Padding(4).Text("SİSTEM NOTU / YORUM").FontSize(8).Bold();
                        });

                        if (dto.Workflow == null || !dto.Workflow.Any())
                        {
                            table.Cell().ColumnSpan(4).Border(1).BorderColor(Colors.Black).Padding(10).AlignCenter().Text("Onay adım kaydı bulunmamaktadır.").Italic().FontColor(Colors.Grey.Darken1);
                        }
                        else
                        {
                            foreach (var app in dto.Workflow)
                            {
                                bool isFuture = app.Status == "Future";
                                string dateStr = app.Date?.ToString("dd.MM.yyyy HH:mm") ?? "-";
                                string statusStr = getWorkflowStatusText(app.Status);
                                string comment = string.IsNullOrWhiteSpace(app.Comment) ? "-" : $"\"{app.Comment}\"";

                                // Future adımlar için opacity benzeri bir görünüm (gri renk)
                                var textColor = isFuture ? Colors.Grey.Medium : Colors.Black;

                                table.Cell().Border(1).BorderColor(Colors.Black).Padding(4).Text(dateStr).FontSize(8).FontColor(textColor);
                                table.Cell().Border(1).BorderColor(Colors.Black).Padding(4).Column(c => 
                                {
                                    c.Item().Text(app.Step).FontSize(8).Bold().FontColor(textColor);
                                    c.Item().Text($"[{statusStr}]").FontSize(7).FontColor(textColor);
                                });
                                table.Cell().Border(1).BorderColor(Colors.Black).Padding(4).Text(app.Actor).FontSize(8).Bold().FontColor(textColor);
                                table.Cell().Border(1).BorderColor(Colors.Black).Padding(4).Text(comment).FontSize(8).Italic().FontColor(textColor);
                            }
                        }
                    });

                    // KVKK Footer
                    col.Item().PaddingTop(10).Border(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten4).Padding(8).Row(row => 
                    {
                        row.AutoItem().PaddingRight(10).Text("⚠️").FontSize(20);
                        row.RelativeItem().Column(c => 
                        {
                            c.Item().Text("KVKK AYDINLATMA VE GİZLİLİK BEYANI").FontSize(8).Bold();
                            c.Item().Text($"6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, bu belgede yer alan veriler Erkurt Holding Aydınlatma Metni'ne uygun olarak, yalnızca Formfleks İş Akış Sistemi çerçevesinde ve belgenin tahsis amacına yönelik hukuki/operasyonel gereklilikler sebebiyle işlenmektedir. Bu belgede yer alan kişisel veriler, yetkisiz üçüncü şahıslarla paylaşılamaz, kopyalanamaz veya amacı dışında kullanılamaz. Elektronik onay takip sistemi (Formfleks) üzerinden {DateTime.Now.ToString("dd.MM.yyyy HH:mm:ss")} tarihinde otomatik olarak üretilmiştir. Tüm dijital izler ve kimlik doğrulama logları 5651 sayılı kanun gereği sunucu veri tabanlarında kriptolanmış olarak tutulmaktadır.").FontSize(7);
                            c.Item().PaddingTop(4).Text($"Belge Doğrulama Referansı: {formRequestId}").FontSize(6).FontColor(Colors.Grey.Medium);
                        });
                    });
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Sayfa ");
                    x.CurrentPageNumber();
                    x.Span(" / ");
                    x.TotalPages();
                });
            });
        });

        using var ms = new MemoryStream();
        document.GeneratePdf(ms);

        return new EmailAttachment
        {
            FileName = $"{request.RequestNo}_Ozet.pdf",
            Content = ms.ToArray(),
            ContentType = "application/pdf"
        };
    }
}
