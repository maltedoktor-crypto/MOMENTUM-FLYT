import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';

/**
 * QuotePrint
 * - Minimal printable page for browser "Save as PDF".
 * - Uses company snapshot fields on the quote when available.
 * - Falls back to organization/company settings if snapshot fields are missing.
 */
export default function QuotePrint() {
  const urlParams = new URLSearchParams(window.location.search);
  const quoteId = urlParams.get('id');
  const autoPrint = urlParams.get('autoprint') === '1';

  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        // If not authenticated, keep user null. (Page may still work if quote is public in your backend.)
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];
      return base44.entities.Organization.filter({ company_id: user.company_id });
    },
    enabled: !!user?.company_id,
  });

  const organization = organizations[0];

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote_print', quoteId, organization?.id],
    queryFn: async () => {
      if (!quoteId) return null;
      // Prefer scoping to organization when available
      if (organization?.id) {
        const scoped = await base44.entities.Quote.filter({ id: quoteId, organization_id: organization.id });
        return scoped[0] || null;
      }
      // Fallback: try without org scope (if your backend allows)
      const quotes = await base44.entities.Quote.filter({ id: quoteId });
      return quotes[0] || null;
    },
    enabled: !!quoteId,
  });

  const pricingBreakdown = useMemo(() => {
    const pb = quote?.pricing_breakdown;
    if (!pb) return null;
    try {
      return typeof pb === 'string' ? JSON.parse(pb) : pb;
    } catch {
      return null;
    }
  }, [quote?.pricing_breakdown]);

  const company = useMemo(() => {
    // Quote snapshot fields (preferred)
    const snapshot = {
      name: quote?.company_name,
      email: quote?.company_email,
      phone: quote?.company_phone,
      address: quote?.company_address,
      cvr: quote?.company_cvr,
      logoUrl: quote?.company_logo_url,
      website: quote?.company_website,
    };
    const hasSnapshot = Object.values(snapshot).some(v => !!v);
    if (hasSnapshot) return snapshot;

    // Fallback to organization settings (best-effort)
    const companySettings = organization?.company_settings?.company || organization?.company || {};
    return {
      name: companySettings?.name || organization?.name,
      email: companySettings?.email || organization?.email,
      phone: companySettings?.phone || organization?.phone,
      address: companySettings?.address || organization?.address,
      cvr: companySettings?.cvr || organization?.cvr,
      logoUrl: companySettings?.logo_url || organization?.logo_url,
      website: companySettings?.website || organization?.website,
    };
  }, [quote, organization]);

  useEffect(() => {
    if (!autoPrint) return;
    if (!quoteId) return;
    if (isLoading) return;

    // Let the browser paint before printing
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, [autoPrint, quoteId, isLoading]);

  if (!quoteId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full border rounded-lg p-6">
          <h1 className="text-lg font-semibold">Mangler tilbuds-id</h1>
          <p className="text-sm text-slate-600 mt-2">Åbn denne side med <code>?id=...</code>.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full border rounded-lg p-6">
          <h1 className="text-lg font-semibold">Tilbud ikke fundet</h1>
          <p className="text-sm text-slate-600 mt-2">Kontrollér linket eller adgangen til tilbuddet.</p>
        </div>
      </div>
    );
  }

  const currency = (n) => {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return '';
    return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(Number(n));
  };

  const fmtDate = (d) => {
    if (!d) return '';
    try {
      return format(new Date(d), 'd. MMMM yyyy', { locale: da });
    } catch {
      return String(d);
    }
  };

  // Breakdown lines (best-effort)
  const lines = [];
  if (pricingBreakdown?.labor_price != null) lines.push({ label: 'Arbejde', value: currency(pricingBreakdown.labor_price) });
  if (pricingBreakdown?.transport_price != null && Number(pricingBreakdown.transport_price) > 0) {
    lines.push({ label: 'Transport', value: currency(pricingBreakdown.transport_price) });
  }
  if (pricingBreakdown?.heavy_fee != null && Number(pricingBreakdown.heavy_fee) > 0) {
    lines.push({ label: 'Tunge genstande', value: currency(pricingBreakdown.heavy_fee) });
  }
  if (Array.isArray(pricingBreakdown?.fees) && pricingBreakdown.fees.length) {
    for (const fee of pricingBreakdown.fees) {
      lines.push({ label: fee?.name || 'Tillæg', value: currency(fee?.amount || 0) });
    }
  }
  if (pricingBreakdown?.add_on_fees_total != null && Number(pricingBreakdown.add_on_fees_total) > 0 && !Array.isArray(pricingBreakdown?.fees)) {
    lines.push({ label: 'Tillæg', value: currency(pricingBreakdown.add_on_fees_total) });
  }
  const total = pricingBreakdown?.total_price ?? quote.total_price ?? quote.price_total ?? quote.final_price;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Controls (hidden in print) */}
      <div className="print:hidden border-b bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Tilbage
            </Button>
          </div>
          <Button onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Printable content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name || 'Logo'}
                className="h-12 w-auto object-contain"
              />
            ) : null}
            <div>
              <h1 className="text-2xl font-semibold">Tilbud</h1>
              <p className="text-sm text-slate-600">Tilbud ID: {quote.id}</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">{company.name || 'Virksomhed'}</div>
            {company.cvr ? <div>CVR: {company.cvr}</div> : null}
            {company.address ? <div>{company.address}</div> : null}
            <div className="mt-1">
              {company.email ? <div>{company.email}</div> : null}
              {company.phone ? <div>{company.phone}</div> : null}
              {company.website ? <div>{company.website}</div> : null}
            </div>
          </div>
        </div>

        <hr className="my-6" />

        {/* Customer + job details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold">Kunde</h2>
            <div className="mt-2 text-sm space-y-1">
              <div><span className="text-slate-600">Navn:</span> {quote.customer_name || '-'}</div>
              <div><span className="text-slate-600">Email:</span> {quote.customer_email || '-'}</div>
              <div><span className="text-slate-600">Telefon:</span> {quote.customer_phone || '-'}</div>
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold">Flytning</h2>
            <div className="mt-2 text-sm space-y-1">
              <div><span className="text-slate-600">Dato:</span> {fmtDate(quote.preferred_date)}</div>
              <div><span className="text-slate-600">Fra:</span> {quote.from_address || '-'}</div>
              <div><span className="text-slate-600">Til:</span> {quote.to_address || '-'}</div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div><span className="text-slate-600">Etage (fra):</span> {quote.from_floor ?? '-'}</div>
                <div><span className="text-slate-600">Etage (til):</span> {quote.to_floor ?? '-'}</div>
                <div><span className="text-slate-600">Elevator (fra):</span> {quote.from_elevator ? 'Ja' : 'Nej'}</div>
                <div><span className="text-slate-600">Elevator (til):</span> {quote.to_elevator ? 'Ja' : 'Nej'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="mt-6 border rounded-lg p-4">
          <h2 className="font-semibold">Pris</h2>
          {pricingBreakdown ? (
            <div className="mt-3 text-sm">
              <div className="grid grid-cols-2 gap-y-2">
                {pricingBreakdown?.volume_m3 != null ? (
                  <>
                    <div className="text-slate-600">Estimeret volumen</div>
                    <div className="text-right">{Number(pricingBreakdown.volume_m3).toFixed(1)} m³</div>
                  </>
                ) : null}
                {pricingBreakdown?.crew != null ? (
                  <>
                    <div className="text-slate-600">Medarbejdere</div>
                    <div className="text-right">{pricingBreakdown.crew}</div>
                  </>
                ) : null}
                {pricingBreakdown?.labor_hours != null ? (
                  <>
                    <div className="text-slate-600">Tid (estimat)</div>
                    <div className="text-right">{Number(pricingBreakdown.labor_hours).toFixed(2)} timer</div>
                  </>
                ) : null}
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="space-y-2">
                  {lines.length ? lines.map((l, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="text-slate-700">{l.label}</div>
                      <div className="font-medium">{l.value}</div>
                    </div>
                  )) : (
                    <div className="flex items-center justify-between">
                      <div className="text-slate-700">Pris</div>
                      <div className="font-medium">{currency(total)}</div>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t pt-4 flex items-center justify-between">
                  <div className="text-base font-semibold">Total</div>
                  <div className="text-base font-semibold">{currency(total)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-slate-700">Total</div>
                <div className="text-base font-semibold">{currency(total)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Terms */}
        <div className="mt-6 text-xs text-slate-600">
          <p>
            Dette tilbud er et estimat baseret på de oplysninger, der er angivet. Endelig pris kan afhænge af
            adgangsforhold, ekstra stop og uforudsete forhold.
          </p>
        </div>
      </div>
    </div>
  );
}
