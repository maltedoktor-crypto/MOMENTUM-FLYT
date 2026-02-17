import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogIn, Loader2 } from "lucide-react";
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

export default function UserLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.auth.loginViaEmailPassword(formData.email, formData.password);
      
      toast.success('Logget ind!');
      
      // Redirect to dashboard
      window.location.href = createPageUrl('Dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setLoading(false);
      
      // Show appropriate error message
      if (err.message?.includes('verify your email')) {
        // Store email and redirect to verification page
        sessionStorage.setItem('user_email', formData.email);
        setError('Du skal bekræfte din email først');
        setTimeout(() => {
          navigate(createPageUrl('EmailVerification'));
        }, 2000);
      } else {
        setError('Forkert email eller adgangskode');
      }
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await base44.auth.resetPasswordRequest(resetEmail);
      toast.success('Check din email for link til nulstilling af adgangskode');
      setResetMode(false);
      setResetEmail('');
    } catch (err) {
      toast.error('Kunne ikke sende nulstillings-link');
    } finally {
      setResetLoading(false);
    }
  };

  if (resetMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center space-y-2 pb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">Nulstil adgangskode</CardTitle>
            <CardDescription className="text-base">
              Skriv din email for at modtage nulstillings-link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="din@email.dk"
                  required
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sender...
                  </>
                ) : (
                  'Send nulstillings-link'
                )}
              </Button>

              <div className="text-center pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Tilbage til login
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-2 pb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Log ind</CardTitle>
          <CardDescription className="text-base">
            Log ind på din virksomhedskonto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="din@email.dk"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Adgangskode</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Din adgangskode"
                required
                autoComplete="current-password"
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
                  Logger ind...
                </>
              ) : (
                'Log ind'
              )}
            </Button>

            <div className="text-center pt-4 border-t border-slate-200 space-y-2">
              <p className="text-sm text-slate-600">
                Har du ikke en konto?{' '}
                <Link to={createPageUrl('CompanySignup')} className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Opret konto
                </Link>
              </p>
              <button
                type="button"
                onClick={() => setResetMode(true)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Glemt adgangskode?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}