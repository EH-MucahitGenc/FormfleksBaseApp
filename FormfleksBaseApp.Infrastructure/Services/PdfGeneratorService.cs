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

/// <summary>
/// Dinamik olarak doldurulan formların QuestPDF kütüphanesi kullanılarak 
/// şık ve okunabilir bir PDF formatına dönüştürülmesini sağlayan servis.
/// Bu PDF'ler e-posta eklerine (Onay bildirimleri) otomatik olarak iliştirilir.
/// </summary>
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

        TimeZoneInfo turkeyZone;
        try
        {
            turkeyZone = TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");
        }
        catch (TimeZoneNotFoundException)
        {
            turkeyZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");
        }
        var nowTurkey = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, turkeyZone);

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
                            col.Item().Text(text => { text.Span("ÇIKTI TARİHİ: ").Bold(); text.Span(nowTurkey.ToString("dd.MM.yyyy")); });
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
                    if (dto.Values == null || !dto.Values.Any())
                    {
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
                            table.Cell().ColumnSpan(2).Border(1).BorderColor(Colors.Black).Padding(10).AlignCenter().Text("Form verisi bulunamadı.").Italic().FontColor(Colors.Grey.Darken1);
                        });
                    }
                    else
                    {
                        var groupedSections = dto.Values.GroupBy(v => new { v.SectionSortOrder, v.SectionName }).OrderBy(g => g.Key.SectionSortOrder).ToList();
                        int sectionCounter = 1;

                        foreach (var section in groupedSections)
                        {
                            string sectionTitle = string.IsNullOrWhiteSpace(section.Key.SectionName) ? "DİĞER BİLGİLER" : section.Key.SectionName.ToUpper();
                            string displayTitle = System.Text.RegularExpressions.Regex.IsMatch(sectionTitle, @"^\d+\s*\.") ? sectionTitle : $"{sectionCounter}. {sectionTitle}";
                            col.Item().Background(Colors.Black).Padding(4).Text(displayTitle).FontColor(Colors.White).Bold();
                            
                            col.Item().PaddingBottom(15).Table(table => 
                            {
                                table.ColumnsDefinition(columns => 
                                {
                                    columns.RelativeColumn(3);
                                    columns.RelativeColumn(7);
                                });
                                
                                foreach (var field in section)
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
                                                    var orderedKeys = new List<string>();
                                                    var summaryDict = new Dictionary<string, List<string>>();
                                                    if (!string.IsNullOrWhiteSpace(field.OptionsJson))
                                                    {
                                                        try {
                                                            var options = JsonNode.Parse(field.OptionsJson);
                                                            var optObj = options as JsonObject;
                                                            var cols = optObj != null && optObj.ContainsKey("columns") ? optObj["columns"] as JsonArray : options as JsonArray;
                                                            
                                                            var numericCols = new List<string>();

                                                            if (cols != null)
                                                            {
                                                                if (optObj != null && optObj.ContainsKey("fixedRows"))
                                                                {
                                                                    orderedKeys.Add("_fixedRow");
                                                                    columnMap["_fixedRow"] = !string.IsNullOrWhiteSpace(field.Label) ? field.Label : "Değerlendirme Kriterleri";
                                                                }

                                                                foreach (var cCol in cols)
                                                                {
                                                                    var dField = cCol?["dataField"]?.ToString() ?? cCol?["name"]?.ToString();
                                                                    var cCaption = cCol?["caption"]?.ToString() ?? cCol?["label"]?.ToString();
                                                                    var eType = cCol?["editorType"]?.ToString();
                                                                    if (!string.IsNullOrWhiteSpace(dField))
                                                                    {
                                                                        columnMap[dField] = string.IsNullOrWhiteSpace(cCaption) ? dField : cCaption;
                                                                        orderedKeys.Add(dField);
                                                                        if (eType == "number") numericCols.Add(dField);
                                                                    }
                                                                }
                                                            }
                                                            
                                                            var summaryNode = optObj != null && optObj.ContainsKey("summary") ? optObj["summary"] as JsonObject : null;
                                                            var totalItems = summaryNode != null && summaryNode.ContainsKey("totalItems") ? summaryNode["totalItems"] as JsonArray : null;
                                                            if (totalItems != null)
                                                            {
                                                                foreach (var sItem in totalItems)
                                                                {
                                                                    var sCol = sItem?["column"]?.ToString() ?? sItem?["showInColumn"]?.ToString();
                                                                    var sType = sItem?["summaryType"]?.ToString();
                                                                    var dFmt = sItem?["displayFormat"]?.ToString() ?? "{0}";
                                                                    
                                                                    if (!string.IsNullOrEmpty(sCol) && !string.IsNullOrEmpty(sType))
                                                                    {
                                                                        double sum = 0; int count = 0;
                                                                        foreach (var row in jsonArray)
                                                                        {
                                                                            var rObj = row as JsonObject;
                                                                            if (rObj != null && rObj.ContainsKey(sCol))
                                                                            {
                                                                                var rVal = rObj[sCol];
                                                                                if (rVal != null && rVal.GetValueKind() == JsonValueKind.Number) { sum += rVal.GetValue<double>(); count++; }
                                                                                else if (rVal != null && rVal.GetValueKind() == JsonValueKind.String && double.TryParse(rVal.ToString(), out double d)) { sum += d; count++; }
                                                                            }
                                                                        }
                                                                        double val = 0;
                                                                        if (sType == "sum") val = sum; else if (sType == "avg") val = count > 0 ? sum / count : 0; else if (sType == "count") val = count;
                                                                        string resStr = dFmt.Contains("{0}") ? string.Format(dFmt, val) : $"{dFmt} {val}";
                                                                        if (!summaryDict.ContainsKey(sCol)) summaryDict[sCol] = new List<string>();
                                                                        summaryDict[sCol].Add(resStr);
                                                                    }
                                                                }
                                                            }
                                                            else if (numericCols.Any())
                                                            {
                                                                foreach(var numCol in numericCols)
                                                                {
                                                                    double sum = 0; int count = 0;
                                                                    foreach (var row in jsonArray)
                                                                    {
                                                                        var rObj = row as JsonObject;
                                                                        if (rObj != null && rObj.ContainsKey(numCol))
                                                                        {
                                                                            var rVal = rObj[numCol];
                                                                            if (rVal != null && rVal.GetValueKind() == JsonValueKind.Number) { sum += rVal.GetValue<double>(); count++; }
                                                                            else if (rVal != null && rVal.GetValueKind() == JsonValueKind.String && double.TryParse(rVal.ToString(), out double d)) { sum += d; count++; }
                                                                        }
                                                                    }
                                                                    if (count > 0)
                                                                    {
                                                                        summaryDict[numCol] = new List<string> { $"Top: {sum}", $"Ort: {(sum/(double)count).ToString("0.##")}" };
                                                                    }
                                                                }
                                                            }
                                                        } catch {}
                                                    }

                                                    var hiddenExact = new[] { "uuid", "listOrder", "KEY" };
                                                    var hiddenContains = new[] { "_fixedRow" };
                                                    var rawKeys = new List<string>();
                                                    if (orderedKeys.Any()) {
                                                        rawKeys = orderedKeys.ToList();
                                                    } else {
                                                        var firstItem = jsonArray.FirstOrDefault() as JsonObject;
                                                        rawKeys = firstItem?.Select(x => x.Key).Where(k => !hiddenExact.Any(hk => k.Equals(hk, StringComparison.OrdinalIgnoreCase)) && !hiddenContains.Any(hk => k.Contains(hk, StringComparison.OrdinalIgnoreCase)) && !k.Equals("id", StringComparison.OrdinalIgnoreCase)).ToList() ?? new List<string>();
                                                    }

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
                                                                        if (valNode.GetValueKind() == JsonValueKind.True || (valNode.GetValueKind() == JsonValueKind.String && valNode.ToString().Equals("true", StringComparison.OrdinalIgnoreCase))) val = "☑";
                                                                        else if (valNode.GetValueKind() == JsonValueKind.False || (valNode.GetValueKind() == JsonValueKind.String && valNode.ToString().Equals("false", StringComparison.OrdinalIgnoreCase))) val = "☐";
                                                                        else 
                                                                        {
                                                                            string rawStr = valNode.ToString().Trim('\"');
                                                                            if (rawStr.Length >= 10 && rawStr.Length <= 35 && rawStr.Contains("T") && DateTimeOffset.TryParse(rawStr, out var dtoff))
                                                                            {
                                                                                if (!rawStr.EndsWith("Z") && !rawStr.Contains("+") && !rawStr.Contains("-"))
                                                                                {
                                                                                    dtoff = new DateTimeOffset(dtoff.DateTime, TimeSpan.Zero);
                                                                                }
                                                                                var turkeyTime = TimeZoneInfo.ConvertTime(dtoff, turkeyZone);
                                                                                val = turkeyTime.ToString("dd.MM.yyyy");
                                                                            }
                                                                            else
                                                                            {
                                                                                val = rawStr;
                                                                            }
                                                                        }
                                                                    }
                                                                    
                                                                    innerTable.Cell().BorderBottom(1).BorderRight(1).BorderColor(Colors.Black).Padding(2).Text(val).FontSize(8);
                                                                }
                                                                rowIndex++;
                                                            }
                                                            
                                                            if (summaryDict.Any())
                                                            {
                                                                innerTable.Cell().BorderBottom(1).BorderRight(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten4).Padding(2).Text("Sonuçlar").FontSize(8).Bold();
                                                                foreach (var key in rawKeys)
                                                                {
                                                                    var cell = innerTable.Cell().BorderBottom(1).BorderRight(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten4).Padding(2);
                                                                    if (summaryDict.ContainsKey(key))
                                                                    {
                                                                        cell.Text(string.Join("\n", summaryDict[key])).FontSize(8).Bold();
                                                                    }
                                                                    else
                                                                    {
                                                                        cell.Text("");
                                                                    }
                                                                }
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
                                    else if (field.FieldType == 13) // Subheader / Label
                                    {
                                        table.Cell().ColumnSpan(2).Border(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten3).Padding(4).Text(field.Label).Bold();
                                    }
                                    else
                                    {
                                        table.Cell().Border(1).BorderColor(Colors.Black).Background(Colors.Grey.Lighten4).Padding(4).Text(field.Label).Bold();
                                        
                                        string displayVal = string.IsNullOrWhiteSpace(field.ValueText) ? "-" : field.ValueText;
                                        if (displayVal.Equals("true", StringComparison.OrdinalIgnoreCase)) displayVal = "☑";
                                        if (displayVal.Equals("false", StringComparison.OrdinalIgnoreCase)) displayVal = "☐";
                                        
                                        table.Cell().Border(1).BorderColor(Colors.Black).Padding(4).Text(displayVal);
                                    }
                                }
                            });
                            
                            sectionCounter++;
                        }
                    }

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
                                string dateStr = "-";
                                if (app.Date.HasValue)
                                {
                                    DateTimeOffset dateOffset = app.Date.Value.Kind == DateTimeKind.Utc
                                        ? new DateTimeOffset(app.Date.Value, TimeSpan.Zero)
                                        : new DateTimeOffset(app.Date.Value, TimeZoneInfo.Local.GetUtcOffset(app.Date.Value));
                                    var turkeyDate = TimeZoneInfo.ConvertTime(dateOffset, turkeyZone);
                                    dateStr = turkeyDate.ToString("dd.MM.yyyy HH:mm");
                                }
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
                            c.Item().Text($"6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, bu belgede yer alan veriler Erkurt Holding Aydınlatma Metni'ne uygun olarak, yalnızca Formfleks İş Akış Sistemi çerçevesinde ve belgenin tahsis amacına yönelik hukuki/operasyonel gereklilikler sebebiyle işlenmektedir. Bu belgede yer alan kişisel veriler, yetkisiz üçüncü şahıslarla paylaşılamaz, kopyalanamaz veya amacı dışında kullanılamaz. Elektronik onay takip sistemi (Formfleks) üzerinden {nowTurkey.ToString("dd.MM.yyyy HH:mm:ss")} tarihinde otomatik olarak üretilmiştir. Tüm dijital izler ve kimlik doğrulama logları 5651 sayılı kanun gereği sunucu veri tabanlarında kriptolanmış olarak tutulmaktadır.").FontSize(7);
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
