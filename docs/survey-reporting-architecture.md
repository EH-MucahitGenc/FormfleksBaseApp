# Survey Reporting Architecture

## Scope and status

This document is the contract for the scalable survey reporting core. The current delivery implements active AppUser targeting, immutable organization snapshots, aggregate reporting, participant paging, identified response access, segment suppression, crosstabs, paged text responses, quality indicators, and permission-separated exports.

The following are intentionally recorded as later phases rather than represented as complete: durable asynchronous export jobs, saved filter views, audit-log persistence for every identified view/download, complementary-cell and differencing-query protection, human-reviewed text coding, longitudinal metric definitions, and a reporting read model/cache for very large installations.

## Identity and snapshot model

- `AppUser` is the only identity authority for campaign recipients. New campaigns can target active users only.
- QDMS data is enrichment data. It can provide company, location, department, title, and personnel-group values but never creates survey identities.
- `SurveyAssignment.UserId` is an AppUser identifier.
- The assignment stores display name, email, organization labels, snapshot time, and source at campaign processing time.
- A response copies only organization dimensions required for analysis. Anonymous responses do not copy identity fields.
- Historical reports use snapshots. Legacy assignments without a snapshot may use a controlled current-directory fallback and expose the fallback source so that consumers do not mistake it for historical data.
- A user becoming inactive or moving organization after publication does not alter an existing assignment or response report.

## Metric dictionary

| Metric | Numerator | Denominator |
| --- | --- | --- |
| Participation rate | Completed assignments | Assigned users |
| Start conversion | Started or completed assignments | Assigned users |
| Start-to-completion | Completed assignments | Started or completed assignments |
| Question answer rate | Valid responses for the question | Respondents eligible to see the question |
| Single-choice option percent | Respondents selecting the option | Valid respondents to the question |
| Multi-select participant percent | Respondents selecting the option | Valid respondents to the question |
| Multi-select selection percent | Selections of the option | All selections for the question |
| Segment participation | Completed assignments in segment | Assigned users in segment |
| NPS | Promoter percent minus detractor percent | Valid 0-10 responses |

Reports return numerator, denominator, valid count, and missing count where applicable. Corporate census campaigns do not display a classical sampling margin of error by default; coverage, representation, and nonresponse risk are reported instead.

## API contract

- `GET /admin/campaigns/{id}/analytics/overview`: campaign metadata, funnel, trend, timing, quality summary, and question aggregates.
- `GET /admin/campaigns/{id}/analytics/segments?dimension=department`: company, location, department, title, or personnel-group participation.
- `GET /admin/campaigns/{id}/analytics/crosstab?questionId={id}&dimension=department`: question-by-organization rows, counts, row percentages, and eligible chi-square/Cramer's V output.
- `GET /admin/campaigns/{id}/analytics/questions/{questionId}/text`: bounded, searchable text-response paging with anonymous PII masking.
- `GET /admin/campaigns/{id}/participants`: identified-only, server-paged participant explorer with search and organization/status filters.
- `GET /admin/campaigns/{id}/participant-response?assignmentId={id}`: identified-only response detail.
- `GET /admin/campaigns/{id}/export`: aggregate CSV by default; identity columns require the separate identified-export permission.

Page sizes are bounded by the backend. Anonymous restrictions and suppression are enforced before DTO creation and are not delegated to the browser.

## Authorization matrix

| Capability | Permission |
| --- | --- |
| Aggregate results | `Surveys.Results.View` or existing campaign access |
| Aggregate export | `Surveys.Results.Export` |
| Identified response | `Surveys.Results.ViewIdentified` or survey management permission |
| Identified export | `Surveys.Results.ExportIdentified` or survey management permission |
| Data-quality details | `Surveys.Results.ViewDataQuality` |
| Text coding | `Surveys.Results.ManageTextCoding` |
| Privacy configuration | `Surveys.Results.ManagePrivacy` |

Owning a campaign does not make an anonymous response identifiable. Anonymous campaigns reject participant and single-response queries regardless of administrator status.

## Privacy threat model

Protected identifiers include names, email addresses, AppUser IDs, assignment IDs, receipt codes, exact timestamps, direct organization combinations, and personal information entered into free text.

Controls implemented now:

- Anonymous DTOs omit identity and exact-time fields.
- Anonymous segment, crosstab, and text results are suppressed below a minimum group size of 10.
- Anonymous organization analysis uses response snapshots without joining back to AppUser.
- Anonymous text applies basic email and phone masking before transport.
- Identified access and identified export have separate permission checks.
- Anonymous CSV is aggregate-only.

Required hardening before arbitrary self-service filter composition:

- Use a centrally configured threshold with a safe minimum.
- Add complementary-cell suppression and stable rounding.
- Canonicalize filter sets and audit near-identical queries to reduce differencing attacks.
- Apply a production PII detection pipeline and analyst review to anonymous free text.
- Persist identified-view and file-download audit events.

## Query and performance design

- EF queries use `AsNoTracking`, projection, SQL grouping, and bounded paging.
- The overview no longer loads every answer for the campaign into a single in-memory list.
- Only the values required for a selected statistic are materialized per question.
- Text answers and participants are separate paged endpoints.
- Indexes cover campaign/status, campaign/submission time, campaign/organization dimensions, response user, and answer question/response access.
- The participant explorer supports thousands of users without rendering or transporting the entire result set.

For sustained workloads above the transactional database's reporting budget, introduce a versioned read model (facts for responses/answers and dimensions for question, organization, and date), filter-hash caching, and invalidation by campaign response version. This should be measured first, not added speculatively.

## Statistical rules

- Median, mode, standard deviation, quartiles, range, top/bottom box, and NPS are calculated only from valid numeric values.
- Multi-select participant percentages and selection percentages remain separate.
- Chi-square is returned only when the contingency table is suitable and every expected cell is at least five; Cramer's V accompanies a valid test.
- Multi-select crosstabs do not report chi-square because selections from one respondent are not independent.
- Small anonymous rows are suppressed before statistics are returned.
- Quality flags inform filtering but never delete raw responses.

## Migration and backward compatibility

Migration `20260826114816_AddSurveyReportingSnapshots` adds assignment timing and snapshot columns and marks old rows with `LegacyCurrentFallback`. Migration `20260826120856_AddSurveyReportingAnalytics` adds privacy-preserving organization snapshots to responses and reporting indexes.

Existing campaign and fill routes remain in place. The former result route remains compatible while `analytics/overview` provides the reporting-oriented alias. Old assignments continue to resolve through controlled fallback; new assignments and responses use snapshots.

## Delivery phases

1. Completed core: AppUser identity authority, snapshots, indexes, bounded participant/text queries, aggregate metrics, funnel/trend, question statistics, segment suppression, crosstab statistics, quality summary, permission-separated details and CSV.
2. Next security phase: persistent audit events, complementary suppression, differencing-query controls, configurable privacy policy, and expanded authorization integration tests.
3. Next scale phase: durable queued CSV/XLSX jobs, expiring object storage, job status/download endpoints, cancellation, and load tests at 10,000 and 50,000 responses.
4. Next analysis phase: shared URL filter model, saved views, crosstab builder UI, matrix/date/file visualizations, analyst-reviewed text themes, and quality-rule comparison views.
5. Later comparison phase: stable `QuestionMetricDefinition`, campaign comparability validation, period trends, and executive action tracking.

Each later phase must preserve the anonymous API boundary and remain deployable independently.
