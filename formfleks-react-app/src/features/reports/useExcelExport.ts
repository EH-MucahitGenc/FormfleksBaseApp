import ExcelJS from 'exceljs';
import type { HrSummaryReportDto, TrendMetricDto } from '@/services/report.service';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const BRAND = {
  darkNavy:   '1E3A5F',
  midBlue:    '2D6A9F',
  lightBlue:  'D6E8F7',
  approved:   { bg: 'D4EDDA', fg: '155724' },
  rejected:   { bg: 'F8D7DA', fg: '721C24' },
  draft:      { bg: 'E2E3E5', fg: '383D41' },
  zebraLight: 'F0F7FF',
  white:      'FFFFFF',
  headerFg:   'FFFFFF',
};

// ─── Helper Functions ──────────────────────────────────────────────────────────
function colHeader(ws: ExcelJS.Worksheet, row: number, cols: { header: string; key: string; width: number }[]) {
  const r = ws.getRow(row);
  cols.forEach((c, i) => {
    const cell = r.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: 'Calibri', bold: true, color: { argb: 'FF' + BRAND.headerFg }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.darkNavy } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF' + BRAND.darkNavy } },
      bottom: { style: 'medium', color: { argb: 'FF' + BRAND.darkNavy } },
      left: { style: 'thin', color: { argb: 'FF' + BRAND.lightBlue } },
      right: { style: 'thin', color: { argb: 'FF' + BRAND.lightBlue } },
    };
    ws.getColumn(i + 1).width = c.width;
  });
  r.height = 32;
  r.commit();
}

function dataRow(ws: ExcelJS.Worksheet, rowIndex: number, values: (string | number)[], isZebra: boolean) {
  const r = ws.getRow(rowIndex);
  const bg = isZebra ? BRAND.zebraLight : BRAND.white;
  values.forEach((v, i) => {
    const cell = r.getCell(i + 1);
    cell.value = v;
    cell.font = { name: 'Calibri', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
    cell.alignment = { vertical: 'middle', horizontal: typeof v === 'number' ? 'center' : 'left' };
    cell.border = {
      bottom: { style: 'hair', color: { argb: 'FFD0D8E4' } },
      right:  { style: 'hair', color: { argb: 'FFD0D8E4' } },
    };
  });
  r.height = 20;
  r.commit();
}

function approvalRateCell(cell: ExcelJS.Cell, rate: number) {
  cell.value = rate / 100;
  cell.numFmt = '0%';
  cell.font = { name: 'Calibri', bold: true, size: 10 };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  if (rate >= 80) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.approved.bg } };
    cell.font = { ...cell.font, color: { argb: 'FF' + BRAND.approved.fg } };
  } else if (rate >= 50) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
    cell.font = { ...cell.font, color: { argb: 'FF856404' } };
  } else {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.rejected.bg } };
    cell.font = { ...cell.font, color: { argb: 'FF' + BRAND.rejected.fg } };
  }
}

function sectionTitle(ws: ExcelJS.Worksheet, row: number, title: string, colSpan: number) {
  const r = ws.getRow(row);
  const cell = r.getCell(1);
  cell.value = title;
  cell.font = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FF' + BRAND.darkNavy } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.lightBlue } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.mergeCells(row, 1, row, colSpan);
  r.height = 28;
  r.commit();
}

function totalRow(ws: ExcelJS.Worksheet, rowIndex: number, values: (string | number | null)[], numCols: number) {
  const r = ws.getRow(rowIndex);
  values.forEach((v, i) => {
    const cell = r.getCell(i + 1);
    cell.value = v ?? '';
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF' + BRAND.headerFg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.midBlue } };
    cell.alignment = { horizontal: typeof v === 'number' ? 'center' : 'left', vertical: 'middle' };
    if (i > 0) cell.border = { top: { style: 'medium', color: { argb: 'FF' + BRAND.darkNavy } } };
  });
  for (let i = values.length; i < numCols; i++) {
    const cell = r.getCell(i + 1);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.midBlue } };
  }
  r.height = 24;
  r.commit();
}

// ─── Sheet Builders ───────────────────────────────────────────────────────────

