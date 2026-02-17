import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { event, data } = await req.json();
    
    // Only process create events
    if (event.type !== 'create') {
      return Response.json({ success: true });
    }

    const base44 = createClientFromRequest(req);
    
    // Link user to company by email
    if (data.email) {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email: data.email });
        if (users.length > 0) {
          await base44.asServiceRole.auth.updateMe({ 
            data: { company_id: event.entity_id }
          });
        }
      } catch (err) {
        console.log('Could not auto-link user to company:', err.message);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in auto-link function:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});