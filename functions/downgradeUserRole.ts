import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If user is admin, downgrade to user
    if (user.role === 'admin') {
      // Get all users for this company to check if this should remain admin
      const companyId = user.company_id;
      
      if (companyId) {
        // Check how many admins exist for this company
        const allUsers = await base44.asServiceRole.entities.User.filter({ company_id: companyId });
        const adminCount = allUsers.filter(u => u.role === 'admin').length;
        
        // Only downgrade if there's more than one admin
        if (adminCount > 1) {
          console.log(`Downgrading user ${user.email} from admin to user`);
          // Note: We cannot directly update the role field as it's a system field
          // This is a limitation - the role can only be managed by Base44
          return Response.json({ 
            success: false,
            message: 'Cannot downgrade admin role - this must be done manually in Base44 dashboard'
          }, { status: 400 });
        }
      }

      return Response.json({ 
        success: true,
        message: 'User is admin but has no company or is only admin',
        role: user.role
      });
    }

    return Response.json({ 
      success: true,
      message: 'User is already a regular user',
      role: user.role
    });
  } catch (error) {
    console.error('Error checking user role:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});