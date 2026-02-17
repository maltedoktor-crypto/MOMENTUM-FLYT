import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    console.log('Test webhook event:', body.type);
    
    // For testing: skip signature verification
    const event = body;

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout completed - metadata:', session.metadata);
        const companyId = session.metadata?.company_id;
        
        if (!companyId) {
          console.error('No company_id in checkout session metadata');
          break;
        }
        
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          
          console.log(`Updating company ${companyId} with subscription ${session.subscription}`);
          
          await base44.asServiceRole.entities.Company.update(companyId, {
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            subscription_status: subscription.status,
            subscription_plan: session.metadata.plan_name,
            trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          });
          
          console.log(`✓ Company ${companyId} updated successfully with plan: ${session.metadata.plan_name}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const companyId = subscription.metadata?.company_id;
        
        if (companyId) {
          const updateData = {
            subscription_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
          };
          
          if (subscription.metadata?.plan_name) {
            updateData.subscription_plan = subscription.metadata.plan_name;
          }
          
          await base44.asServiceRole.entities.Company.update(companyId, updateData);
          
          console.log(`✓ Subscription updated for company ${companyId}: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const companyId = subscription.metadata?.company_id;
        
        if (companyId) {
          // Update company subscription status
          await base44.asServiceRole.entities.Company.update(companyId, {
            subscription_status: 'canceled',
            subscription_plan: null
          });
          
          // Deactivate all embed tokens for this company
          const tokens = await base44.asServiceRole.entities.EmbedToken.filter({
            organization_id: companyId,
            active: true
          });
          
          for (const token of tokens) {
            await base44.asServiceRole.entities.EmbedToken.update(token.id, {
              active: false
            });
          }
          
          console.log(`✓ Subscription canceled for company ${companyId} - deactivated ${tokens.length} embed tokens`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const companyId = subscription.metadata?.company_id;
        
        if (companyId) {
          await base44.asServiceRole.entities.Company.update(companyId, {
            subscription_status: 'past_due'
          });
          
          console.log(`✓ Payment failed for company ${companyId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true, processed: event.type });
  } catch (error) {
    console.error('Test webhook error:', error);
    return Response.json({ 
      error: 'Webhook processing failed',
      details: error.message 
    }, { status: 500 });
  }
});