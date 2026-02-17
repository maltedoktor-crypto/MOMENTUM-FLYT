import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token mangler' }, { status: 400 });
    }

    // Find the embed token
    const embedTokens = await base44.asServiceRole.entities.EmbedToken.filter({
      token: token,
      active: true
    });

    if (embedTokens.length === 0) {
      return Response.json({ error: 'Ugyldigt token' }, { status: 401 });
    }

    const embedToken = embedTokens[0];

    // Get the company
    const companies = await base44.asServiceRole.entities.Company.filter({
      id: embedToken.company_id
    });

    if (companies.length === 0) {
      return Response.json({ error: 'Virksomhed ikke fundet' }, { status: 404 });
    }

    const company = companies[0];

    return Response.json({
      success: true,
      company: {
        id: company.id,
        name: company.company_name,
        pricing_config: company.pricing_config || {}
      }
    });
  } catch (error) {
    console.error('Token validation error:', error.message, error.stack);
    return Response.json({ error: 'Der skete en fejl: ' + error.message }, { status: 500 });
  }
});