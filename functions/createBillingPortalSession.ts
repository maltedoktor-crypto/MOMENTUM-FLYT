import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.company_id) {
      return Response.json({ error: 'Bruger eller virksomhed ikke fundet' }, { status: 401 });
    }

    // Hent virksomhed for at få Stripe customer ID
    const companies = await base44.entities.Company.filter({ id: user.company_id });
    if (!companies.length || !companies[0].stripe_customer_id) {
      return Response.json({ error: 'Intet Stripe kundeid found' }, { status: 400 });
    }

    const customerId = companies[0].stripe_customer_id;

    // Opret billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: req.headers.get('origin') || 'https://your-app-url.com/Profile',
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    return Response.json({ 
      error: 'Kunne ikke oprette billing portal session',
      details: error.message 
    }, { status: 500 });
  }
});