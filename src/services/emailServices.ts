// services/emailService.ts
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production') {
      // Production: Use actual email service
      await sendProductionEmail(options);
    } else {
      // Development: Log email to console and save to file
      await logEmailForDevelopment(options);
    }
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    // In development, don't throw error - just log
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Continuing in development mode despite email error');
      return;
    }
    
    throw new Error('Failed to send email');
  }
};

const sendProductionEmail = async (options: EmailOptions): Promise<void> => {
  // Using nodemailer for production
  const nodemailer = await import('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
  console.log('✅ Production email sent to:', options.to);
};

const logEmailForDevelopment = async (options: EmailOptions): Promise<void> => {
  const resetLink = extractResetLink(options.html);
  
  console.log('\n📧 ===== PASSWORD RESET EMAIL =====');
  console.log('To:', options.to);
  console.log('Subject:', options.subject);
  console.log('Reset Link:', resetLink);
  console.log('📧 ===== END EMAIL =====\n');

  // Also save to a file for easy access
  const fs = await import('fs');
  const path = await import('path');
  
  const emailLog = {
    timestamp: new Date().toISOString(),
    to: options.to,
    subject: options.subject,
    resetLink: resetLink,
    html: options.html
  };

  const logDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, 'password-reset-links.json');
  
  let existingLogs = [];
  if (fs.existsSync(logFile)) {
    existingLogs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  }
  
  existingLogs.push(emailLog);
  fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
  
  console.log(`✅ Reset link saved to: ${logFile}`);
};

const extractResetLink = (html: string): string => {
  const match = html.match(/href="([^"]*)"/);
  return match ? match[1] : 'No link found in email';
};