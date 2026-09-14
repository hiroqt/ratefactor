import { z } from "zod";

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80, "Name must not exceed 80 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .optional(),
  role: z
    .string()
    .trim()
    .min(1, "Role must not be empty")
    .max(60, "Role must not exceed 60 characters")
    .optional(),
  avatar: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(val)) return true;
        if (/^https?:\/\//i.test(val)) return true;
        return false;
      },
      {
        message: "Avatar must be a valid HTTP/HTTPS URL or base64 image data URI.",
      }
    )
    .optional(),
  onboarded: z.boolean().optional(),
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
    .refine((val) => !val || /^https?:\/\//i.test(val), {
      message: "Website URL must begin with http:// or https://",
    })
    .max(255, "Website URL must not exceed 255 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  github: z
    .string()
    .trim()
    .max(100, "GitHub handle or URL must not exceed 100 characters")
    .refine(
      (val) => {
        if (!val) return true;
        if (/^(javascript|data|vbscript|file|blob):/i.test(val)) return false;
        if (/^[a-z0-9]+:/i.test(val) && !/^https?:\/\//i.test(val)) return false;
        return true;
      },
      {
        message: "Dangerous URL scheme not allowed. Use http://, https:// or a handle name.",
      }
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  twitter: z
    .string()
    .trim()
    .max(100, "Twitter/X handle or URL must not exceed 100 characters")
    .refine(
      (val) => {
        if (!val) return true;
        if (/^(javascript|data|vbscript|file|blob):/i.test(val)) return false;
        if (/^[a-z0-9]+:/i.test(val) && !/^https?:\/\//i.test(val)) return false;
        return true;
      },
      {
        message: "Dangerous URL scheme not allowed. Use http://, https:// or a handle name.",
      }
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  linkedin: z
    .string()
    .trim()
    .max(255, "LinkedIn handle or URL must not exceed 255 characters")
    .refine(
      (val) => {
        if (!val) return true;
        if (/^(javascript|data|vbscript|file|blob):/i.test(val)) return false;
        if (/^[a-z0-9]+:/i.test(val) && !/^https?:\/\//i.test(val)) return false;
        return true;
      },
      {
        message: "Dangerous URL scheme not allowed. Use http://, https:// or a handle name.",
      }
    )
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
