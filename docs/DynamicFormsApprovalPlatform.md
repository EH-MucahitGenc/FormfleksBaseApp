# FormfleksBaseApp Dynamic Forms + Approval Platform

## 1) Mevcut Proje Değerlendirmesi

Mevcut repo hali:

- Katmanlı yapı (`Api`, `Application`, `Domain`, `Infrastructure`) doğru temel sunuyor.
- Auth ve token altyapısı var, bu sayede RBAC katmanı eklemek kolay.
- PostgreSQL + EF Core kullanımı mevcut.
- DB yönetimi manuel SQL script yaklaşımına geçmiş durumda (`db/schema`).

Eksik noktalar (bu revizyonda hedeflenen):

- Dinamik form metamodeli yoktu (`form_types`, `form_fields`, `form_request_values` vb.).
- Generic workflow ve approval yürütme modeli yoktu.
- Form bazlı yetki matrisi yoktu.
- Tam audit zinciri form/approval tarafında standardize değildi.

## 2) Önerilen Kurumsal Mimari

İstenen namespace modeli:

- `FormfleksBaseApp.DynamicForms.Domain`
- `FormfleksBaseApp.DynamicForms.DataAccess`
- `FormfleksBaseApp.DynamicForms.Business`
- `FormfleksBaseApp.DynamicForms.Web`

Repo içi karşılığı (uygulandı):

- Domain enumları: `FormfleksBaseApp.Domain/DynamicForms/Enums`
- Business kontratları: `FormfleksBaseApp.Application/DynamicForms/Business`
- DataAccess EF katmanı: `FormfleksBaseApp.Infrastructure/DynamicForms/DataAccess`
- Web API: `FormfleksBaseApp.Api/Controllers/DynamicFormsController.cs`

Neden doğru:

- Yeni form tipleri sadece veri (metadata) ekleyerek açılır, kod değişimi zorunlu olmaz.
- Workflow tanımı data-driven olduğu için 2 adım/3 adım/karma onay kod fork’u gerektirmez.
- Domain ve Business kontratları UI teknolojisinden bağımsız kalır.

Alternatif neden zayıf:

- Her form tipi için ayrı tablo + ayrı service: kısa vadede hızlı, uzun vadede bakım maliyeti çok yüksek.
- Workflow’u hard-code etmek: değişiklikte deploy zorunlu olur, operasyonel çeviklik düşer.

## 3) DB First + Scaffold Sonrası Temiz Kalma Stratejisi

DB First kuralı:

- Şema kaynağı SQL scriptlerdir (`db/schema/V*.sql`).
- EF migration operasyonel kaynak değildir.

Scaffold/yenileme için öneri:

1. Scaffold sınıflarını `Generated/` altına alın.
2. Custom davranışları `partial class` ve ayrı service dosyalarında tutun.
3. Business kurallarını entity sınıflarına değil Business servislerine koyun.
4. Scaffold tekrarlandığında sadece `Generated/` güncellensin.

## 4) Veritabanı Tasarımı (Özet + Kritik Kararlar)

Uygulanan script:

- `db/schema/V2026030503__dynamic_forms_platform.sql`

Tablolar:

- `users`, `roles`, `user_roles`
- `departments`, `user_departments`
- `form_types`, `form_sections`, `form_fields`
- `workflow_definitions`, `workflow_steps`
- `form_requests`, `form_request_values`, `form_request_approvals`
- `authorization_matrix`
- `department_approval_mapping`
- `audit_logs`

Kritik kolonlar:

- `form_fields.options_json`, `visibility_rule_json`, `validation_rule_json` => `jsonb`
- `form_request_values.value_json` => karmaşık field tipleri için `jsonb`
- `form_requests.concurrency_token`, `form_request_approvals.concurrency_token` => çift onay/yarış riskine karşı
- `form_requests.current_step_no` => süreçte aktif adım takibi

İndeks yaklaşımı:

- Unique: `form_types.code`, `form_fields(form_type_id, field_key)`, `workflow_steps(definition, step_no)`, `request_no`
- Süreç performansı: pending approval index (`status`, `assignee_role_id`, `assignee_user_id`)
- Audit ve jsonb için GIN index’ler

## 5) Status Yaşam Döngüsü ve Workflow Algoritması

Durumlar:

- `Draft` -> `InApproval` (submit ile)
- `InApproval` -> `Approved` (son adım approve)
- `InApproval` -> `Rejected` (herhangi bir adım reject)
- `InApproval` -> `ReturnedForRevision` (iade)
- `ReturnedForRevision` -> `InApproval` (yeniden submit)
- `Draft/ReturnedForRevision` -> `Cancelled` (iş kuralına bağlı)

