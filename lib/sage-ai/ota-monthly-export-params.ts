import { z } from 'zod';

export const otaMonthlyExportParamsSchema = z
  .object({
    zip: z.string().min(3).optional(),
    city: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    radius_miles: z.number().min(1).max(200).optional().default(50),
    years: z.array(z.number().int().min(2024).max(2030)).optional().default([2025, 2026]),
    sources: z.array(z.enum(['hipcamp', 'campspot'])).optional().default(['hipcamp', 'campspot']),
  })
  .superRefine((value, ctx) => {
    const hasZip = Boolean(value.zip?.trim());
    const hasCityState = Boolean(value.city?.trim() && value.state?.trim());
    if (!hasZip && !hasCityState) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide zip OR city and state.',
        path: ['zip'],
      });
    }
  });

export type OtaMonthlyExportParamsInput = z.infer<typeof otaMonthlyExportParamsSchema>;
