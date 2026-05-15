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
using FormfleksBaseApp.Application.Integrations.Oracle.QdmsPersonel;
using FormfleksBaseApp.Infrastructure.Integrations.Oracle.QdmsPersonel;
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

// CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

// Options
builder.Services.Configure<LdapOptions>(builder.Configuration.GetSection("LDAP"));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<FormfleksBaseApp.Application.Common.Models.EmailSettings>(builder.Configuration.GetSection("EmailSettings"));

// ? Oracle ConnectionString'i ConnectionStrings'ten okuyup DI'a sabit instance olarak bas
var oracleConnStr = builder.Configuration.GetConnectionString("Oracle");
if (string.IsNullOrWhiteSpace(oracleConnStr))
    throw new InvalidOperationException("ConnectionStrings:Oracle missing");

builder.Services.Configure<OracleOptions>(opts =>
{
    opts.ConnectionString = oracleConnStr;
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

builder.Services.AddAuthorization();
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationPolicyProvider, FormfleksBaseApp.Api.Authorization.PermissionPolicyProvider>();
builder.Services.AddScoped<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, FormfleksBaseApp.Api.Authorization.PermissionAuthorizationHandler>();

// MediatR + FluentValidation + Pipeline
FormfleksBaseApp.Application.DependencyInjection.AddApplicationServices(builder.Services);

builder.Services.AddValidatorsFromAssembly(typeof(FormfleksBaseApp.Application.AssemblyMarker).Assembly);
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

// EF Core (Postgres)
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddDbContext<FormfleksBaseApp.DynamicForms.DataAccess.DynamicFormsDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
    
builder.Services.AddScoped<FormfleksBaseApp.Application.Common.Interfaces.IDynamicFormsDbContext>(sp =>
    sp.GetRequiredService<FormfleksBaseApp.DynamicForms.DataAccess.DynamicFormsDbContext>());

// Repositories / Services
builder.Services.AddScoped<IAuthTokenIssuer, AuthTokenIssuer>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<FormfleksBaseApp.Application.Features.AdminUsers.Interfaces.IAdminUserRepository, FormfleksBaseApp.Infrastructure.Repositories.AdminUsers.AdminUserRepository>();
builder.Services.AddScoped<FormfleksBaseApp.Application.Common.Interfaces.IRolePermissionRepository, FormfleksBaseApp.Infrastructure.Persistence.Repositories.RolePermissionRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasherAdapter>();
builder.Services.AddTransient<FormfleksBaseApp.Infrastructure.Persistence.Seeders.PermissionSeeder>();

builder.Services.AddScoped<IActiveDirectoryAuthenticator, LdapActiveDirectoryAuthenticator>();

// Email & Background Queue
builder.Services.AddSingleton<FormfleksBaseApp.Infrastructure.Services.IEmailBackgroundQueue, FormfleksBaseApp.Infrastructure.Services.EmailBackgroundQueue>();
builder.Services.AddHostedService<FormfleksBaseApp.Infrastructure.Services.EmailSenderBackgroundWorker>();
builder.Services.AddScoped<FormfleksBaseApp.Application.Common.Interfaces.IEmailService, FormfleksBaseApp.Infrastructure.Services.EmailService>();
builder.Services.AddScoped<FormfleksBaseApp.Application.Common.Interfaces.IPdfGeneratorService, FormfleksBaseApp.Infrastructure.Services.PdfGeneratorService>();
builder.Services.AddScoped<FormfleksBaseApp.Application.Common.Interfaces.IFormAttachmentCollectorService, FormfleksBaseApp.Infrastructure.Services.FormAttachmentCollectorService>();

// Oracle integration
builder.Services.AddScoped<IOracleConnectionFactory, OracleConnectionFactory>();
builder.Services.AddScoped<ITrautCompanyPersonRepository, TrautCompanyPersonRepository>();
builder.Services.AddScoped<IQdmsPersonelAktarimRepository, QdmsPersonelAktarimRepository>();

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

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    c.IncludeXmlComments(xmlPath);
});

// Health Checks
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy("API OK"), tags: new[] { "live" })
    .AddNpgSql(builder.Configuration.GetConnectionString("Default")!, name: "postgres", tags: new[] { "ready" })
    .AddCheck<OracleHealthCheck>("oracle", tags: new[] { "ready" });

var app = builder.Build();

// Pipeline sırası
app.UseExceptionHandler();
app.UseMiddleware<CorrelationIdMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseCors("AllowAll");

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

// Execute Database Seeders
using (var scope = app.Services.CreateScope())
{
    try
    {
        var permissionSeeder = scope.ServiceProvider.GetRequiredService<FormfleksBaseApp.Infrastructure.Persistence.Seeders.PermissionSeeder>();
        await permissionSeeder.SeedAsync();
    }
    catch (Exception ex)
    {
        Log.Error(ex, "An error occurred while seeding the database.");
    }
}

app.Run();



