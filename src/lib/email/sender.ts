import { Resend } from "resend";

export interface SendOtpEmailOptions {
  to: string;
  code: string;
  name?: string;
  expiresInMinutes?: number;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  previewUrl?: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.EMAIL_FROM || "RateFactor <onboarding@resend.dev>";

const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Generates responsive, branded HTML email template for RateFactor OTP
 */
export function generateOtpEmailHtml(code: string, name?: string, expiresInMinutes = 5): string {
  const displayName = name ? name.trim() : "Developer";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RateFactor Verification Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 560px;
      margin: 40px auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .header {
      background: #0f172a;
      padding: 28px 32px;
      text-align: left;
    }
    .brand {
      color: #ffffff;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .brand-accent {
      color: #10b981;
    }
    .content {
      padding: 36px 32px;
      color: #334155;
      font-size: 15px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .code-box {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 20px 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #0f172a;
      margin: 0;
    }
    .expiry-note {
      font-size: 13px;
      color: #64748b;
      margin-top: 8px;
      margin-bottom: 0;
    }
    .warning {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 13px;
      color: #065f46;
      margin: 24px 0 0 0;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
      padding: 20px 32px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        Rate<span class="brand-accent">Factor</span>
      </div>
    </div>
    <div class="content">
      <h1 class="greeting">Verify your email address</h1>
      <p>Hello ${displayName},</p>
      <p>Thank you for joining RateFactor. Enter the 6-digit verification code below to complete your account registration:</p>
      
      <div class="code-box">
        <div class="otp-code">${code}</div>
        <p class="expiry-note">⏱️ Expires in <strong>${expiresInMinutes} minutes</strong></p>
      </div>

      <div class="warning">
        <strong>Security note:</strong> RateFactor will never ask for your password or verification code outside this registration screen. If you did not request this, please ignore this email.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} RateFactor Developer Platform. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends OTP Email via Resend or logs to console fallback in development
 */
export async function sendOtpEmail({
  to,
  code,
  name,
  expiresInMinutes = 5,
}: SendOtpEmailOptions): Promise<SendEmailResult> {
  const subject = `Your RateFactor Verification Code: ${code}`;
  const html = generateOtpEmailHtml(code, name, expiresInMinutes);
  const text = `Hello ${name || "Developer"},\n\nYour RateFactor verification code is: ${code}\nThis code expires in ${expiresInMinutes} minutes.\n\nIf you did not request this code, please ignore this message.`;

  // 1. Production delivery with Resend if API key is present
  if (resendClient && RESEND_API_KEY) {
    try {
      const response = await resendClient.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
        text,
      });

      if (response.error) {
        console.error("[Email Service / Resend Error]:", response.error);
        return {
          success: false,
          error: response.error.message || "Resend email dispatch error",
        };
      }

      console.log(`[Email Service] Sent OTP to ${to} via Resend (ID: ${response.data?.id})`);
      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (err: any) {
      console.error("[Email Service / Resend Exception]:", err);
      return {
        success: false,
        error: err?.message || "Failed to send email via Resend",
      };
    }
  }

  // 2. Development / Local Mock Logging
  console.log("\n=======================================================");
  console.log(`📧 [RATEFACTOR EMAIL DISPATCH - DEV MOCK]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`🔐 6-DIGIT OTP CODE: [ ${code} ]`);
  console.log(`⏳ Expiration: ${expiresInMinutes} Minutes (${new Date(Date.now() + expiresInMinutes * 60 * 1000).toLocaleTimeString()})`);
  console.log("=======================================================\n");

  return {
    success: true,
    messageId: `dev-mock-${Date.now()}`,
  };
}
