using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.Text.Json;
using FormfleksBaseApp.Web.Auth;
using FormfleksBaseApp.Web.Models;

namespace FormfleksBaseApp.Web.Services;

public sealed class ApiClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly AuthTokenStore _tokenStore;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public ApiClient(IHttpClientFactory httpClientFactory, IConfiguration configuration, AuthTokenStore tokenStore)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _tokenStore = tokenStore;
    }

    private HttpClient Client
    {
        get
        {
            var client = _httpClientFactory.CreateClient("Api");
            if (!string.IsNullOrWhiteSpace(_tokenStore.AccessToken))
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _tokenStore.AccessToken);

            return client;
        }
    }
    public string ApiBaseUrl => _configuration["Api:BaseUrl"] ?? "(undefined)";

    public async Task<ApiCallResult<FormfleksBaseApp.Contracts.Auth.LoginResponse>> AdLoginAsync(FormfleksBaseApp.Contracts.Auth.LoginRequest request, CancellationToken ct)
    {
        try
        {
            var resp = await Client.PostAsJsonAsync("/api/auth/ad-login", request, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                return new ApiCallResult<FormfleksBaseApp.Contracts.Auth.LoginResponse>
                {
                    Success = false,
                    StatusCode = (int)resp.StatusCode,
                    Error = $"AD login failed. HTTP {(int)resp.StatusCode}. {body}"
                };
            }

            var data = await resp.Content.ReadFromJsonAsync<FormfleksBaseApp.Contracts.Auth.LoginResponse>(JsonOptions, ct);
            if (data is null)
            {
                return new ApiCallResult<FormfleksBaseApp.Contracts.Auth.LoginResponse>
                {
                    Success = false,
                    Error = "AD login response is empty."
                };
            }

            return new ApiCallResult<FormfleksBaseApp.Contracts.Auth.LoginResponse> { Success = true, Data = data, StatusCode = (int)resp.StatusCode };
        }
        catch (Exception ex)
        {
            return new ApiCallResult<FormfleksBaseApp.Contracts.Auth.LoginResponse>
            {
                Success = false,
                Error = $"API call error ({ApiBaseUrl}): {ex.Message}"
            };
        }
    }

    public async Task<ApiCallResult<bool>> PingAsync(CancellationToken ct)
    {
        try
        {
            var resp = await Client.GetAsync("/health/live", ct);
            return new ApiCallResult<bool>
            {
                Success = resp.IsSuccessStatusCode,
                Data = resp.IsSuccessStatusCode,
                StatusCode = (int)resp.StatusCode,
                Error = resp.IsSuccessStatusCode ? null : $"Ping failed with HTTP {(int)resp.StatusCode}"
            };
        }
        catch (Exception ex)
        {
            return new ApiCallResult<bool>
            {
                Success = false,
                Error = $"API ping error ({ApiBaseUrl}): {ex.Message}"
            };
        }
    }

    public async Task<FormDefinitionDto?> GetFormDefinitionAsync(string formCode, CancellationToken ct)
    {
        var resp = await Client.GetAsync($"/api/dynamic-forms/{formCode}", ct);
        if (!resp.IsSuccessStatusCode)
            return null;

        return await resp.Content.ReadFromJsonAsync<FormDefinitionDto>(JsonOptions, ct);
    }

    public async Task<ApiCallResult<FormDefinitionDto>> GetFormDefinitionDetailedAsync(string formCode, CancellationToken ct)
    {
        try
        {
            var resp = await Client.GetAsync($"/api/dynamic-forms/{formCode}", ct);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                return new ApiCallResult<FormDefinitionDto>
                {
                    Success = false,
                    StatusCode = (int)resp.StatusCode,
                    Error = $"Form definition failed. HTTP {(int)resp.StatusCode}. {body}"
                };
            }

            var data = await resp.Content.ReadFromJsonAsync<FormDefinitionDto>(JsonOptions, ct);
            return data is null
                ? new ApiCallResult<FormDefinitionDto> { Success = false, Error = "Form definition response is empty." }
                : new ApiCallResult<FormDefinitionDto> { Success = true, Data = data, StatusCode = (int)resp.StatusCode };
        }
        catch (Exception ex)
        {
            return new ApiCallResult<FormDefinitionDto>
            {
                Success = false,
                Error = $"Form definition error: {ex.Message}"
            };
        }
    }

    public async Task<ApiCallResult<FormRequestResultDto>> SaveDraftDetailedAsync(SaveDraftRequestDto request, CancellationToken ct)
    {
        try
        {
            var resp = await Client.PostAsJsonAsync("/api/dynamic-forms/requests/draft", request, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                return new ApiCallResult<FormRequestResultDto>
                {
                    Success = false,
                    StatusCode = (int)resp.StatusCode,
                    Error = $"HTTP {(int)resp.StatusCode}: {body}"
                };
            }

            var data = await resp.Content.ReadFromJsonAsync<FormRequestResultDto>(JsonOptions, ct);
            return data is null
                ? new ApiCallResult<FormRequestResultDto> { Success = false, Error = "Response is empty" }
                : new ApiCallResult<FormRequestResultDto> { Success = true, Data = data, StatusCode = (int)resp.StatusCode };
        }
        catch (Exception ex)
        {
            return new ApiCallResult<FormRequestResultDto> { Success = false, Error = ex.Message };
        }
    }

    public async Task<ApiCallResult<FormRequestResultDto>> SubmitDetailedAsync(SubmitRequestDto request, CancellationToken ct)
    {
        try
        {
            var resp = await Client.PostAsJsonAsync("/api/dynamic-forms/requests/submit", request, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                return new ApiCallResult<FormRequestResultDto>
                {
                    Success = false,
                    StatusCode = (int)resp.StatusCode,
                    Error = $"HTTP {(int)resp.StatusCode}: {body}"
                };
            }

            var data = await resp.Content.ReadFromJsonAsync<FormRequestResultDto>(JsonOptions, ct);
            return data is null
                ? new ApiCallResult<FormRequestResultDto> { Success = false, Error = "Response is empty" }
                : new ApiCallResult<FormRequestResultDto> { Success = true, Data = data, StatusCode = (int)resp.StatusCode };
        }
        catch (Exception ex)
        {
            return new ApiCallResult<FormRequestResultDto> { Success = false, Error = ex.Message };
        }
    }

    public async Task<IReadOnlyList<MyFormRequestListItemDto>> GetMyRequestsAsync(CancellationToken ct)
    {
        var resp = await Client.GetAsync("/api/dynamic-forms/requests/my", ct);
        if (!resp.IsSuccessStatusCode)
            return [];

        var data = await resp.Content.ReadFromJsonAsync<List<MyFormRequestListItemDto>>(JsonOptions, ct);
        return data ?? [];
    }

    public async Task<FormRequestDetailedDto?> GetRequestDetailedAsync(Guid requestId, CancellationToken ct)
    {
        var response = await Client.GetAsync($"/api/dynamic-forms/requests/{requestId}", ct);
        if (!response.IsSuccessStatusCode) return null;

        return await response.Content.ReadFromJsonAsync<FormRequestDetailedDto>(JsonOptions, ct);
    }

    public async Task<IReadOnlyList<PendingApprovalListItemDto>> GetPendingApprovalsAsync(CancellationToken ct)
    {
        var resp = await Client.GetAsync("/api/dynamic-forms/approvals/pending", ct);
        if (!resp.IsSuccessStatusCode)
            return [];

        var data = await resp.Content.ReadFromJsonAsync<List<PendingApprovalListItemDto>>(JsonOptions, ct);
        return data ?? [];
    }

    public async Task<FormRequestResultDto?> ExecuteApprovalActionAsync(ApprovalActionRequestDto request, CancellationToken ct)
    {
        var resp = await Client.PostAsJsonAsync("/api/dynamic-forms/approvals/action", request, ct);
        if (!resp.IsSuccessStatusCode)
            return null;

        return await resp.Content.ReadFromJsonAsync<FormRequestResultDto>(JsonOptions, ct);
    }

    public async Task<IReadOnlyList<FormfleksBaseApp.Contracts.DynamicForms.AuditLogs.AuditLogItemDto>> GetAuditLogsAsync(CancellationToken ct)
    {
        var resp = await Client.GetAsync("/api/dynamic-forms/admin/audit-logs", ct);
        if (!resp.IsSuccessStatusCode)
            return [];

        var data = await resp.Content.ReadFromJsonAsync<List<FormfleksBaseApp.Contracts.DynamicForms.AuditLogs.AuditLogItemDto>>(JsonOptions, ct);
        return data ?? [];
    }

    public async Task<IReadOnlyList<FormTemplateSummaryDto>> GetTemplatesAsync(CancellationToken ct)
    {
        var resp = await Client.GetAsync("/api/dynamic-forms/admin/templates", ct);
        if (!resp.IsSuccessStatusCode)
            return [];

        var data = await resp.Content.ReadFromJsonAsync<List<FormTemplateSummaryDto>>(JsonOptions, ct);
        return data ?? [];
    }

    public async Task<ApiCallResult<FormTemplateSummaryDto>> SetTemplateStatusAsync(
        Guid formTypeId,
        bool active,
        CancellationToken ct)
    {
        try
        {
            using var req = new HttpRequestMessage(
                HttpMethod.Patch,
                $"/api/dynamic-forms/admin/templates/{formTypeId}/status")
            {
                Content = JsonContent.Create(new { active })
            };
            var resp = await Client.SendAsync(req, ct);

            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                return new ApiCallResult<FormTemplateSummaryDto>
                {
                    Success = false,
                    StatusCode = (int)resp.StatusCode,
                    Error = $"Template status update failed. HTTP {(int)resp.StatusCode}. {body}"
                };
            }

            var data = await resp.Content.ReadFromJsonAsync<FormTemplateSummaryDto>(JsonOptions, ct);
            return data is null
                ? new ApiCallResult<FormTemplateSummaryDto> { Success = false, Error = "Template status response is empty." }
                : new ApiCallResult<FormTemplateSummaryDto> { Success = true, Data = data, StatusCode = (int)resp.StatusCode };
        }
        catch (Exception ex)
        {
            return new ApiCallResult<FormTemplateSummaryDto>
            {
                Success = false,
                Error = $"Template status error: {ex.Message}"
            };
        }
    }

    public async Task<IReadOnlyList<RoleLookupDto>> GetRolesAsync(CancellationToken ct)
    {
        var resp = await Client.GetAsync("/api/dynamic-forms/admin/roles", ct);
        if (!resp.IsSuccessStatusCode)
            return [];

        var data = await resp.Content.ReadFromJsonAsync<List<RoleLookupDto>>(JsonOptions, ct);
        return data ?? [];
    }

    // --- Admin Roles ---
    public async Task<IReadOnlyList<FormfleksBaseApp.Application.Features.AdminRoles.Dtos.AdminRoleDto>> GetAdminRolesAsync(CancellationToken ct)
    {
        var resp = await Client.GetAsync("/api/admin/roles", ct);
        if (!resp.IsSuccessStatusCode) return [];
        return await resp.Content.ReadFromJsonAsync<List<FormfleksBaseApp.Application.Features.AdminRoles.Dtos.AdminRoleDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<ApiCallResult<Guid>> CreateRoleAsync(FormfleksBaseApp.Application.Features.AdminRoles.Commands.CreateRole.CreateRoleCommand command, CancellationToken ct)
    {
        var resp = await Client.PostAsJsonAsync("/api/admin/roles", command, ct);
        if (resp.IsSuccessStatusCode)
        {
            var id = await resp.Content.ReadFromJsonAsync<Guid>(JsonOptions, ct);
            return new ApiCallResult<Guid> { Success = true, Data = id };
        }
        return new ApiCallResult<Guid> { Success = false, Error = await resp.Content.ReadAsStringAsync(ct) };
    }

    public async Task<ApiCallResult<bool>> UpdateRoleAsync(Guid id, FormfleksBaseApp.Application.Features.AdminRoles.Commands.UpdateRole.UpdateRoleCommand command, CancellationToken ct)
    {
        var resp = await Client.PutAsJsonAsync($"/api/admin/roles/{id}", command, ct);
        if (resp.IsSuccessStatusCode)
            return new ApiCallResult<bool> { Success = true, Data = true };
        return new ApiCallResult<bool> { Success = false, Error = await resp.Content.ReadAsStringAsync(ct) };
    }

    public async Task<ApiCallResult<bool>> DeleteRoleAsync(Guid id, CancellationToken ct)
    {
        var resp = await Client.DeleteAsync($"/api/admin/roles/{id}", ct);
        if (resp.IsSuccessStatusCode)
            return new ApiCallResult<bool> { Success = true, Data = true };
        return new ApiCallResult<bool> { Success = false, Error = await resp.Content.ReadAsStringAsync(ct) };
    }

    // --- Admin Departments ---
    public async Task<IReadOnlyList<FormfleksBaseApp.Application.Features.AdminDepartments.Dtos.AdminDepartmentDto>> GetAdminDepartmentsAsync(CancellationToken ct)
    {
        var resp = await Client.GetAsync("/api/admin/departments", ct);
        if (!resp.IsSuccessStatusCode) return [];
        return await resp.Content.ReadFromJsonAsync<List<FormfleksBaseApp.Application.Features.AdminDepartments.Dtos.AdminDepartmentDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<ApiCallResult<Guid>> CreateDepartmentAsync(FormfleksBaseApp.Application.Features.AdminDepartments.Commands.CreateDepartment.CreateDepartmentCommand command, CancellationToken ct)
    {
        var resp = await Client.PostAsJsonAsync("/api/admin/departments", command, ct);
        if (resp.IsSuccessStatusCode)
        {
            var id = await resp.Content.ReadFromJsonAsync<Guid>(JsonOptions, ct);
            return new ApiCallResult<Guid> { Success = true, Data = id };
        }
        return new ApiCallResult<Guid> { Success = false, Error = await resp.Content.ReadAsStringAsync(ct) };
    }

    public async Task<ApiCallResult<bool>> UpdateDepartmentAsync(Guid id, FormfleksBaseApp.Application.Features.AdminDepartments.Commands.UpdateDepartment.UpdateDepartmentCommand command, CancellationToken ct)
    {
        var resp = await Client.PutAsJsonAsync($"/api/admin/departments/{id}", command, ct);
        if (resp.IsSuccessStatusCode)
            return new ApiCallResult<bool> { Success = true, Data = true };
        return new ApiCallResult<bool> { Success = false, Error = await resp.Content.ReadAsStringAsync(ct) };
    }

    public async Task<ApiCallResult<bool>> DeleteDepartmentAsync(Guid id, CancellationToken ct)
    {
        var resp = await Client.DeleteAsync($"/api/admin/departments/{id}", ct);
        if (resp.IsSuccessStatusCode)
            return new ApiCallResult<bool> { Success = true, Data = true };
        return new ApiCallResult<bool> { Success = false, Error = await resp.Content.ReadAsStringAsync(ct) };
    }

    public async Task<IReadOnlyList<AdminUserDto>> GetUsersAsync(CancellationToken ct)
    {
        var resp = await Client.GetAsync("/api/admin/users", ct);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync(ct);
            throw new Exception($"HTTP {(int)resp.StatusCode}: {err}");
        }

        var data = await resp.Content.ReadFromJsonAsync<List<AdminUserDto>>(JsonOptions, ct);
        return data ?? [];
    }

    public async Task<bool> UpdateUserAsync(Guid userId, UpdateUserRequest req, CancellationToken ct)
    {
        var resp = await Client.PutAsJsonAsync($"/api/admin/users/{userId}", req, ct);
        return resp.IsSuccessStatusCode;
    }

    public async Task<bool> DeleteUserAsync(Guid userId, CancellationToken ct)
    {
        var resp = await Client.DeleteAsync($"/api/admin/users/{userId}", ct);
        return resp.IsSuccessStatusCode;
    }

    public async Task<IReadOnlyList<RoleLookupItem>> GetUserRolesAsync(CancellationToken ct)
    {
        var resp = await Client.GetAsync("/api/admin/users/roles", ct);
        if (!resp.IsSuccessStatusCode)
            return [];

        var data = await resp.Content.ReadFromJsonAsync<List<RoleLookupItem>>(JsonOptions, ct);
        return data ?? [];
    }

    public async Task<FormTemplateSummaryDto?> SaveTemplateAsync(FormTemplateUpsertDto request, CancellationToken ct)
    {
        var resp = await Client.PostAsJsonAsync("/api/dynamic-forms/admin/templates", request, ct);
        if (!resp.IsSuccessStatusCode)
            return null;

        return await resp.Content.ReadFromJsonAsync<FormTemplateSummaryDto>(JsonOptions, ct);
    }

    public async Task<ApiCallResult<FormTemplateSummaryDto>> SaveTemplateDetailedAsync(FormTemplateUpsertDto request, CancellationToken ct)
    {
        try
        {
            var resp = await Client.PostAsJsonAsync("/api/dynamic-forms/admin/templates", request, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                var authHint = resp.StatusCode == System.Net.HttpStatusCode.Unauthorized
                    ? " Oturum suresi dolmus olabilir, tekrar giris yapin."
                    : string.Empty;
                return new ApiCallResult<FormTemplateSummaryDto>
                {
                    Success = false,
                    StatusCode = (int)resp.StatusCode,
                    Error = $"Template save failed. HTTP {(int)resp.StatusCode}.{authHint} {body}"
                };
            }

            var data = await resp.Content.ReadFromJsonAsync<FormTemplateSummaryDto>(JsonOptions, ct);
            return data is null
                ? new ApiCallResult<FormTemplateSummaryDto> { Success = false, Error = "Template response is empty." }
                : new ApiCallResult<FormTemplateSummaryDto> { Success = true, Data = data, StatusCode = (int)resp.StatusCode };
        }
        catch (Exception ex)
        {
            return new ApiCallResult<FormTemplateSummaryDto>
            {
                Success = false,
                Error = $"Template save error: {ex.Message}"
            };
        }
    }

    public async Task<IReadOnlyList<FormTemplateWorkflowStepUpsertDto>> GetTemplateWorkflowAsync(Guid formTypeId, CancellationToken ct)
    {
        var resp = await Client.GetAsync($"/api/dynamic-forms/admin/templates/{formTypeId}/workflow", ct);
        if (!resp.IsSuccessStatusCode)
            return [];

        var data = await resp.Content.ReadFromJsonAsync<List<FormTemplateWorkflowStepUpsertDto>>(JsonOptions, ct);
        return data ?? [];
    }

    public async Task<ApiCallResult<int>> SaveTemplateWorkflowAsync(
        Guid formTypeId,
        IReadOnlyList<FormTemplateWorkflowStepUpsertDto> steps,
        CancellationToken ct)
    {
        try
        {
            var resp = await Client.PostAsJsonAsync($"/api/dynamic-forms/admin/templates/{formTypeId}/workflow", steps, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                var authHint = resp.StatusCode == System.Net.HttpStatusCode.Unauthorized
                    ? " Oturum suresi dolmus olabilir, tekrar giris yapin."
                    : string.Empty;
                return new ApiCallResult<int>
                {
                    Success = false,
                    StatusCode = (int)resp.StatusCode,
                    Error = $"Workflow save failed. HTTP {(int)resp.StatusCode}.{authHint} {body}"
                };
            }

            var payload = await resp.Content.ReadFromJsonAsync<WorkflowSaveResponseDto>(JsonOptions, ct);
            return new ApiCallResult<int> { Success = true, Data = payload?.StepCount ?? steps.Count };
        }
        catch (Exception ex)
        {
            return new ApiCallResult<int>
            {
                Success = false,
                Error = $"Workflow save error: {ex.Message}"
            };
        }
    }

    private sealed class WorkflowSaveResponseDto
    {
        public int StepCount { get; set; }
    }

    public async Task<IReadOnlyList<FormfleksBaseApp.Contracts.Visitors.VisitorDto>> GetVisitorsAsync(CancellationToken ct)
    {
        var resp = await Client.GetAsync("/api/visitors", ct);
        if (!resp.IsSuccessStatusCode)
            return [];

        var wrapper = await resp.Content.ReadFromJsonAsync<FormfleksBaseApp.Contracts.Common.ApiResponse<List<FormfleksBaseApp.Contracts.Visitors.VisitorDto>>>(JsonOptions, ct);
        return wrapper?.Data ?? [];
    }

    public async Task<ApiCallResult<Guid>> CreateVisitorAsync(FormfleksBaseApp.Contracts.Visitors.CreateVisitorRequestDto request, CancellationToken ct)
    {
        try
        {
            var resp = await Client.PostAsJsonAsync("/api/visitors", request, JsonOptions, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                return new ApiCallResult<Guid>
                {
                    Success = false,
                    StatusCode = (int)resp.StatusCode,
                    Error = $"Visitor creation failed. HTTP {(int)resp.StatusCode}. {body}"
                };
            }

            var wrapper = await resp.Content.ReadFromJsonAsync<FormfleksBaseApp.Contracts.Common.ApiResponse<Guid>>(JsonOptions, ct);
            return new ApiCallResult<Guid> { Success = wrapper?.Succeeded ?? false, Data = wrapper?.Data ?? Guid.Empty, Error = wrapper?.Error?.Message ?? wrapper?.Messages?.FirstOrDefault() };
        }
        catch (Exception ex)
        {
            return new ApiCallResult<Guid> { Success = false, Error = ex.Message };
        }
    }
}

public sealed class AdminUserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = [];
    public bool IsActive { get; set; }
}

public sealed class RoleLookupItem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public sealed class UpdateUserRequest
{
    public string? DisplayName { get; set; }
    public List<Guid>? RoleIds { get; set; }
}