`current_step_no`:

- Submit anında ilk pending step atanır.
- Approve sonrası bir sonraki pending step’e çekilir.
- Final (`Approved/Rejected/ReturnedForRevision/Cancelled`) durumda `NULL` yapılır.

Transaction zorunlu noktalar:

- Draft save (request + value upsert + audit)
- Submit (request status + approval satırlarının üretimi + audit)
- Approval action (approval update + main status sync + audit)

Audit tetikleme:

- Draft kaydetme
- Submit
- Approve/Reject/ReturnForRevision
- İleride admin metadata değişiklikleri (`form_types`, `form_fields`, `workflow_*`)

## 6) Yetki Matrisi

Rol örnekleri:

- `Admin`, `HR`, `TeamLead`, `FormfleksLeader`, `Employee`

Model:

- `authorization_matrix` satırı form bazlı yetkiyi user/role seviyesinde tanımlar.
- `user_roles` ile çoklu rol desteği vardır.
- User override: aynı form için user satırı role satırından yüksek öncelik alır.

İleriye dönük departman:

- İlk sürüm role-based çalışır.
- `department_approval_mapping` ile departman yönlendirme ikinci fazda açılır.

## 7) UI Teknoloji Kararı

Öneri: **ASP.NET Core MVC + DevExtreme**

Neden:

- Dinamik form render + grid/list + admin builder ekranlarında enterprise hız sağlar.
- Kurumsal kullanıcıların beklediği tablo/filtre/paging/rapor davranışları hazır gelir.

Blazor Server alternatifi:

- Güçlü .NET bütünlüğü sağlar ama dinamik form builder + karma yönetim ekranlarında DevExtreme kadar kısa sürede olgun sonuç vermeyebilir.

## 8) Dinamik Ekran Akışı

1. UI `GET /api/dynamic-forms/{formCode}` çağrısı ile metadata alır.
2. Alanlar `sort_order` ile render edilir.
3. `field_type` -> input component eşleşmesi yapılır.
4. `options_json` select/radio datasource olur.
5. `visibility_rule_json` front-end expression engine ile uygulanır.
6. Submit öncesi frontend validasyon + backend tekrar validasyon yapılır.
7. Draft kaydet: `POST /api/dynamic-forms/requests/draft`
8. Gönder: `POST /api/dynamic-forms/requests/submit`
9. Onay işlemi: `POST /api/dynamic-forms/approvals/action`

## 9) MVP Kapsamı ve Sprint Sırası

Sprint 1 (MVP):

1. Auth + role seed
2. Dynamic form metadata yönetimi (DB + admin seed)
3. Tek aktif form tipi: izin formu
4. Draft + submit
5. 3 adımlı role-based workflow
6. Bekleyen onaylar + onay/red/iade
7. Audit log

Generic başlaması gerekenler:

- `form_types`, `form_fields`, `workflow_*`, `form_request_*`, `authorization_matrix`, `audit_logs`

Geçici sabit kalabilecekler:

- İlk form tipi seed ile tek aktif (`LEAVE_REQUEST`)
- Dynamic rule engine ilk sürümde role/user atamasıyla sınırlı

## 10) Kritik Riskler ve Önlemler

- Çift onay riski: `concurrency_token` + transaction + pending status check
- Yetki bypass riski: approval aksiyonunda assignee doğrulaması zorunlu
- JSON esnekliği nedeniyle rapor zorluğu: kritik rapor alanları için materialized view/read model planı
- Büyük veri performansı: approval queue ve audit için hedefli index + arşivleme politikası

## 11) Bu Revizyonda Eklenen Kod Parçaları

- Business kontratları:
  - `FormfleksBaseApp.Application/DynamicForms/Business/Contracts/*`
  - `FormfleksBaseApp.Application/DynamicForms/Business/Services/*`
- DataAccess:
  - `FormfleksBaseApp.Infrastructure/DynamicForms/DataAccess/DynamicFormsDbContext.cs`
  - `FormfleksBaseApp.Infrastructure/DynamicForms/DataAccess/Entities/DynamicFormsEntities.cs`
  - `FormfleksBaseApp.Infrastructure/DynamicForms/DataAccess/Services/DynamicFormServices.cs`
- Web:
  - `FormfleksBaseApp.Api/Controllers/DynamicFormsController.cs`
- DI bağlama:
  - `FormfleksBaseApp.Api/Program.cs`
- Şema:
  - `db/schema/V2026030503__dynamic_forms_platform.sql`

