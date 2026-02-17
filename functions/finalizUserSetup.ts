import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Create SDK client
    const base44 = createClientFromRequest(req);
    
    // Parse request body
    const { company_id, user_id } = await req.json().catch(() => ({}));
    
    if (!company_id || !user_id) {
      return Response.json({ error: 'Company ID and User ID are required' }, { status: 400 });
    }

    // Fetch the company (so we can prefill the company's settings for the user)
    const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
    const company = companies?.[0] || null;

    // Build a default company settings payload from the signup/company record
    const defaultCompanySettings = company ? {
      name: company.company_name || '',
      contact_name: company.contact_name || '',
      email: company.email || '',
      phone: company.phone || '',
      cvr: company.cvr || '',
      address: company.address || '',
      address_coordinates: company.address_coordinates || { lat: null, lon: null },
      website: company.website || '',
      logo_url: company.logo_url || '',
      terms_and_conditions: company.terms_and_conditions || '',
      quote_validity_days: company.quote_validity_days || 14,
    } : null;

    // Update user with company_id using service role (no auth check needed)
    // Access to the app is gated by email verification only (no manual admin approval).
    // If the User schema supports a "status" field, set it to active.
    // Also seed company_settings so the "Firma" settings page is pre-filled immediately.
    const userUpdate: Record<string, unknown> = {
      company_id: company_id,
    };

    if (defaultCompanySettings) {
      userUpdate.company_settings = {
        company: defaultCompanySettings,
      };
    }

    // Try to set status if the schema supports it
    try {
      await base44.asServiceRole.entities.User.update(user_id, {
        ...userUpdate,
        status: 'active'
      });
    } catch (_e) {
      await base44.asServiceRole.entities.User.update(user_id, userUpdate);
    }

    return Response.json({
      success: true,
      user_id: user_id,
      company_id: company_id,
      message: 'User setup completed successfully'
    });
  } catch (error) {
    console.error('Error finalizing user setup:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});