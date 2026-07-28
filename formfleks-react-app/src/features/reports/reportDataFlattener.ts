import type { HrFormDetailItemDto } from '@/services/report.service';

export function formatDateValue(value: string | null | undefined): string {
  if (!value) return '-';

  // Check if it's an ISO date string like 2026-08-02T21:00:00.000Z
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (isoMatch) {
    const [, year, month, day, hour, min] = isoMatch;
    if (hour === '00' && min === '00') {
      return `${day}.${month}.${year}`;
    }
    return `${day}.${month}.${year} ${hour}:${min}`;
  }

  // Short format matching (M/D/YY or M/D/YY H:MM) - typical JS/C# short date
  const shortMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?: (\d{1,2}):(\d{2}))?/.exec(value);
  if (shortMatch) {
    const m = shortMatch[1].padStart(2, '0');
    const d = shortMatch[2].padStart(2, '0');
    let y = shortMatch[3];
    if (y.length === 2) y = '20' + y;
    
    if (shortMatch[4] !== undefined) {
      const h = shortMatch[4].padStart(2, '0');
      const min = shortMatch[5].padStart(2, '0');
      return `${d}.${m}.${y} ${h}:${min}`;
    }
    
    return `${d}.${m}.${y}`;
  }
  // Standalone time matching (H:MM or HH:MM or HH.MM)
  const timeMatch = /^(\d{1,2})[:.](\d{2})$/.exec(value.trim());
  if (timeMatch) {
    const h = timeMatch[1].padStart(2, '0');
    const m = timeMatch[2];
    return `${h}:${m}`;
  }

  return value;
}

export function isJsonArray(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.startsWith('[') && trimmed.endsWith(']');
}

export function tryParseJsonArray(value: string): Record<string, string>[] | null {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      return parsed.filter((row: Record<string, string>) => {
        const keys = Object.keys(row).filter(k => k !== '__KEY__');
        return keys.length > 0;
      });
    }
  } catch { /* not valid JSON */ }
  return null;
}

export function getStatusLabel(status: number): string {
  switch (status) {
    case 1: return 'Taslak';
    case 2: return 'Onay Bekliyor';
    case 3: return 'Onay Bekliyor';
    case 4: return 'Onaylandı';
    case 5: return 'Reddedildi';
    case 6: return 'İptal Edildi';
    case 7: return 'Revizyon Bekliyor';
    default: return `Durum ${status}`;
  }
}

export interface FlattenedReportResult {
  columns: { dataField: string; caption: string; isGrid: boolean }[];
  dataSource: any[];
}

export function flattenFormTypeData(items: HrFormDetailItemDto[]): FlattenedReportResult {
  const scalarKeys = new Set<string>();
  let hasGridData = false;
  const allGridRows: { parentIndex: number; gridRow: Record<string, string> }[] = [];
  const gridColumnLabels = new Map<string, string>();

  items.forEach((item, idx) => {
    if (!item.formValues) return;
    Object.entries(item.formValues).forEach(([label, value]) => {
      if (isJsonArray(value)) {
        hasGridData = true;
        const parsed = tryParseJsonArray(value);
        if (parsed) {
          parsed.forEach(gridRow => {
            allGridRows.push({ parentIndex: idx, gridRow });
            Object.keys(gridRow).forEach(k => {
              if (k !== '__KEY__' && !gridColumnLabels.has(k)) {
                const realLabel = item.gridColumnLabels?.[k] || k;
                gridColumnLabels.set(k, realLabel);
              }
            });
          });
        }
      } else {
        scalarKeys.add(label);
      }
    });
  });

  let scalarKeyArray = Array.from(scalarKeys);
  
  const referenceItem = items.find(i => i.orderedFieldLabels && i.orderedFieldLabels.length > 0);
  if (referenceItem?.orderedFieldLabels) {
    const orderList = referenceItem.orderedFieldLabels;
    scalarKeyArray.sort((a, b) => {
      let idxA = orderList.indexOf(a);
      let idxB = orderList.indexOf(b);
      if (idxA === -1) idxA = 9999;
      if (idxB === -1) idxB = 9999;
      return idxA - idxB;
    });
  }

  const gridKeys = Array.from(gridColumnLabels.keys());

  const columns: { dataField: string; caption: string; isGrid: boolean }[] = [
    { dataField: 'formRequestNo', caption: 'Talep No', isGrid: false },
    { dataField: 'requestorName', caption: 'Talebi Oluşturan', isGrid: false },
    { dataField: 'subjectPersonName', caption: 'İlgili Kişi', isGrid: false },
    { dataField: 'createdAt', caption: 'Oluşturma Tarihi', isGrid: false },
    { dataField: 'completedAt', caption: 'Tamamlanma Tarihi', isGrid: false },
    { dataField: 'statusLabel', caption: 'Durum', isGrid: false }
  ];

  scalarKeyArray.forEach(k => {
    columns.push({ dataField: `scalar_${k}`, caption: k, isGrid: false });
  });

  if (hasGridData) {
    gridKeys.forEach(k => {
      columns.push({ dataField: `grid_${k}`, caption: gridColumnLabels.get(k) || k, isGrid: true });
    });
  }

  const dataSource: any[] = [];
  
  items.forEach((item, itemIdx) => {
    const baseRow: any = {
      formRequestNo: item.formRequestNo,
      requestorName: item.requestorName,
      subjectPersonName: item.subjectPersonName || '-',
      createdAt: formatDateValue(item.createdAt),
      completedAt: item.completedAt ? formatDateValue(item.completedAt) : '-',
      statusLabel: getStatusLabel(item.status),
      originalItem: item
    };

    scalarKeyArray.forEach(k => {
      baseRow[`scalar_${k}`] = formatDateValue(item.formValues?.[k]);
    });

    if (hasGridData) {
      const itemGridRows = allGridRows.filter(r => r.parentIndex === itemIdx);
      if (itemGridRows.length > 0) {
        itemGridRows.forEach((gr) => {
          const row = { ...baseRow };
          gridKeys.forEach(k => {
            row[`grid_${k}`] = formatDateValue(gr.gridRow[k]);
          });
          dataSource.push(row);
        });
      } else {
        const row = { ...baseRow };
        gridKeys.forEach(k => { row[`grid_${k}`] = '-'; });
        dataSource.push(row);
      }
    } else {
      dataSource.push(baseRow);
    }
  });

  return { columns, dataSource };
}
