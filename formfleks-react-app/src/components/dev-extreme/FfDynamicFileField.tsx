import { useState, useRef } from 'react';
import { UploadCloud, File, X, AlertCircle, Loader2 } from 'lucide-react';
import { fileService } from '@/services/file.service';

interface FfDynamicFileFieldProps {
  fieldKey: string;
  label: string;
  isRequired?: boolean;
  value?: string; // Kaydedilmiş mevcut URL
  onValueChanged?: (e: { value: string | null }) => void;
  optionsJson?: string;
  readonly?: boolean;
}

export const FfDynamicFileField = ({
  label,
  isRequired,
  value,
  onValueChanged,
  optionsJson,
  readonly
}: FfDynamicFileFieldProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ayarları parse et
  let maxSizeMB = 10;
  let allowedExts = '.pdf,.png,.jpg,.jpeg';
  if (optionsJson) {
    try {
      const parsed = JSON.parse(optionsJson);
      if (parsed.maxSizeMB) maxSizeMB = parsed.maxSizeMB;
      if (parsed.allowedExtensions) allowedExts = parsed.allowedExtensions;
    } catch {}
  }
  const allowedArray = allowedExts.split(',').map(e => e.trim().toLowerCase());

  const handleFileSelect = async (file: File) => {
    setError(null);

    // Validate extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedArray.includes(extension) && allowedExts !== '*') {
      setError(`Sadece ${allowedExts} uzantılı dosyalar yüklenebilir.`);
      return;
    }

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Dosya boyutu en fazla ${maxSizeMB} MB olabilir.`);
      return;
    }

    try {
      setIsUploading(true);
      const res = await fileService.uploadFile(file);
      onValueChanged?.({ value: res.url }); // Sadece URL kaydediliyor
    } catch (err) {
      setError('Dosya yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (readonly) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const clearFile = () => {
    if (readonly) return;
    onValueChanged?.({ value: null });
    setError(null);
  };

  return (
    <div className="w-full flex flex-col gap-1.5 mb-5">
      {label && (
        <label className="text-sm font-semibold text-brand-dark flex items-center justify-between">
          <span>
            {label}
            {isRequired && <span className="text-status-danger ml-1">*</span>}
          </span>
          <span className="text-xs text-brand-gray opacity-70">
            Maks: {maxSizeMB}MB
          </span>
        </label>
      )}

      {value ? (
        // Dosya yüklendiyse gösterilecek alan
        <div className="relative flex items-center gap-4 p-4 border border-surface-muted bg-surface-base rounded-xl shadow-sm group transition-all hover:border-brand-primary/30">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-brand-primary/10 text-brand-primary">
            <File className="h-6 w-6" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <a 
              href={value.startsWith('http') ? value : `https://localhost:7127${value}`} 
              target="_blank" 
              rel="noreferrer"
              className="text-sm font-bold text-brand-dark truncate hover:text-brand-primary transition-colors"
              title="Dosyayı Görüntüle"
            >
              Yüklenen Dosya
            </a>
            <span className="text-xs text-brand-gray truncate">
              {value.split('/').pop()}
            </span>
          </div>
          {!readonly && (
            <button 
              type="button"
              onClick={clearFile}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-surface-hover text-brand-gray hover:bg-status-danger/10 hover:text-status-danger transition-colors shrink-0"
              title="Dosyayı Sil"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        // Dropzone
        <div 
          className={`
            relative w-full p-8 flex flex-col items-center justify-center text-center 
            border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer
            ${readonly ? 'opacity-60 cursor-not-allowed bg-surface-muted border-surface-muted' : ''}
            ${isDragging ? 'border-brand-primary bg-brand-primary/5 scale-[1.02]' : 'border-surface-muted bg-surface-hover/50 hover:bg-surface-hover'}
            ${error ? 'border-status-danger/50 bg-status-danger/5' : ''}
          `}
          onDragOver={(e) => { e.preventDefault(); !readonly && setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
          onClick={() => !readonly && fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept={allowedExts} 
            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
            disabled={readonly || isUploading}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in duration-300">
              <Loader2 className="h-10 w-10 text-brand-primary animate-spin" />
              <p className="text-sm font-bold text-brand-dark">Dosya Yükleniyor...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className={`p-3 rounded-full mb-2 ${error ? 'bg-status-danger/10 text-status-danger' : 'bg-surface-base text-brand-gray shadow-sm'}`}>
                {error ? <AlertCircle className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
              </div>
              <p className="text-sm font-bold text-brand-dark">
                {error ? error : "Dosyayı buraya sürükleyin veya seçin"}
              </p>
              {!error && (
                <p className="text-xs font-medium text-brand-gray/70">
                  {allowedExts} formatında en fazla {maxSizeMB}MB
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
