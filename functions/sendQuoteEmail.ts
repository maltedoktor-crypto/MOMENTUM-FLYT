import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    const emailContent = `From: noreply@momentum.dk\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}`;
    
    // Convert to UTF-8 bytes then to base64
    const encoder = new TextEncoder();
    const encodedBytes = encoder.encode(emailContent);
    
    // Convert Uint8Array to base64 string
    let binaryString = '';
    for (let i = 0; i < encodedBytes.length; i++) {
      binaryString += String.fromCharCode(encodedBytes[i]);
    }
    const encodedMessage = btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Gmail error:', error);
      return Response.json({ error: 'Failed to send email' }, { status: 500 });
    }

    const data = await response.json();
    return Response.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});