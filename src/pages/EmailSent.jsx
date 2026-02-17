import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, CheckCircle2 } from "lucide-react";
import { createPageUrl } from '@/utils';

export default function EmailSent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-xl border-0 text-center">
        <CardHeader className="space-y-4 pb-8">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-indigo-600" />
          </div>
          <CardTitle className="text-3xl font-bold">Tjek din email</CardTitle>
          <CardDescription className="text-base">
            Vi har sendt en invitation til din email-adresse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-6 text-left space-y-3">
            <h3 className="font-semibold text-slate-900">Hvad sker der nu?</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Åbn emailen og klik på linket for at oprette din adgangskode</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Din konto vil være i afventning af godkendelse</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Du får besked når din konto er godkendt og klar til brug</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-slate-500">
            Har du ikke modtaget emailen? Tjek din spam-mappe eller kontakt support@momentum.dk
          </p>

          <a 
            href={createPageUrl('Landing')} 
            className="inline-block text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            ← Tilbage til forsiden
          </a>
        </CardContent>
      </Card>
    </div>
  );
}