function buildSummarySheet(wb: ExcelJS.Workbook, data: HrSummaryReportDto[], filters: FilterInfo) {
  const ws = wb.addWorksheet('🏆 Yönetici Özeti');
  ws.views = [{ showGridLines: false }];

  const totalForms    = data.reduce((s,c) => s + c.totalForms, 0);
  const totalApproved = data.reduce((s,c) => s + c.totalApproved, 0);
  const totalRejected = data.reduce((s,c) => s + c.totalRejected, 0);
  const totalDraft    = data.reduce((s,c) => s + c.totalDraft, 0);
  const approvalRate  = totalForms > 0 ? Math.round((totalApproved / totalForms) * 100) : 0;
  const uniquePersons = new Set(data.map(d => d.requestorUserId)).size;

  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 18;

  // Title block
  ws.mergeCells('B2:G2');
  const titleCell = ws.getCell('B2');
  titleCell.value = 'FORMFLEKS — İK FORM ANALİZ RAPORU';
  titleCell.font = { name: 'Calibri', bold: true, size: 18, color: { argb: 'FF' + BRAND.headerFg } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.darkNavy } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 46;

  ws.mergeCells('B3:G3');
  const subtitleCell = ws.getCell('B3');
  subtitleCell.value = `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}`;
  subtitleCell.font = { name: 'Calibri', italic: true, size: 11, color: { argb: 'FF' + BRAND.headerFg } };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.midBlue } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 22;

  // Filter info
  ws.getRow(4).height = 12;
  ws.mergeCells('B5:G5');
  const filterCell = ws.getCell('B5');
  const filterText = [
    filters.location    ? `📍 Şube: ${filters.location}` : null,
    filters.department  ? `🏢 Departman: ${filters.department}` : null,
    filters.personName  ? `👤 Personel: ${filters.personName}` : null,
    filters.dateLabel   ? `📅 Dönem: ${filters.dateLabel}` : null,
  ].filter(Boolean).join('   |   ') || '📅 Dönem: Tüm Zamanlar — Tüm Şube/Departman/Personel';
  filterCell.value = filterText;
  filterCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF' + BRAND.darkNavy } };
  filterCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.lightBlue } };
  filterCell.alignment = { horizontal: 'center', vertical: 'middle' };
  filterCell.border = { bottom: { style: 'thin', color: { argb: 'FF' + BRAND.midBlue } } };
  ws.getRow(5).height = 22;

  ws.getRow(6).height = 16;

  // KPI Cards
  const kpis = [
    { label: '📋 Toplam Form', value: totalForms, bg: BRAND.midBlue, fg: BRAND.white },
    { label: '👥 Aktif Personel', value: uniquePersons, bg: '10855E', fg: BRAND.white },
    { label: '✅ Onaylanan', value: totalApproved, bg: BRAND.approved.bg, fg: BRAND.approved.fg },
    { label: '❌ Reddedilen', value: totalRejected, bg: BRAND.rejected.bg, fg: BRAND.rejected.fg },
    { label: '📝 Taslak', value: totalDraft, bg: BRAND.draft.bg, fg: BRAND.draft.fg },
    { label: '📊 Onay Oranı', value: `%${approvalRate}`, bg: approvalRate>=80?BRAND.approved.bg:approvalRate>=50?'FFF3CD':BRAND.rejected.bg, fg: approvalRate>=80?BRAND.approved.fg:approvalRate>=50?'856404':BRAND.rejected.fg },
  ];

  const kpiCols = ['B','C','D','E','F','G'];
  kpis.forEach((kpi, i) => {
    const col = kpiCols[i];
    ws.mergeCells(`${col}7:${col}8`);
    const labelCell = ws.getCell(`${col}7`);
    labelCell.value = kpi.label;
    labelCell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF' + kpi.fg } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + kpi.bg } };
    labelCell.alignment = { horizontal: 'center', vertical: 'bottom' };

    ws.mergeCells(`${col}9:${col}10`);
    const valueCell = ws.getCell(`${col}9`);
    valueCell.value = kpi.value;
    valueCell.font = { name: 'Calibri', bold: true, size: 20, color: { argb: 'FF' + kpi.fg } };
    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + kpi.bg } };
    valueCell.alignment = { horizontal: 'center', vertical: 'top' };

    ws.getRow(7).height = 22;
    ws.getRow(8).height = 0;
    ws.getRow(9).height = 36;
    ws.getRow(10).height = 0;
  });
}

