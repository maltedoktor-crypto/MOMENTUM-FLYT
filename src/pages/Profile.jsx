import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { 
  User, 
  Mail, 
  Save,
  Loader2,
  TrendingUp,
  FileText,
  Users,
  Calendar,
  Crown,
  CheckCircle2,
  Building2,
  CreditCard,
  Phone,
  Globe,
  Shield,
  XCircle,
  Clock,
  ExternalLink,
  Link2,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });
  const [companyForm, setCompanyForm] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    address_coordinates: { lat: null, lon: null },
    cvr: '',
    website: '',
    logo_url: '',
    terms_and_conditions: '',
    quote_validity_days: 14,
  });
  const [pricingForm, setPricingForm] = useState({
    // New pricing engine (Momentum)
    pricing_mode: 'both',
    vehicle_capacity_m3: 25,
    vehicle_capacity_m2_reference: 90,
    standard_volume_m3: 25,
    base_load_time_minutes_for_standard_volume: 150,
    base_unload_time_minutes_for_standard_volume: 120,
    base_min_employees: 2,
    max_m3_per_employee: 12,
    crew_factor_table: { 2: 1.0, 3: 1.25, 4: 1.45, 5: 1.6 },
    minutes_per_floor_per_m3: 0.8,
    elevator_multiplier: 0.5,
    floor_threshold_for_extra_employee: 4,
    transport_pricing_mode: 'charge_time_from_departure',
    price_per_km: 6,
    hourly_rate_total: 650,
    hourly_rate_per_employee: null,
    buffer_minutes: 30,
    buffer_percent: null,
    heavy_80_enabled: true,
    heavy_80_fee_per_item: 250,
    heavy_80_extra_minutes_per_item: 10,
    heavy_150_enabled: true,
    heavy_150_fee_per_item: 650,
    heavy_150_extra_minutes_per_item: 20,
    heavy_150_min_employees_override: 3,
    heavy_150_enforce_min_employees: true,
    fees: [],

    // Legacy fields (kept for backwards-compatibility in older UI)
    floor_surcharge_no_elevator: 200,
    long_carry_surcharge: 150,
    long_carry_threshold_meters: 20,
    transport_cost_per_km: 6,
    volume_cost_per_m3: 320,
    weekend_surcharge_percent: 25,
    hourly_rate_2_men: 650,
    hourly_rate_3_men: 850,
    hourly_rate_4_men: 1050,
    heavy_lift_surcharge: 500,
    markup_price: 0,
  });
  const [emailForm, setEmailForm] = useState({
    quote_followup_subject: 'Påmindelse: Dit tilbud fra {{company_name}}',
    quote_followup_body: 'Hej {{customer_name}},\n\nVi vil gerne minde dig om tilbuddet vi sendte for {{days_ago}} dage siden.\n\nDu kan se og acceptere tilbuddet her:\n{{quote_link}}\n\nHar du spørgsmål eller ønsker ændringer? Kontakt os gerne.\n\nMed venlig hilsen,\n{{company_name}}',
    followup_interval_days: 3,
  });
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [connectingGoogleCalendar, setConnectingGoogleCalendar] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFormData({
          full_name: currentUser.full_name || '',
          email: currentUser.email || '',
        });

        // Load company data
        if (currentUser?.company_id) {
          const companies = await base44.entities.Company.filter({ id: currentUser.company_id });
          if (companies.length > 0) {
            const c = companies[0];
            setCompany(c);

            // If the user has no saved company settings yet, prefill from the Company record
            const hasCompanySettings = !!(currentUser?.company_settings?.company);
            if (!hasCompanySettings) {
              setCompanyForm(prev => ({
                ...prev,
                name: c.company_name || prev.name,
                contact_name: c.contact_name || prev.contact_name,
                email: c.email || prev.email,
                phone: c.phone || prev.phone,
                address: c.address || prev.address,
                address_coordinates: c.address_coordinates || prev.address_coordinates,
                cvr: c.cvr || prev.cvr,
                website: c.website || prev.website,
                logo_url: c.logo_url || prev.logo_url,
                terms_and_conditions: c.terms_and_conditions || prev.terms_and_conditions,
                quote_validity_days: c.quote_validity_days || prev.quote_validity_days,
              }));

              // Also prefill pricing from Company.pricing_config if present
              if (c.pricing_config && Object.keys(c.pricing_config).length > 0) {
                setPricingForm(prev => ({ ...prev, ...c.pricing_config }));
              }
            }
          }
        }
        
        // Load settings from user object
        if (currentUser?.company_settings) {
          const settings = currentUser.company_settings;
          if (settings.company) setCompanyForm(settings.company);
          if (settings.pricing) setPricingForm(settings.pricing);
          if (settings.emails) setEmailForm(settings.emails);
        }

        // Check if Google Calendar is connected
        if (currentUser?.google_calendar_connected) {
          setGoogleCalendarConnected(true);
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date', 500),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 500),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
  });

  const { mutate: updateUser, isPending: updatePending } = useMutation({
    mutationFn: async (settings) => {
      const updatedUser = await base44.auth.updateMe({
        ...formData,
        company_settings: settings
      });

      if (updatedUser?.company_id) {
        const companies = await base44.entities.Company.filter({ id: updatedUser.company_id });
        if (companies.length > 0) {
          await base44.entities.Company.update(updatedUser.company_id, {
            company_name: settings.company?.name || companies[0].company_name,
            contact_name: settings.company?.contact_name || companies[0].contact_name,
            cvr: settings.company?.cvr || companies[0].cvr,
            email: settings.company?.email || companies[0].email,
            phone: settings.company?.phone || companies[0].phone,
            address: settings.company?.address || companies[0].address,
            address_coordinates: settings.company?.address_coordinates || companies[0].address_coordinates,
            website: settings.company?.website || companies[0].website,
            logo_url: settings.company?.logo_url || companies[0].logo_url,
            terms_and_conditions: settings.company?.terms_and_conditions || companies[0].terms_and_conditions,
            quote_validity_days: settings.company?.quote_validity_days || companies[0].quote_validity_days,
            pricing_config: settings.pricing || {},
          });
        }
      }
      return updatedUser;
    },
    onSuccess: () => {
      toast.success('Oplysninger gemt');
    },
  });

  const handleSaveProfile = () => {
    updateUser({ company: companyForm, pricing: pricingForm, emails: emailForm });
  };

  const addFee = () => {
    const next = Array.isArray(pricingForm.fees) ? [...pricingForm.fees] : [];
    next.push({
      fee_name: 'Nyt tillæg',
      fee_type: 'fixed',
      fee_value: 0,
      enabled: true,
      required: false,
      default_selected: false,
      auto_apply: false,
    });
    setPricingForm({ ...pricingForm, fees: next });
  };

  const updateFee = (index, patch) => {
    const next = Array.isArray(pricingForm.fees) ? [...pricingForm.fees] : [];
    next[index] = { ...(next[index] || {}), ...patch };
    setPricingForm({ ...pricingForm, fees: next });
  };

  const removeFee = (index) => {
    const next = Array.isArray(pricingForm.fees) ? [...pricingForm.fees] : [];
    next.splice(index, 1);
    setPricingForm({ ...pricingForm, fees: next });
  };

  const handleConnectGoogleCalendar = async () => {
    setConnectingGoogleCalendar(true);
    try {
      const response = await base44.functions.invoke('connectGoogleCalendar', {});
      if (response?.data?.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        toast.error('Kunne ikke få autoriserings-URL');
        setConnectingGoogleCalendar(false);
      }
    } catch (err) {
      console.error('Error connecting Google Calendar:', err);
      toast.error('Kunne ikke forbinde Google Calendar');
      setConnectingGoogleCalendar(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      const response = await base44.functions.invoke('createBillingPortalSession', {});
      if (response?.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        toast.error('Kunne ikke åbne Stripe portal');
      }
    } catch (err) {
      console.error('Billing portal error:', err);
      toast.error('Kunne ikke åbne Stripe portal');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const totalQuoteValue = quotes.reduce((sum, q) => sum + (q.total_price || 0), 0);
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Min Profil</h1>
        <p className="text-slate-500 mt-1">
          Se dine statistikker og håndter din profil
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Overblik
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profil & Abonnement
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Firma & Priser
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email-opfølgning
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Integrationer
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Quotes */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Tilbud i alt</p>
                    <p className="text-2xl font-bold text-slate-900">{quotes.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accepted Quotes */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Accepterede</p>
                    <p className="text-2xl font-bold text-slate-900">{acceptedQuotes}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Customers */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Kunder</p>
                    <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completed Jobs */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Afsluttede jobs</p>
                    <p className="text-2xl font-bold text-slate-900">{completedJobs}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Total Revenue */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Samlet værdi af tilbud</CardTitle>
                <CardDescription>Sum af alle tilbud (uanset status)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-indigo-600">
                  {totalQuoteValue.toLocaleString('da-DK')} kr
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Værdi af accepterede tilbud</CardTitle>
                <CardDescription>Sum af tilbud med status "accepteret"</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-green-600">
                  {quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + (q.total_price || 0), 0).toLocaleString('da-DK')} kr
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profile & Subscription Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Personlige oplysninger */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              Personlige oplysninger
            </h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="full-name">Fuldt navn</Label>
                  <Input
                    id="full-name"
                    placeholder="Jens Hansen"
                    className="mt-1.5"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jens@email.dk"
                    className="mt-1.5"
                    value={formData.email}
                    disabled
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Email kan ikke ændres direkte. Kontakt support hvis du skal ændre din email.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600 mb-3">
                    <strong>Rolle:</strong> {user?.role === 'admin' ? 'Administrator' : 'Bruger'}
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Medlem siden:</strong> {new Date(user?.created_date).toLocaleDateString('da-DK')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Abonnement */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-indigo-600" />
              Dit abonnement
            </h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-6">
                {company?.subscription_status ? (
                  <>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <Crown className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{company.subscription_plan || 'Aktiv Plan'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {company.subscription_status === 'active' && (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-600 font-medium">Aktiv</span>
                              </>
                            )}
                            {company.subscription_status === 'trialing' && (
                              <>
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-blue-600 font-medium">Prøveperiode</span>
                              </>
                            )}
                            {(company.subscription_status === 'past_due' || company.subscription_status === 'unpaid') && (
                              <>
                                <XCircle className="w-4 h-4 text-red-600" />
                                <span className="text-sm text-red-600 font-medium">Betaling fejlet</span>
                              </>
                            )}
                            {company.subscription_status === 'canceled' && (
                              <>
                                <XCircle className="w-4 h-4 text-slate-600" />
                                <span className="text-sm text-slate-600 font-medium">Opsagt</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {company.trial_ends_at && company.subscription_status === 'trialing' && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-900">Prøveperiode aktiv</p>
                            <p className="text-sm text-blue-700 mt-1">
                              Din prøveperiode slutter {new Date(company.trial_ends_at).toLocaleDateString('da-DK')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {company.current_period_end && (
                      <div>
                        <Label className="text-sm font-medium text-slate-700">Næste fakturering</Label>
                        <p className="text-slate-900 mt-1">
                          {new Date(company.current_period_end).toLocaleDateString('da-DK')}
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-200">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleOpenBillingPortal()}
                        disabled={updatePending}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Administrer abonnement i Stripe
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        Ændre betalingsmetode, se fakturaer eller opsig abonnement
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Intet abonnement</h3>
                    <p className="text-slate-600">
                      Vælg en plan nedenfor for at komme i gang
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveProfile}
              disabled={updatePending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {updatePending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Gem profil
            </Button>
          </div>
        </TabsContent>

        {/* Company & Pricing Tab */}
        <TabsContent value="company" className="space-y-6">
          {/* Firmainformation */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Firmainformation
            </h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-name">Firmanavn</Label>
                    <Input
                      id="company-name"
                      placeholder="Mit Flyttefirma ApS"
                      className="mt-1.5"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-name">Kontaktperson</Label>
                    <Input
                      id="contact-name"
                      placeholder="Navn på kontaktperson"
                      className="mt-1.5"
                      value={companyForm.contact_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, contact_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cvr">CVR-nummer</Label>
                    <Input
                      id="cvr"
                      placeholder="12345678"
                      className="mt-1.5"
                      value={companyForm.cvr}
                      onChange={(e) => setCompanyForm({ ...companyForm, cvr: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="logo-url">Logo URL</Label>
                    <Input
                      id="logo-url"
                      placeholder="https://.../logo.png"
                      className="mt-1.5"
                      value={companyForm.logo_url}
                      onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
                    />
                    <p className="text-xs text-slate-500 mt-2">Valgfrit: bruges på tilbudssiden for et mere professionelt udtryk</p>
                  </div>
                </div>

                <div>
                   <Label htmlFor="address">Adresse</Label>
                   <div className="mt-1.5">
                     <AddressAutocomplete
                       placeholder="Vejnavn 123, 1234 By"
                       value={companyForm.address}
                       onChange={(value) => {
                         setCompanyForm({ ...companyForm, address: value });
                         // Extract coordinates from address if it has them
                         if (value && value.includes(',')) {
                           const geocode = async () => {
                             try {
                               const response = await fetch(
                                 `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=dk&limit=1`,
                                 { headers: { 'User-Agent': 'MovingApp/1.0' }}
                               );
                               const data = await response.json();
                               if (data.length > 0) {
                                 setCompanyForm(prev => ({
                                   ...prev,
                                   address_coordinates: {
                                     lat: parseFloat(data[0].lat),
                                     lon: parseFloat(data[0].lon)
                                   }
                                 }));
                               }
                             } catch (error) {
                               console.error('Error geocoding address:', error);
                             }
                           };
                           geocode();
                         }
                       }}
                     />
                   </div>
                   <p className="text-xs text-slate-500 mt-2">Bruges til at beregne ruteplanlægning fra dit kontor til kundernes adresser</p>
                 </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="info@firma.dk"
                      className="mt-1.5"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      placeholder="12 34 56 78"
                      className="mt-1.5"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website">Hjemmeside</Label>
                  <Input
                    id="website"
                    placeholder="https://www.firma.dk"
                    className="mt-1.5"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tilbudsindstillinger */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Tilbudsindstillinger
            </h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="validity">Tilbuds gyldighed (dage)</Label>
                  <Input
                    id="validity"
                    type="number"
                    className="mt-1.5 max-w-32"
                    value={companyForm.quote_validity_days}
                    onChange={(e) => setCompanyForm({ ...companyForm, quote_validity_days: parseInt(e.target.value) || 14 })}
                  />
                </div>
                <div>
                  <Label htmlFor="terms">Standardvilkår</Label>
                  <Textarea
                    id="terms"
                    placeholder="Indtast dine standardvilkår..."
                    className="mt-1.5 min-h-32"
                    value={companyForm.terms_and_conditions}
                    onChange={(e) => setCompanyForm({ ...companyForm, terms_and_conditions: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Automatiske priser */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Automatiske priser
            </h2>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Basis priser</CardTitle>
                <CardDescription>Grundlæggende prisberegning for tilbud</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 border-b border-slate-200 pb-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Transportpris per km (kr)</Label>
                    <Input
                      type="number"
                      className="mt-1.5"
                      value={pricingForm.transport_cost_per_km}
                      onChange={(e) => setPricingForm({ ...pricingForm, transport_cost_per_km: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Volumen pris per m³ (kr)</Label>
                    <Input
                      type="number"
                      className="mt-1.5"
                      value={pricingForm.volume_cost_per_m3}
                      onChange={(e) => setPricingForm({ ...pricingForm, volume_cost_per_m3: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <Label>Pris oveni (fast gebyr)</Label>
                  <Input
                    type="number"
                    className="mt-1.5"
                    placeholder="0"
                    value={pricingForm.markup_price || ''}
                    onChange={(e) => setPricingForm({ ...pricingForm, markup_price: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-slate-500 mt-1">Fast beløb der automatisk lægges på alle tilbud</p>
                </div>
              </CardContent>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-4">Tillæg</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Etage uden elevator (kr/etage)</Label>
                    <Input
                      type="number"
                      className="mt-1.5"
                      value={pricingForm.floor_surcharge_no_elevator}
                      onChange={(e) => setPricingForm({ ...pricingForm, floor_surcharge_no_elevator: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Lang bæreafstand - tærskel (meter)</Label>
                    <Input
                      type="number"
                      className="mt-1.5"
                      value={pricingForm.long_carry_threshold_meters}
                      onChange={(e) => setPricingForm({ ...pricingForm, long_carry_threshold_meters: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Lang bæreafstand - tillæg (kr)</Label>
                    <Input
                      type="number"
                      className="mt-1.5"
                      value={pricingForm.long_carry_surcharge}
                      onChange={(e) => setPricingForm({ ...pricingForm, long_carry_surcharge: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Weekend tillæg (%)</Label>
                    <Input
                      type="number"
                      className="mt-1.5"
                      value={pricingForm.weekend_surcharge_percent}
                      onChange={(e) => setPricingForm({ ...pricingForm, weekend_surcharge_percent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Avanceret prisberegning (Momentum) */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Momentum-prisberegner
            </h2>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Beregningsmetode & parametre</CardTitle>
                <CardDescription>Disse indstillinger styrer den nye beregner (timepris/kubikmeter/begge) i både dashboard og kunde-flow.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Pris-metode</Label>
                    <Select value={pricingForm.pricing_mode || 'both'} onValueChange={(v) => setPricingForm({ ...pricingForm, pricing_mode: v })}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Vælg" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="time">Timepris</SelectItem>
                        <SelectItem value="volume">Kubikmeter</SelectItem>
                        <SelectItem value="both">Kombineret</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Transport-beregning</Label>
                    <Select value={pricingForm.transport_pricing_mode || 'charge_time_from_departure'} onValueChange={(v) => setPricingForm({ ...pricingForm, transport_pricing_mode: v })}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Vælg" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="charge_time_from_departure">Start betaling ved afgang</SelectItem>
                        <SelectItem value="charge_time_from_arrival">Start betaling ved ankomst</SelectItem>
                        <SelectItem value="price_per_km_roundtrip">Pris pr. km (tur/retur)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Bil kapacitet (m³)</Label>
                    <Input type="number" className="mt-1.5" value={pricingForm.vehicle_capacity_m3} onChange={(e) => setPricingForm({ ...pricingForm, vehicle_capacity_m3: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Standard volumen (m³)</Label>
                    <Input type="number" className="mt-1.5" value={pricingForm.standard_volume_m3} onChange={(e) => setPricingForm({ ...pricingForm, standard_volume_m3: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Min. medarbejdere</Label>
                    <Input type="number" className="mt-1.5" value={pricingForm.base_min_employees} onChange={(e) => setPricingForm({ ...pricingForm, base_min_employees: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Pakke tid for standard (min)</Label>
                    <Input type="number" className="mt-1.5" value={pricingForm.base_load_time_minutes_for_standard_volume} onChange={(e) => setPricingForm({ ...pricingForm, base_load_time_minutes_for_standard_volume: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Aflæsse tid for standard (min)</Label>
                    <Input type="number" className="mt-1.5" value={pricingForm.base_unload_time_minutes_for_standard_volume} onChange={(e) => setPricingForm({ ...pricingForm, base_unload_time_minutes_for_standard_volume: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Timepris (total) (kr)</Label>
                    <Input type="number" className="mt-1.5" value={pricingForm.hourly_rate_total} onChange={(e) => setPricingForm({ ...pricingForm, hourly_rate_total: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Pris pr. km (kr)</Label>
                    <Input type="number" className="mt-1.5" value={pricingForm.price_per_km} onChange={(e) => setPricingForm({ ...pricingForm, price_per_km: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Maks m³ pr medarbejder</Label>
                    <Input type="number" className="mt-1.5" value={pricingForm.max_m3_per_employee} onChange={(e) => setPricingForm({ ...pricingForm, max_m3_per_employee: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Buffer (min)</Label>
                    <Input type="number" className="mt-1.5" value={pricingForm.buffer_minutes ?? ''} onChange={(e) => setPricingForm({ ...pricingForm, buffer_minutes: e.target.value === '' ? null : (parseFloat(e.target.value) || 0) })} />
                  </div>
                  <div>
                    <Label>Buffer (%)</Label>
                    <Input type="number" className="mt-1.5" value={pricingForm.buffer_percent ?? ''} onChange={(e) => setPricingForm({ ...pricingForm, buffer_percent: e.target.value === '' ? null : (parseFloat(e.target.value) || 0) })} />
                  </div>
                  <div>
                    <Label>Minutter pr etage pr m³</Label>
                    <Input type="number" className="mt-1.5" value={pricingForm.minutes_per_floor_per_m3} onChange={(e) => setPricingForm({ ...pricingForm, minutes_per_floor_per_m3: parseFloat(e.target.value) || 0 })} />
                    <p className="text-xs text-slate-500 mt-1">Etagetillæg (justér pr. virksomhed)</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Tunge genstande</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Aktivér 80kg+</Label>
                        <Switch checked={pricingForm.heavy_80_enabled !== false} onCheckedChange={(v) => setPricingForm({ ...pricingForm, heavy_80_enabled: !!v })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Pris pr stk (kr)</Label>
                          <Input type="number" className="mt-1" value={pricingForm.heavy_80_fee_per_item} onChange={(e) => setPricingForm({ ...pricingForm, heavy_80_fee_per_item: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label className="text-xs">Ekstra min pr stk</Label>
                          <Input type="number" className="mt-1" value={pricingForm.heavy_80_extra_minutes_per_item} onChange={(e) => setPricingForm({ ...pricingForm, heavy_80_extra_minutes_per_item: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Aktivér 150kg+</Label>
                        <Switch checked={pricingForm.heavy_150_enabled !== false} onCheckedChange={(v) => setPricingForm({ ...pricingForm, heavy_150_enabled: !!v })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Pris pr stk (kr)</Label>
                          <Input type="number" className="mt-1" value={pricingForm.heavy_150_fee_per_item} onChange={(e) => setPricingForm({ ...pricingForm, heavy_150_fee_per_item: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label className="text-xs">Ekstra min pr stk</Label>
                          <Input type="number" className="mt-1" value={pricingForm.heavy_150_extra_minutes_per_item} onChange={(e) => setPricingForm({ ...pricingForm, heavy_150_extra_minutes_per_item: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label className="text-xs">Min medarbejdere</Label>
                          <Input type="number" className="mt-1" value={pricingForm.heavy_150_min_employees_override} onChange={(e) => setPricingForm({ ...pricingForm, heavy_150_min_employees_override: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <Label className="text-xs">Håndhæv min</Label>
                            <p className="text-[11px] text-slate-500">Sikrer nok folk</p>
                          </div>
                          <Switch checked={pricingForm.heavy_150_enforce_min_employees !== false} onCheckedChange={(v) => setPricingForm({ ...pricingForm, heavy_150_enforce_min_employees: !!v })} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">Tillæg (linje-for-linje)</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addFee}>
                      <Plus className="w-4 h-4 mr-1" /> Tilføj tillæg
                    </Button>
                  </div>
                  {Array.isArray(pricingForm.fees) && pricingForm.fees.length > 0 ? (
                    <div className="space-y-3">
                      {pricingForm.fees.map((fee, idx) => (
                        <div key={`${fee.fee_name}-${idx}`} className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <Input className="flex-1" value={fee.fee_name || ''} onChange={(e) => updateFee(idx, { fee_name: e.target.value })} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeFee(idx)} title="Slet">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid md:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Type</Label>
                              <Select value={fee.fee_type || 'fixed'} onValueChange={(v) => updateFee(idx, { fee_type: v })}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Vælg" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed">Fast beløb</SelectItem>
                                  <SelectItem value="percent">Procent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Værdi</Label>
                              <Input type="number" className="mt-1" value={fee.fee_value ?? 0} onChange={(e) => updateFee(idx, { fee_value: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="flex items-end justify-between">
                              <div>
                                <Label className="text-xs">Aktiv</Label>
                                <p className="text-[11px] text-slate-500">Vis i kunde-flow</p>
                              </div>
                              <Switch checked={fee.enabled !== false} onCheckedChange={(v) => updateFee(idx, { enabled: !!v })} />
                            </div>
                            <div className="flex items-end justify-between">
                              <div>
                                <Label className="text-xs">Påkrævet</Label>
                                <p className="text-[11px] text-slate-500">Kan ikke fravælges</p>
                              </div>
                              <Switch checked={!!fee.required} onCheckedChange={(v) => updateFee(idx, { required: !!v })} />
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="flex items-end justify-between">
                              <div>
                                <Label className="text-xs">Standard valgt</Label>
                                <p className="text-[11px] text-slate-500">Forvalg i kunde-flow</p>
                              </div>
                              <Switch checked={!!fee.default_selected} onCheckedChange={(v) => updateFee(idx, { default_selected: !!v })} />
                            </div>
                            <div className="flex items-end justify-between">
                              <div>
                                <Label className="text-xs">Auto-apply</Label>
                                <p className="text-[11px] text-slate-500">Tilføjes automatisk</p>
                              </div>
                              <Switch checked={!!fee.auto_apply} onCheckedChange={(v) => updateFee(idx, { auto_apply: !!v })} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Ingen tillæg oprettet endnu.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Manuelle priser */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Manuelle priser
            </h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">Timepriser</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="hourly_rate_2_men">2 mænd (kr/time)</Label>
                      <Input
                        id="hourly_rate_2_men"
                        type="number"
                        className="mt-1.5"
                        value={pricingForm.hourly_rate_2_men}
                        onChange={(e) => setPricingForm({ ...pricingForm, hourly_rate_2_men: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourly_rate_3_men">3 mænd (kr/time)</Label>
                      <Input
                        id="hourly_rate_3_men"
                        type="number"
                        className="mt-1.5"
                        value={pricingForm.hourly_rate_3_men}
                        onChange={(e) => setPricingForm({ ...pricingForm, hourly_rate_3_men: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourly_rate_4_men">4 mænd (kr/time)</Label>
                      <Input
                        id="hourly_rate_4_men"
                        type="number"
                        className="mt-1.5"
                        value={pricingForm.hourly_rate_4_men}
                        onChange={(e) => setPricingForm({ ...pricingForm, hourly_rate_4_men: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Tillæg</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="heavy_lift_surcharge">Tung løft tillæg (kr)</Label>
                      <Input
                        id="heavy_lift_surcharge"
                        type="number"
                        className="mt-1.5"
                        value={pricingForm.heavy_lift_surcharge}
                        onChange={(e) => setPricingForm({ ...pricingForm, heavy_lift_surcharge: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="manual_weekend_surcharge">Weekend tillæg (%)</Label>
                      <Input
                        id="manual_weekend_surcharge"
                        type="number"
                        className="mt-1.5"
                        value={pricingForm.weekend_surcharge_percent}
                        onChange={(e) => setPricingForm({ ...pricingForm, weekend_surcharge_percent: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveProfile}
              disabled={updatePending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {updatePending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Gem alle ændringer
            </Button>
          </div>
        </TabsContent>

        {/* Emails Tab */}
        <TabsContent value="emails" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Email Opfølgning</CardTitle>
              <CardDescription>Konfigurér opfølgnings-emails til kunder der ikke har svaret</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="followup_interval">Opfølgningsinterval (dage)</Label>
                <Input
                  id="followup_interval"
                  type="number"
                  className="mt-1.5 max-w-xs"
                  value={emailForm.followup_interval_days}
                  onChange={(e) => setEmailForm({ ...emailForm, followup_interval_days: parseInt(e.target.value) || 3 })}
                />
              </div>

              <div>
                <Label htmlFor="email_subject">Email Emne</Label>
                <Input
                  id="email_subject"
                  className="mt-1.5"
                  value={emailForm.quote_followup_subject}
                  onChange={(e) => setEmailForm({ ...emailForm, quote_followup_subject: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="email_body">Email Indhold</Label>
                <Textarea
                  id="email_body"
                  rows={10}
                  className="mt-1.5 font-mono text-sm"
                  value={emailForm.quote_followup_body}
                  onChange={(e) => setEmailForm({ ...emailForm, quote_followup_body: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-2">Placeholders: {'{{customer_name}}'} {'{{company_name}}'} {'{{quote_link}}'} {'{{days_ago}}'}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveProfile}
              disabled={updatePending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {updatePending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Gem emails
            </Button>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-indigo-600" />
              Eksterne tjenester
            </h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Google Calendar</p>
                      <p className="text-sm text-slate-500">Synkronisér jobs automatisk</p>
                    </div>
                  </div>
                  {googleCalendarConnected ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">Forbundet</span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleConnectGoogleCalendar}
                      disabled={connectingGoogleCalendar}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {connectingGoogleCalendar ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Forbinder...
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 mr-2" />
                          Forbind
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  Når du forbinder Google Calendar, synkroniseres alle dine jobs automatisk til din kalender. Ændringer på siden opdateres i realtid.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}