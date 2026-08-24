using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Entities.Surveys;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Infrastructure.Surveys.DataAccess;

public class SurveyDbContext : DbContext, ISurveyDbContext
{
    public SurveyDbContext(DbContextOptions<SurveyDbContext> options) : base(options)
    {
    }

    public DbSet<SurveyTemplate> SurveyTemplates => Set<SurveyTemplate>();
    public DbSet<SurveyTemplateVersion> SurveyTemplateVersions => Set<SurveyTemplateVersion>();
    public DbSet<SurveyVersionSection> SurveyVersionSections => Set<SurveyVersionSection>();
    public DbSet<SurveyVersionQuestion> SurveyVersionQuestions => Set<SurveyVersionQuestion>();
    public DbSet<SurveyQuestionOption> SurveyQuestionOptions => Set<SurveyQuestionOption>();
    public DbSet<SurveyCampaign> SurveyCampaigns => Set<SurveyCampaign>();
    public DbSet<SurveyAssignment> SurveyAssignments => Set<SurveyAssignment>();
    public DbSet<SurveyResponse> SurveyResponses => Set<SurveyResponse>();
    public DbSet<SurveyAnswer> SurveyAnswers => Set<SurveyAnswer>();
    public DbSet<SurveyResultViewer> SurveyResultViewers => Set<SurveyResultViewer>();
    public DbSet<SurveyAnswerFile> SurveyAnswerFiles => Set<SurveyAnswerFile>();
    public DbSet<SurveyParticipationGuard> SurveyParticipationGuards => Set<SurveyParticipationGuard>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditRules();
        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Map all entities to snake_case table names and columns, and configure relations
        
