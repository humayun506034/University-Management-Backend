import { ConfigService } from '@nestjs/config';

export async function sendVerificationEmail(
  configService: ConfigService,
  to: string,
  subject: string,
  html: string,
) {
  const brevoApiKey = configService.get<string>('BREVO_API_KEY');
  const brevoSenderEmail = configService.get<string>('BREVO_SENDER_EMAIL');
  const brevoSenderName ='CampusMS';
  if (!brevoApiKey || !brevoSenderEmail) {
    return {
      success: false,
      skipped: true,
      error: 'BREVO_API_KEY and BREVO_SENDER_EMAIL are required.',
    };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          email: brevoSenderEmail,
          name: brevoSenderName,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Brevo error: ${errorText}` };
    }

    const result = await response.json();
    return { success: true, info: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Brevo email error';
    return { success: false, error: message };
  }
}
