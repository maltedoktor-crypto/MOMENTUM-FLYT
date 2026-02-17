import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { user_email, company_id } = await req.json();
    
    if (!user_email || !company_id) {
      return Response.json({ error: 'user_email and company_id are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    
    // Get the user
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = users[0];
    
    // Update user with company_id
    await base44.asServiceRole.entities.User.update(user.id, {
      company_id
    });

    console.log('User updated with company_id:', company_id);
    return Response.json({ success: true, user_id: user.id, company_id });
  } catch (error) {
    console.error('Error updating user company:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});