import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { calculateQuotePricing } from '@/utils/pricingEngine';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  ArrowRight, 
  MapPin, 
  Home, 
  Calendar, 
  Package, 
  Calculator,
  User,
  Phone,
  Mail,
  Building,
  Plus,
  Trash2,
  Check,
  Loader2
} from 'lucide-react';

const servicePackages = {
  basic: {
    name: 'Basic',
    description: 'Kun transport - vi flytter dine ting',
    features: ['Transport', 'Basis beskyttelse'],
  },
  standard: {
    name: 'Standard',
    description: 'Transport + nedpakning af møbler',
    features: ['Transport', 'Demontering af møbler', 'Montering af møbler', 'Basis beskyttelse'],
  },
  premium: {
    name: 'Premium',
    description: 'Alt inklusiv - vi klarer det hele',
    features: ['Transport', 'Fuld nedpakning', 'Fuld udpakning', 'Demontering & montering', 'Premium beskyttelse', 'Rengøring'],
  },
};

const specialItemTypes = [
  { value: 'piano', label: 'Klaver/Flygel' },
  { value: 'safe', label: 'Pengeskab' },
  { value: 'artwork', label: 'Kunstværk' },
  { value: 'antique', label: 'Antikvitet' },
  { value: 'aquarium', label: 'Akvarium' },
  { value: 'pool_table', label: 'Poolbord' },
  { value: 'other', label: 'Andet' },
];