function buildPersonnelSheet(wb: ExcelJS.Workbook, data: HrSummaryReportDto[]) {
  const ws = wb.addWorksheet('👥 Personel Karnesi');
  ws.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }];

  const cols = [
    { header: '#', key: 'no', width: 5 },
    { header: 'Personel Adı', key: 'name', width: 24 },
    { header: 'Departman', key: 'dept', width: 22 },
    { header: 'Şube', key: 'loc', width: 20 },
    { header: 'Form Tipi', key: 'form', width: 28 },
    { header: 'Toplam', key: 'total', width: 10 },
    { header: '✅ Onaylanan', key: 'appr', width: 13 },
    { header: '❌ Reddedilen', key: 'rej', width: 13 },
    { header: '📝 Taslak', key: 'draft', width: 12 },
    { header: '📊 Onay Oranı', key: 'rate', width: 14 },
  ];
  colHeader(ws, 1, cols);

  let rowIdx = 2;
  data.forEach((item, i) => {
    const rate = item.totalForms > 0 ? Math.round((item.totalApproved / item.totalForms) * 100) : 0;
    const isZebra = i % 2 === 0;
    dataRow(ws, rowIdx, [i+1, item.fullName, item.department, item.location, item.formTypeName, item.totalForms, item.totalApproved, item.totalRejected, item.totalDraft, ''], isZebra);
    approvalRateCell(ws.getRow(rowIdx).getCell(10), rate);
    rowIdx++;
  });

  // Total row
  const tot = { forms: data.reduce((s,c)=>s+c.totalForms,0), appr: data.reduce((s,c)=>s+c.totalApproved,0), rej: data.reduce((s,c)=>s+c.totalRejected,0), draft: data.reduce((s,c)=>s+c.totalDraft,0) };
  const totalRate = tot.forms > 0 ? Math.round((tot.appr/tot.forms)*100) : 0;
  totalRow(ws, rowIdx, ['', 'GENEL TOPLAM', '', '', '', tot.forms, tot.appr, tot.rej, tot.draft, `%${totalRate}`], 10);
}

function buildDepartmentSheet(wb: ExcelJS.Workbook, data: HrSummaryReportDto[]) {
  const ws = wb.addWorksheet('🏢 Departman Analizi');
  ws.views = [{ state: 'frozen', ySplit: 2, showGridLines: false }];

  sectionTitle(ws, 1, '  DEPARTMAN BAZLI FORM ANALİZİ', 7);
  colHeader(ws, 2, [
    { header: '#', key: 'no', width: 5 },
    { header: 'Departman', key: 'dept', width: 30 },
    { header: 'Şube', key: 'loc', width: 22 },
    { header: 'Toplam Form', key: 'total', width: 14 },
    { header: '✅ Onaylanan', key: 'appr', width: 14 },
    { header: '❌ Reddedilen', key: 'rej', width: 14 },
    { header: '📊 Onay Oranı', key: 'rate', width: 14 },
  ]);

  const grouped: Record<string, { location: string; total: number; approved: number; rejected: number }> = {};
  data.forEach(d => {
    const k = `${d.location}__${d.department}`;
    if (!grouped[k]) grouped[k] = { location: d.location, total: 0, approved: 0, rejected: 0 };
    grouped[k].total    += d.totalForms;
    grouped[k].approved += d.totalApproved;
    grouped[k].rejected += d.totalRejected;
  });

  let rowIdx = 3;
  const sorted = Object.entries(grouped).sort((a,b)=>b[1].total-a[1].total);
  sorted.forEach(([key, g], i) => {
    const dept = key.split('__')[1];
    const rate = g.total > 0 ? Math.round((g.approved/g.total)*100) : 0;
    dataRow(ws, rowIdx, [i+1, dept, g.location, g.total, g.approved, g.rejected, ''], i%2===0);
    approvalRateCell(ws.getRow(rowIdx).getCell(7), rate);
    rowIdx++;
  });

  const tTotal   = data.reduce((s,c)=>s+c.totalForms,0);
  const tApproved= data.reduce((s,c)=>s+c.totalApproved,0);
  const tRejected= data.reduce((s,c)=>s+c.totalRejected,0);
  const tRate    = tTotal>0?Math.round((tApproved/tTotal)*100):0;
  totalRow(ws, rowIdx, ['','TOPLAM','',tTotal,tApproved,tRejected,`%${tRate}`], 7);
}

