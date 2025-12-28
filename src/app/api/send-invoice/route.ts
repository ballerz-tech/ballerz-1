import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order, orderId, sendTo } = body || {};

    const recipient = sendTo || order?.customer?.email;
    if (!recipient) return NextResponse.json({ error: "No recipient" }, { status: 400 });

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    if (!user || !pass) return NextResponse.json({ error: "Email not configured" }, { status: 500 });

    const allowInsecure = process.env.SMTP_ALLOW_INSECURE === "true";
    const transportOptions: any = {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    };
    if (allowInsecure) transportOptions.tls = { rejectUnauthorized: false };

    const transporter = nodemailer.createTransport(transportOptions);

    const senderName = process.env.SENDER_NAME || "Ballerz";

    const orderIdDisplay = orderId || order?.id || "";

    const items = order?.items || [];
    const total = order?.total ?? 0;

    const plainItems = items
      .map((it: any) => {
        const name = it.product?.Description || it.product?.Product || "Item";
        const qty = Number(it.Quantity || 1);
        const price = Number(it.product?.Price || 0);
        const lineTotal = price * qty;
        return `${name} x${qty} - Rs. ${lineTotal}`;
      })
      .join("\n");

    const textBody = `Thank you for your order with Ballerz.

Order ID: ${orderIdDisplay}
Total: Rs. ${total}

Items:
${plainItems || "(details unavailable)"}

If you have any questions, just reply to this email.`;

    const htmlItemsRows = items
      .map((it: any) => {
        const name = it.product?.Description || it.product?.Product || "Item";
        const qty = Number(it.Quantity || 1);
        const price = Number(it.product?.Price || 0);
        const lineTotal = price * qty;
        return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:left;">${name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${qty}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">Rs. ${price}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">Rs. ${lineTotal}</td>
          </tr>`;
      })
      .join("");

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Your Ballerz Order ${orderIdDisplay}</title>
        </head>
        <body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f3f4f6;">
          <div style="max-width:640px;margin:0 auto;">
            <div style="background-color:#ffffff;border:2px solid #2563eb;border-radius:16px;padding:24px 24px 28px;box-shadow:0 10px 25px rgba(15,23,42,0.12);">
              <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:40px;line-height:1;margin-bottom:8px;">💐</div>
                <h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;">Thank you for your order!</h1>
                <p style="margin:8px 0 0;font-size:14px;color:#4b5563;">We&apos;re truly grateful you chose Ballerz. Your drip is on its way.</p>
              </div>

              <div style="background-color:#eff6ff;border-radius:12px;padding:12px 16px;margin-bottom:16px;border:1px solid #bfdbfe;">
                <p style="margin:0;font-size:13px;color:#1e3a8a;">
                  <strong>Order ID:</strong> ${orderIdDisplay || "N/A"}<br />
                  <strong>Total:</strong> Rs. ${total}
                </p>
              </div>

              <h2 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#111827;">Order Summary</h2>
              <div style="border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:16px;">
                <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="border-collapse:collapse;font-size:13px;color:#111827;">
                  <thead style="background-color:#eff6ff;">
                    <tr>
                      <th align="left" style="padding:8px 12px;font-weight:600;color:#1f2937;border-bottom:1px solid #e5e7eb;">Item</th>
                      <th align="center" style="padding:8px 12px;font-weight:600;color:#1f2937;border-bottom:1px solid #e5e7eb;">Qty</th>
                      <th align="right" style="padding:8px 12px;font-weight:600;color:#1f2937;border-bottom:1px solid #e5e7eb;">Price</th>
                      <th align="right" style="padding:8px 12px;font-weight:600;color:#1f2937;border-bottom:1px solid #e5e7eb;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${htmlItemsRows || `
                      <tr>
                        <td colspan="4" style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;">Item details unavailable</td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>

              <p style="margin:0 0 4px;font-size:14px;color:#111827;font-weight:600;">With heartfelt thanks,</p>
              <p style="margin:0 0 16px;font-size:13px;color:#4b5563;">Team Ballerz</p>

              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
                If you have any questions about your order, just reply to this email and we&apos;ll be happy to help.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `${senderName} <${user}>`,
      to: recipient,
      subject: `Your Ballerz Order ${orderIdDisplay}`,
      text: textBody,
      html: htmlBody,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("send-invoice error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
