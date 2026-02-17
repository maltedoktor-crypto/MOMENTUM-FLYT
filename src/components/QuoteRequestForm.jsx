import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import AddressAutocomplete from "./AddressAutocomplete";
import { 
  ArrowRight, 
  ArrowLeft,
  Calendar as CalendarIcon,
  Loader2,
  CheckCircle2,
  Mic,
  Plus,
  Minus,
  Mail,
  Phone,
  Send,
  Package
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { calculateQuotePricing } from '@/utils/pricingEngine';

// Furniture items organized by category with default volume in m³
const furnitureCategories = [
  {
    name: 'Soveværelse',
    items: [
      { id: 'dobbeltsen', name: 'Dobbeltseng (180x200)', volume: 3.5 },
      { id: 'seng', name: 'Enkeltseng (90x200)', volume: 2.5 },
      { id: 'babyseng', name: 'Babyseng', volume: 1.2 },
      { id: 'natbord', name: 'Natbord', volume: 0.4 },
      { id: 'klædeskab', name: 'Garderobeskab (stor)', volume: 4.5 },
      { id: 'klædeskab_lille', name: 'Garderobeskab (lille)', volume: 2.5 },
      { id: 'toiletbord', name: 'Toiletbord med spejl', volume: 1.2 },
    ]
  },
  {
    name: 'Stue',
    items: [
      { id: 'sofa3', name: '3-personers sofa med chaiselong', volume: 4.4 },
      { id: 'sofa2', name: '2-personers sofa', volume: 3.2 },
      { id: 'lænestol', name: 'Lænestol', volume: 1.8 },
      { id: 'sofabord', name: 'Sofabord', volume: 1.1 },
      { id: 'tv_bord', name: 'TV-bord', volume: 1.5 },
      { id: 'tv', name: 'Fladskærms-TV (stor)', volume: 0.4 },
      { id: 'tv_lille', name: 'Fladskærms-TV (lille)', volume: 0.2 },
      { id: 'reol', name: 'Reol/Bogreol (stor)', volume: 2.2 },
      { id: 'reol_lille', name: 'Reol/Bogreol (lille)', volume: 1.2 },
      { id: 'vitrineskab', name: 'Vitrineskab', volume: 2.5 },
      { id: 'sidebord', name: 'Sidebord', volume: 0.5 },
      { id: 'staalampe', name: 'Stålampe', volume: 0.3 },
    ]
  },
  {
    name: 'Spisestue',
    items: [
      { id: 'spisebord', name: 'Spisebord (4-6 personer)', volume: 2.5 },
      { id: 'spisebord_stort', name: 'Spisebord (8+ personer)', volume: 3.8 },
      { id: 'spisebordsstol', name: 'Spisebordsstol', volume: 0.6 },
      { id: 'baenkebord', name: 'Bænk til spisebord', volume: 1.2 },
      { id: 'buffet', name: 'Buffet/Skænk', volume: 3.0 },
    ]
  },
  {
    name: 'Kontor',
    items: [
      { id: 'skrivebord', name: 'Skrivebord', volume: 2.0 },
      { id: 'kontorstol', name: 'Kontorstol', volume: 0.9 },
      { id: 'computer', name: 'Stationær computer', volume: 0.2 },
      { id: 'computerskaerm', name: 'Computerskærm', volume: 0.3 },
      { id: 'arkivskab', name: 'Arkivskab', volume: 2.5 },
      { id: 'kontorreol', name: 'Kontorreol', volume: 2.0 },
    ]
  },
  {
    name: 'Køkken',
    items: [
      { id: 'køleskab', name: 'Køleskab', volume: 1.5 },
      { id: 'fryseskab', name: 'Fryseskab', volume: 1.3 },
      { id: 'køl_frys', name: 'Køle-fryseskab', volume: 2.0 },
      { id: 'opvaskemaskine', name: 'Opvaskemaskine', volume: 1.0 },
      { id: 'komfur', name: 'Komfur', volume: 1.2 },
      { id: 'mikrobølge', name: 'Mikrobølgeovn', volume: 0.3 },
      { id: 'køkkenbord', name: 'Køkkenbord', volume: 1.5 },
      { id: 'køkkenstol', name: 'Køkkenstol', volume: 0.5 },
      { id: 'køkkenskab', name: 'Køkkenskab', volume: 1.0 },
    ]
  },
  {
    name: 'Badeværelse',
    items: [
      { id: 'vaskemaskine', name: 'Vaskemaskine', volume: 1.0 },
      { id: 'tørretumbler', name: 'Tørretumbler', volume: 1.0 },
      { id: 'badeværelseskab', name: 'Badeværelseskab', volume: 0.8 },
    ]
  },
  {
    name: 'Børneværelse',
    items: [
      { id: 'legetøjskasse', name: 'Legetøjskasse', volume: 0.5 },
      { id: 'puslebord', name: 'Puslebord', volume: 0.8 },
      { id: 'barneseng', name: 'Barneseng', volume: 2.0 },
      { id: 'børneskrivebord', name: 'Børneskrivebord', volume: 1.2 },
    ]
  },
  {
    name: 'Diverse',
    items: [
      { id: 'cykel', name: 'Cykel', volume: 0.8 },
      { id: 'barnevogn', name: 'Barnevogn', volume: 0.6 },
      { id: 'støvsuger', name: 'Støvsuger', volume: 0.2 },
      { id: 'strygejern', name: 'Strygejern + bræt', volume: 0.4 },
      { id: 'tæppe', name: 'Tæppe (rullet)', volume: 0.5 },
      { id: 'spejl', name: 'Stort vægspejl', volume: 0.4 },
      { id: 'plante', name: 'Stor potteplante', volume: 0.3 },
      { id: 'stige', name: 'Stige', volume: 0.4 },
      { id: 'havemøbel', name: 'Havemøbelsæt (bord + 4 stole)', volume: 2.5 },
      { id: 'grill', name: 'Grill', volume: 0.6 },
      { id: 'kasse', name: 'Flyttekasse (standard)', volume: 0.12 },
    ]
  },
];

// Flatten for easy lookups
const furnitureItems = furnitureCategories.flatMap(cat => cat.items);

export default function QuoteRequestForm({ organization }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submissionType, setSubmissionType] = useState(null); // 'booking', 'email', 'callback'
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [callbackDialogOpen, setCallbackDialogOpen] = useState(false);
  const [distanceData, setDistanceData] = useState(null);
  const [loadingDistance, setLoadingDistance] = useState(false);
  
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  
  const [formData, setFormData] = useState({
    from_address: '',
    from_parking_distance: '',
    to_address: '',
    to_parking_distance: '',
    furniture: {},
  });

  const [bookingData, setBookingData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    preferred_date: '',
    time_slot: '08:00-10:00',
    cvr: '',
    notes: '',
  });

  const pricingConfig = organization?.pricing_config || {};

  // Calculate total volume
  const calculateTotalVolume = () => {
    let total = 0;
    Object.entries(formData.furniture).forEach(([itemId, quantity]) => {
      const item = furnitureItems.find(f => f.id === itemId);
      if (item && quantity > 0) {
        total += item.volume * quantity;
      }
    });
    return Math.round(total * 100) / 100;
  };

  // Calculate distance using OSRM routing with retry logic
  const fetchDistance = async () => {
    if (!formData.from_address || !formData.to_address) return;
    
    setLoadingDistance(true);
    try {
      const companyCoords = organization?.address_coordinates || { lat: 56.4617, lon: 10.0371 };
      
      const geocodeWithRetry = async (address, retries = 3) => {
        for (let i = 0; i <= retries; i++) {
          try {
            await new Promise(resolve => setTimeout(resolve, 500 + i * 800));
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
            const res = await fetch(url, { headers: { 'User-Agent': 'MovingApp/1.0' }, signal: AbortSignal.timeout(10000) });
            const data = await res.json();
            if (data.length === 0) throw new Error('Address not found');
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
          } catch (e) {
            if (i === retries) throw e;
          }
        }
      };
      
      const getRouteDistance = async (coords, retries = 2) => {
        for (let i = 0; i <= retries; i++) {
          try {
            const coordString = coords.map(c => `${c.lon},${c.lat}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=false`;
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            const data = await res.json();
            if (data.code !== 'Ok') throw new Error('Routing unavailable');
            if (!data.routes || data.routes.length === 0) throw new Error('No route found');
            return data.routes[0].distance / 1000;
          } catch (e) {
            if (i === retries) throw e;
            await new Promise(resolve => setTimeout(resolve, 1000 + i * 500));
          }
        }
      };
      
      const fromCoords = await geocodeWithRetry(formData.from_address);
      const toCoords = await geocodeWithRetry(formData.to_address);
      
      const [fromCompanyToStart, startToEnd, endToCompanyReturn] = await Promise.all([
        getRouteDistance([companyCoords, fromCoords]),
        getRouteDistance([fromCoords, toCoords]),
        getRouteDistance([toCoords, companyCoords])
      ]);
      
      const total = fromCompanyToStart + startToEnd + endToCompanyReturn;
      
      setDistanceData({
        total: Math.round(total * 10) / 10,
        fromCompanyToStart: Math.round(fromCompanyToStart * 10) / 10,
        startToEnd: Math.round(startToEnd * 10) / 10,
        endToCompanyReturn: Math.round(endToCompanyReturn * 10) / 10,
      });
    } catch (error) {
      console.error('Error fetching distance:', error);
      setDistanceData(null);
    } finally {
      setLoadingDistance(false);
    }
  };

  React.useEffect(() => {
    if (formData.from_address && formData.to_address && 
        formData.from_address.length > 10 && formData.to_address.length > 10) {
      const timer = setTimeout(() => {
        fetchDistance();
      }, 1500);
      
      return () => clearTimeout(timer);
    } else {
      setDistanceData(null);
    }
  }, [formData.from_address, formData.to_address]);

  // Calculate distance
  const calculateDistance = () => {
    return distanceData || {
      total: 0,
      fromCompanyToStart: 0,
      startToEnd: 0,
      endToCompanyReturn: 0,
    };
  };

  // Calculate drive time
  const calculateDriveTime = () => {
    const distance = calculateDistance();
    const avgSpeed = 60;
    return Math.round((distance.total / avgSpeed) * 60);
  };

  // Calculate pricing
  const calculatePricing = () => {
    const distance = calculateDistance();
    const volume = calculateTotalVolume();
    const driveTimeMinutes = calculateDriveTime();

    // Backwards compatible mapping from old pricing_config keys to new engine keys
    const mappedConfig = {
      ...pricingConfig,
      hourly_rate_total: pricingConfig.hourly_rate_total ?? pricingConfig.hourly_rate_2_men ?? 650,
      price_per_km: pricingConfig.price_per_km ?? pricingConfig.transport_cost_per_km ?? 6,
      // If the company hasn't chosen a transport method yet, default to charging time (simplest for MVP)
      transport_pricing_mode: pricingConfig.transport_pricing_mode ?? 'charge_time_from_departure',
    };

    const breakdown = calculateQuotePricing({
      pricingConfig: mappedConfig,
      volume_m3: volume,
      from_floor: 0,
      to_floor: 0,
      elevator_from: false,
      elevator_to: false,
      transport_minutes: driveTimeMinutes,
      km_roundtrip: distance.total,
      heavy_80_count: 0,
      heavy_150_count: 0,
      selectedFees: [],
    });

    // Keep the existing UI/email template working by mapping to the previous shape
    const transportCost = breakdown.prices.transport_price;
    const driveTimeCost = 0;
    const volumeCost = breakdown.prices.labor_price;
    const subtotal = breakdown.prices.subtotal;
    const vat = breakdown.prices.vat_amount;
    const total = breakdown.prices.total_price;

    return {
      transportCost,
      driveTimeCost,
      volumeCost,
      volume: breakdown.volume_m3,
      subtotal,
      vat,
      total,
      driveTimeHours: breakdown.time.labor_hours,
      crew: breakdown.crew,
      breakdown,
    };
  };

  const handleFurnitureChange = (itemId, delta) => {
    setFormData(prev => ({
      ...prev,
      furniture: {
        ...prev.furniture,
        [itemId]: Math.max(0, (prev.furniture[itemId] || 0) + delta)
      }
    }));
  };

  const bookNowMutation = useMutation({
    mutationFn: async () => {
      const pricing = calculatePricing();
      const quoteNumber = `REQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
      const publicToken = crypto.randomUUID().substring(0, 8).toUpperCase();
      
      if (!organization?.id) {
        throw new Error('Organisationen kunne ikke findes. Prøv at genindlæse siden.');
      }

      const existingCustomers = await base44.entities.Customer.filter({ 
        email: bookingData.customer_email,
        company_id: organization.id 
      });
      
      let customer;
      if (existingCustomers.length > 0) {
        customer = existingCustomers[0];
      } else {
        customer = await base44.entities.Customer.create({
          company_id: organization.id,
          name: bookingData.customer_name,
          email: bookingData.customer_email,
          phone: bookingData.customer_phone,
          source: 'website',
          total_jobs: 0,
          total_revenue: 0,
        });
      }

      const quote = await base44.entities.Quote.create({
        company_id: organization.id,
        // Company snapshot for public quote display
        company_name: organization.company_name || organization.name || '',
        company_contact_name: organization.contact_name || '',
        company_email: organization.email || '',
        company_phone: organization.phone || '',
        company_address: organization.address || '',
        company_website: organization.website || '',
        company_logo_url: organization.logo_url || '',
        customer_id: customer.id,
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        customer_phone: bookingData.customer_phone,
        from_address: formData.from_address,
        to_address: formData.to_address,
        from_floor: Number(formData.from_floor || 0),
        to_floor: Number(formData.to_floor || 0),
        from_elevator: !!formData.from_elevator,
        to_elevator: !!formData.to_elevator,
        from_parking_distance: formData.from_parking_distance,
        to_parking_distance: formData.to_parking_distance,
        preferred_date: bookingData.preferred_date,
        estimated_volume_m3: pricing.volume,
        pricing_type: 'fixed',
        crew_size: pricing.crew || 2,
        base_price: pricing.subtotal,
        subtotal: pricing.subtotal,
        vat_rate: 25,
        vat_amount: pricing.vat,
        total_price: pricing.total,
        heavy_80_count: parseInt(formData.heavy_80_count || 0, 10),
        heavy_150_count: parseInt(formData.heavy_150_count || 0, 10),
        selected_fees: Object.entries(formData.selected_fees || {}).map(([fee_name, selected]) => ({ fee_name, selected: !!selected })),
        pricing_breakdown: pricing.breakdown,
        customer_notes: bookingData.notes,
        quote_number: quoteNumber,
        public_token: publicToken,
        status: 'accepted',
        surcharges: pricing.breakdown?.fees || [],
      });

      const jobNumber = `JOB-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
      
      await base44.entities.Job.create({
        company_id: organization.id,
        quote_id: quote.id,
        customer_id: customer.id,
        job_number: jobNumber,
        status: 'scheduled',
        scheduled_date: bookingData.preferred_date,
        start_time: bookingData.time_slot.split('-')[0],
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        customer_phone: bookingData.customer_phone,
        from_address: formData.from_address,
        to_address: formData.to_address,
        from_parking_distance: formData.from_parking_distance,
        to_parking_distance: formData.to_parking_distance,
        crew_size: 2,
        quoted_price: pricing.total,
      });

      return { quoteNumber, publicToken };
    },
    onSuccess: () => {
      setSubmitted(true);
      setSubmissionType('booking');
      setBookingDialogOpen(false);
    },
    onError: (error) => {
      console.error('Booking error:', error);
      alert(error.message || 'Der skete en fejl. Prøv venligst igen.');
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      // Ensure distance is calculated
      if (!distanceData && formData.from_address && formData.to_address) {
        throw new Error('Ruteberegning er ikke færdig. Prøv igen om få sekunder.');
      }
      
      const pricing = calculatePricing();
      const quoteNumber = `REQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
      const publicToken = crypto.randomUUID().substring(0, 8).toUpperCase();
      
      if (!organization?.id) {
        throw new Error('Organisationen kunne ikke findes. Prøv at genindlæse siden.');
      }

      const existingCustomers = await base44.entities.Customer.filter({ 
        email: contactData.email,
        company_id: organization.id 
      });
      
      let customer;
      if (existingCustomers.length > 0) {
        customer = existingCustomers[0];
      } else {
        customer = await base44.entities.Customer.create({
          company_id: organization.id,
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phone,
          source: 'website',
          total_jobs: 0,
          total_revenue: 0,
        });
      }

      const quote = await base44.entities.Quote.create({
        company_id: organization.id,
        // Company snapshot for public quote display
        company_name: organization.company_name || organization.name || '',
        company_contact_name: organization.contact_name || '',
        company_email: organization.email || '',
        company_phone: organization.phone || '',
        company_address: organization.address || '',
        company_website: organization.website || '',
        company_logo_url: organization.logo_url || '',
        customer_id: customer.id,
        customer_name: contactData.name,
        customer_email: contactData.email,
        customer_phone: contactData.phone,
        from_address: formData.from_address,
        to_address: formData.to_address,
        from_floor: Number(formData.from_floor || 0),
        to_floor: Number(formData.to_floor || 0),
        from_elevator: !!formData.from_elevator,
        to_elevator: !!formData.to_elevator,
        from_parking_distance: formData.from_parking_distance,
        to_parking_distance: formData.to_parking_distance,
        estimated_volume_m3: pricing.volume,
        pricing_type: 'fixed',
        crew_size: pricing.crew || 2,
        base_price: pricing.subtotal,
        subtotal: pricing.subtotal,
        vat_rate: 25,
        vat_amount: pricing.vat,
        total_price: pricing.total,
        heavy_80_count: parseInt(formData.heavy_80_count || 0, 10),
        heavy_150_count: parseInt(formData.heavy_150_count || 0, 10),
        selected_fees: Object.entries(formData.selected_fees || {}).map(([fee_name, selected]) => ({ fee_name, selected: !!selected })),
        pricing_breakdown: pricing.breakdown,
        quote_number: quoteNumber,
        public_token: publicToken,
        status: 'sent',
        surcharges: pricing.breakdown?.fees || [],
      });

      await base44.functions.invoke('sendQuoteEmail', {
        to: contactData.email,
        subject: `Dit flyttetilbud fra ${organization?.name || 'MOMENTUM'}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 40px 20px; text-align: center; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header p { font-size: 14px; opacity: 0.9; }
        .content { background: white; padding: 40px 30px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .info-box { background: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px 20px; margin-bottom: 16px; border-radius: 4px; }
        .info-label { font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; }
        .info-value { font-size: 16px; color: #1e293b; font-weight: 500; }
        .price-box { background: #f8fafc; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .price-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .price-row.total { border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 12px; font-weight: 600; font-size: 18px; color: #4f46e5; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .timestamp { font-size: 12px; color: #94a3b8; margin-top: 20px; }
        .logo { display: inline-block; font-weight: 700; color: white; font-size: 18px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="margin-bottom: 20px;">
                <span class="logo">M</span>
            </div>
            <h1>Dit Flyttetilbud</h1>
            <p>Personaliseret tilbud til din flytning</p>
        </div>
        
        <div class="content">
            <p>Hej ${contactData.name},</p>
            <p style="margin-top: 16px; color: #475569;">Tak for din interesse i ${organization?.name || 'MOMENTUM'}. Vi har udarbejdet et personalizeret tilbud baseret på dine oplysninger.</p>

            <div class="section" style="margin-top: 30px;">
                <div class="section-title">Fluytningsdetaljer</div>
                
                <div class="info-box">
                    <div class="info-label">Fra</div>
                    <div class="info-value">${formData.from_address}</div>
                </div>
                
                <div class="info-box">
                    <div class="info-label">Til</div>
                    <div class="info-value">${formData.to_address}</div>
                </div>
                
                <div class="info-box">
                    <div class="info-label">Estimeret volumen</div>
                    <div class="info-value">${pricing.volume} m³</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Prisberegning</div>
                <div class="price-box">
                    <div class="price-row">
                        <span>Transport:</span>
                        <span>${pricing.transportCost.toLocaleString('da-DK')} kr</span>
                    </div>
                    <div class="price-row">
                        <span>Køretid:</span>
                        <span>${pricing.driveTimeCost.toLocaleString('da-DK')} kr</span>
                    </div>
                    <div class="price-row">
                        <span>Volumen:</span>
                        <span>${pricing.volumeCost.toLocaleString('da-DK')} kr</span>
                    </div>
                    <div class="price-row">
                        <span>Subtotal:</span>
                        <span>${pricing.subtotal.toLocaleString('da-DK')} kr</span>
                    </div>
                    <div class="price-row">
                        <span>Moms (25%):</span>
                        <span>${pricing.vat.toLocaleString('da-DK')} kr</span>
                    </div>
                    <div class="price-row total">
                        <span>Total pris:</span>
                        <span>${pricing.total.toLocaleString('da-DK')} kr</span>
                    </div>
                </div>
            </div>

            <div style="margin-top: 30px; padding: 20px; background: #f0f4ff; border-radius: 6px;">
                <p style="font-size: 14px; color: #4f46e5; font-weight: 600; margin-bottom: 8px;">Hvad sker der nu?</p>
                <p style="font-size: 14px; color: #475569; line-height: 1.6;">Vi behandler dit tilbud og kontakter dig inden for 24 timer for at bekræfte alle detaljer og gennemgå eventuelle spørgsmål.</p>
            </div>
        </div>

        <div class="footer">
            <p>${organization?.name || 'MOMENTUM'}</p>
            <p style="margin-top: 8px;">Vi bringer dine møbler sikkert fra A til B 📦</p>
            <p class="timestamp">Tilbud oprettet: ${new Date().toLocaleString('da-DK')}</p>
        </div>
    </div>
</body>
</html>
        `
      });

      return { quoteNumber, publicToken };
    },
    onSuccess: () => {
      setSubmitted(true);
      setSubmissionType('email');
      setEmailDialogOpen(false);
    },
  });

  const requestCallbackMutation = useMutation({
    mutationFn: async () => {
      // Ensure distance is calculated
      if (!distanceData && formData.from_address && formData.to_address) {
        throw new Error('Ruteberegning er ikke færdig. Prøv igen om få sekunder.');
      }
      
      const pricing = calculatePricing();
      const quoteNumber = `REQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
      const publicToken = crypto.randomUUID().substring(0, 8).toUpperCase();
      
      if (!organization?.id) {
        throw new Error('Organisationen kunne ikke findes. Prøv at genindlæse siden.');
      }

      const existingCustomers = await base44.entities.Customer.filter({ 
        email: contactData.email,
        company_id: organization.id 
      });
      
      let customer;
      if (existingCustomers.length > 0) {
        customer = existingCustomers[0];
      } else {
        customer = await base44.entities.Customer.create({
          company_id: organization.id,
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phone,
          source: 'website',
          total_jobs: 0,
          total_revenue: 0,
        });
      }

      await base44.entities.Quote.create({
        company_id: organization.id,
        // Company snapshot for public quote display
        company_name: organization.company_name || organization.name || '',
        company_contact_name: organization.contact_name || '',
        company_email: organization.email || '',
        company_phone: organization.phone || '',
        company_address: organization.address || '',
        company_website: organization.website || '',
        company_logo_url: organization.logo_url || '',
        customer_id: customer.id,
        customer_name: contactData.name,
        customer_email: contactData.email,
        customer_phone: contactData.phone,
        from_address: formData.from_address,
        to_address: formData.to_address,
        from_floor: Number(formData.from_floor || 0),
        to_floor: Number(formData.to_floor || 0),
        from_elevator: !!formData.from_elevator,
        to_elevator: !!formData.to_elevator,
        from_parking_distance: formData.from_parking_distance,
        to_parking_distance: formData.to_parking_distance,
        estimated_volume_m3: pricing.volume,
        pricing_type: 'fixed',
        crew_size: pricing.crew || 2,
        base_price: pricing.subtotal,
        subtotal: pricing.subtotal,
        vat_rate: 25,
        vat_amount: pricing.vat,
        total_price: pricing.total,
        heavy_80_count: parseInt(formData.heavy_80_count || 0, 10),
        heavy_150_count: parseInt(formData.heavy_150_count || 0, 10),
        selected_fees: Object.entries(formData.selected_fees || {}).map(([fee_name, selected]) => ({ fee_name, selected: !!selected })),
        pricing_breakdown: pricing.breakdown,
        customer_notes: 'Kunden ønsker at blive ringet op',
        quote_number: quoteNumber,
        public_token: publicToken,
        status: 'sent',
        surcharges: pricing.breakdown?.fees || [],
      });

      return { quoteNumber, publicToken };
    },
    onSuccess: () => {
      setSubmitted(true);
      setSubmissionType('callback');
      setCallbackDialogOpen(false);
    },
  });

  // Success screen
  if (submitted) {
    if (submissionType === 'booking') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full border-0 shadow-xl">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CalendarIcon className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Tak for din booking!
              </h2>
              <p className="text-lg text-slate-600 mb-2">
                Hej {bookingData.customer_name},
              </p>
              <p className="text-slate-600 mb-8 max-w-xl mx-auto">
                Din booking er modtaget og vi behandler den nu manuelt. Vi kontakter dig inden for 24 timer på {bookingData.customer_email} for at bekræfte den endelige tid og koordinere alle detaljer.
              </p>
              <p className="text-slate-600 mb-8">
                Vi glæder os til at hjælpe dig med din flytning!
              </p>
              
              <div className="bg-slate-50 rounded-2xl p-6 max-w-md mx-auto">
                <p className="text-sm text-slate-600 mb-2">Reference nummer:</p>
                <p className="text-2xl font-bold text-slate-900 tracking-wider">
                  {bookNowMutation.data?.publicToken || 'XXXXXXXX'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (submissionType === 'email') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full border-0 shadow-xl">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Tilbud sendt!
              </h2>
              <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
                Tak {contactData.name}! Dit tilbud er på vej til {contactData.email}. Vi ringer dig op inden kort for at gennemgå detaljer.
              </p>
              <p className="text-slate-600">
                Vi glæder os til at hjælpe dig med din flytning! 📦
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (submissionType === 'callback') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full border-0 shadow-xl">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Vi ringer snart!
              </h2>
              <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
                Tak {contactData.name}! Vi har modtaget din anmodning og ringer dig op på {contactData.phone} inden kort tid.
              </p>
              <p className="text-slate-600">
                Vi glæder os til at gennemgå dit tilbud med dig! 📞
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  const pricing = calculatePricing();
  const distance = calculateDistance();
  const driveTimeMinutes = calculateDriveTime();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-indigo-600 mb-2">{organization?.name || 'MOMENTUM'}</h1>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'} font-semibold transition-all`}>
              {step > 1 ? <CheckCircle2 className="w-6 h-6" /> : '1'}
            </div>
            <div className={`text-sm font-medium ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>Adresser</div>
            
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'} transition-all`} />
            
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'} font-semibold transition-all`}>
              {step > 2 ? <CheckCircle2 className="w-6 h-6" /> : '2'}
            </div>
            <div className={`text-sm font-medium ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>Møbler</div>
            
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'} transition-all`} />
            
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'} font-semibold transition-all`}>
              3
            </div>
            <div className={`text-sm font-medium ${step >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>Tilbud</div>
          </div>
        </div>

        {/* Step 1: Adresser */}
         {step === 1 && (
           <Card className="border-0 shadow-lg">
             <CardContent className="p-8">
               <h2 className="text-2xl font-bold text-slate-900 mb-2">Hvor skal du flytte?</h2>
               <p className="text-slate-500 text-sm mb-8">Indtast adresserne så beregner vi automtisk afstand og kostnad.</p>

               <div className="space-y-8">
                 {/* From Address */}
                 <div className="space-y-3">
                   <Label className="text-sm font-semibold text-slate-700">Fra adresse *</Label>
                   <AddressAutocomplete
                     placeholder="Vejnavn 123, 1234 By"
                     value={formData.from_address}
                     onChange={(value) => setFormData({ ...formData, from_address: value })}
                   />
                   <div className="flex items-center gap-2 mt-4">
                     <span className="text-xs text-slate-600 font-medium">Parkering:</span>
                     <Input
                       type="number"
                       placeholder="10"
                       className="h-9 text-sm w-24"
                       value={formData.from_parking_distance}
                       onChange={(e) => setFormData({ ...formData, from_parking_distance: e.target.value })}
                     />
                     <span className="text-xs text-slate-500">meter</span>
                   </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="text-xs text-slate-600 font-medium">Etage</Label>
                      <Input
                        type="number"
                        className="h-9 text-sm mt-1"
                        value={formData.from_floor}
                        onChange={(e) => setFormData({ ...formData, from_floor: parseInt(e.target.value || '0', 10) })}
                      />
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <Label className="text-xs text-slate-600 font-medium">Elevator</Label>
                        <p className="text-[11px] text-slate-500">Tilgængelig ved afhentning</p>
                      </div>
                      <Switch
                        checked={!!formData.from_elevator}
                        onCheckedChange={(checked) => setFormData({ ...formData, from_elevator: !!checked })}
                      />
                    </div>
                  </div>
                 </div>

                 {/* To Address */}
                 <div className="space-y-3">
                   <Label className="text-sm font-semibold text-slate-700">Til adresse *</Label>
                   <AddressAutocomplete
                     placeholder="Vejnavn 456, 5678 By"
                     value={formData.to_address}
                     onChange={(value) => setFormData({ ...formData, to_address: value })}
                   />
                   <div className="flex items-center gap-2 mt-4">
                     <span className="text-xs text-slate-600 font-medium">Parkering:</span>
                     <Input
                       type="number"
                       placeholder="15"
                       className="h-9 text-sm w-24"
                       value={formData.to_parking_distance}
                       onChange={(e) => setFormData({ ...formData, to_parking_distance: e.target.value })}
                     />
                     <span className="text-xs text-slate-500">meter</span>
                   </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="text-xs text-slate-600 font-medium">Etage</Label>
                      <Input
                        type="number"
                        className="h-9 text-sm mt-1"
                        value={formData.to_floor}
                        onChange={(e) => setFormData({ ...formData, to_floor: parseInt(e.target.value || '0', 10) })}
                      />
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <Label className="text-xs text-slate-600 font-medium">Elevator</Label>
                        <p className="text-[11px] text-slate-500">Tilgængelig ved levering</p>
                      </div>
                      <Switch
                        checked={!!formData.to_elevator}
                        onCheckedChange={(checked) => setFormData({ ...formData, to_elevator: !!checked })}
                      />
                    </div>
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
                       <div className="flex justify-between">
                         <span className="text-slate-600">Fra flyttefirma til afhentning:</span>
                         <span className="font-medium">{distance.fromCompanyToStart} km ({Math.round(distance.fromCompanyToStart / 60 * 60)} min)</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-slate-600">Fra afhentning til levering:</span>
                         <span className="font-medium">{distance.startToEnd} km ({Math.round(distance.startToEnd / 60 * 60)} min)</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-slate-600">Fra levering til flyttefirma:</span>
                         <span className="font-medium">{distance.endToCompanyReturn} km ({Math.round(distance.endToCompanyReturn / 60 * 60)} min)</span>
                       </div>
                       {!loadingDistance && !distanceData && (
                         <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                           <p className="text-xs text-red-700">Kunne ikke beregne afstand. Tjek venligst at begge adresser er indtastet korrekt.</p>
                         </div>
                       )}
                      <div className="flex justify-between font-semibold border-t border-slate-200 pt-2 mt-2">
                        <span>Total afstand:</span>
                        <span>{distance.total} km</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Total køretid:</span>
                        <span>{driveTimeMinutes} min ({pricing.driveTimeHours}t {Math.round((driveTimeMinutes % 60))}m)</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => setStep(2)}
                  disabled={!formData.from_address || !formData.to_address || loadingDistance || !distanceData}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  {loadingDistance ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Beregner afstand...
                    </>
                  ) : !distanceData && formData.from_address && formData.to_address ? (
                    <>
                      Kunne ikke beregne afstand
                    </>
                  ) : (
                    <>
                      Fortsæt til møbler
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Møbler */}
        {step === 2 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Vælg møbler</h2>
                <Button variant="outline" size="sm" className="gap-2">
                  <Mic className="w-4 h-4" />
                  Indtast møbler
                </Button>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-600">
                  <strong>Tilføj møbler via stemmeoptagelse</strong><br />
                  Gå en tur rundt i dit hjem og sig fx "1 spisebord, 6 stole, 4 flyttekasser" - nemt og hurtigt!
                </p>
              </div>

              <Accordion type="multiple" defaultValue={['0', '1']} className="mb-6">
                {furnitureCategories.map((category, categoryIndex) => {
                  const categoryCount = category.items.reduce((sum, item) => sum + (formData.furniture[item.id] || 0), 0);
                  
                  return (
                    <AccordionItem key={categoryIndex} value={categoryIndex.toString()}>
                      <AccordionTrigger className="text-base font-semibold hover:no-underline">
                        <div className="flex items-center gap-3">
                          <span>{category.name}</span>
                          {categoryCount > 0 && (
                            <Badge className="bg-indigo-100 text-indigo-700">
                              {categoryCount} {categoryCount === 1 ? 'stk' : 'stk'}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {category.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-200 transition-all">
                              <div className="flex-1">
                                <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                                <p className="text-xs text-slate-500">{item.volume} m³</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleFurnitureChange(item.id, -1)}
                                  disabled={(formData.furniture[item.id] || 0) === 0}
                                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center transition-all"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-8 text-center font-semibold">{formData.furniture[item.id] || 0}</span>
                                <button
                                  onClick={() => handleFurnitureChange(item.id, 1)}
                                  className="w-8 h-8 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center justify-center transition-all"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900">Samlet volumen:</span>
                  <span className="text-2xl font-bold text-indigo-600">{calculateTotalVolume()} m³</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="h-12 flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tilbage
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={calculateTotalVolume() === 0}
                  className="h-12 flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Se pris
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Tilbud */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Heavy items + fees */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Specielle genstande</h3>
                  <p className="text-xs text-slate-500">Bruges til at beregne evt. tunge-løft tillæg.</p>
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Over 80 kg (antal)</Label>
                      <Input
                        type="number"
                        min="0"
                        className="mt-2 h-11"
                        value={formData.heavy_80_count}
                        onChange={(e) => setFormData({ ...formData, heavy_80_count: parseInt(e.target.value || '0', 10) })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Over 150 kg (antal)</Label>
                      <Input
                        type="number"
                        min="0"
                        className="mt-2 h-11"
                        value={formData.heavy_150_count}
                        onChange={(e) => setFormData({ ...formData, heavy_150_count: parseInt(e.target.value || '0', 10) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="font-semibold text-slate-900 mb-2">Tillæg</h3>
                  <p className="text-xs text-slate-500">Vælg de relevante tillæg. De bliver vist tydeligt i tilbuddet.</p>

                  <div className="space-y-3 mt-4">
                    {Array.isArray(pricingConfig?.fees) && pricingConfig.fees.filter(f => f && f.enabled !== false).length > 0 ? (
                      pricingConfig.fees
                        .filter((fee) => fee && fee.enabled !== false)
                        .map((fee) => {
                          const defaultChecked = !!(fee.default_selected || fee.required || fee.auto_apply);
                          const checked = formData.selected_fees?.hasOwnProperty(fee.fee_name)
                            ? !!formData.selected_fees[fee.fee_name]
                            : defaultChecked;

                          return (
                            <label key={fee.fee_name} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white cursor-pointer">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{fee.fee_name}</p>
                                <p className="text-xs text-slate-500">
                                  {fee.fee_type === 'percent' ? `${fee.fee_value}%` : `${fee.fee_value} kr`}
                                  {fee.required ? ' • Påkrævet' : ''}
                                </p>
                              </div>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const next = { ...(formData.selected_fees || {}) };
                                  next[fee.fee_name] = !!v;
                                  setFormData({ ...formData, selected_fees: next });
                                }}
                              />
                            </label>
                          );
                        })
                    ) : (
                      <p className="text-sm text-slate-500">Ingen tillæg er aktiveret af flyttefirmaet.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Furniture Summary */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Møbler
                </h3>
                <div className="space-y-2">
                  {Object.entries(formData.furniture)
                    .filter(([_, qty]) => qty > 0)
                    .map(([itemId, qty]) => {
                      const item = furnitureItems.find(f => f.id === itemId);
                      return (
                        <div key={itemId} className="flex justify-between text-sm">
                          <span className="text-slate-600">{item?.name} x {qty}</span>
                          <span className="font-medium">{(item.volume * qty).toFixed(2)} m³</span>
                        </div>
                      );
                    })}
                  <div className="flex justify-between font-semibold border-t border-slate-200 pt-2 mt-2">
                    <span>Samlet volumen:</span>
                    <span>{calculateTotalVolume()} m³</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Breakdown */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Prisberegning</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Estimeret volumen:</span>
                    <span className="font-medium">{pricing.breakdown?.volume_m3} m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Medarbejdere:</span>
                    <span className="font-medium">{pricing.breakdown?.crew}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Estimeret tid:</span>
                    <span className="font-medium">{pricing.breakdown?.time?.labor_hours} timer</span>
                  </div>

                  <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Arbejde:</span>
                      <span className="font-medium">{pricing.breakdown?.prices?.labor_price?.toLocaleString('da-DK')} kr</span>
                    </div>

                    {pricing.breakdown?.meta?.transport_mode === 'price_per_km_roundtrip' ? (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Transport ({distance.total} km):</span>
                        <span className="font-medium">{pricing.breakdown?.prices?.transport_price?.toLocaleString('da-DK')} kr</span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Transporttid ({Math.round(driveTimeMinutes)} min) inkluderet</span>
                        <span className="font-medium">—</span>
                      </div>
                    )}

                    {(pricing.breakdown?.prices?.heavy_fee || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tunge genstande:</span>
                        <span className="font-medium">{pricing.breakdown?.prices?.heavy_fee?.toLocaleString('da-DK')} kr</span>
                      </div>
                    )}

                    {Array.isArray(pricing.breakdown?.fees) && pricing.breakdown.fees.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Tillæg</p>
                        <div className="space-y-1">
                          {pricing.breakdown.fees.map((f) => (
                            <div key={f.fee_name} className="flex justify-between">
                              <span className="text-slate-600">{f.fee_name}:</span>
                              <span className="font-medium">{Number(f.amount || 0).toLocaleString('da-DK')} kr</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pricing.breakdown?.time?.buffer?.type && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Buffer ({pricing.breakdown.time.buffer.type === 'minutes' ? `${pricing.breakdown.time.buffer.value} min` : `${pricing.breakdown.time.buffer.value}%`}):</span>
                        <span className="font-medium">inkluderet</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Price */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xl font-semibold">Total:</span>
                <span className="text-4xl font-black">{pricing.total.toLocaleString('da-DK')} kr</span>
              </div>
              <div className="flex justify-between text-sm text-slate-300">
                <span>Heraf moms (25%):</span>
                <span>{pricing.vat.toLocaleString('da-DK')} kr</span>
              </div>
            </div>

            {/* Actions */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Hvad vil du gøre med dit tilbud?</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  <Button
                    onClick={() => setBookingDialogOpen(true)}
                    className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    Acceptér og book
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-14"
                    onClick={() => setEmailDialogOpen(true)}
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Send tilbud på mail
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-14"
                    onClick={() => setCallbackDialogOpen(true)}
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Ring mig op
                  </Button>
                </div>
                
                <Button
                  onClick={() => setStep(2)}
                  variant="ghost"
                  className="w-full mt-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tilbage til møbler
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Send tilbud på mail</DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-slate-600">
            Indtast dine kontaktoplysninger, så sender vi dig tilbuddet på mail. Vi kontakter dig også for at gennemgå detaljerne.
          </p>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-semibold">Dit navn</Label>
              <Input
                placeholder="Dit fulde navn"
                className="mt-2 h-11"
                value={contactData.name}
                onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Din email adresse</Label>
              <Input
                type="email"
                placeholder="din@email.dk"
                className="mt-2 h-11"
                value={contactData.email}
                onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Telefon</Label>
              <Input
                placeholder="12 34 56 78"
                className="mt-2 h-11"
                value={contactData.phone}
                onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Fortryd
            </Button>
            <Button
              onClick={() => sendEmailMutation.mutate()}
              disabled={sendEmailMutation.isPending || !contactData.name || !contactData.email}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {sendEmailMutation.isPending ? (
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

      {/* Callback Dialog */}
      <Dialog open={callbackDialogOpen} onOpenChange={setCallbackDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Ring mig op</DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-slate-600">
            Indtast dine kontaktoplysninger, så ringer vi dig op hurtigst muligt for at gennemgå tilbuddet.
          </p>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-semibold">Dit navn</Label>
              <Input
                placeholder="Dit fulde navn"
                className="mt-2 h-11"
                value={contactData.name}
                onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Telefon *</Label>
              <Input
                placeholder="12 34 56 78"
                className="mt-2 h-11"
                value={contactData.phone}
                onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Din email adresse (valgfrit)</Label>
              <Input
                type="email"
                placeholder="din@email.dk"
                className="mt-2 h-11"
                value={contactData.email}
                onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCallbackDialogOpen(false)}>
              Fortryd
            </Button>
            <Button
              onClick={() => requestCallbackMutation.mutate()}
              disabled={requestCallbackMutation.isPending || !contactData.name || !contactData.phone}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {requestCallbackMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sender anmodning...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Ring mig op
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Acceptér og book</DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-slate-600">
            Vælg din ønskede start dato og tid for flytningen. Du modtager en bekræftelse på din mail. Vi gennemgår alle accepterede tilbud manuelt og kontakter dig for at bekræfte den endelige tid og hvis vi har spørgsmål.
          </p>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-semibold">Tidspunkt</Label>
              <select
                className="w-full mt-2 h-11 rounded-lg border border-slate-300 px-3 text-sm bg-white"
                value={bookingData.time_slot}
                onChange={(e) => setBookingData({ ...bookingData, time_slot: e.target.value })}
              >
                <option value="08:00-10:00">08:00 til 10:00</option>
                <option value="10:00-12:00">10:00 til 12:00</option>
                <option value="12:00-14:00">12:00 til 14:00</option>
                <option value="14:00-16:00">14:00 til 16:00</option>
                <option value="16:00-18:00">16:00 til 18:00</option>
              </select>
            </div>

            <div>
              <Label className="text-sm font-semibold">Dato</Label>
              <Input
                type="date"
                className="mt-2 h-11"
                value={bookingData.preferred_date}
                onChange={(e) => setBookingData({ ...bookingData, preferred_date: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Din email adresse</Label>
              <Input
                type="email"
                placeholder="din@email.dk"
                className="mt-2 h-11"
                value={bookingData.customer_email}
                onChange={(e) => setBookingData({ ...bookingData, customer_email: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Dit navn</Label>
              <Input
                placeholder="Dit fulde navn"
                className="mt-2 h-11"
                value={bookingData.customer_name}
                onChange={(e) => setBookingData({ ...bookingData, customer_name: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Telefon</Label>
              <Input
                placeholder="12 34 56 78"
                className="mt-2 h-11"
                value={bookingData.customer_phone}
                onChange={(e) => setBookingData({ ...bookingData, customer_phone: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">CVR-nummer (valgfrit)</Label>
              <Input
                placeholder="Virksomhedens CVR-nummer"
                className="mt-2 h-11"
                value={bookingData.cvr}
                onChange={(e) => setBookingData({ ...bookingData, cvr: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Evt. bemærkninger</Label>
              <Textarea
                placeholder="Skriv hvis der er ting, vi skal være opmærksomme på ifbm flytningen..."
                className="mt-2 min-h-24"
                value={bookingData.notes}
                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
              Fortryd
            </Button>
            <Button
              onClick={() => bookNowMutation.mutate()}
              disabled={bookNowMutation.isPending || !bookingData.customer_name || !bookingData.customer_email || !bookingData.customer_phone || !bookingData.preferred_date}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {bookNowMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booker...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Acceptér og book
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}