const timeWindows = [
  { value: 'morning', label: 'Morgen (08:00-12:00)' },
  { value: 'afternoon', label: 'Eftermiddag (12:00-17:00)' },
  { value: 'full_day', label: 'Hel dag' },
  { value: 'flexible', label: 'Fleksibel' },
];

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [autoCalculateSurcharges, setAutoCalculateSurcharges] = useState(true);
  const [pricingMode, setPricingMode] = useState('calculator');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdQuote, setCreatedQuote] = useState(null);
  const [calculator, setCalculator] = useState({
    vehicles: 0,
    men: 0,
    hours: 0,
    heavyLift: false,
    weekend: false,
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // No need to auto-create - company already exists
      } catch (e) {
        console.error('Error loading user:', e);
      }
    };
    loadUser();
  }, [queryClient]);

  const { data: company = null } = useQuery({
    queryKey: ['company', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return null;
      try {
        const companies = await base44.entities.Company.filter({
          id: user.company_id,
        });
        return companies.length > 0 ? companies[0] : null;
      } catch (e) {
        return null;
      }
    },
    enabled: !!user?.company_id,
  });

  const pricing = company?.pricing_config || {};

  const runAutoPricingFromVolume = () => {
    const volume = Number(formData.estimated_volume_m3 || 0);
    if (!company || !volume || volume <= 0) {
      window.alert('Indtast et estimeret volumen (m³) før du kan auto-beregne.');
      return;
    }

    const mappedConfig = {
      ...pricing,
      hourly_rate_total: pricing.hourly_rate_total ?? pricing.hourly_rate_2_men ?? 650,
      price_per_km: pricing.price_per_km ?? pricing.transport_cost_per_km ?? 6,
      transport_pricing_mode: pricing.transport_pricing_mode ?? 'charge_time_from_departure',
    };

    const breakdown = calculateQuotePricing({
      pricingConfig: mappedConfig,
      volume_m3: volume,
      from_floor: formData.from_floor,
      to_floor: formData.to_floor,
      elevator_from: formData.from_elevator,
      elevator_to: formData.to_elevator,
      transport_minutes: 0,
      km_roundtrip: 0,
      heavy_80_count: parseInt(formData.heavy_80_count || 0, 10),
      heavy_150_count: parseInt(formData.heavy_150_count || 0, 10),
      selectedFees: Object.entries(formData.selected_fees || {}).map(([fee_name, selected]) => ({ fee_name, selected: !!selected })),
    });

    // Map to the existing manual calculator fields
    const crew = breakdown.crew;
    const hours = Math.max(0.5, Math.round((breakdown.time.labor_hours) * 2) / 2); // nearest 0.5 hour
    const men = Math.min(4, Math.max(2, crew));
    const vehiclesGuess = Math.max(1, Math.ceil(volume / (mappedConfig.vehicle_capacity_m3 || 25)));

    const newCalc = {
      ...calculator,
      vehicles: vehiclesGuess,
      men,
      hours,
    };

    setCalculator(newCalc);
    setFormData(prev => ({
      ...prev,
      base_price: breakdown.prices.subtotal,
      pricing_breakdown: breakdown,
      estimated_crew: breakdown.crew,
      estimated_hours: breakdown.time.labor_hours,
    }));
  };

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: () => user?.company_id ? base44.entities.Worker.filter({ company_id: user.company_id }) : [],
    enabled: !!user?.company_id,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => user?.company_id ? base44.entities.Vehicle.filter({ company_id: user.company_id }) : [],
    enabled: !!user?.company_id,
  });

  const [formData, setFormData] = useState({
    // Customer
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    // From
    from_address: '',
    from_floor: 0,
    from_elevator: false,
    from_parking_distance: 0,
    // To
    to_address: '',
    to_floor: 0,
    to_elevator: false,
    to_parking_distance: 0,
    heavy_80_count: 0,
    heavy_150_count: 0,
    selected_fees: {},
    // Date
    preferred_date: '',
    start_time: '08:00',
    // Details
    estimated_volume_m3: '',
    // Special items
    special_items: [],
    // Resources
    assigned_workers: [],
    assigned_vehicle_id: '',
    // Pricing
    pricing_type: 'fixed',
    base_price: 0,
    pricing_breakdown: null,
    estimated_crew: null,
    estimated_hours: null,
    surcharges: [],
    discount_amount: 0,
    discount_reason: '',
    // Notes
    customer_notes: '',
    internal_notes: '',
  });

  const [distanceData, setDistanceData] = useState(null);
  const [loadingDistance, setLoadingDistance] = useState(false);

  const generateQuoteNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `MOM-${year}-${random}`;
  };

  const createQuoteMutation = useMutation({
    mutationFn: async (data) => {
       if (!company) {
         throw new Error('Der mangler firmaoplysninger. Opdater venligst firmaets oplysninger under Indstillinger.');
       }

       const org = company;

      // 1. Create or find customer
      let customer;
      const existingCustomers = await base44.entities.Customer.filter({
        email: data.customer_email,
        company_id: org.id,
      });

      if (existingCustomers.length > 0) {
        customer = existingCustomers[0];
      } else {
        customer = await base44.entities.Customer.create({
          company_id: org.id,
          name: data.customer_name,
          email: data.customer_email,
          phone: data.customer_phone,
          source: 'manual',
        });
      }

      // 2. Create quote
      const quoteNumber = generateQuoteNumber();
      const publicToken = crypto.randomUUID();
      
      const basePrice = data.base_price;
      const cleanedSurcharges = data.surcharges.map(s => ({
        description: s.description,
        amount: s.amount,
      }));
      
      const surchargesTotal = cleanedSurcharges.reduce((sum, s) => sum + s.amount, 0);
      const materialsPrice = 0;
      
      const subtotal = basePrice + surchargesTotal + materialsPrice - data.discount_amount;
      const vatRate = 25;
      const vatAmount = subtotal * (vatRate / 100);
      const totalPrice = subtotal + vatAmount;

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 14);

      const quote = await base44.entities.Quote.create({
        company_id: org.id,
        // Company snapshot for public quote display
        company_name: org.company_name || org.name || '',
        company_contact_name: org.contact_name || '',
        company_email: org.email || '',
        company_phone: org.phone || '',
        company_address: org.address || '',
        company_website: org.website || '',
        company_logo_url: org.logo_url || '',
        customer_id: customer.id,
        quote_number: quoteNumber,
        public_token: publicToken,
        status: 'draft',
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        from_address: data.from_address,
        from_floor: data.from_floor,
        from_elevator: data.from_elevator,
        from_parking_distance: data.from_parking_distance,
        to_address: data.to_address,
        to_floor: data.to_floor,
        to_elevator: data.to_elevator,
        to_parking_distance: data.to_parking_distance,
        preferred_date: data.preferred_date,
        estimated_volume_m3: data.estimated_volume_m3 ? parseFloat(data.estimated_volume_m3) : null,
        heavy_80_count: parseInt(data.heavy_80_count || 0, 10),
        heavy_150_count: parseInt(data.heavy_150_count || 0, 10),
        selected_fees: Object.entries(data.selected_fees || {}).map(([fee_name, selected]) => ({ fee_name, selected: !!selected })),
        pricing_breakdown: data.pricing_breakdown || null,
        estimated_crew: data.estimated_crew || null,
        estimated_hours: data.estimated_hours || null,
        special_items: data.special_items,
        base_price: basePrice,
        surcharges: cleanedSurcharges,
        materials_price: materialsPrice,
        subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_price: totalPrice,
        valid_until: validUntil.toISOString().split('T')[0],
        customer_notes: data.customer_notes,
        internal_notes: data.internal_notes,
        discount_amount: data.discount_amount,
        discount_reason: data.discount_reason,
      });

      // 3. Create job in calendar if date is selected
      if (data.preferred_date) {
       const jobNumber = `JOB-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;

       await base44.entities.Job.create({
          company_id: org.id,
           quote_id: quote.id,
           customer_id: customer.id,
           job_number: jobNumber,
           status: 'scheduled',
           scheduled_date: data.preferred_date,
           start_time: data.start_time || '08:00',
           customer_name: data.customer_name,
           customer_email: data.customer_email,
           customer_phone: data.customer_phone,
           from_address: data.from_address,
           from_floor: data.from_floor,
           from_elevator: data.from_elevator,
           to_address: data.to_address,
           to_floor: data.to_floor,
           to_elevator: data.to_elevator,
           assigned_workers: data.assigned_workers || [],
           assigned_vehicle_id: data.assigned_vehicle_id || null,
           special_items: data.special_items,
           quoted_price: totalPrice,
           notes: data.internal_notes,
           customer_notes: data.customer_notes,
         });
      }

      return quote;
    },
    onSuccess: (newQuote) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
       queryClient.invalidateQueries({ queryKey: ['customers'] });
       queryClient.invalidateQueries({ queryKey: ['jobs'] });
       queryClient.invalidateQueries({ queryKey: ['company', user?.company_id] });
      setCreatedQuote(newQuote);
      setShowSuccess(true);
    },
    onError: (error) => {
      console.error('Quote creation error:', error);
      alert(error.message || 'Der opstod en fejl. Prøv venligst igen.');
    },
  });

  // Auto-calculate surcharges when relevant fields change
  useEffect(() => {
    if (!autoCalculateSurcharges || !company) return;

    const autoSurcharges = [];

    // Floor surcharges (no elevator)
    const fromFloorCharge = !formData.from_elevator && formData.from_floor > 0
      ? formData.from_floor * (pricing.floor_surcharge_no_elevator || 200)
      : 0;
    const toFloorCharge = !formData.to_elevator && formData.to_floor > 0
      ? formData.to_floor * (pricing.floor_surcharge_no_elevator || 200)
      : 0;

    if (fromFloorCharge > 0) {
      autoSurcharges.push({
        description: `Etage uden elevator (fra) - ${formData.from_floor}. sal`,
        amount: fromFloorCharge,
        auto: true,
      });
    }
    if (toFloorCharge > 0) {
      autoSurcharges.push({
        description: `Etage uden elevator (til) - ${formData.to_floor}. sal`,
        amount: toFloorCharge,
        auto: true,
      });
    }

    // Long carry distance
    const threshold = pricing.long_carry_threshold_meters || 20;
    const longCarryFrom = formData.from_parking_distance > threshold
      ? (pricing.long_carry_surcharge || 150)
      : 0;
    const longCarryTo = formData.to_parking_distance > threshold
      ? (pricing.long_carry_surcharge || 150)
      : 0;

    if (longCarryFrom > 0) {
      autoSurcharges.push({
        description: `Lang bæreafstand fra parkering (fra) - ${formData.from_parking_distance}m`,
        amount: longCarryFrom,
        auto: true,
      });
    }
    if (longCarryTo > 0) {
      autoSurcharges.push({
        description: `Lang bæreafstand fra parkering (til) - ${formData.to_parking_distance}m`,
        amount: longCarryTo,
        auto: true,
      });
    }

    // Special items surcharges
    formData.special_items.forEach(item => {
      if (item.type === 'piano') {
        autoSurcharges.push({
          description: `Klaver/Flygel${item.quantity > 1 ? ` (${item.quantity} stk)` : ''}`,
          amount: (pricing.piano_surcharge || 1500) * item.quantity,
          auto: true,
        });
      }
      if (item.type === 'safe') {
        autoSurcharges.push({
          description: `Pengeskab${item.quantity > 1 ? ` (${item.quantity} stk)` : ''}`,
          amount: (pricing.safe_surcharge || 800) * item.quantity,
          auto: true,
        });
      }
    });

    // Weekend surcharges
    if (formData.preferred_date && formData.base_price > 0) {
      const date = new Date(formData.preferred_date);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const weekendSurcharge = formData.base_price * ((pricing.weekend_surcharge_percent || 25) / 100);
        
        autoSurcharges.push({
          description: `Weekend tillæg (${pricing.weekend_surcharge_percent || 25}%)`,
          amount: weekendSurcharge,
          auto: true,
        });
      }
    }

    // Combine auto surcharges with manual ones
    const manualSurcharges = formData.surcharges.filter(s => !s.auto);
    setFormData(prev => ({
      ...prev,
      surcharges: [...autoSurcharges, ...manualSurcharges],
    }));
  }, [
    formData.from_floor,
    formData.from_elevator,
    formData.from_parking_distance,
    formData.to_floor,
    formData.to_elevator,
    formData.to_parking_distance,
    formData.special_items,
    formData.preferred_date,
    formData.base_price,
    autoCalculateSurcharges,
    company,
  ]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatePrice = (calc) => {
    let rate = 0;
    if (calc.men === 2) rate = pricing.hourly_rate_2_men || 650;
    else if (calc.men === 3) rate = pricing.hourly_rate_3_men || 850;
    else if (calc.men === 4) rate = pricing.hourly_rate_4_men || 1050;

    let total = calc.vehicles * rate * calc.hours;
    if (calc.heavyLift) total += (pricing.heavy_lift_surcharge || 500);
    if (calc.weekend) total = total * (1 + (pricing.weekend_surcharge_percent || 25) / 100);

    return Math.round(total);
  };

  const updateCalculator = (field, value) => {
    const newCalc = { ...calculator, [field]: value };
    setCalculator(newCalc);
    handleInputChange('base_price', calculatePrice(newCalc));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const addSpecialItem = () => {
    setFormData(prev => ({
      ...prev,
      special_items: [...prev.special_items, { type: 'other', description: '', quantity: 1 }]
    }));
  };

  const removeSpecialItem = (index) => {
    setFormData(prev => ({
      ...prev,
      special_items: prev.special_items.filter((_, i) => i !== index)
    }));
  };

  const updateSpecialItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      special_items: prev.special_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addSurcharge = () => {
    setFormData(prev => ({
      ...prev,
      surcharges: [...prev.surcharges, { description: '', amount: 0 }]
    }));
  };

  const removeSurcharge = (index) => {
    setFormData(prev => ({
      ...prev,
      surcharges: prev.surcharges.filter((_, i) => i !== index)
    }));
  };

  const updateSurcharge = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      surcharges: prev.surcharges.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateEstimate = () => {
    const basePrice = formData.base_price;
    const surchargesTotal = formData.surcharges.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    const materialsPrice = 0;
    
    const subtotal = basePrice + surchargesTotal + materialsPrice - (formData.discount_amount || 0);
    const vatAmount = subtotal * 0.25;
    const total = subtotal + vatAmount;

    return { basePrice, surchargesTotal, materialsPrice, subtotal, vatAmount, total };
  };

  const steps = [
    { number: 1, title: 'Kunde & Adresse', icon: User },
    { number: 2, title: 'Pris & Detaljer', icon: Calculator },
  ];

  const estimate = calculateEstimate();

  if (showSuccess && createdQuote) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Tilbud oprettet!</h1>
            <p className="text-slate-600 mb-2">Tilbudsnummer: <span className="font-semibold">{createdQuote.quote_number}</span></p>
            {formData.preferred_date && (
              <p className="text-slate-600 mb-8">Opgave oprettet i kalenderen for {new Date(formData.preferred_date).toLocaleDateString('da-DK')}</p>
            )}
            
            <div className="space-y-3 mb-8">
              <div className="p-4 bg-slate-50 rounded-lg text-left">
                <p className="text-sm text-slate-500 mb-1">Kunde</p>
                <p className="font-medium text-slate-900">{createdQuote.customer_name}</p>
                <p className="text-sm text-slate-600">{createdQuote.customer_email}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-left">
                <p className="text-sm text-slate-500 mb-1">Total pris</p>
                <p className="text-2xl font-bold text-indigo-600">{createdQuote.total_price.toLocaleString('da-DK')} kr</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate(createPageUrl(`QuoteDetail?id=${createdQuote.id}`))}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Se tilbud
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('Calendar'))}
                variant="outline"
                className="flex-1"
              >
                Gå til kalender
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('Quotes'))}
                variant="outline"
                className="flex-1"
              >
                Alle tilbud
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(createPageUrl("Quotes"))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nyt tilbud</h1>
          <p className="text-slate-500">Udfyld oplysninger for at oprette et tilbud</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-4">
        {steps.map((s, index) => (
          <div key={s.number} className="flex items-center flex-1">
            {index > 0 && <div className={`flex-1 h-0.5 mr-4 ${step > steps[index - 1].number ? 'bg-indigo-200' : 'bg-slate-200'}`} />}
            <button
              onClick={() => setStep(s.number)}
              className={`flex items-center gap-2 ${step >= s.number ? 'text-indigo-600' : 'text-slate-400'}`}
            >
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center
                ${step >= s.number ? 'bg-indigo-100' : 'bg-slate-100'}
              `}>
                {step > s.number ? (
                  <Check className="w-5 h-5 text-indigo-600" />
                ) : (
                  <s.icon className={`w-5 h-5 ${step >= s.number ? 'text-indigo-600' : 'text-slate-400'}`} />
                )}
              </div>
              <span className="hidden md:inline font-medium">{s.title}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              {/* Step 1: Customer & Address */}
              {step === 1 && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Kundeinformation</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="customer_name">Fulde navn *</Label>
                        <div className="relative mt-1.5">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="customer_name"
                            placeholder="Jens Hansen"
                            className="pl-10"
                            value={formData.customer_name}
                            onChange={(e) => handleInputChange('customer_name', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="customer_email">Email *</Label>
                        <div className="relative mt-1.5">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="customer_email"
                            type="email"
                            placeholder="jens@email.dk"
                            className="pl-10"
                            value={formData.customer_email}
                            onChange={(e) => handleInputChange('customer_email', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="customer_phone">Telefon</Label>
                        <div className="relative mt-1.5">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="customer_phone"
                            placeholder="12 34 56 78"
                            className="pl-10"
                            value={formData.customer_phone}
                            onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Fraflytningsadresse</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="from_address">Adresse *</Label>
                        <div className="relative mt-1.5">
                          <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <Input
                            id="from_address"
                            placeholder="Vejnavn 123, 1234 By"
                            className="pl-10"
                            value={formData.from_address}
                            onChange={(e) => handleInputChange('from_address', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="from_floor">Etage</Label>
                          <Input
                            id="from_floor"
                            type="number"
                            placeholder="0"
                            className="mt-1.5"
                            value={formData.from_floor}
                            onChange={(e) => handleInputChange('from_floor', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Elevator</Label>
                          <div className="flex items-center gap-2 mt-3">
                            <Switch
                              checked={formData.from_elevator}
                              onCheckedChange={(v) => handleInputChange('from_elevator', v)}
                            />
                            <span className="text-sm text-slate-600">
                              {formData.from_elevator ? 'Ja' : 'Nej'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="from_parking">Parkering (m)</Label>
                          <Input
                            id="from_parking"
                            type="number"
                            placeholder="0"
                            className="mt-1.5"
                            value={formData.from_parking_distance}
                            onChange={(e) => handleInputChange('from_parking_distance', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Tilflytningsadresse</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="to_address">Adresse *</Label>
                        <div className="relative mt-1.5">
                          <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <Input
                            id="to_address"
                            placeholder="Vejnavn 456, 5678 By"
                            className="pl-10"
                            value={formData.to_address}
                            onChange={(e) => handleInputChange('to_address', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="to_floor">Etage</Label>
                          <Input
                            id="to_floor"
                            type="number"
                            placeholder="0"
                            className="mt-1.5"
                            value={formData.to_floor}
                            onChange={(e) => handleInputChange('to_floor', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Elevator</Label>
                          <div className="flex items-center gap-2 mt-3">
                            <Switch
                              checked={formData.to_elevator}
                              onCheckedChange={(v) => handleInputChange('to_elevator', v)}
                            />
                            <span className="text-sm text-slate-600">
                              {formData.to_elevator ? 'Ja' : 'Nej'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="to_parking">Parkering (m)</Label>
                          <Input
                            id="to_parking"
                            type="number"
                            placeholder="0"
                            className="mt-1.5"
                            value={formData.to_parking_distance}
                            onChange={(e) => handleInputChange('to_parking_distance', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      {/* Route Details */}
                      {formData.from_address && formData.to_address && (
                        <div className="bg-slate-50 rounded-xl p-6 mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">Rutedetaljer</h3>
                            {loadingDistance && (
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            )}
                          </div>
                          <div className="space-y-2 text-sm">
                            {distanceData && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Fra virksomhed til afhentning:</span>
                                  <span className="font-medium">{distanceData.fromCompanyToStart} km</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Fra afhentning til levering:</span>
                                  <span className="font-medium">{distanceData.startToEnd} km</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Fra levering til virksomhed:</span>
                                  <span className="font-medium">{distanceData.endToCompanyReturn} km</span>
                                </div>
                                <div className="flex justify-between font-semibold border-t border-slate-200 pt-2 mt-2">
                                  <span>Total afstand:</span>
                                  <span className="text-indigo-600">{distanceData.total} km</span>
                                </div>
                              </>
                            )}
                            {!loadingDistance && !distanceData && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs text-red-700">Kunne ikke beregne afstand. Tjek venligst at begge adresser er indtastet korrekt.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Ønsket flyttedato</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="preferred_date">Dato</Label>
                        <div className="relative mt-1.5">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="preferred_date"
                            type="date"
                            className="pl-10"
                            value={formData.preferred_date}
                            onChange={(e) => handleInputChange('preferred_date', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="start_time">Starttidspunkt</Label>
                        <Input
                          id="start_time"
                          type="time"
                          className="mt-1.5"
                          value={formData.start_time}
                          onChange={(e) => handleInputChange('start_time', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Step 2: Pricing & Details */}
              {step === 2 && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Grundpris</h3>
                    
                    <Tabs value={pricingMode} onValueChange={setPricingMode} className="mb-6">
                      <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                        <TabsTrigger value="calculator">Prisberegner</TabsTrigger>
                        <TabsTrigger value="fixed">Fast pris</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="calculator">
                        <Card className="bg-indigo-50 border-indigo-100 mb-4">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900">Auto-beregning (fra m³ + etager)</p>
                            <p className="text-xs text-slate-600">Bruger virksomhedens indstillinger til at foreslå medarbejdere, timer og grundpris.</p>
                          </div>
                          <Button type="button" variant="secondary" onClick={runAutoPricingFromVolume}>
                            Auto-beregn
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                          <div>
                            <Label htmlFor="calc_vehicles" className="text-xs">Biler</Label>
                            <Input
                              id="calc_vehicles"
                              type="number"
                              placeholder="1"
                              min="0"
                              value={calculator.vehicles || ''}
                              className="mt-1 h-9 bg-white"
                              onChange={(e) => updateCalculator('vehicles', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="calc_men" className="text-xs">Mænd</Label>
                            <Select
                              value={calculator.men ? calculator.men.toString() : ''}
                              onValueChange={(v) => updateCalculator('men', parseFloat(v))}
                            >
                              <SelectTrigger id="calc_men" className="mt-1 h-9 bg-white">
                                <SelectValue placeholder="Vælg" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2 mænd</SelectItem>
                                <SelectItem value="3">3 mænd</SelectItem>
                                <SelectItem value="4">4 mænd</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="calc_hours" className="text-xs">Timer</Label>
                            <Input
                              id="calc_hours"
                              type="number"
                              placeholder="8"
                              min="0"
                              step="0.5"
                              value={calculator.hours || ''}
                              className="mt-1 h-9 bg-white"
                              onChange={(e) => updateCalculator('hours', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="calc_heavy_lift" className="text-xs">Tung løft</Label>
                            <div className="flex items-center h-9 mt-1">
                              <Switch
                                id="calc_heavy_lift"
                                checked={calculator.heavyLift}
                                onCheckedChange={(checked) => updateCalculator('heavyLift', checked)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="calc_weekend" className="text-xs">Weekend</Label>
                            <div className="flex items-center h-9 mt-1">
                              <Switch
                                id="calc_weekend"
                                checked={calculator.weekend}
                                onCheckedChange={(checked) => updateCalculator('weekend', checked)}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-center pt-2 border-t border-indigo-200">
                          <p className="text-xs text-indigo-600 font-medium">Beregnet pris bliver automatisk indsat nedenfor</p>
                        </div>
                      </CardContent>
                    </Card>
                      </TabsContent>
                      
                      <TabsContent value="fixed">
                        <div>
                          <Label htmlFor="base_price_fixed">Fast pris (kr ekskl. moms) *</Label>
                          <Input
                            id="base_price_fixed"
                            type="number"
                            placeholder="8000"
                            className="mt-1.5 max-w-xs"
                            value={formData.base_price}
                            onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                          />
                          <p className="text-xs text-slate-500 mt-1">Indtast den faste pris aftalt med kunden</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="border-t border-slate-100 pt-8">
                    <div>
                      <Label htmlFor="estimated_volume_m3">Estimeret volumen (valgfrit)</Label>
                      <Input
                        id="estimated_volume_m3"
                        type="number"
                        placeholder="25"
                        className="mt-1.5 max-w-xs"
                        value={formData.estimated_volume_m3}
                        onChange={(e) => handleInputChange('estimated_volume_m3', e.target.value)}
                      />
                      <p className="text-xs text-slate-500 mt-1">m³ til intern reference</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Tunge genstande & tillæg</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="heavy_80_count">Over 80 kg (antal)</Label>
                        <Input
                          id="heavy_80_count"
                          type="number"
                          min="0"
                          className="mt-1.5"
                          value={formData.heavy_80_count}
                          onChange={(e) => handleInputChange('heavy_80_count', parseInt(e.target.value || '0', 10))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="heavy_150_count">Over 150 kg (antal)</Label>
                        <Input
                          id="heavy_150_count"
                          type="number"
                          min="0"
                          className="mt-1.5"
                          value={formData.heavy_150_count}
                          onChange={(e) => handleInputChange('heavy_150_count', parseInt(e.target.value || '0', 10))}
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-sm font-medium text-slate-900 mb-2">Tillæg (vises linje-for-linje i tilbud)</p>
                      {Array.isArray(pricing?.fees) && pricing.fees.filter(f => f && f.enabled !== false).length > 0 ? (
                        <div className="space-y-2">
                          {pricing.fees
                            .filter((f) => f && f.enabled !== false)
                            .map((fee) => {
                              const defaultChecked = !!(fee.default_selected || fee.required || fee.auto_apply);
                              const checked = Object.prototype.hasOwnProperty.call(formData.selected_fees || {}, fee.fee_name)
                                ? !!formData.selected_fees[fee.fee_name]
                                : defaultChecked;
                              return (
                                <label key={fee.fee_name} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{fee.fee_name}</p>
                                    <p className="text-xs text-slate-500">
                                      {fee.fee_type === 'percent' ? `${fee.fee_value}%` : `${fee.fee_value} kr`}
                                      {fee.required ? ' • Påkrævet' : ''}
                                    </p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = { ...(formData.selected_fees || {}) };
                                      next[fee.fee_name] = e.target.checked;
                                      handleInputChange('selected_fees', next);
                                    }}
                                  />
                                </label>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Ingen tillæg er opsat under virksomhedens indstillinger endnu.</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Specielle genstande</h3>
                      <Button variant="outline" size="sm" onClick={addSpecialItem}>
                        <Plus className="w-4 h-4 mr-1" /> Tilføj
                      </Button>
                    </div>
                    {formData.special_items.length === 0 ? (
                      <p className="text-sm text-slate-500">Ingen specielle genstande tilføjet</p>
                    ) : (
                      <div className="space-y-3">
                        {formData.special_items.map((item, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Select
                              value={item.type}
                              onValueChange={(v) => updateSpecialItem(index, 'type', v)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {specialItemTypes.map(t => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Beskrivelse"
                              className="flex-1"
                              value={item.description}
                              onChange={(e) => updateSpecialItem(index, 'description', e.target.value)}
                            />
                            <Input
                              type="number"
                              className="w-20"
                              placeholder="Antal"
                              value={item.quantity}
                              onChange={(e) => updateSpecialItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeSpecialItem(index)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-8">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-semibold text-slate-900">Tillæg</h3>
                     <div className="flex items-center gap-3">
                       <div className="flex items-center gap-2">
                         <Switch
                           checked={autoCalculateSurcharges}
                           onCheckedChange={setAutoCalculateSurcharges}
                         />
                         <span className="text-sm text-slate-600">Auto-beregn</span>
                       </div>
                       <Button variant="outline" size="sm" onClick={addSurcharge}>
                         <Plus className="w-4 h-4 mr-1" /> Tilføj manuelt
                       </Button>
                     </div>
                   </div>
                   {formData.surcharges.length === 0 ? (
                     <div className="p-4 bg-slate-50 rounded-lg text-center">
                       <p className="text-sm text-slate-500">
                         {autoCalculateSurcharges 
                           ? 'Tillæg beregnes automatisk baseret på detaljer (etager, afstand, specielle genstande)'
                           : 'Ingen tillæg tilføjet'}
                       </p>
                     </div>
                   ) : (
                     <div className="space-y-3">
                       {formData.surcharges.map((item, index) => (
                         <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                           {item.auto && (
                             <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                               Auto
                             </Badge>
                           )}
                           <Input
                             placeholder="Beskrivelse (fx etage-tillæg)"
                             className="flex-1"
                             value={item.description}
                             onChange={(e) => updateSurcharge(index, 'description', e.target.value)}
                             disabled={item.auto}
                           />
                           <Input
                             type="number"
                             placeholder="Beløb"
                             className="w-32"
                             value={item.amount}
                             onChange={(e) => updateSurcharge(index, 'amount', parseFloat(e.target.value) || 0)}
                             disabled={item.auto}
                           />
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => removeSurcharge(index)}
                             disabled={item.auto && autoCalculateSurcharges}
                           >
                             <Trash2 className={`w-4 h-4 ${item.auto && autoCalculateSurcharges ? 'text-slate-300' : 'text-red-500'}`} />
                           </Button>
                         </div>
                       ))}
                     </div>
                   )}
                  </div>

                  <div className="border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Rabat</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="discount_amount">Rabatbeløb (kr)</Label>
                        <Input
                          id="discount_amount"
                          type="number"
                          className="mt-1.5"
                          value={formData.discount_amount}
                          onChange={(e) => handleInputChange('discount_amount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="discount_reason">Rabatårsag</Label>
                        <Input
                          id="discount_reason"
                          placeholder="Fx loyalitetsrabat"
                          className="mt-1.5"
                          value={formData.discount_reason}
                          onChange={(e) => handleInputChange('discount_reason', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Ressourcer</h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Medarbejdere</Label>
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                          {workers.length === 0 ? (
                            <p className="text-sm text-slate-500 col-span-2">Ingen medarbejdere tilgængelige. Opret medarbejdere under Ressourcer.</p>
                          ) : (
                            workers.map(worker => (
                              <div key={worker.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`worker-${worker.id}`}
                                  checked={formData.assigned_workers.includes(worker.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      handleInputChange('assigned_workers', [...formData.assigned_workers, worker.id]);
                                    } else {
                                      handleInputChange('assigned_workers', formData.assigned_workers.filter(id => id !== worker.id));
                                    }
                                  }}
                                  className="rounded cursor-pointer"
                                />
                                <label htmlFor={`worker-${worker.id}`} className="text-sm cursor-pointer text-slate-700">
                                  {worker.full_name}
                                </label>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="assigned_vehicle">Køretøj</Label>
                        <Select
                          value={formData.assigned_vehicle_id}
                          onValueChange={(v) => handleInputChange('assigned_vehicle_id', v)}
                        >
                          <SelectTrigger id="assigned_vehicle" className="mt-1.5">
                            <SelectValue placeholder="Vælg køretøj" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>Intet køretøj</SelectItem>
                            {vehicles.map(vehicle => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Kundens noter</h3>
                    <Textarea
                      placeholder="Specielle ønsker eller bemærkninger fra kunden..."
                      value={formData.customer_notes}
                      onChange={(e) => handleInputChange('customer_notes', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Interne noter</h3>
                    <Textarea
                      placeholder="Noter kun synlige for dit team..."
                      value={formData.internal_notes}
                      onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setStep(s => Math.max(1, s - 1))}
                  disabled={step === 1}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tilbage
                </Button>
                {step < 2 ? (
                  <Button
                    onClick={() => setStep(s => Math.min(2, s + 1))}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Næste
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => createQuoteMutation.mutate(formData)}
                    disabled={createQuoteMutation.isPending || !formData.customer_name || !formData.from_address || !formData.to_address || !formData.base_price}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {createQuoteMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Opretter...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Opret tilbud
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Price Summary */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-sm sticky top-24">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Prisestimat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Grundpris</span>
                  <span className="font-medium">{estimate.basePrice.toLocaleString('da-DK')} kr</span>
                </div>
                
                {formData.surcharges.filter(s => s.auto).length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Automatiske tillæg:</p>
                    {formData.surcharges.filter(s => s.auto).map((s, i) => (
                      <div key={i} className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">{s.description}</span>
                        <span className="font-medium text-slate-700">+{s.amount.toLocaleString('da-DK')} kr</span>
                      </div>
                    ))}
                  </div>
                )}

                {formData.surcharges.filter(s => !s.auto).length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Manuelle tillæg:</p>
                    {formData.surcharges.filter(s => !s.auto).map((s, i) => (
                      <div key={i} className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">{s.description}</span>
                        <span className="font-medium text-slate-700">+{s.amount.toLocaleString('da-DK')} kr</span>
                      </div>
                    ))}
                  </div>
                )}

                {formData.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Rabat</span>
                    <span>-{formData.discount_amount.toLocaleString('da-DK')} kr</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span>{estimate.subtotal.toLocaleString('da-DK')} kr</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-600">Moms (25%)</span>
                    <span>{estimate.vatAmount.toLocaleString('da-DK')} kr</span>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-900">Total</span>
                    <span className="text-xl font-bold text-indigo-600">
                      {estimate.total.toLocaleString('da-DK')} kr
                    </span>
                  </div>
                </div>
              </div>


            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}