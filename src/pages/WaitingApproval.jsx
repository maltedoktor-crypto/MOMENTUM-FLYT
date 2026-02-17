import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Mail, LogOut } from "lucide-react";
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

export default function WaitingApproval() {
  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Login'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-xl border-0 text-center">
        <CardHeader className="space-y-4 pb-8">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <CardTitle className="text-3xl font-bold">Afventer godkendelse</CardTitle>
          <CardDescription className="text-base">
            Din konto er under behandling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3 text-left">
              <Mail className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Vi er på sagen</h3>
                <p className="text-sm text-slate-600">
                  Vores team gennemgår din ansøgning. Du vil modtage en email, så snart din konto er godkendt.
                </p>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500">
                Dette tager typisk 1-2 hverdage. Har du spørgsmål? Kontakt os på support@momentum.dk
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full h-12 border-slate-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log ud
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}