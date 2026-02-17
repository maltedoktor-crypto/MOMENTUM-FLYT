import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CheckCircle2, 
  XCircle, 
  MapPin,
  Calendar,
  Clock,
  Package,
  Truck,
  Loader2,
  FileText,
  Phone,
  Mail,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

const servicePackageNames = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

const servicePackageFeatures = {
  basic: ['Transport', 'Basis beskyttelse'],
  standard: ['Transport', 'Demontering af møbler', 'Montering af møbler', 'Basis beskyttelse'],
  premium: ['Transport', 'Fuld nedpakning', 'Fuld udpakning', 'Demontering & montering', 'Premium beskyttelse'],
};

const timeWindowNames = {
  morning: 'Morgen (08:00-12:00)',
  afternoon: 'Eftermiddag (12:00-17:00)',
  full_day: 'Hel dag',
  flexible: 'Fleksibel',
};

const specialItemNames = {
  piano: 'Klaver/Flygel',
  safe: 'Pengeskab',
  artwork: 'Kunstværk',
  antique: 'Antikvitet',
  aquarium: 'Akvarium',
  pool_table: 'Poolbord',
  other: 'Andet',
};

export default function PublicQuote() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['public-quote', token],
    queryFn: async () => {
      const quotes = await base44.entities.Quote.filter({ public_token: token });
      return quotes[0] || null;
    },
    enabled: !!token,
  });

  // Mark as viewed
  useEffect(() => {
    if (quote && quote.status === 'sent') {
      base44.entities.Quote.update(quote.id, { 
        status: 'viewed', 
        viewed_at: new Date().toISOString() 
      });
    }
  }, [quote]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!quote?.organization_id) {
        throw new Error('Tilbuddet mangler organisation. Kontakt venligst supporten.');
      }

      // Update quote to accepted
      await base44.entities.Quote.update(quote.id, {
        status: 'accepted',
        responded_at: new Date().toISOString(),
      });

      // Check if a job already exists for this quote
      const existingJobs = await base44.entities.Job.filter({ quote_id: quote.id });
      
      // Only create job if one doesn't exist already
      if (existingJobs.length === 0) {
        const jobNumber = `JOB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(3, '0')}`;
        
        await base44.entities.Job.create({
          organization_id: quote.organization_id,
          quote_id: quote.id,
          customer_id: quote.customer_id,
          job_number: jobNumber,
          status: 'scheduled',
          scheduled_date: quote.preferred_date || new Date().toISOString().split('T')[0],
          start_time: quote.time_window === 'morning' ? '08:00' : quote.time_window === 'afternoon' ? '12:00' : '08:00',
          customer_name: quote.customer_name,
          customer_email: quote.customer_email,
          customer_phone: quote.customer_phone,
          from_address: quote.from_address,
          from_floor: quote.from_floor,
          from_elevator: quote.from_elevator,
          to_address: quote.to_address,
          to_floor: quote.to_floor,
          to_elevator: quote.to_elevator,
          extra_stops: quote.extra_stops,
          crew_size: quote.crew_size,
          services: quote.services,
          special_items: quote.special_items,
          notes: quote.internal_notes,
          customer_notes: quote.customer_notes,
          quoted_price: quote.total_price,
        });
      }

      return true;
    },
    onSuccess: () => {
      setAccepted(true);
      queryClient.invalidateQueries({ queryKey: ['public-quote', token] });
    },
    onError: (error) => {
      console.error('Accept error:', error);
      alert(error.message || 'Der opstod en fejl. Prøv venligst igen.');
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Quote.update(quote.id, {
        status: 'declined',
        responded_at: new Date().toISOString(),
        decline_reason: declineReason,
      });
    },
    onSuccess: () => {
      setDeclined(true);
      setDeclineDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['public-quote', token] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!quote || error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-slate-900 mb-2">Tilbud ikke fundet</h2>
            <p className="text-slate-500">
              Dette tilbud findes ikke eller linket er udløbet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();
  const alreadyResponded = quote.status === 'accepted' || quote.status === 'declined' || quote.status === 'converted';

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Tilbud accepteret!</h2>
            <p className="text-slate-600 mb-6">
              Tak! Vi har modtaget din accept og kontakter dig snarest for at bekræfte detaljerne.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl text-left">
              <p className="text-sm text-slate-500">Tilbudsnummer</p>
              <p className="font-semibold text-slate-900">{quote.quote_number}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Tilbud afvist</h2>
            <p className="text-slate-600">
              Tak for din tilbagemelding. Vi håber at høre fra dig igen i fremtiden.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">M</span>
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">MOMENTUM</span>
            </div>
            <div className="flex items-center gap-4">
              {(quote.company_logo_url || quote.company_name) ? (
                <div className="flex items-center gap-2">
                  {quote.company_logo_url ? (
                    <img
                      src={quote.company_logo_url}
                      alt={quote.company_name || 'Firma logo'}
                      className="h-8 w-8 rounded-md object-contain bg-white border border-slate-200"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : null}
                  {quote.company_name ? (
                    <span className="text-sm font-medium text-slate-700">{quote.company_name}</span>
                  ) : null}
                </div>
              ) : null}
              <Badge className="bg-indigo-100 text-indigo-700">
                Tilbud {quote.quote_number}
              </Badge>
              <Button
                variant="outline"
                className="print:hidden"
                onClick={() => window.print()}
              >
                <FileText className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Banner */}
        {isExpired && (
          <Card className="border-0 shadow-sm bg-amber-50 mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Dette tilbud er udløbet</p>
                  <p className="text-sm text-amber-600">Kontakt os for et nyt tilbud.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {alreadyResponded && (
          <Card className="border-0 shadow-sm bg-slate-100 mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                {quote.status === 'accepted' || quote.status === 'converted' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium text-slate-800">
                    {quote.status === 'accepted' || quote.status === 'converted'
                      ? 'Du har accepteret dette tilbud'
                      : 'Du har afvist dette tilbud'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome */}
            <Card className="border-0 shadow-sm">
              <CardContent className="py-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Hej {quote.customer_name?.split(' ')[0]}! 👋
                </h1>
                <p className="text-slate-600">
                  Her er dit tilbud på flytning. Gennemgå detaljerne nedenfor og acceptér, hvis du er tilfreds.
                </p>
              </CardContent>
            </Card>

            {/* Addresses */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Rute
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-700 font-bold text-sm">Fra</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{quote.from_address}</p>
                      <div className="flex gap-3 mt-1 text-sm text-slate-500">
                        <span>Etage: {quote.from_floor || 0}</span>
                        <span>•</span>
                        <span>Elevator: {quote.from_elevator ? 'Ja' : 'Nej'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-5 border-l-2 border-dashed border-slate-200 h-8" />
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-700 font-bold text-sm">Til</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{quote.to_address}</p>
                      <div className="flex gap-3 mt-1 text-sm text-slate-500">
                        <span>Etage: {quote.to_floor || 0}</span>
                        <span>•</span>
                        <span>Elevator: {quote.to_elevator ? 'Ja' : 'Nej'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Detaljer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Ønsket dato</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <p className="font-medium text-slate-900">
                        {quote.preferred_date 
                          ? format(new Date(quote.preferred_date), 'd. MMMM yyyy', { locale: da })
                          : 'Ikke angivet'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Tidsvindue</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <p className="font-medium text-slate-900">
                        {timeWindowNames[quote.time_window] || 'Ikke angivet'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Mandskab</p>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-400" />
                      <p className="font-medium text-slate-900">{quote.crew_size || 2} mand</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Est. timer</p>
                    <p className="font-medium text-slate-900">{quote.estimated_hours || '-'} timer</p>
                  </div>
                </div>

                {quote.service_package && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <p className="text-sm text-slate-500 mb-3">Servicepakke</p>
                    <div className="p-4 bg-indigo-50 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-indigo-600 text-white">
                          {servicePackageNames[quote.service_package]}
                        </Badge>
                      </div>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {servicePackageFeatures[quote.service_package]?.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                            <Check className="w-4 h-4 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {quote.special_items && quote.special_items.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <p className="text-sm text-slate-500 mb-3">Specielle genstande</p>
                    <div className="flex flex-wrap gap-2">
                      {quote.special_items.map((item, i) => (
                        <Badge key={i} variant="outline" className="bg-white">
                          {specialItemNames[item.type] || item.type}
                          {item.quantity > 1 && ` (${item.quantity})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price */}
            <Card className="border-0 shadow-lg sticky top-6">
              <CardHeader className="pb-4 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-t-xl">
                <CardTitle className="text-white text-lg">Pris</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Flytning</span>
                    <span className="font-medium">{quote.base_price?.toLocaleString('da-DK')} kr</span>
                  </div>

                  {quote.surcharges && quote.surcharges.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600">{s.description}</span>
                      <span className="font-medium">{s.amount?.toLocaleString('da-DK')} kr</span>
                    </div>
                  ))}

                  {quote.materials_price > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Materialer</span>
                      <span className="font-medium">{quote.materials_price?.toLocaleString('da-DK')} kr</span>
                    </div>
                  )}

                  {quote.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Rabat</span>
                      <span>-{quote.discount_amount?.toLocaleString('da-DK')} kr</span>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span>{quote.subtotal?.toLocaleString('da-DK')} kr</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-slate-600">Moms (25%)</span>
                      <span>{quote.vat_amount?.toLocaleString('da-DK')} kr</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex justify-between items-end">
                      <span className="font-semibold text-slate-900">Total</span>
                      <span className="text-3xl font-bold text-indigo-600">
                        {quote.total_price?.toLocaleString('da-DK')} kr
                      </span>
                    </div>
                  </div>
                </div>

                {!alreadyResponded && !isExpired && (
                  <div className="space-y-3">
                    <Button 
                      className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-lg"
                      onClick={() => acceptMutation.mutate()}
                      disabled={acceptMutation.isPending}
                    >
                      {acceptMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          Acceptér tilbud
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setDeclineDialogOpen(true)}
                    >
                      Afvis tilbud
                    </Button>
                  </div>
                )}

                {quote.valid_until && (
                  <p className="text-xs text-slate-500 text-center mt-4">
                    Tilbuddet er gyldigt til {format(new Date(quote.valid_until), 'd. MMMM yyyy', { locale: da })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="border-0 shadow-sm">
              <CardContent className="py-4">
                <p className="text-sm text-slate-500 mb-3">Spørgsmål? Kontakt os</p>
                <div className="space-y-2">
                  {quote?.company_phone ? (
                    <a href={`tel:${quote.company_phone}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                      <Phone className="w-4 h-4" />
                      {quote.company_phone}
                    </a>
                  ) : null}

                  {quote?.company_email ? (
                    <a href={`mailto:${quote.company_email}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                      <Mail className="w-4 h-4" />
                      {quote.company_email}
                    </a>
                  ) : null}

                  {!quote?.company_phone && !quote?.company_email ? (
                    <p className="text-sm text-slate-600">Kontaktoplysninger mangler. Kontakt venligst firmaet direkte.</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
          Powered by MOMENTUM
        </div>
      </footer>

      {/* Decline Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Afvis tilbud</DialogTitle>
            <DialogDescription>
              Fortæl os gerne hvorfor, så vi kan forbedre vores tilbud.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Valgfrit: Årsag til afvisning..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
              Annuller
            </Button>
            <Button 
              variant="destructive"
              onClick={() => declineMutation.mutate()}
              disabled={declineMutation.isPending}
            >
              {declineMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Afvis tilbud'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}