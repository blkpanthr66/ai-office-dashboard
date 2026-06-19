import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { name, email, role } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
  }

  try {
    // Send Supabase magic-link invite so they can log in
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name, role },
    });

    // Ignore "already registered" errors — user may already have an account
    if (inviteError && !inviteError.message.toLowerCase().includes('already registered')) {
      throw new Error(inviteError.message);
    }

    // Send a welcome email via Resend
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.pinpointlocal.ai';
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PinPoint Local AI <hello@pinpointlocal.ai>',
        to: [email],
        reply_to: process.env.PETER_EMAIL,
        subject: `You've been invited to PinPoint Local AI`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#080c14;color:#e2e8f0;border-radius:16px;">
            <h2 style="color:#22d3ee;margin-top:0;">Welcome to PinPoint Local AI</h2>
            <p>Hi ${name},</p>
            <p>You've been added to the PinPoint Local AI dashboard as <strong style="color:#fff;">${role}</strong>.</p>
            <p>You should receive a separate email shortly with a secure login link. Click it to set your password and access the dashboard.</p>
            <p>If you don't see it, check your spam folder or contact us at <a href="mailto:${process.env.PETER_EMAIL}" style="color:#22d3ee;">${process.env.PETER_EMAIL}</a>.</p>
            <a href="${dashboardUrl}" style="display:inline-block;margin-top:16px;background:#22d3ee;color:#080c14;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;">
              Go to Dashboard
            </a>
            <p style="margin-top:32px;color:#475569;font-size:13px;">PinPoint Local AI · ${dashboardUrl}</p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const resendData = await resendRes.json();
      console.error('Resend error:', resendData);
      // Don't fail the whole invite if only the welcome email failed
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
