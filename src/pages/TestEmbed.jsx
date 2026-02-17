import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check } from 'lucide-react';

export default function TestEmbed() {
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  const appUrl = window.location.origin;
  const iframeUrl = token ? `${appUrl}/EmbedQuote?token=${token}` : '';
  const iframeCode = `<iframe 
  src="${iframeUrl}" 
  width="100%" 
  height="800"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Token Input Card - Fixed at top */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Embed Token</label>
              <Input
                placeholder="Indsæt embed token her..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            {token && (
              <Button 
                onClick={copyToClipboard}
                variant="outline"
                className="flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Kopieret!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Kopier kode
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Example Moving Company Website */}
      <div className="max-w-6xl mx-auto py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ProFlytning</h1>
          <p className="text-xl text-gray-600">Din pålidelige flyttepartner siden 2015</p>
        </div>

        {/* Hero section */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg shadow-sm p-12 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-4">Få et tilbud på din flytning</h2>
          <p className="text-lg mb-6 opacity-90">Udfyld formularen nedenfor og få et konkret tilbud inden for få minutter</p>
        </div>

        {/* Embed Form */}
        {token ? (
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <iframe 
                src={iframeUrl}
                width="100%" 
                height="1000"
                frameBorder="0"
                style={{ border: 'none' }}
                title="Flytning Tilbudformular"
              />
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-8 text-center">
            <p className="text-blue-900">Indsæt en token ovenfor for at se formularen her</p>
          </div>
        )}

        {/* Footer info */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Hvorfor vælge os?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">🚚 Pålideligt hold</h4>
              <p className="text-gray-600">Erfaret personale der behandler dine ejendele med omhu</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">💰 Fair priser</h4>
              <p className="text-gray-600">Transparente tilbud uden skjulte gebyrer</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">⏱️ Hurtig service</h4>
              <p className="text-gray-600">Vi tilbyder fleksible tider, også weekender</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}