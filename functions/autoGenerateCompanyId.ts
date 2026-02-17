import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { event, data } = await req.json();
    
    // Only process create events
    if (event.type !== 'create') {
      return Response.json({ success: true });
    }

    const base44 = createClientFromRequest(req);
    
    // Generate a unique company_id (COMP-XXXXXX format)
    const companyId = `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Update the company with the generated ID
    const updatedCompany = await base44.asServiceRole.entities.Company.update(event.entity_id, {
      company_id: companyId
    });

    // Link user to company if email exists
    if (data.email) {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email: data.email });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            company_id: companyId
          });
        }
      } catch (err) {
        console.log('Could not auto-link user to company:', err.message);
      }
    }

    return Response.json({ success: true, company_id: companyId });
  } catch (error) {
    console.error('Error generating company ID:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});