import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';

export interface SendQuotationEmailOptions {
  to: string;
  subject?: string;
  quotationNumber: string;
  customerName: string;
  grandTotal: string;
  validUntil?: string;
  pdfBuffer: Buffer;
  filename: string;
  customMessage?: string;
}

export class EmailService {
  private resendClient: Resend | null = null;

  private getClient(): Resend {
    const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (!apiKey || apiKey.includes('your_resend_api_key')) {
      throw AppError.badRequest(
        'Resend API key is missing or not configured. Please add a valid RESEND_API_KEY to your server .env file.'
      );
    }

    if (!this.resendClient) {
      this.resendClient = new Resend(apiKey);
    }
    return this.resendClient;
  }

  /**
   * Send quotation PDF attachment to customer via Resend
   */
  async sendQuotationEmail(options: SendQuotationEmailOptions): Promise<{ id: string }> {
    const resend = this.getClient();

    const fromAddress = env.RESEND_FROM_EMAIL || 'Taneja Power Systems <onboarding@resend.dev>';
    const subject =
      options.subject ||
      `Official Commercial Quotation ${options.quotationNumber} - Taneja Power Systems`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 28px 32px; text-align: left; }
            .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
            .header p { margin: 0; color: #c7d2fe; font-size: 13px; font-weight: 500; }
            .content { padding: 32px; }
            .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
            .message-box { background-color: #f1f5f9; border-left: 4px solid #4f46e5; padding: 14px 18px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 14px; color: #334155; line-height: 1.6; }
            .details-card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 20px; margin: 24px 0; }
            .details-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px border-dashed #e5e7eb; font-size: 13px; }
            .details-row:last-child { border-bottom: none; }
            .label { color: #64748b; font-weight: 500; }
            .value { color: #0f172a; font-weight: 700; text-align: right; }
            .highlight { color: #4f46e5; font-size: 16px; }
            .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; }
            .footer p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>TANEJA POWER SYSTEMS</h1>
              <p>Commercial & Industrial Energy Solutions</p>
            </div>
            <div class="content">
              <div class="greeting">Dear ${options.customerName},</div>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                We are pleased to present our official commercial quotation <strong>${options.quotationNumber}</strong> for your review. Please find the complete proposal document attached in PDF format.
              </p>

              ${
                options.customMessage
                  ? `<div class="message-box"><strong>Note from Sales Team:</strong><br>${options.customMessage.replace(/\n/g, '<br>')}</div>`
                  : ''
              }

              <div class="details-card">
                <div class="details-row">
                  <span class="label">Quotation Ref:</span>
                  <span class="value">${options.quotationNumber}</span>
                </div>
                <div class="details-row">
                  <span class="label">Customer Name:</span>
                  <span class="value">${options.customerName}</span>
                </div>
                <div class="details-row">
                  <span class="label">Valid Until:</span>
                  <span class="value">${options.validUntil || '30 Days from date of issue'}</span>
                </div>
                <div class="details-row" style="padding-top: 10px; margin-top: 4px; border-top: 2px solid #e2e8f0;">
                  <span class="label" style="font-size: 14px; font-weight: 700; color: #0f172a;">Grand Total:</span>
                  <span class="value highlight">${options.grandTotal}</span>
                </div>
              </div>

              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Should you have any questions or require modifications to this proposal, please do not hesitate to reach out to our team.
              </p>
            </div>
            <div class="footer">
              <p><strong>Taneja Power Systems</strong> • GIDC Industrial Estate, Makarpura, Vadodara, Gujarat 390010</p>
              <p>Email: sales@tanejapower.com | Phone: +91 98765 43210</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const response = await resend.emails.send({
        from: fromAddress,
        to: [options.to],
        subject: subject,
        html: htmlBody,
        attachments: [
          {
            filename: options.filename,
            content: options.pdfBuffer,
          },
        ],
      });

      if (response.error) {
        throw AppError.badRequest(`Resend email delivery error: ${response.error.message}`);
      }

      return { id: response.data?.id || 'resend-email-sent' };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw AppError.badRequest(`Failed to send email via Resend: ${err.message || 'Unknown error'}`);
    }
  }

  /**
   * Send 4-digit password reset OTP email
   */
  async sendOtpEmail(to: string, otpCode: string): Promise<void> {
    const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (!apiKey || apiKey.includes('your_resend_api_key')) {
      console.log(`\n==============================================`);
      console.log(`[DEV OTP EMAIL] Sent 4-digit OTP code [${otpCode}] to recipient: ${to}`);
      console.log(`==============================================\n`);
      return;
    }

    try {
      const resend = this.getClient();
      const fromAddress = env.RESEND_FROM_EMAIL || 'Taneja Power Systems <onboarding@resend.dev>';
      await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: `[Taneja Power CRM] Password Reset OTP: ${otpCode}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Password Reset OTP</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f1f5f9; margin: 0; padding: 32px 16px;">
              <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
                
                <!-- Brand Header -->
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1d4ed8 100%); border-top: 4px solid #2563eb; padding: 28px 32px; text-align: left;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 0.5px;">TANEJA POWER SYSTEMS</h1>
                        <p style="margin: 4px 0 0 0; color: #93c5fd; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Enterprise CRM • Account Security Verification</p>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Main Content -->
                <div style="padding: 32px;">
                  <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px; font-weight: 800;">Verification Required</h3>
                  <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                    A password reset request was initiated for your <strong>Taneja Power Workspace</strong> account (<span style="color: #2563eb;">${to}</span>).
                  </p>

                  <!-- OTP Display Card -->
                  <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1.5px solid #bfdbfe; border-radius: 14px; padding: 24px 20px; text-align: center; margin: 24px 0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="font-size: 11px; color: #1e40af; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">Your 4-Digit Verification OTP</div>
                    <div style="margin-top: 14px;">
                      <span style="font-size: 36px; font-weight: 900; color: #1d4ed8; font-family: 'Courier New', Courier, monospace; letter-spacing: 14px; background: #ffffff; padding: 12px 28px; border-radius: 12px; border: 1px solid #93c5fd; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06); display: inline-block;">${otpCode}</span>
                    </div>
                    <div style="margin-top: 14px; font-size: 12px; color: #475569; font-weight: 600;">
                      ⏱ This code will expire in <strong>5 minutes</strong>
                    </div>
                  </div>

                  <!-- Security Advisory Box -->
                  <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 14px 16px; margin: 24px 0;">
                    <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">Important Security Advisory:</div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #64748b; line-height: 1.6;">
                      <li>Never share this OTP with anyone, including Taneja Power administrators.</li>
                      <li>If you did not request this code, no action is required and your account remains secure.</li>
                    </ul>
                  </div>

                  <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">
                    Need assistance? Please reach out to our system support desk.
                  </p>
                </div>

                <!-- Corporate Footer -->
                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
                  <p style="margin: 0; font-weight: 700; color: #334155;">Taneja Power Systems Inc.</p>
                  <p style="margin: 2px 0 0 0;">GIDC Industrial Estate, Makarpura, Vadodara, Gujarat 390010</p>
                  <p style="margin: 4px 0 0 0; color: #94a3b8;">Automated System Notification • Do Not Reply directly to this email</p>
                </div>

              </div>
            </body>
          </html>
        `,
      });
    } catch (err: any) {
      console.log(`[DEV OTP EMAIL FALLBACK] Sent 4-digit OTP code [${otpCode}] to ${to}. Notice: ${err?.message}`);
    }
  }
}

export const emailService = new EmailService();
