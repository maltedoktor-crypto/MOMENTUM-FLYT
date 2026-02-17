import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { priceId, planName, companyId } = body;

    if (!priceId) {
      return Response.json({ error: 'Price ID is required' }, { status: 400 });
    }

    if (!companyId) {
      return Response.json({ 
        error: 'NEED_SIGNUP',
        message: 'Brugeren skal oprette virksomhed først'
      }, { status: 401 });
    }

    const origin = req.headers.get('origin') || 'https://your-app-url.com';
    
    console.log('Creating checkout for company:', companyId, 'plan:', planName);
    
    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/Dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Dashboard`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        company_id: companyId,
        plan_name: planName
      },
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          company_id: companyId,
          plan_name: planName
        },
        trial_period_days: 14
      }
    });
    
    console.log('Checkout session created:', session.id, 'for company:', companyId);

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    }, { status: 500 });
  }
});