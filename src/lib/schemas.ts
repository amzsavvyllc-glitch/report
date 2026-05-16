import { z } from "zod";

export const localeSchema = z.enum(["en", "ur", "hi", "bn"]);
export const riderStatusSchema = z.enum(["active", "off", "suspended"]);
export const docTypeSchema = z.enum(["iqama", "license", "bike_registration"]);

export const riderInputSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().regex(/^\+\d{8,15}$/, "Phone must be in E.164 format, e.g. +9665XXXXXXXX"),
  nationalId: z.string().max(60).optional().nullable(),
  status: riderStatusSchema.default("active"),
  bikePlate: z.string().max(20).optional().nullable(),
  role: z.string().max(40).optional().nullable(),
  preferredLocale: localeSchema.default("en"),
  notes: z.string().max(2000).optional().nullable(),
});

export type RiderInput = z.infer<typeof riderInputSchema>;

export const managerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const otpRequestSchema = z.object({
  phone: z.string().regex(/^\+\d{8,15}$/),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+\d{8,15}$/),
  code: z.string().regex(/^\d{4,8}$/),
});

export const incidentInputSchema = z.object({
  descriptionRaw: z.string().min(1).max(5000),
  locationText: z.string().max(500).optional(),
  photoKeys: z.array(z.string()).max(10).default([]),
  voiceNoteKey: z.string().optional(),
});

export const documentInputSchema = z.object({
  docType: docTypeSchema,
  r2Key: z.string(),
  contentType: z.string().max(120),
});