        modelBuilder.Entity<SurveyTemplate>(e =>
        {
            e.ToTable("survey_templates");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);
            
            e.Property(x => x.Title).HasColumnName("title").IsRequired().HasMaxLength(200);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.DefaultIsAnonymous).HasColumnName("default_is_anonymous");
        });

        modelBuilder.Entity<SurveyTemplateVersion>(e =>
        {
            e.ToTable("survey_template_versions");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);
            
            e.Property(x => x.SurveyTemplateId).HasColumnName("survey_template_id");
            e.Property(x => x.VersionNumber).HasColumnName("version_number");
            e.Property(x => x.IsPublished).HasColumnName("is_published");
            e.Property(x => x.PublishedAt).HasColumnName("published_at");
            e.Property(x => x.PublishedByUserId).HasColumnName("published_by_user_id");
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(1000);

            e.HasOne(x => x.SurveyTemplate)
             .WithMany(x => x.Versions)
             .HasForeignKey(x => x.SurveyTemplateId)
             .OnDelete(DeleteBehavior.Cascade);
             
            e.HasIndex(x => new { x.SurveyTemplateId, x.VersionNumber }).IsUnique();
        });

        modelBuilder.Entity<SurveyVersionSection>(e =>
        {
            e.ToTable("survey_version_sections");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);
            
            e.Property(x => x.SurveyTemplateVersionId).HasColumnName("survey_template_version_id");
            e.Property(x => x.Title).HasColumnName("title").IsRequired().HasMaxLength(200);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.SortOrder).HasColumnName("sort_order");

            e.HasOne(x => x.SurveyTemplateVersion)
             .WithMany(x => x.Sections)
             .HasForeignKey(x => x.SurveyTemplateVersionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SurveyVersionQuestion>(e =>
        {
            e.ToTable("survey_version_questions");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);
            
            e.Property(x => x.SurveyVersionSectionId).HasColumnName("survey_version_section_id");
            e.Property(x => x.QuestionType).HasColumnName("question_type").HasColumnType("smallint");
            e.Property(x => x.Title).HasColumnName("title").IsRequired().HasMaxLength(500);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.IsRequired).HasColumnName("is_required");
            e.Property(x => x.SortOrder).HasColumnName("sort_order");
            e.Property(x => x.SettingsJson).HasColumnName("settings_json").HasColumnType("jsonb");
            e.Property(x => x.VisibilityRuleJson).HasColumnName("visibility_rule_json").HasColumnType("jsonb");

            e.HasOne(x => x.SurveyVersionSection)
             .WithMany(x => x.Questions)
             .HasForeignKey(x => x.SurveyVersionSectionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SurveyQuestionOption>(e =>
        {
            e.ToTable("survey_question_options");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);
            
            e.Property(x => x.SurveyVersionQuestionId).HasColumnName("survey_version_question_id");
            e.Property(x => x.Label).HasColumnName("label").IsRequired().HasMaxLength(200);
            e.Property(x => x.Value).HasColumnName("value").HasMaxLength(200);
            e.Property(x => x.SortOrder).HasColumnName("sort_order");
            e.Property(x => x.IsOtherOption).HasColumnName("is_other_option");

            e.HasOne(x => x.SurveyVersionQuestion)
             .WithMany(x => x.Options)
             .HasForeignKey(x => x.SurveyVersionQuestionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SurveyCampaign>(e =>
        {
            e.ToTable("survey_campaigns");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);
            
            e.Property(x => x.SurveyTemplateVersionId).HasColumnName("survey_template_version_id");
            e.Property(x => x.Title).HasColumnName("title").IsRequired().HasMaxLength(200);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.IsAnonymous).HasColumnName("is_anonymous");
            e.Property(x => x.Status).HasColumnName("status").HasColumnType("smallint");
            e.Property(x => x.StartDate).HasColumnName("start_date");
            e.Property(x => x.EndDate).HasColumnName("end_date");
            e.Property(x => x.EmailSubject).HasColumnName("email_subject").HasMaxLength(250);
            e.Property(x => x.EmailBodyTemplate).HasColumnName("email_body_template");

            e.HasOne(x => x.SurveyTemplateVersion)
             .WithMany(x => x.Campaigns)
             .HasForeignKey(x => x.SurveyTemplateVersionId)
             .OnDelete(DeleteBehavior.Restrict); // Published version should not be easily deleted if has campaign
        });

        modelBuilder.Entity<SurveyAssignment>(e =>
        {
            e.ToTable("survey_assignments");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);
            
            e.Property(x => x.SurveyCampaignId).HasColumnName("survey_campaign_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Token).HasColumnName("token");
            e.Property(x => x.Status).HasColumnName("status").HasColumnType("smallint");
            e.Property(x => x.EmailSentAt).HasColumnName("email_sent_at");
            e.Property(x => x.CompletedAt).HasColumnName("completed_at");

            e.HasOne(x => x.SurveyCampaign)
             .WithMany(x => x.Assignments)
             .HasForeignKey(x => x.SurveyCampaignId)
             .OnDelete(DeleteBehavior.Cascade);
             
            e.HasIndex(x => x.Token).IsUnique();
            e.HasIndex(x => new { x.SurveyCampaignId, x.UserId }).IsUnique();
        });

        modelBuilder.Entity<SurveyResponse>(e =>
        {
            e.ToTable("survey_responses");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);
            
            e.Property(x => x.SurveyCampaignId).HasColumnName("survey_campaign_id");
            e.Property(x => x.SurveyAssignmentId).HasColumnName("survey_assignment_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.StartedAt).HasColumnName("started_at");
            e.Property(x => x.SubmittedAt).HasColumnName("submitted_at");

            e.HasOne(x => x.SurveyCampaign)
             .WithMany(x => x.Responses)
             .HasForeignKey(x => x.SurveyCampaignId)
             .OnDelete(DeleteBehavior.Cascade);
             
            e.HasOne(x => x.SurveyAssignment)
             .WithMany()
             .HasForeignKey(x => x.SurveyAssignmentId)
             .OnDelete(DeleteBehavior.SetNull); // Keeping response if assignment is deleted? Better SetNull
        });

        modelBuilder.Entity<SurveyAnswer>(e =>
        {
            e.ToTable("survey_answers");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);
            
            e.Property(x => x.SurveyResponseId).HasColumnName("survey_response_id");
            e.Property(x => x.SurveyVersionQuestionId).HasColumnName("survey_version_question_id");
            e.Property(x => x.ValueText).HasColumnName("value_text");
            e.Property(x => x.ValueNumber).HasColumnName("value_number").HasColumnType("numeric(18,6)");
            e.Property(x => x.ValueDate).HasColumnName("value_date");
            e.Property(x => x.ValueJson).HasColumnName("value_json").HasColumnType("jsonb");

            e.HasOne(x => x.SurveyResponse)
             .WithMany(x => x.Answers)
             .HasForeignKey(x => x.SurveyResponseId)
             .OnDelete(DeleteBehavior.Cascade);
             
            e.HasOne(x => x.SurveyVersionQuestion)
             .WithMany()
             .HasForeignKey(x => x.SurveyVersionQuestionId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SurveyResultViewer>(e =>
        {
            e.ToTable("survey_result_viewers");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);
            
            e.Property(x => x.SurveyCampaignId).HasColumnName("survey_campaign_id");
            e.Property(x => x.UserId).HasColumnName("user_id");

            e.HasOne(x => x.SurveyCampaign)
             .WithMany(x => x.ResultViewers)
             .HasForeignKey(x => x.SurveyCampaignId)
             .OnDelete(DeleteBehavior.Cascade);
             
            e.HasIndex(x => new { x.SurveyCampaignId, x.UserId }).IsUnique();
        });

        modelBuilder.Entity<SurveyAnswerFile>(e =>
        {
            e.ToTable("survey_answer_files");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);
            
            e.Property(x => x.SurveyAnswerId).HasColumnName("survey_answer_id");
            e.Property(x => x.FileName).HasColumnName("file_name").IsRequired().HasMaxLength(255);
            e.Property(x => x.FilePath).HasColumnName("file_path").IsRequired().HasMaxLength(1000);
            e.Property(x => x.ContentType).HasColumnName("content_type").HasMaxLength(100);
            e.Property(x => x.FileSize).HasColumnName("file_size");

            e.HasOne(x => x.SurveyAnswer)
             .WithMany(x => x.Files)
             .HasForeignKey(x => x.SurveyAnswerId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SurveyParticipationGuard>(e =>
        {
            e.ToTable("survey_participation_guards");
            e.HasKey(x => x.Token);
            e.Property(x => x.Token).HasColumnName("token");
            e.Property(x => x.CompletedAt).HasColumnName("completed_at").HasColumnType("timestamp with time zone");
        });
    }

    private static void ConfigureBaseEntity<TEntity>(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> e)
        where TEntity : BaseEntity
    {
        e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid").ValueGeneratedNever();
        e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("CURRENT_TIMESTAMP").ValueGeneratedOnAdd();
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").IsRequired(false);
        e.Property(x => x.Active).HasColumnName("active").HasColumnType("boolean").HasDefaultValue(true);
    }

    private void ApplyAuditRules()
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.Id == Guid.Empty)
                    entry.Entity.Id = Guid.NewGuid();

                entry.Entity.UpdatedAt = null;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Property(x => x.CreatedAt).IsModified = false;
                entry.Entity.UpdatedAt = now;
            }
        }
    }
}
