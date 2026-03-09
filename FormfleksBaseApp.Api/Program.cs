using FluentValidation;
using FormfleksBaseApp.Api.ExceptionHandling;
using FormfleksBaseApp.Api.Health;
using FormfleksBaseApp.Api.Middlewares;
using FormfleksBaseApp.Api.Options;
using FormfleksBaseApp.Api.Services;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Auth.Services;
using FormfleksBaseApp.Application.Common.Behaviors;
using FormfleksBaseApp.Application.Integrations.Oracle;
using FormfleksBaseApp.Application.Integrations.Oracle.CompanyPersons;
using FormfleksBaseApp.Infrastructure.Integrations.Oracle;
using FormfleksBaseApp.Infrastructure.Integrations.Oracle.CompanyPersons;
using FormfleksBaseApp.Infrastructure.Options;
using FormfleksBaseApp.Infrastructure.Persistence;
using FormfleksBaseApp.Infrastructure.Repositories.Auth;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using System.Text;

using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
builder.Host.UseSerilog((context, loggerConfig) =>
{
    loggerConfig
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console();
});

// Controllers + ValidationProblemDetails (ModelState)
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var problemDetails = new ValidationProblemDetails(context.ModelState)
            {
                Title = "Validation failed",
                Status = StatusCodes.Status400BadRequest,
                Instance = context.HttpContext.Request.Path
            };

            problemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;

            if (context.HttpContext.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var cid) && cid is not null)
                problemDetails.Extensions["correlationId"] = cid.ToString();

            return new BadRequestObjectResult(problemDetails)
            {
                ContentTypes = { "application/problem+json" }
            };
        };
    });

// Options
builder.Services.Configure<LdapOptions>(builder.Configuration.GetSection("LDAP"));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));

// ? Oracle ConnectionString'i ConnectionStrings'ten okuyup DI'a sabit instance olarak bas
var oracleConnStr = builder.Configuration.GetConnectionString("Oracle");
if (string.IsNullOrWhiteSpace(oracleConnStr))
    throw new InvalidOperationException("ConnectionStrings:Oracle missing");

builder.Services.AddSingleton(new OracleOptions
{
    ConnectionString = oracleConnStr
});

// JWT Auth
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection.GetValue<string>("Key") ?? throw new InvalidOperationException("Jwt:Key missing");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = jwtSection.GetValue<string>("Issuer"),
            ValidAudience = jwtSection.GetValue<string>("Audience"),
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),

            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin", "ADMIN", "admin"));
    options.AddPolicy("HasAppRole", policy => policy.RequireAuthenticatedUser());
    options.AddPolicy("AdminOrHr", policy => policy.RequireRole("Admin", "ADMIN", "admin", "HumanResources", "IK", "IK-Admin", "HR"));
});

// MediatR + FluentValidation + Pipeline
FormfleksBaseApp.Application.DependencyInjection.AddApplicationServices(builder.Services);

// Ek: Infrastructure projesinde bulunan CQRS Handler'larını (GetRequestDetailedQueryHandler vb.) da kaydet.
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(FormfleksBaseApp.DynamicForms.Infrastructure.Queries.GetRequestDetailedQueryHandler).Assembly);
});

builder.Services.AddValidatorsFromAssembly(typeof(FormfleksBaseApp.Application.AssemblyMarker).Assembly);
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

// EF Core (Postgres)
builder.Services.AddScoped<FormfleksBaseApp.Application.Common.Interfaces.IVisitorRepository, FormfleksBaseApp.Infrastructure.Persistence.Repositories.VisitorRepository>();
builder.Services.AddScoped<FormfleksBaseApp.Application.Common.Interfaces.IVisitorRepository, FormfleksBaseApp.Infrastructure.Persistence.Repositories.VisitorRepository>();
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddDbContext<FormfleksBaseApp.DynamicForms.DataAccess.DynamicFormsDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// DynamicForms Services (tek s�n�f, 4 interface)
builder.Services.AddScoped<FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Services.DynamicFormServices>();
builder.Services.AddScoped<FormfleksBaseApp.DynamicForms.Business.Services.IFormDefinitionService>(sp =>
    sp.GetRequiredService<FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Services.DynamicFormServices>());
builder.Services.AddScoped<FormfleksBaseApp.DynamicForms.Business.Services.IFormTemplateAdminService>(sp =>
    sp.GetRequiredService<FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Services.DynamicFormServices>());
builder.Services.AddScoped<FormfleksBaseApp.DynamicForms.Business.Services.IFormRequestService>(sp =>
    sp.GetRequiredService<FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Services.DynamicFormServices>());
builder.Services.AddScoped<FormfleksBaseApp.DynamicForms.Business.Services.IApprovalService>(sp =>
    sp.GetRequiredService<FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Services.DynamicFormServices>());
builder.Services.AddScoped<FormfleksBaseApp.Application.DynamicForms.Business.Services.IAuditLogService, FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Services.AuditLogService>();

// Repositories / Services
builder.Services.AddScoped<IAuthTokenIssuer, AuthTokenIssuer>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<FormfleksBaseApp.Application.Features.AdminUsers.Interfaces.IAdminUserRepository, FormfleksBaseApp.Infrastructure.Repositories.AdminUsers.AdminUserRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasherAdapter>();

builder.Services.AddScoped<IActiveDirectoryAuthenticator, LdapActiveDirectoryAuthenticator>();

// Oracle integration
builder.Services.AddScoped<IOracleConnectionFactory, OracleConnectionFactory>();
builder.Services.AddScoped<ITrautCompanyPersonRepository, TrautCompanyPersonRepository>();

// Global Exception Handler + ProblemDetails
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = ctx =>
    {
        ctx.ProblemDetails.Instance = ctx.HttpContext.Request.Path;
        ctx.ProblemDetails.Extensions["traceId"] = ctx.HttpContext.TraceIdentifier;

        if (ctx.HttpContext.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var cid) && cid is not null)
            ctx.ProblemDetails.Extensions["correlationId"] = cid.ToString();
    };
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.CustomSchemaIds(t => t.FullName);

    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "JWT Bearer token. Example: Bearer {token}"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Health Checks
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy("API OK"), tags: new[] { "live" })
    .AddNpgSql(builder.Configuration.GetConnectionString("Default")!, name: "postgres", tags: new[] { "ready" })
    .AddCheck<OracleHealthCheck>("oracle", tags: new[] { "ready" });

var app = builder.Build();

// Pipeline s?ras?
app.UseMiddleware<FormfleksBaseApp.Api.Middleware.GlobalExceptionMiddleware>();
app.UseMiddleware<CorrelationIdMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = r => r.Tags.Contains("live"),
    ResponseWriter = HealthCheckResponseWriter.WriteResponse
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = r => r.Tags.Contains("ready"),
    ResponseWriter = HealthCheckResponseWriter.WriteResponse
});

app.MapControllers();

app.Run();



