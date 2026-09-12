import { z } from "zod";

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name must not be empty")
    .max(80, "Name must not exceed 80 characters")
    .optional(),
  bio: z
    .string()
    .trim()
    .max(500, "Bio must not exceed 500 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  skills: z
    .array(z.string().trim().min(1, "Skill tag must not be empty"))
    .max(30, "Cannot specify more than 30 skills")
    .optional(),
  availableForHire: z.boolean().optional(),
  customHireMessage: z
    .string()
    .trim()
    .max(500, "Custom hire message must not exceed 500 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  company: z
    .string()
    .trim()
    .max(80, "Company name must not exceed 80 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  location: z
    .string()
    .trim()
    .max(80, "Location must not exceed 80 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  website: z
    .string()
    .trim()
    .url("Invalid website URL")
    .max(255, "Website URL must not exceed 255 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  github: z
    .string()
    .trim()
    .max(100, "GitHub handle or URL must not exceed 100 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  twitter: z
    .string()
    .trim()
    .max(100, "Twitter/X handle or URL must not exceed 100 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  linkedin: z
    .string()
    .trim()
    .max(255, "LinkedIn handle or URL must not exceed 255 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
