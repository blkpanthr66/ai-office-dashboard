import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { lead_id, draft_reply, contact_email, contact_name } = await req.json();

  if (!lead_id || !draft_reply || !contact_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Send email via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PinPoint Local AI <hello@pinpointlocal.ai>',
        to: [contact_email],
        reply_to: process.env.PETER_EMAIL,
        subject: `Thanks for getting in touch — PinPoint Local AI`,
        text: draft_reply,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) throw new Error(resendData.message || 'Resend failed');

    // Update lead status
    await supabaseAdmin.from('leads').update({ status: 'sent' }).eq('id', lead_id);

    // Save message record
    await supabaseAdmin.from('messages').insert({
      lead_id,
      direction: 'outbound',
      body: draft_reply,
      sent_via: 'resend',
      approved_by: process.env.PETER_EMAIL,
    });

    // Log it
    await supabaseAdmin.from('logs').insert({
      lead_id,
      action: 'sent',
      detail: `Reply approved and sent to ${contact_email}`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await supabaseAdmin.from('logs').insert({
      lead_id,
      action: 'error',
      detail: `Email send failed: ${message}`,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
