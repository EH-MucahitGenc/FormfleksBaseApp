// @ts-nocheck
import { z } from 'zod';

const trErrorMap = (issue: any, ctx: any) => {
  let message: string;

  if (ctx.defaultError === 'Required') {
    message = 'Bu alan zorunludur';
  } else if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.expected !== 'undefined' && issue.received === 'undefined') {
      message = 'Bu alan zorunludur';
    } else {
      message = `Geçersiz veri tipi. Beklenen: ${issue.expected}, Gelen: ${issue.received}`;
    }
  } else if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === 'string') {
      message = `En az ${issue.minimum} karakter girmelisiniz`;
    } else if (issue.type === 'number') {
      message = `Değer en az ${issue.minimum} olmalıdır`;
    } else {
      message = `En az ${issue.minimum} gereklidir`;
    }
  } else if (issue.code === z.ZodIssueCode.too_big) {
    if (issue.type === 'string') {
      message = `En fazla ${issue.maximum} karakter girebilirsiniz`;
    } else if (issue.type === 'number') {
      message = `Değer en fazla ${issue.maximum} olmalıdır`;
    } else {
      message = `En fazla ${issue.maximum} girilebilir`;
    }
  } else if (issue.code === z.ZodIssueCode.custom) {
    message = issue.message || 'Geçersiz veri';
  } else {
    message = ctx.defaultError || 'Geçersiz girdi';
  }

  return { message };
};

z.setErrorMap(trErrorMap);

export default trErrorMap;
