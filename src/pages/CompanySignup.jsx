import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function CompanySignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    cvr: '',
    password: ''
  });

  // Store password for later use
  const storePassword = (password) => {
    sessionStorage.setItem('temp_password', password);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Store password temporarily
      storePassword(formData.password);
      
      // Register user account (only send supported fields)
      await base44.auth.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.contact_name
      });

      // Create company
      const company = await base44.entities.Company.create({
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone,
        cvr: formData.cvr || null,
        subscription_status: 'trialing',
        subscription_plan: null
      });

      // Store company_id and email temporarily for finalization after email verification
      sessionStorage.setItem('pending_company_id', company.id);
      sessionStorage.setItem('user_email', formData.email);

      toast.success('Tjek din email for at bekræfte din konto');
      
      // Redirect to email verification page
      navigate(createPageUrl('EmailVerification'));
    } catch (err) {
      console.error('Signup error:', err);
      const errorMsg = err.message || 'Der opstod en fejl. Prøv venligst igen.';
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <CardHeader className="text-center space-y-2 pb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Opret virksomhedskonto</CardTitle>
          <CardDescription className="text-base">
            Kom i gang med Momentum - én konto per virksomhed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company_name">Virksomhedsnavn *</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="Eks. FlyttePartner ApS"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_name">Kontaktperson *</Label>
                <Input
                  id="contact_name"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  placeholder="Dit fulde navn"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="kontakt@firma.dk"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+45 12 34 56 78"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cvr">CVR-nummer (valgfrit)</Label>
              <Input
                id="cvr"
                name="cvr"
                value={formData.cvr}
                onChange={handleChange}
                placeholder="12345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Adgangskode *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mindst 8 tegn"
                required
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Opretter konto...
                </>
              ) : (
                'Opret konto'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}