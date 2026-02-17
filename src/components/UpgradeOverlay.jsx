import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Crown, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function UpgradeOverlay({ requiredPlan, currentPlan, feature, onClose }) {
  const navigate = useNavigate();
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="max-w-md mx-4 border-0 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Opgrader for at få adgang</CardTitle>
          <CardDescription className="text-base mt-2">
            {feature} er tilgængelig fra {requiredPlan} planen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-indigo-600" />
              <p className="font-semibold text-slate-900">Din nuværende plan: {currentPlan || 'Ingen'}</p>
            </div>
            <p className="text-sm text-slate-600">
              Opgrader til {requiredPlan} for at få adgang til denne funktion
            </p>
          </div>

          <div className="space-y-2">
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                onClose();
                navigate(createPageUrl("Settings") + "?tab=subscription");
              }}
            >
              <Crown className="w-4 h-4 mr-2" />
              Se planer og opgrader
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                onClose();
                navigate(createPageUrl("Dashboard"));
              }}
            >
              Luk
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}