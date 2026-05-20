import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { X, UploadCloud, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { FfButton } from '@/components/ui';

export interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: { dataField: string; caption: string }[];
  onImport: (mappedData: any[]) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, columns, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // { gridDataField: excelHeader }
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setExcelHeaders([]);
      setExcelData([]);
      setMapping({});
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // raw data arrays
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        
        if (data.length < 2) {
          setError("Seçilen Excel dosyasında yeterli veri bulunamadı (En az başlık ve 1 satır veri olmalıdır).");
          return;
        }

        // Kurumsal formlarda ilk satırlarda "Başlık" veya birleşmiş hücreler olabilir.
        // En çok dolu hücreye sahip olan satırı "Başlık (Header) Satırı" olarak kabul et (ilk 10 satıra bak)
        let headerRowIndex = 0;
        let maxCells = 0;
        const maxRowsToCheck = Math.min(data.length, 10);
        
        for (let i = 0; i < maxRowsToCheck; i++) {
          const row = data[i] || [];
          const cellCount = row.filter(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '').length;
          if (cellCount > maxCells) {
            maxCells = cellCount;
            headerRowIndex = i;
          }
        }

        const headers = (data[headerRowIndex] || []) as string[];
        const validHeadersForMapping = headers.map(h => (h || '').toString().trim()).filter(h => h.length > 0);
        
        // Sadece header satırından sonrasını al ve İLK BOŞ SATIRDA DUR (Böylece alt kısımdaki form imzaları/footer gelmez)
        const rows: Record<string, any>[] = [];
        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i] as any[];
          if (!row || row.length === 0) break; // Boş satıra geldik, tablo bitti.
          
          const hasData = row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
          if (!hasData) break; // Tamamen boş satır, tablo bitti.

          const rowObj: Record<string, any> = {};
          headers.forEach((h, colIndex) => {
            const hStr = (h || '').toString().trim();
            if (hStr) {
              rowObj[hStr] = row[colIndex];
            }
          });
          rows.push(rowObj);
        }

        setExcelHeaders(validHeadersForMapping);
        setExcelData(rows);

        // Auto-map based on similar names
        const autoMapping: Record<string, string> = {};
        columns.forEach(col => {
          const colCaption = (col.caption || '').toLowerCase().trim();
          const match = validHeadersForMapping.find(h => h.toLowerCase().trim() === colCaption || h.toLowerCase().trim().includes(colCaption) || colCaption.includes(h.toLowerCase().trim()));
          if (match) {
            autoMapping[col.dataField] = match;
          }
        });
        setMapping(autoMapping);
        
      } catch (err) {
        setError("Dosya okunurken bir hata oluştu. Lütfen geçerli bir Excel dosyası seçtiğinizden emin olun.");
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = () => {
    const mappedResult = excelData.map(row => {
      const newRow: any = {};
      let hasMappedData = false;
      columns.forEach(col => {
        const excelColName = mapping[col.dataField];
        if (excelColName && row[excelColName] !== undefined && row[excelColName] !== null && row[excelColName].toString().trim() !== '') {
          newRow[col.dataField] = row[excelColName];
          hasMappedData = true;
        }
      });
      return hasMappedData ? newRow : null;
    }).filter(row => row !== null);

    onImport(mappedResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f172a]/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-base rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-brand-primary/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-dark">Excel'den Veri Aktar</h2>
              <p className="text-xs text-brand-gray">Tablonuzu otomatik olarak doldurmak için Excel yükleyin</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-muted rounded-full text-brand-gray">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!file && (
            <div 
              className="border-2 border-dashed border-surface-muted hover:border-brand-primary bg-surface-hover/30 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
              <UploadCloud className="h-12 w-12 text-brand-gray mb-4" />
              <h3 className="text-base font-bold text-brand-dark mb-1">Dosyayı Seçin veya Sürükleyin</h3>
              <p className="text-sm text-brand-gray">.xlsx veya .xls formatında Excel dosyası yükleyin</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-start gap-3 text-status-danger">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {file && !error && excelHeaders.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-status-success/5 border border-status-success/20 rounded-lg">
                <div className="flex items-center gap-3 text-status-success">
                  <CheckCircle className="h-5 w-5" />
                  <div>
                    <div className="font-bold text-sm">Dosya Başarıyla Okundu</div>
                    <div className="text-xs opacity-80">{file.name} ({excelData.length} Satır Bulundu)</div>
                  </div>
                </div>
                <FfButton variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Dosyayı Değiştir
                </FfButton>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-brand-dark mb-3">Kolon Eşleştirmeleri</h3>
                <p className="text-xs text-brand-gray mb-4">Formdaki kolonların Excel'deki hangi kolonlara karşılık geldiğini kontrol edin.</p>
                
                <div className="space-y-3">
                  {columns.map(col => {
                    const mappedValue = mapping[col.dataField] || '';
                    return (
                      <div key={col.dataField} className="flex items-center gap-4 p-3 border border-surface-muted rounded-lg bg-surface-hover/30">
                        <div className="flex-1 font-semibold text-sm text-brand-dark">
                          {col.caption}
                        </div>
                        <ArrowRight className="h-4 w-4 text-brand-gray shrink-0" />
                        <div className="flex-1">
                          <select 
                            className="w-full p-2 text-sm border border-surface-muted rounded-md focus:border-brand-primary outline-none bg-surface-base"
                            value={mappedValue}
                            onChange={(e) => setMapping({ ...mapping, [col.dataField]: e.target.value })}
                          >
                            <option value="">-- Veri Aktarma --</option>
                            {excelHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-surface-muted bg-surface-base flex justify-end gap-3">
          <FfButton variant="ghost" onClick={onClose}>
            İptal
          </FfButton>
          <FfButton 
            variant="primary" 
            onClick={handleImport}
            disabled={!file || excelHeaders.length === 0}
          >
            Verileri Tabloya Aktar
          </FfButton>
        </div>
      </div>
    </div>
  );
};
