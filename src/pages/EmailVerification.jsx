import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Loader2 } from "lucide-react";
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function EmailVerification() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [code, setCode] = useState('');
  const email = sessionStorage.getItem('user_email') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify OTP - this automatically logs the user in
      const verifyResult = await base44.auth.verifyOtp({
        email: email,
        otpCode: code
      });

      console.log('OTP verified:', verifyResult);

      // Finalize user setup with company_id
      const companyId = sessionStorage.getItem('pending_company_id');
      console.log('Company ID from session:', companyId);
      
      if (companyId && verifyResult.id) {
        try {
          await base44.functions.invoke('finalizUserSetup', { 
            company_id: companyId,
            user_id: verifyResult.id 
          });
        } catch (setupErr) {
          console.error('Error finalizing user setup:', setupErr);
          toast.error('Kunne ikke færdiggjøre kontooprætelse. Kontakt support.');
          setLoading(false);
          return;
        }
      }

      // Clear session storage
      sessionStorage.removeItem('pending_company_id');
      sessionStorage.removeItem('user_email');
      sessionStorage.removeItem('temp_password');
      
      // Redirect to dashboard immediately
      window.location.href = createPageUrl('Dashboard');
    } catch (err) {
      console.error('Verification error:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response
      });
      toast.error('Fejl: ' + (err.message || 'Ugyldig eller udløbet kode. Prøv igen.'));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await base44.auth.resendOtp(email);
      toast.success('Ny kode sendt! Tjek din email.');
    } catch (err) {
      toast.error('Kunne ikke sende ny kode. Prøv igen.');
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-2 pb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Bekræft din email</CardTitle>
          <CardDescription className="text-base">
            Vi har sendt en 6-cifret kode til<br/>
            <span className="font-medium text-slate-700">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Verifikationskode</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                required
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bekræfter...
                </>
              ) : (
                'Bekræft email'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                {resending ? 'Sender...' : 'Send ny kode'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}