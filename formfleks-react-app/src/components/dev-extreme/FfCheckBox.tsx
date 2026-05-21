import React from 'react';
import CheckBox from 'devextreme-react/check-box';
import { cn } from '@/components/ui';

export interface FfCheckBoxProps extends React.ComponentProps<typeof CheckBox> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  containerClassName?: string;
}

export const FfCheckBox = React.forwardRef<CheckBox, FfCheckBoxProps>(
  ({ label, error, helperText, className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1 w-full', containerClassName)}>
        <div className="flex items-center gap-2 h-10">
          <CheckBox
            ref={ref}
            className={cn(error ? "dx-invalid" : "", className)}
            onInitialized={(e) => {
              if (error && e.component) {
                 e.component.option('isValid', false);
              }
            }}
            onOptionChanged={(e) => {
               if (e.name === 'isValid' && error && e.value === true) {
                  e.component?.option('isValid', false);
               }
            }}
            isValid={!error}
            text={label}
            {...props}
          />
          {((props as any).validationRules?.some((r: any) => r.type === 'required') || props.required) && (
             <span className="text-status-danger text-sm">*</span>
          )}
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

FfCheckBox.displayName = 'FfCheckBox';
