import { z } from "zod";
import { 
  validateCommentContent, 
  MAX_IMAGE_SIZE_BYTES 
} from "@/lib/guardrails";

export const portfolioSubmissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must not exceed 120 characters"),
  tagline: z
    .string()
    .trim()
    .min(10, "Tagline must be at least 10 characters")
    .max(240, "Tagline must not exceed 240 characters"),
  description: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val || !val.trim()) return true;
      return val.trim().length >= 200;
    }, {
      message: "Description is optional, but if provided it must be at least 200 characters.",
    })
    .refine((val) => {
      if (!val) return true;
      return val.length <= 15000;
    }, {
      message: "Description exceeds maximum limit of 15,000 characters.",
    }),
  portfolioUrl: z
    .string()
    .url("Please provide a valid live/portfolio URL (http:// or https://)")
    .refine((val) => /^https?:\/\//i.test(val), {
      message: "Portfolio URL must start with http:// or https://",
    }),
  githubUrl: z
    .string()
    .url("Please provide a valid GitHub repository URL (http:// or https://)")
    .refine((val) => /^https?:\/\//i.test(val), {
      message: "GitHub repository URL must start with http:// or https://",
    }),
  demoUrl: z
    .string()
    .url("Please provide a valid Demo URL")
    .refine((val) => !val || /^https?:\/\//i.test(val), {
      message: "Demo URL must start with http:// or https://",
    })
    .optional()
    .or(z.literal("")),
  thumbnailUrl: z.string().min(1, "Cover image thumbnail is required"),
  imageSizeBytes: z
    .number()
    .positive()
    .max(MAX_IMAGE_SIZE_BYTES, "Image size exceeds strict 2.00 MB limit"),
  category: z.enum([
    "Developer",
    "Arts",
    "Client",
    "Frontend",
    "Fullstack",
    "Systems",
    "Design Engineer",
    "Mobile",
    "AI / ML",
  ]),
  techStack: z
    .array(z.string().trim().min(1))
    .min(1, "At least one technology tag is required")
    .max(15, "Cannot specify more than 15 technologies"),
  requestCritique: z.boolean().optional().default(false),
});

export const critiqueTagEnum = z.enum([
  "ui_suggestion",
  "bug_spotted",
  "performance_tip",
  "love_detail",
]);

export const commentSubmissionSchema = z.object({
  portfolioId: z.string().min(1, "Portfolio ID is required"),
  content: z
    .string()
    .trim()
    .refine((val) => validateCommentContent(val).isValid, {
      message: "Comment does not meet quality guardrails (min 10 characters, constructive feedback, no spam).",
    }),
  critiqueTag: critiqueTagEnum.optional().nullable(),
});

export const commentReportSchema = z.object({
  commentId: z.string().min(1, "Comment ID is required"),
  reason: z.enum(["spam", "offensive", "off_topic", "harassment", "low_quality"]),
  details: z.string().max(500, "Details must not exceed 500 characters").optional(),
});

export const ratingSubmissionSchema = z.object({
  portfolioId: z.string().min(1, "Portfolio ID is required"),
  design: z.number().min(1, "Design rating must be between 1.0 and 5.0").max(5, "Design rating must be between 1.0 and 5.0"),
  codeQuality: z.number().min(1, "Code quality rating must be between 1.0 and 5.0").max(5, "Code quality rating must be between 1.0 and 5.0"),
  performance: z.number().min(1, "Performance rating must be between 1.0 and 5.0").max(5, "Performance rating must be between 1.0 and 5.0"),
  documentation: z.number().min(1, "Documentation rating must be between 1.0 and 5.0").max(5, "Documentation rating must be between 1.0 and 5.0"),
});

export const otpRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  provider: z.enum(["google", "email_password"]).default("email_password"),
  name: z.string().min(1, "Name cannot be empty").max(100, "Name is too long").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  purpose: z.enum(["signup", "signin", "2fa"]).optional(),
});

export const otpVerifySchema = z.object({
  challengeId: z.string().uuid("Invalid challenge ID"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be exactly 6 numeric digits"),
});
