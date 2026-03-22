import React from 'react';
import DateBox from 'devextreme-react/date-box';
import { cn } from '@/components/ui';

export interface FfDateBoxProps extends React.ComponentProps<typeof DateBox> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  containerClassName?: string;
}

export const FfDateBox = React.forwardRef<DateBox, FfDateBoxProps>(
  ({ label, error, helperText, className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
        {label && (
          <label className="text-sm font-semibold text-brand-dark mb-0.5 select-none">
            {label}
            {((props as any).validationRules?.some((r: any) => r.type === 'required') || props.required) && (
              <span className="text-status-danger ml-1">*</span>
            )}
          </label>
        )}
        
        <div className={cn("relative rounded-lg transition-all", error && "focus-ring-error")}>
          <DateBox
            ref={ref}
            stylingMode="outlined"
            className={cn(
              "w-full", 
              error ? "dx-invalid" : "", 
              className
            )}
            isValid={!error}
            displayFormat={(props as any).displayFormat ?? "dd.MM.yyyy"}
            useMaskBehavior={(props as any).useMaskBehavior ?? true}
            {...props}
          />
        </div>

        {error ? (
          <span className="text-xs font-medium text-status-danger mt-0.5 animate-fade-in-up">
            {error}
          </span>
        ) : helperText ? (
          <span className="text-xs text-brand-gray mt-0.5">
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

FfDateBox.displayName = 'FfDateBox';
