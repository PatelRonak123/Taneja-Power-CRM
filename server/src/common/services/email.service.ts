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
}

export const emailService = new EmailService();
