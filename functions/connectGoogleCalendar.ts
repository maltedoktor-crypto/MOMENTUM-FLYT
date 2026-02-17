import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the OAuth authorization URL for Google Calendar
    const authUrl = await base44.asServiceRole.connectors.getAuthorizationUrl('googlecalendar');

    return Response.json({
      success: true,
      authUrl: authUrl
    });
  } catch (error) {
    console.error('Error getting Google Calendar auth URL:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});