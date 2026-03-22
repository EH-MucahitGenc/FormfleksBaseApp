import React from 'react';
import TextBox from 'devextreme-react/text-box';
import { cn } from '@/components/ui';

export interface FfTextBoxProps extends React.ComponentProps<typeof TextBox> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  containerClassName?: string;
}

export const FfTextBox = React.forwardRef<TextBox, FfTextBoxProps>(
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
          <TextBox
            ref={ref}
            stylingMode="outlined"
            className={cn(
              "w-full", 
              error ? "dx-invalid" : "", 
              className
            )}
            onInitialized={(e) => {
              // Internal DX styling adjustments if necessary
              if (error && e.component) {
                 e.component.option('isValid', false);
              }
            }}
            onOptionChanged={(e) => {
               if (e.name === 'isValid' && error && e.value === true) {
                  e.component?.option('isValid', false); // Force invalid state if error prop exists
               }
            }}
            isValid={!error}
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

FfTextBox.displayName = 'FfTextBox';
