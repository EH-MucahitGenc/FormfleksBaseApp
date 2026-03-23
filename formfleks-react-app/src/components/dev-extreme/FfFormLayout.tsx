import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import TextBox from 'devextreme-react/text-box';
import DateBox from 'devextreme-react/date-box';
import { cn } from '../ui';

// ----------------------------------------------------------------------
// FormSection
// ----------------------------------------------------------------------

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, description, children, className }) => {
  return (
    <div className={cn("flex flex-col gap-6 py-6 border-b border-surface-muted last:border-0", className)}>
      {(title || description) && (
        <div className="flex flex-col gap-1">
          {title && <h3 className="text-lg font-semibold text-brand-dark">{title}</h3>}
          {description && <p className="text-sm text-brand-gray">{description}</p>}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Controlled Form Fields (React Hook Form + DevExpress Adapters)
// NOTE: Use the dedicated wrapper components (FfTextBox, FfSelectBox, etc.) with FfField instead for new development.
// ----------------------------------------------------------------------

export interface FfFieldProps {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  mode?: 'text' | 'password' | 'email' | 'search' | 'tel' | 'url';
}

const FieldWrapper: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode; className?: string }> = ({ 
  label, required, error, children, className 
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-brand-dark flex items-center gap-1">
        {label}
        {required && <span className="text-status-danger">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-status-danger mt-1">{error}</span>}
    </div>
  );
};

export const FfTextField: React.FC<FfFieldProps> = ({ name, label, required, placeholder, className, disabled, mode }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, ...restField }, fieldState: { error } }) => (
        <FieldWrapper label={label} required={required} error={error?.message} className={className}>
          <TextBox
            {...restField}
            value={value || ''}
            onValueChanged={(e) => {
              if (e.value !== value) {
                onChange(e.value);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            mode={mode || "text"}
            stylingMode="outlined"
            className={cn("w-full transition-all", error ? "border-status-danger" : "focus-within:border-brand-primary")}
          />
        </FieldWrapper>
      )}
    />
  );
};

export const FfTimeBox: React.FC<FfFieldProps> = ({ name, label, required, placeholder, className, disabled }) => {
    const { control } = useFormContext();
  
    return (
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value, ...restField }, fieldState: { error } }) => (
          <FieldWrapper label={label} required={required} error={error?.message} className={className}>
            <DateBox
              {...restField}
              type="time"
              value={value || null}
              onValueChanged={(e) => {
                if (e.value !== value) {
                  onChange(e.value);
                }
              }}
              placeholder={placeholder || "SS:DD"}
              disabled={disabled}
              stylingMode="outlined"
              displayFormat="HH:mm"
              useMaskBehavior={true}
              adaptivityEnabled={false}
              dateSerializationFormat="HH:mm:ss"
              pickerType="list"
              className={cn("w-full transition-all", error ? "border-status-danger" : "focus-within:border-brand-primary")}
            />
          </FieldWrapper>
        )}
      />
    );
};

// ----------------------------------------------------------------------
export const FfDateBox: React.FC<FfFieldProps> = ({ name, label, required, placeholder, className, disabled }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, ...restField }, fieldState: { error } }) => {
        // DateBox crashes randomly on strings if they aren't fully formatted or parsed securely
        const dateValue = value && typeof value === 'string' 
          ? (!isNaN(new Date(value).getTime()) ? new Date(value) : null) 
          : (value instanceof Date && !isNaN(value.getTime()) ? value : null);

        return (
          <FieldWrapper label={label} required={required} error={error?.message} className={className}>
            <DateBox
              {...restField}
              type="date"
              value={dateValue || undefined}
              onValueChanged={(e) => {
                if (!e.value) {
                  onChange(null);
                } else if (e.value instanceof Date && !isNaN(e.value.getTime())) {
                  onChange(e.value.toISOString());
                } else if (typeof e.value === 'string') {
                  onChange(e.value);
                }
              }}
              placeholder={placeholder || "Tarih Seçin"}
              disabled={disabled}
              stylingMode="outlined"
              displayFormat="dd.MM.yyyy"
              useMaskBehavior={true}
              adaptivityEnabled={false}
              className={cn("w-full transition-all", error ? "border-status-danger" : "focus-within:border-brand-primary")}
            />
          </FieldWrapper>
        );
      }}
    />
  );
};

export const FfDateTimeBox: React.FC<FfFieldProps> = ({ name, label, required, placeholder, className, disabled }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, ...restField }, fieldState: { error } }) => {
        const dateValue = value && typeof value === 'string' 
          ? (!isNaN(new Date(value).getTime()) ? new Date(value) : null) 
          : (value instanceof Date && !isNaN(value.getTime()) ? value : null);
          
        return (
          <FieldWrapper label={label} required={required} error={error?.message} className={className}>
            <DateBox
              {...restField}
              type="datetime"
              value={dateValue || undefined}
              onValueChanged={(e) => {
                if (!e.value) {
                  onChange(null);
                } else if (e.value instanceof Date && !isNaN(e.value.getTime())) {
                  onChange(e.value.toISOString());
                } else if (typeof e.value === 'string') {
                  onChange(e.value);
                }
              }}
            placeholder={placeholder || "Tarih ve Saat Seçin"}
            disabled={disabled}
            stylingMode="outlined"
            displayFormat="dd.MM.yyyy HH:mm"
            useMaskBehavior={true}
            adaptivityEnabled={false}
            className={cn("w-full transition-all", error ? "border-status-danger" : "focus-within:border-brand-primary")}
          />
          </FieldWrapper>
        );
      }}
    />
  );
};
