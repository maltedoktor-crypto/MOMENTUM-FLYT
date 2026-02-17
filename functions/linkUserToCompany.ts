import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find company by user email
    const companies = await base44.asServiceRole.entities.Company.filter({ email: user.email });
    
    if (companies.length === 0) {
      return Response.json({ error: 'No company found for this email' }, { status: 404 });
    }

    // Update user with company_id
    const companyId = companies[0].id;
    await base44.auth.updateMe({ 
      company_id: companyId
    });

    return Response.json({ 
      success: true, 
      company_id: companyId,
      message: 'User linked to company'
    });
  } catch (error) {
    console.error('Error linking user to company:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});