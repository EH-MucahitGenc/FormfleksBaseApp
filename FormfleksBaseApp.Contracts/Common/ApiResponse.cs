using System.Text.Json.Serialization;

namespace FormfleksBaseApp.Contracts.Common;

public class ApiResponse<T>
{
    public bool Succeeded { get; set; }
    public T? Data { get; set; }
    public List<string> Messages { get; set; } = new();

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Error? Error { get; set; }

    public ApiResponse()
    {
    }

    public ApiResponse(T data, string message = "")
    {
        Succeeded = true;
        Data = data;
        if (!string.IsNullOrEmpty(message))
            Messages.Add(message);
    }

    public static ApiResponse<T> Success(T data, string message = "")
    {
        return new ApiResponse<T>(data, message);
    }

    public static ApiResponse<T> Fail(string message, Error? error = null)
    {
        var response = new ApiResponse<T> { Succeeded = false, Error = error };
        if (!string.IsNullOrEmpty(message))
            response.Messages.Add(message);
        return response;
    }
}
