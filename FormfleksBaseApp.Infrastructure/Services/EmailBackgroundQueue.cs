using System.Threading.Channels;
using FormfleksBaseApp.Application.Common.Models;

namespace FormfleksBaseApp.Infrastructure.Services;

public interface IEmailBackgroundQueue
{
    ValueTask QueueEmailAsync(EmailMessage message, CancellationToken cancellationToken = default);
    ValueTask<EmailMessage> DequeueEmailAsync(CancellationToken cancellationToken = default);
}

public class EmailBackgroundQueue : IEmailBackgroundQueue
{
    private readonly Channel<EmailMessage> _queue;

    public EmailBackgroundQueue()
    {
        // Kapasite sınırlaması, bellek şişmesini önler.
        var options = new BoundedChannelOptions(1000)
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _queue = Channel.CreateBounded<EmailMessage>(options);
    }

    public async ValueTask QueueEmailAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(message);
        await _queue.Writer.WriteAsync(message, cancellationToken);
    }

    public async ValueTask<EmailMessage> DequeueEmailAsync(CancellationToken cancellationToken = default)
    {
        return await _queue.Reader.ReadAsync(cancellationToken);
    }
}
