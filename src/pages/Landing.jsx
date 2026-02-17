import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowRight, 
  Calendar, 
  FileText, 
  Users, 
  Truck, 
  CheckCircle2, 
  BarChart3,
  Shield,
  Zap,
  Globe,
  MapPin,
  Send,
  Briefcase
} from "lucide-react";
import { base44 } from '@/api/base44Client';
import { createPageUrl } from "@/utils";
import DemoQuoteForm from "@/components/DemoQuoteForm";
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function Landing() {
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [demoFormData, setDemoFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    message: ''
  });

  // Check if user is authenticated
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        setIsAuthenticated(isAuth);
      } catch (e) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const demoRequestMutation = useMutation({
    mutationFn: async () => {
      const request = await base44.entities.DemoRequest.create({
        ...demoFormData,
        status: 'new'
      });

      await base44.integrations.Core.SendEmail({
        to: 'maltedoktor1@gmail.com',
        subject: `Ny demo-anmodning fra ${demoFormData.company_name}`,
        body: `
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
        .message-box { background: #f8fafc; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .message-content { color: #475569; line-height: 1.7; white-space: pre-wrap; word-wrap: break-word; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .timestamp { font-size: 12px; color: #94a3b8; margin-top: 20px; }
        .logo { display: inline-block; font-weight: 700; color: white; font-size: 18px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="margin-bottom: 20px;">
                <span class="logo">M</span>
            </div>
            <h1>Ny Demo-Anmodning</h1>
            <p>En interessent har anmodet om en demo</p>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">Kontaktoplysninger</div>
                
                <div class="info-box">
                    <div class="info-label">Navn</div>
                    <div class="info-value">${demoFormData.name}</div>
                </div>
                
                <div class="info-box">
                    <div class="info-label">Virksomhed</div>
                    <div class="info-value">${demoFormData.company_name}</div>
                </div>
                
                <div class="info-box">
                    <div class="info-label">Email</div>
                    <div class="info-value"><a href="mailto:${demoFormData.email}" style="color: #4f46e5; text-decoration: none;">${demoFormData.email}</a></div>
                </div>
                
                ${demoFormData.phone ? `
                <div class="info-box">
                    <div class="info-label">Telefon</div>
                    <div class="info-value"><a href="tel:${demoFormData.phone.replace(/\\s/g, '')}" style="color: #4f46e5; text-decoration: none;">${demoFormData.phone}</a></div>
                </div>
                ` : ''}
            </div>

            ${demoFormData.message ? `
            <div class="section">
                <div class="section-title">Besked</div>
                <div class="message-box">
                    <div class="message-content">${demoFormData.message}</div>
                </div>
            </div>
            ` : ''}

            <div class="section" style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: center;">
                <a href="mailto:${demoFormData.email}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Svar på anmodning</a>
            </div>
        </div>

        <div class="footer">
            <p>MOMENTUM Demo Anmodninger</p>
            <p class="timestamp">Modtaget: ${new Date().toLocaleString('da-DK')}</p>
        </div>
    </div>
</body>
</html>
        `
      });

      return request;
    },
    onSuccess: () => {
      toast.success('Tak! Vi kontakter dig snarest.');
      setDemoDialogOpen(false);
      setDemoFormData({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        message: ''
      });
    },
    onError: () => {
      toast.error('Der skete en fejl. Prøv venligst igen.');
    }
  });

  const features = [
    {
      icon: FileText,
      title: "Intelligent Tilbudsgenerator",
      description: "Opret professionelle tilbud på minutter. Automatisk prisberegning baseret på din prismodel."
    },
    {
      icon: Calendar,
      title: "Integreret Planlægning",
      description: "Accepterede tilbud bliver automatisk til jobs i din kalender. Fuld oversigt over din kapacitet."
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Tildel teams og køretøjer til jobs. Hold styr på hvem der er hvor, og hvornår."
    },
    {
      icon: Truck,
      title: "Ressourcestyring",
      description: "Administrer din flåde af køretøjer og undgå dobbeltbookinger med smart kapacitetsstyring."
    },
    {
      icon: BarChart3,
      title: "Indsigt & Rapporter",
      description: "Få overblik over din forretning med dashboards og nøgletal i realtid."
    },
    {
      icon: Globe,
      title: "Kundeportal",
      description: "Dine kunder kan se og acceptere tilbud online. Professionelt og nemt."
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "799",
      period: "kr/md",
      description: "Til mindre flyttefirmaer",
      features: [
        "Manuelle tilbud",
        "Tilbudsgenerator",
        "Offentlige tilbudsanmodninger",
        "Kundeadministration",
        "Email support"
      ]
    },
    {
      name: "Enterprise",
      price: "Fra 2.000",
      period: "kr/md",
      description: "Til alle funktioner",
      features: [
        "Alt fra Starter",
        "Kalender & planlægning",
        "Team & ressourcestyring",
        "Analytics & rapporter",
        "Prioriteret support"
      ],
      highlighted: true
    },
    {
      name: "Onboarding",
      price: "Skræddersyet",
      period: "",
      description: "Tilpasset efter opgavens omfang",
      features: [
        "Systemopsætning og konfiguration",
        "Datamigrering fra eksisterende systemer",
        "Bruger- og teamopsætning",
        "Tilpasset prismodel og workflows",
        "Træning for hele dit team"
      ],
      isOnboarding: true
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href={createPageUrl('Landing')} className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">MOMENTUM</span>
          </a>

          <div className="flex items-center gap-4">
            <a href="#features" className="hidden md:block text-slate-600 hover:text-slate-900 transition-colors">Funktioner</a>
            <a href="#pricing" className="hidden md:block text-slate-600 hover:text-slate-900 transition-colors">Priser</a>
            <a href="#contact" className="hidden md:block text-slate-600 hover:text-slate-900 transition-colors">Kontakt</a>
            <a href={createPageUrl('UserLogin')}>
              <Button 
                variant="ghost" 
                className="text-slate-600 hover:text-slate-900"
              >
                Log ind
              </Button>
            </a>
            <a href={createPageUrl('CompanySignup')} className="hidden md:block">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                Kom i gang
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Bygget til moderne flyttefirmaer
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                Den komplette platform til{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  flyttefirmaer
                </span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Automatiser tilbudsgivning, planlæg ressourcer effektivt og lever en professionel kundeoplevelse.
                Alt du behøver til at drive dit flyttefirma – samlet ét sted.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <a href={createPageUrl('CompanySignup')}>
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-14 text-lg w-full sm:w-auto">
                    Kom i gang gratis
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </a>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-14 text-lg px-8 border-slate-300"
                  onClick={() => setDemoDialogOpen(true)}
                >
                  Book demo
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  Ingen kreditkort krævet
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Opsig når som helst
                </div>
              </div>
            </div>
            <div className="relative">
              <DemoQuoteForm />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Alt hvad dit flyttefirma har brug for
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Fra første kundehenvendelse til afsluttet job – MOMENTUM håndterer hele flowet.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow bg-white">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <BarChart3 className="w-4 h-4" />
              Fleksible priser
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Skræddersyet til din virksomhed
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Prisen tilpasses efter dit behov og antal brugere. Ingen skjulte omkostninger.
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative border-0 transition-all duration-300 hover:scale-105 ${
                  plan.highlighted 
                    ? 'shadow-2xl shadow-indigo-200/50 ring-2 ring-indigo-500 lg:scale-105' 
                    : plan.isOnboarding
                    ? 'shadow-xl shadow-slate-200/50 bg-gradient-to-br from-slate-50 to-white'
                    : 'shadow-xl shadow-slate-200/50'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-5 left-0 right-0 flex justify-center">
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                      Mest populær
                    </div>
                  </div>
                )}
                {plan.isOnboarding && (
                  <div className="absolute -top-5 left-0 right-0 flex justify-center">
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" />
                      Professionel setup
                    </div>
                  </div>
                )}
                <CardContent className={`p-8 ${plan.isOnboarding ? 'pt-12' : ''}`}>
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                    <p className="text-slate-600 text-sm">{plan.description}</p>
                  </div>
                  
                  <div className="text-center mb-8">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className={`text-5xl font-black ${
                        plan.isOnboarding 
                          ? 'text-slate-700' 
                          : 'bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent'
                      }`}>
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-slate-500 text-lg font-medium">{plan.period}</span>
                      )}
                    </div>
                    {plan.period && (
                      <p className="text-xs text-slate-500 mt-2">Prisen afhænger af antal brugere</p>
                    )}
                    {plan.isOnboarding && (
                      <p className="text-xs text-slate-500 mt-2">Individuelt forhandlet baseret på virksomhedens behov</p>
                    )}
                  </div>

                  <button 
                   onClick={() => {
                     if (plan.isOnboarding) {
                       setDemoDialogOpen(true);
                     } else if (plan.period) {
                       // Handle subscription plan click
                       if (!isAuthenticated) {
                         // Redirect to login
                         window.location.href = createPageUrl('UserLogin');
                       } else {
                         // User is logged in, initiate checkout
                         const priceId = plan.name === 'Starter' 
                           ? 'price_1T091uEhfL10WmXc3ossclnq'
                           : 'price_1T0942EhfL10WmXcZ63sji1x';
                         // This will be handled by layout's handleSubscribe
                         window.location.href = createPageUrl('Dashboard') + `?plan=${plan.name}&priceId=${priceId}`;
                       }
                     } else {
                       setDemoDialogOpen(true);
                     }
                   }}
                   disabled={checkoutLoading}
                   className={`w-full mb-8 h-12 font-semibold rounded-lg transition-all ${
                     plan.isOnboarding
                       ? 'bg-slate-900 hover:bg-slate-800 text-white'
                       : plan.highlighted 
                         ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200' 
                         : 'bg-slate-900 hover:bg-slate-800 text-white'
                   }`}
                  >
                   {plan.isOnboarding ? 'Få pristilbud' : plan.period ? 'Start gratis prøveperiode' : 'Kontakt os'}
                  </button>

                  <div className="space-y-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Inkluderet:
                    </div>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${
                            plan.isOnboarding ? 'text-slate-600' : 'text-green-600'
                          }`} />
                        </div>
                        <span className="text-slate-700 text-sm leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <p className="text-slate-600 mb-4">
              Har du brug for en tilpasset løsning?
            </p>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setDemoDialogOpen(true)}
              className="border-slate-300 hover:bg-slate-50"
            >
              Tal med os om dine behov
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Har du spørgsmål?
            </h2>
            <p className="text-xl text-slate-600">
              Vi er her for at hjælpe. Kontakt os for mere information eller book en demo.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-2xl mx-auto">
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-7 h-7 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Email</h3>
                <a href="mailto:maltedoktor1@gmail.com" className="text-indigo-600 hover:text-indigo-700 text-sm">maltedoktor1@gmail.com</a>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Telefon</h3>
                <a href="tel:+4526353317" className="text-indigo-600 hover:text-indigo-700 text-sm">+45 26 35 33 17</a>
              </CardContent>
            </Card>
          </div>
          <div className="text-center">
            <Button 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 h-14 px-10 text-lg"
              onClick={() => setDemoDialogOpen(true)}
            >
              Book demo
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-xl font-bold text-white tracking-tight">MOMENTUM</span>
              </div>
              <p className="text-sm leading-relaxed">
                Den moderne platform for flyttefirmaer. Tilbud, planlægning og kundestyring – samlet ét sted.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Funktioner</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Priser</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrationer</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Hjælpecenter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Kontakt os</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Virksomhed</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Om os</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privatlivspolitik</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Vilkår</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-sm text-center">
            © 2024 MOMENTUM. Alle rettigheder forbeholdes.
          </div>
        </div>
      </footer>

      {/* Demo Request Dialog */}
      <Dialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Book en demo</DialogTitle>
            <DialogDescription>
              Udfyld formularen nedenfor, så kontakter vi dig hurtigst muligt for at opsætte en personlig demo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-semibold">Dit navn *</Label>
              <Input
                placeholder="Fornavn Efternavn"
                className="mt-2 h-11"
                value={demoFormData.name}
                onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Virksomhedsnavn *</Label>
              <Input
                placeholder="Navn på dit flyttefirma"
                className="mt-2 h-11"
                value={demoFormData.company_name}
                onChange={(e) => setDemoFormData({ ...demoFormData, company_name: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Email *</Label>
              <Input
                type="email"
                placeholder="din@email.dk"
                className="mt-2 h-11"
                value={demoFormData.email}
                onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Telefon</Label>
              <Input
                placeholder="12 34 56 78"
                className="mt-2 h-11"
                value={demoFormData.phone}
                onChange={(e) => setDemoFormData({ ...demoFormData, phone: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Besked (valgfrit)</Label>
              <Textarea
                placeholder="Fortæl os lidt om dine behov..."
                className="mt-2 min-h-20"
                value={demoFormData.message}
                onChange={(e) => setDemoFormData({ ...demoFormData, message: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setDemoDialogOpen(false)}
              className="flex-1"
            >
              Annuller
            </Button>
            <Button
              onClick={() => demoRequestMutation.mutate()}
              disabled={demoRequestMutation.isPending || !demoFormData.name || !demoFormData.email || !demoFormData.company_name}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
            >
              {demoRequestMutation.isPending ? (
                'Sender...'
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send anmodning
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}