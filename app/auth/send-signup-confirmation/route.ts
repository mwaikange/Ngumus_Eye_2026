// app/api/auth/send-signup-confirmation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { email, confirmUrl, displayName } = await req.json();

    if (!email || !confirmUrl) {
      return NextResponse.json(
        { error: 'Email and confirmUrl required' },
        { status: 400 }
      );
    }

    await transporter.sendMail({
      from: `"Ngumu's Eye" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email - Ngumu\'s Eye',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f7f7f7; padding: 20px; text-align: center; border-radius: 8px;">
            <h2 style="color: #333; margin: 0;">Ngumu's Eye</h2>
            <p style="color: #666; margin: 5px 0;">Community Safety Platform</p>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <h3 style="color: #333; margin-bottom: 15px;">Welcome to Ngumu's Eye!</h3>
            <p style="color: #666; line-height: 1.6;">Hi ${displayName || 'there'},</p>
            <p style="color: #666; line-height: 1.6;">Thank you for signing up. Please verify your email address.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background-color: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Verify Email</a>
            </div>
            <p style="color: #666; line-height: 1.6;">This link expires in 24 hours.</p>
            <p style="color: #666; line-height: 1.6;">If you didn't sign up, ignore this email.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: 'Email sent' });
  } catch (error: any) {
    console.error('Email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
