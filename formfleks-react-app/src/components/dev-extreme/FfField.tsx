import React from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';

interface FfFieldProps<TFieldValues extends FieldValues, TProps = any> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  component: React.ComponentType<TProps>;
  label?: string;
  helperText?: string;
  componentProps?: Omit<TProps, 'value' | 'onValueChanged' | 'error' | 'label' | 'helperText'> & Record<string, any>;
  containerClassName?: string;
  className?: string;
}

/**
 * Enterprise level Form Field Wrapper
 * Connects any Ff[Component] (e.g. FfTextBox, FfSelectBox) seamlessly with React Hook Form.
 * Automatically extracts validation errors.
 */
export function FfField<TFieldValues extends FieldValues>({
  name,
  control,
  component: Component,
  label,
  helperText,
  componentProps,
  ...rest
}: FfFieldProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error } }) => {
        // We pass value to DX components, and listen to onValueChanged.
        return (
          <Component
             ref={ref as any}
             label={label}
             helperText={helperText}
             error={error?.message}
             value={value}
             onValueChanged={(e: any) => {
               if (e.value !== value) {
                 onChange(e.value);
               }
             }}
             onFocusOut={onBlur}
             {...(componentProps as any)}
             {...rest}
          />
        );
      }}
    />
  );
}