function buildLocationSheet(wb: ExcelJS.Workbook, data: HrSummaryReportDto[]) {
  const ws = wb.addWorksheet('📍 Şube Karşılaştırması');
  ws.views = [{ state: 'frozen', ySplit: 2, showGridLines: false }];

  sectionTitle(ws, 1, '  ŞUBE (LOKASYON) BAZLI KARŞILAŞTIRMA', 7);
  colHeader(ws, 2, [
    { header: '#', key: 'no', width: 5 },
    { header: 'Şube / Lokasyon', key: 'loc', width: 28 },
    { header: 'Aktif Personel', key: 'prs', width: 16 },
    { header: 'Toplam Form', key: 'total', width: 14 },
    { header: '✅ Onaylanan', key: 'appr', width: 14 },
    { header: '❌ Reddedilen', key: 'rej', width: 14 },
    { header: '📊 Onay Oranı', key: 'rate', width: 14 },
  ]);

  const locMap: Record<string, { persons: Set<string>; total: number; approved: number; rejected: number }> = {};
  data.forEach(d => {
    const k = d.location || 'Tanımlanmamış';
    if (!locMap[k]) locMap[k] = { persons: new Set(), total: 0, approved: 0, rejected: 0 };
    locMap[k].persons.add(d.requestorUserId);
    locMap[k].total    += d.totalForms;
    locMap[k].approved += d.totalApproved;
    locMap[k].rejected += d.totalRejected;
  });

  let rowIdx = 3;
  Object.entries(locMap).sort((a,b)=>b[1].total-a[1].total).forEach(([loc,g],i) => {
    const rate = g.total>0 ? Math.round((g.approved/g.total)*100) : 0;
    dataRow(ws, rowIdx, [i+1, loc, g.persons.size, g.total, g.approved, g.rejected, ''], i%2===0);
    approvalRateCell(ws.getRow(rowIdx).getCell(7), rate);
    rowIdx++;
  });

  const tTotal   = data.reduce((s,c)=>s+c.totalForms,0);
  const tApproved= data.reduce((s,c)=>s+c.totalApproved,0);
  const tRejected= data.reduce((s,c)=>s+c.totalRejected,0);
  const tPrs     = new Set(data.map(d=>d.requestorUserId)).size;
  const tRate    = tTotal>0?Math.round((tApproved/tTotal)*100):0;
  totalRow(ws, rowIdx, ['','GENEL TOPLAM',tPrs,tTotal,tApproved,tRejected,`%${tRate}`], 7);
}

function buildTrendSheet(wb: ExcelJS.Workbook, trendData: TrendMetricDto[]) {
  const ws = wb.addWorksheet('📈 Trend Verisi');
  ws.views = [{ state: 'frozen', ySplit: 2, showGridLines: false }];

  sectionTitle(ws, 1, '  GÜNLÜK AKTİVİTE TRENDİ (Grafik için hazır veri)', 3);
  colHeader(ws, 2, [
    { header: 'Tarih', key: 'date', width: 20 },
    { header: 'Talep Sayısı', key: 'count', width: 18 },
    { header: 'Açıklama', key: 'note', width: 30 },
  ]);

  if (trendData.length === 0) {
    const r = ws.getRow(3);
    r.getCell(1).value = 'Bu dönem için trend verisi bulunamadı.';
    r.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
    ws.mergeCells(3, 1, 3, 3);
    return;
  }

  const maxVal = Math.max(...trendData.map(t=>t.requestCount));
  trendData.forEach((t, i) => {
    const isZebra = i%2===0;
    dataRow(ws, i+3, [t.dateLabel, t.requestCount, t.requestCount === maxVal ? '🔺 En Yüksek Gün' : ''], isZebra);
    if (t.requestCount === maxVal) {
      const cell = ws.getRow(i+3).getCell(2);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF3CD' } };
      cell.font = { bold: true, color: { argb: 'FF856404' }, size: 10, name: 'Calibri' };
    }
  });
}

// ─── Export Params Interface ───────────────────────────────────────────────────
export interface FilterInfo {
  location?:   string;
  department?: string;
  personName?: string;
  dateLabel?:  string;
}

export interface ExcelExportParams {
  summaryData:  HrSummaryReportDto[];
  trendData:    TrendMetricDto[];
  filters:      FilterInfo;
}

// ─── Main Export Function ──────────────────────────────────────────────────────
export async function exportHrReportToExcel(params: ExcelExportParams): Promise<void> {
  const { summaryData, trendData, filters } = params;

  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Formfleks IK Raporlama';
  wb.created  = new Date();
  wb.modified = new Date();
  wb.properties.date1904 = false;

  buildSummarySheet(wb, summaryData, filters);
  buildPersonnelSheet(wb, summaryData);
  buildDepartmentSheet(wb, summaryData);
  buildLocationSheet(wb, summaryData);
  buildTrendSheet(wb, trendData);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g,'-');
  const filterSlug = [filters.location, filters.department, filters.personName].filter(Boolean).join('_') || 'Tum';
  const filename = `Formfleks_IK_Rapor_${filterSlug}_${dateStr}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
