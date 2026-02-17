import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
  ArrowLeft, 
  Send, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  FileText,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  Clock,
  Package,
  Truck,
  Copy,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarPlus,
  Bell
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { toast } from 'sonner';

const statusConfig = {
  draft: { label: 'Kladde', color: 'bg-slate-100 text-slate-700', icon: FileText },
  sent: { label: 'Sendt', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Set', color: 'bg-amber-100 text-amber-700', icon: Eye },
  accepted: { label: 'Accepteret', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  declined: { label: 'Afvist', color: 'bg-red-100 text-red-700', icon: XCircle },
  expired: { label: 'Udløbet', color: 'bg-slate-100 text-slate-500', icon: Clock },
  converted: { label: 'Konverteret', color: 'bg-violet-100 text-violet-700', icon: CheckCircle2 },
};

const servicePackageNames = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
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

export default function QuoteDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const quoteId = urlParams.get('id');
  const [user, setUser] = useState(null);
  
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false);

  const openPrintView = () => {
    if (!quoteId) return;
    const url = `/quote-print?id=${encodeURIComponent(quoteId)}&autoprint=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {}
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

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', quoteId, organizations[0]?.id],
    queryFn: async () => {
      if (!organizations[0]) return null;
      const quotes = await base44.entities.Quote.filter({ id: quoteId, organization_id: organizations[0].id });
      return quotes[0] || null;
    },
    enabled: !!quoteId && !!organizations[0],
  });

  const organization = organizations[0];
  const emailTemplates = organization?.email_templates || {};

  const pricingBreakdown = (() => {
    const pb = quote?.pricing_breakdown;
    if (!pb) return null;
    try {
      return typeof pb === 'string' ? JSON.parse(pb) : pb;
    } catch (e) {
      return null;
    }
  })();
  
  // Check if follow-up is needed
  const needsFollowup = ['sent', 'viewed'].includes(quote?.status) && quote?.sent_at;
  const daysSinceSent = needsFollowup 
    ? Math.floor((new Date() - new Date(quote.sent_at)) / (1000 * 60 * 60 * 24))
    : 0;
  const followupInterval = emailTemplates.followup_interval_days || 3;
  const shouldFollowup = needsFollowup && daysSinceSent >= followupInterval;

  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (id) => {
      // Find and delete related job if exists
      const jobs = await base44.entities.Job.filter({ quote_id: id });
      for (const job of jobs) {
        await base44.entities.Job.delete(job.id);
      }
      
      // Delete the quote
      await base44.entities.Quote.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigate(createPageUrl('Quotes'));
      toast.success('Tilbud og relateret job slettet');
    },
  });

  const convertToJobMutation = useMutation({
    mutationFn: async () => {
      // Create job from quote
      const jobNumber = `JOB-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
      
      const newJob = await base44.entities.Job.create({
        organization_id: quote.organization_id,
        quote_id: quote.id,
        customer_id: quote.customer_id,
        job_number: jobNumber,
        status: 'scheduled',
        scheduled_date: quote.preferred_date,
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
        quoted_price: quote.total_price,
        notes: quote.internal_notes,
        customer_notes: quote.customer_notes,
      });

      // Update quote status
      await base44.entities.Quote.update(quote.id, { status: 'converted' });
      
      return newJob;
    },
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setConvertDialogOpen(false);
      navigate(createPageUrl(`JobDetail?id=${newJob.id}`));
    },
  });

  const handleSendQuote = async () => {
    try {
      // Send email via integration
      await base44.integrations.Core.SendEmail({
        to: quote.customer_email,
        subject: `Tilbud ${quote.quote_number} fra dit flyttefirma`,
        body: `
Kære ${quote.customer_name},

Tak for din henvendelse. Vi har udarbejdet et tilbud til dig.

Tilbudsnummer: ${quote.quote_number}
Flyttedato: ${quote.preferred_date ? format(new Date(quote.preferred_date), 'd. MMMM yyyy', { locale: da }) : 'Ikke angivet'}
Fra: ${quote.from_address}
Til: ${quote.to_address}
Totalpris: ${quote.total_price?.toLocaleString('da-DK')} kr inkl. moms

Se og acceptér tilbuddet her:
${window.location.origin}/PublicQuote?token=${quote.public_token}

Tilbuddet er gyldigt til ${quote.valid_until ? format(new Date(quote.valid_until), 'd. MMMM yyyy', { locale: da }) : '14 dage'}.

Med venlig hilsen,
Dit flyttefirma
        `.trim(),
      });

      // Update quote status
      await updateQuoteMutation.mutateAsync({
        id: quote.id,
        data: { status: 'sent', sent_at: new Date().toISOString() }
      });

      setSendDialogOpen(false);
      toast.success('Tilbud sendt til kunden');
    } catch (error) {
      toast.error('Kunne ikke sende tilbud');
    }
  };

  const copyPublicLink = () => {
    const link = `${window.location.origin}/PublicQuote?token=${quote.public_token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link kopieret til udklipsholder');
  };

  const handleSendFollowup = async () => {
    try {
      const link = `${window.location.origin}/PublicQuote?token=${quote.public_token}`;
      const companyName = organization?.name || 'Dit flyttefirma';
      
      let subject = emailTemplates.quote_followup_subject || 'Påmindelse: Dit tilbud fra {{company_name}}';
      let body = emailTemplates.quote_followup_body || 'Hej {{customer_name}},\n\nVi vil gerne minde dig om tilbuddet vi sendte for {{days_ago}} dage siden.\n\nDu kan se og acceptere tilbuddet her:\n{{quote_link}}\n\nHar du spørgsmål eller ønsker ændringer? Kontakt os gerne.\n\nMed venlig hilsen,\n{{company_name}}';
      
      // Replace placeholders
      subject = subject.replace(/\{\{company_name\}\}/g, companyName);
      body = body
        .replace(/\{\{customer_name\}\}/g, quote.customer_name)
        .replace(/\{\{company_name\}\}/g, companyName)
        .replace(/\{\{quote_link\}\}/g, link)
        .replace(/\{\{days_ago\}\}/g, daysSinceSent.toString());

      // Send email
      await base44.integrations.Core.SendEmail({
        from_name: companyName,
        to: quote.customer_email,
        subject,
        body,
      });

      // Update quote
      await updateQuoteMutation.mutateAsync({
        id: quote.id,
        data: { 
          last_followup_sent: new Date().toISOString(),
          followup_count: (quote.followup_count || 0) + 1
        }
      });

      setFollowupDialogOpen(false);
      toast.success('Opfølgning sendt til kunden');
    } catch (error) {
      toast.error('Kunne ikke sende opfølgning');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-16">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-slate-900">Tilbud ikke fundet</h2>
        <Link to={createPageUrl("Quotes")}>
          <Button variant="link" className="mt-2">Tilbage til tilbud</Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[quote.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Quotes"))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{quote.quote_number}</h1>
              <Badge className={`${status.color} font-medium`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-slate-500 mt-1">
              Oprettet {format(new Date(quote.created_date), 'd. MMMM yyyy', { locale: da })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {quote.status === 'draft' && (
            <Button onClick={() => setSendDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Send className="w-4 h-4 mr-2" />
              Send tilbud
            </Button>
          )}
          {(quote.status === 'sent' || quote.status === 'viewed') && (
            <>
              <Button 
                variant={shouldFollowup ? "default" : "outline"} 
                onClick={() => setFollowupDialogOpen(true)}
                className={shouldFollowup ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}
              >
                <Bell className="w-4 h-4 mr-2" />
                {shouldFollowup ? 'Send opfølgning' : 'Opfølgning'}
              </Button>
              <Button variant="outline" onClick={copyPublicLink}>
                <Copy className="w-4 h-4 mr-2" />
                Kopiér link
              </Button>
            </>
          )}
          {quote.status === 'accepted' && (
            <Button onClick={() => setConvertDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
              <CalendarPlus className="w-4 h-4 mr-2" />
              Konverter til job
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Pencil className="w-4 h-4 mr-2" />
                Rediger
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyPublicLink}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Åbn kundevisning
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openPrintView}>
                <FileText className="w-4 h-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Slet tilbud
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" />
                Kunde
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Navn</p>
                  <p className="font-medium text-slate-900">{quote.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <a href={`mailto:${quote.customer_email}`} className="font-medium text-indigo-600 hover:underline">
                    {quote.customer_email}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Telefon</p>
                  <a href={`tel:${quote.customer_phone}`} className="font-medium text-indigo-600 hover:underline">
                    {quote.customer_phone || '-'}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-slate-400" />
                Adresser
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm font-medium text-slate-500 mb-2">Fra</p>
                  <p className="font-medium text-slate-900">{quote.from_address}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                    <span>Etage: {quote.from_floor || 0}</span>
                    <span>Elevator: {quote.from_elevator ? 'Ja' : 'Nej'}</span>
                    {quote.from_parking_distance > 0 && (
                      <span>Parkering: {quote.from_parking_distance}m</span>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm font-medium text-slate-500 mb-2">Til</p>
                  <p className="font-medium text-slate-900">{quote.to_address}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                    <span>Etage: {quote.to_floor || 0}</span>
                    <span>Elevator: {quote.to_elevator ? 'Ja' : 'Nej'}</span>
                    {quote.to_parking_distance > 0 && (
                      <span>Parkering: {quote.to_parking_distance}m</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-400" />
                Detaljer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-500">Ønsket dato</p>
                  <p className="font-medium text-slate-900">
                    {quote.preferred_date 
                      ? format(new Date(quote.preferred_date), 'd. MMM yyyy', { locale: da })
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tidsvindue</p>
                  <p className="font-medium text-slate-900">{timeWindowNames[quote.time_window] || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Servicepakke</p>
                  <Badge className="bg-indigo-100 text-indigo-700 mt-1">
                    {servicePackageNames[quote.service_package] || 'Standard'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Mandskab</p>
                  <p className="font-medium text-slate-900">{quote.crew_size || 2} mand</p>
                </div>
              </div>

              {(quote.home_size_m2 || quote.home_rooms || quote.estimated_volume_m3) && (
                <div className="grid md:grid-cols-3 gap-4 mb-6 pt-4 border-t border-slate-100">
                  {quote.home_size_m2 && (
                    <div>
                      <p className="text-sm text-slate-500">Boligstørrelse</p>
                      <p className="font-medium text-slate-900">{quote.home_size_m2} m²</p>
                    </div>
                  )}
                  {quote.home_rooms && (
                    <div>
                      <p className="text-sm text-slate-500">Antal rum</p>
                      <p className="font-medium text-slate-900">{quote.home_rooms}</p>
                    </div>
                  )}
                  {quote.estimated_volume_m3 && (
                    <div>
                      <p className="text-sm text-slate-500">Est. volumen</p>
                      <p className="font-medium text-slate-900">{quote.estimated_volume_m3} m³</p>
                    </div>
                  )}
                </div>
              )}

              {quote.special_items && quote.special_items.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm font-medium text-slate-500 mb-2">Specielle genstande</p>
                  <div className="flex flex-wrap gap-2">
                    {quote.special_items.map((item, i) => (
                      <Badge key={i} variant="outline">
                        {specialItemNames[item.type] || item.type}
                        {item.quantity > 1 && ` (${item.quantity})`}
                        {item.description && `: ${item.description}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {quote.customer_notes && (
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <p className="text-sm font-medium text-slate-500 mb-2">Kundens noter</p>
                  <p className="text-slate-700">{quote.customer_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Internal Notes */}
          {quote.internal_notes && (
            <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
              <CardContent className="py-4">
                <p className="text-sm font-medium text-amber-700 mb-1">Interne noter</p>
                <p className="text-slate-700">{quote.internal_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Prisoverslag</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pricingBreakdown ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Estimeret volumen</span>
                      <span className="font-medium">{pricingBreakdown.volume_m3} m³</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Medarbejdere</span>
                      <span className="font-medium">{pricingBreakdown.crew}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Arbejdstid (estimat)</span>
                      <span className="font-medium">{pricingBreakdown.time?.labor_hours} timer</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Arbejde</span>
                      <span className="font-medium">{pricingBreakdown.prices?.labor_price?.toLocaleString('da-DK')} kr</span>
                    </div>
                    {pricingBreakdown.prices?.transport_price > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Transport</span>
                        <span className="font-medium">{pricingBreakdown.prices?.transport_price?.toLocaleString('da-DK')} kr</span>
                      </div>
                    )}
                    {pricingBreakdown.prices?.heavy_fee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Tunge løft</span>
                        <span className="font-medium">{pricingBreakdown.prices?.heavy_fee?.toLocaleString('da-DK')} kr</span>
                      </div>
                    )}
                    {Array.isArray(pricingBreakdown.fees) && pricingBreakdown.fees.length > 0 && pricingBreakdown.fees.map((f, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-600">{f.name}</span>
                        <span className="font-medium">{f.amount?.toLocaleString('da-DK')} kr</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Grundpris (ekskl. moms)</span>
                      <span className="font-medium">{pricingBreakdown.prices?.subtotal?.toLocaleString('da-DK')} kr</span>
                    </div>
                  </>
                ) : (
                  <>
                    {quote.pricing_type === 'hourly' ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          {quote.crew_size} mand × {quote.estimated_hours}t × {quote.hourly_rate} kr
                        </span>
                        <span className="font-medium">{quote.base_price?.toLocaleString('da-DK')} kr</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Fastpris</span>
                        <span className="font-medium">{quote.base_price?.toLocaleString('da-DK')} kr</span>
                      </div>
                    )}
                  </>
                )}

                {quote.surcharges && quote.surcharges.length > 0 && quote.surcharges.map((s, i) => (
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
                    <span>Rabat {quote.discount_reason && `(${quote.discount_reason})`}</span>
                    <span>-{quote.discount_amount?.toLocaleString('da-DK')} kr</span>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span>{quote.subtotal?.toLocaleString('da-DK')} kr</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-600">Moms ({quote.vat_rate || 25}%)</span>
                    <span>{quote.vat_amount?.toLocaleString('da-DK')} kr</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-900">Total</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {quote.total_price?.toLocaleString('da-DK')} kr
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Historik</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Tilbud oprettet</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(quote.created_date), 'd. MMM yyyy HH:mm', { locale: da })}
                    </p>
                  </div>
                </div>

                {quote.sent_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Send className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Sendt til kunde</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(quote.sent_at), 'd. MMM yyyy HH:mm', { locale: da })}
                      </p>
                    </div>
                  </div>
                )}

                {quote.viewed_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Eye className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Set af kunde</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(quote.viewed_at), 'd. MMM yyyy HH:mm', { locale: da })}
                      </p>
                    </div>
                  </div>
                )}

                {quote.responded_at && quote.status === 'accepted' && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Accepteret</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(quote.responded_at), 'd. MMM yyyy HH:mm', { locale: da })}
                      </p>
                    </div>
                  </div>
                )}

                {quote.responded_at && quote.status === 'declined' && (
                 <div className="flex items-start gap-3">
                   <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                     <XCircle className="w-4 h-4 text-red-600" />
                   </div>
                   <div>
                     <p className="text-sm font-medium text-slate-900">Afvist</p>
                     <p className="text-xs text-slate-500">
                       {format(new Date(quote.responded_at), 'd. MMM yyyy HH:mm', { locale: da })}
                     </p>
                     {quote.decline_reason && (
                       <p className="text-xs text-slate-600 mt-1">Årsag: {quote.decline_reason}</p>
                     )}
                   </div>
                 </div>
                )}

                {quote.last_followup_sent && (
                 <div className="flex items-start gap-3">
                   <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                     <Bell className="w-4 h-4 text-orange-600" />
                   </div>
                   <div>
                     <p className="text-sm font-medium text-slate-900">
                       Opfølgning sendt {quote.followup_count > 1 ? `(${quote.followup_count}x)` : ''}
                     </p>
                     <p className="text-xs text-slate-500">
                       {format(new Date(quote.last_followup_sent), 'd. MMM yyyy HH:mm', { locale: da })}
                     </p>
                   </div>
                 </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Valid Until */}
          {quote.valid_until && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Gyldigt til</p>
                    <p className="font-medium text-slate-900">
                      {format(new Date(quote.valid_until), 'd. MMMM yyyy', { locale: da })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send tilbud</DialogTitle>
            <DialogDescription>
              Tilbuddet sendes til {quote.customer_email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Kunden modtager en email med et link til at se og acceptere tilbuddet.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Annuller
            </Button>
            <Button 
              onClick={handleSendQuote}
              disabled={updateQuoteMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {updateQuoteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sender...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send tilbud
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konverter til job</DialogTitle>
            <DialogDescription>
              Opret et job i kalenderen baseret på dette tilbud.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Et nyt job oprettes med data fra tilbuddet. Du kan efterfølgende redigere jobbet og tilføje team/køretøj.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Annuller
            </Button>
            <Button 
              onClick={() => convertToJobMutation.mutate()}
              disabled={convertToJobMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {convertToJobMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Konverterer...
                </>
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Opret job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slet tilbud</DialogTitle>
            <DialogDescription>
              Er du sikker på, at du vil slette dette tilbud? Denne handling kan ikke fortrydes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuller
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteQuoteMutation.mutate(quote.id)}
              disabled={deleteQuoteMutation.isPending}
            >
              {deleteQuoteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sletter...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Slet tilbud
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Followup Dialog */}
      <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send opfølgning</DialogTitle>
            <DialogDescription>
              Send en venlig påmindelse til {quote.customer_email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                Tilbuddet blev sendt for <span className="font-semibold">{daysSinceSent} dage</span> siden.
              </p>
              {quote.followup_count > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {quote.followup_count} opfølgning{quote.followup_count > 1 ? 'er' : ''} sendt tidligere.
                </p>
              )}
            </div>
            {shouldFollowup && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                <Bell className="w-4 h-4" />
                <span>Det anbefales at sende opfølgning nu</span>
              </div>
            )}
            <p className="text-sm text-slate-600">
              Kunden modtager en email baseret på din email-skabelon (kan ændres i Indstillinger → Email Opfølgning).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowupDialogOpen(false)}>
              Annuller
            </Button>
            <Button 
              onClick={handleSendFollowup}
              disabled={updateQuoteMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {updateQuoteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sender...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Send opfølgning
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}