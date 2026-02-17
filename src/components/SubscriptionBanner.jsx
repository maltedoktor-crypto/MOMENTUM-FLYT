import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, Clock } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function SubscriptionBanner({ company }) {
  if (!company?.subscription_status) return null;

  const status = company.subscription_status;
  const trialEndsAt = company.trial_ends_at ? new Date(company.trial_ends_at) : null;
  const currentPeriodEnd = company.current_period_end ? new Date(company.current_period_end) : null;
  
  const daysUntilTrialEnd = trialEndsAt ? Math.ceil((trialEndsAt - new Date()) / (1000 * 60 * 60 * 24)) : 0;
  const daysUntilRenewal = currentPeriodEnd ? Math.ceil((currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  // Trial ending soon
  if (status === 'trialing' && daysUntilTrialEnd <= 3 && daysUntilTrialEnd > 0) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertDescription className="ml-2 flex items-center justify-between">
          <span className="text-amber-900">
            Din prøveperiode slutter om {daysUntilTrialEnd} {daysUntilTrialEnd === 1 ? 'dag' : 'dage'}. 
            Fortsæt med at bruge systemet ved at vælge en plan.
          </span>
          <Link to={createPageUrl('Settings')}>
            <Button size="sm" variant="outline" className="ml-4 border-amber-300 hover:bg-amber-100">
              Vælg plan
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Payment failed or past due
  if (status === 'past_due' || status === 'unpaid') {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="ml-2 flex items-center justify-between">
          <span className="text-red-900">
            Din betaling fejlede. Opdater dine betalingsoplysninger for at fortsætte.
          </span>
          <Link to={createPageUrl('Settings')}>
            <Button size="sm" variant="outline" className="ml-4 border-red-300 hover:bg-red-100">
              <CreditCard className="w-4 h-4 mr-2" />
              Opdater betaling
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Subscription canceled
  if (status === 'canceled') {
    return (
      <Alert className="border-slate-200 bg-slate-50">
        <AlertTriangle className="h-4 w-4 text-slate-600" />
        <AlertDescription className="ml-2 flex items-center justify-between">
          <span className="text-slate-900">
            Dit abonnement er opsagt. Adgang fortsætter indtil {currentPeriodEnd?.toLocaleDateString('da-DK')}.
          </span>
          <Link to={createPageUrl('Settings')}>
            <Button size="sm" variant="outline" className="ml-4">
              Genaktiver
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}