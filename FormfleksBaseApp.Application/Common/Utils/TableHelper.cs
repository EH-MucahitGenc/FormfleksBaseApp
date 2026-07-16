using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations.Schema;
using System.Reflection;

namespace FormfleksBaseApp.Application.Common.Utils;

public static class TableHelper
{
    private static readonly ConcurrentDictionary<Type, string> _tableNameCache = new();

    public static string GetTableName<T>()
    {
        return _tableNameCache.GetOrAdd(typeof(T), type =>
        {
            var tableAttribute = type.GetCustomAttribute<TableAttribute>();
            if (tableAttribute != null)
            {
                if (!string.IsNullOrWhiteSpace(tableAttribute.Schema))
                {
                    // PostgreSQL'de şema kullanıldığında genellikle schema.table_name formatında yazılır.
                    return $"{tableAttribute.Schema}.{tableAttribute.Name}";
                }
                return tableAttribute.Name;
            }

            // Fallback: Sınıfın adı
            return type.Name;
        });
    }
}
