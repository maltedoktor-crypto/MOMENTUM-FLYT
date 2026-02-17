import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { event, data } = await req.json();
    
    // Only process create events
    if (event.type !== 'create') {
      return Response.json({ success: true });
    }

    const base44 = createClientFromRequest(req);
    
    // Create a company for the new user
    if (data.email) {
      try {
        const company = await base44.asServiceRole.entities.Company.create({
          company_name: data.full_name || 'Unavngivet firma',
          contact_name: data.full_name || 'Bruger',
          email: data.email,
        });

        // Link user to company
        await base44.asServiceRole.entities.User.update(event.entity_id, {
          company_id: company.id
        });

        console.log('Company created and linked:', company.id);
        return Response.json({ success: true, company_id: company.id });
      } catch (err) {
        console.error('Could not create company for user:', err.message);
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in auto-create company function:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});