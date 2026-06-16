namespace FormfleksBaseApp.Application.Common.Exceptions;

public class WorkflowManualAssignmentRequiredException : System.Exception
{
    public int StepNo { get; }
    public string StepName { get; }
    public string Reason { get; }

    public WorkflowManualAssignmentRequiredException(int stepNo, string stepName, string reason)
        : base($"Step {stepNo} ({stepName}) requires manual assignment: {reason}")
    {
        StepNo = stepNo;
        StepName = stepName;
        Reason = reason;
    }
}
