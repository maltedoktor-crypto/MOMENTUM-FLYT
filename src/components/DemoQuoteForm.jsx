import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddressAutocomplete from "./AddressAutocomplete";
import { 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Plus,
  Minus,
  Package
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Furniture categories
const furnitureCategories = [
  {
    name: 'Soveværelse',
    items: [
      { id: 'dobbeltsen', name: 'Dobbeltseng (180x200)', volume: 3.5 },
      { id: 'seng', name: 'Enkeltseng (90x200)', volume: 2.5 },
      { id: 'natbord', name: 'Natbord', volume: 0.4 },
      { id: 'klædeskab', name: 'Garderobeskab (stor)', volume: 4.5 },
    ]
  },
  {
    name: 'Stue',
    items: [
      { id: 'sofa3', name: '3-personers sofa', volume: 4.4 },
      { id: 'sofa2', name: '2-personers sofa', volume: 3.2 },
      { id: 'sofabord', name: 'Sofabord', volume: 1.1 },
      { id: 'tv_bord', name: 'TV-bord', volume: 1.5 },
    ]
  },
  {
    name: 'Køkken',
    items: [
      { id: 'køleskab', name: 'Køleskab', volume: 1.5 },
      { id: 'spisebord', name: 'Spisebord', volume: 2.5 },
      { id: 'spisebordsstol', name: 'Spisebordsstol', volume: 0.6 },
    ]
  },
];

const furnitureItems = furnitureCategories.flatMap(cat => cat.items);

export default function DemoQuoteForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    from_address: 'Skaldehøjvej 32, 8800 Viborg',
    to_address: '',
    furniture: {},
  });

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

  const calculatePricing = () => {
    const volume = calculateTotalVolume();
    const distance = 45; // Demo distance
    
    const transportCost = Math.round(distance * 6);
    const driveTimeCost = Math.round((45/60) * 650);
    const volumeCost = Math.round(volume * 320);
    
    const subtotal = transportCost + driveTimeCost + volumeCost;
    const vat = Math.round(subtotal * 0.25);
    const total = subtotal + vat;

    return {
      transportCost,
      driveTimeCost,
      volumeCost,
      volume,
      subtotal,
      vat,
      total,
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

  const pricing = calculatePricing();

  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden max-h-[600px] overflow-y-auto">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-2 text-xs text-slate-500">Demo Tilbudsgenerator</span>
      </div>
      
      <div className="p-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-2 text-xs">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'} font-semibold`}>
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'} font-semibold`}>
              {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'} font-semibold`}>
              3
            </div>
          </div>
        </div>

        {/* Step 1: Adresser */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Adresser</h3>
            
            <div>
              <Label className="text-xs font-medium text-slate-700 mb-1 block">Fra adresse</Label>
              <Input
                placeholder="Kirkevej 12, 8000 Aarhus"
                value={formData.from_address}
                onChange={(e) => setFormData({ ...formData, from_address: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 mb-1 block">Til adresse</Label>
              <Input
                placeholder="Nørregade 45, 8000 Aarhus"
                value={formData.to_address}
                onChange={(e) => setFormData({ ...formData, to_address: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!formData.from_address || !formData.to_address}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-sm"
            >
              Fortsæt til møbler
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Møbler */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Vælg møbler</h3>

            <Accordion type="multiple" defaultValue={['0', '1']} className="text-sm">
              {furnitureCategories.map((category, categoryIndex) => {
                const categoryCount = category.items.reduce((sum, item) => sum + (formData.furniture[item.id] || 0), 0);
                
                return (
                  <AccordionItem key={categoryIndex} value={categoryIndex.toString()}>
                    <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span>{category.name}</span>
                        {categoryCount > 0 && (
                          <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                            {categoryCount}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {category.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 text-xs">{item.name}</p>
                              <p className="text-xs text-slate-500">{item.volume} m³</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleFurnitureChange(item.id, -1)}
                                disabled={(formData.furniture[item.id] || 0) === 0}
                                className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center text-xs border border-slate-200"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-semibold text-sm">{formData.furniture[item.id] || 0}</span>
                              <button
                                onClick={() => handleFurnitureChange(item.id, 1)}
                                className="w-6 h-6 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs"
                              >
                                <Plus className="w-3 h-3" />
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

            <div className="bg-indigo-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-900">Samlet volumen:</span>
                <span className="text-xl font-bold text-indigo-600">{calculateTotalVolume()} m³</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="h-10 flex-1 text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tilbage
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={calculateTotalVolume() === 0}
                className="h-10 flex-1 bg-indigo-600 hover:bg-indigo-700 text-sm"
              >
                Se pris
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Tilbud */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Dit tilbud</h3>
            
            {/* Furniture Summary */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-slate-600" />
                <span className="font-medium text-sm">Møbler</span>
              </div>
              <div className="space-y-1 text-xs">
                {Object.entries(formData.furniture)
                  .filter(([_, qty]) => qty > 0)
                  .map(([itemId, qty]) => {
                    const item = furnitureItems.find(f => f.id === itemId);
                    return (
                      <div key={itemId} className="flex justify-between text-slate-600">
                        <span>{item?.name} x {qty}</span>
                        <span className="font-medium">{(item.volume * qty).toFixed(2)} m³</span>
                      </div>
                    );
                  })}
                <div className="flex justify-between font-semibold border-t border-slate-200 pt-1 mt-1">
                  <span>Total volumen:</span>
                  <span>{calculateTotalVolume()} m³</span>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-slate-50 rounded-lg p-3">
              <span className="font-medium text-sm block mb-2">Prisberegning</span>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Transport (45 km):</span>
                  <span className="font-medium">{pricing.transportCost} kr</span>
                </div>
                <div className="flex justify-between">
                  <span>Køretid (45 min):</span>
                  <span className="font-medium">{pricing.driveTimeCost} kr</span>
                </div>
                <div className="flex justify-between">
                  <span>Volumen ({pricing.volume} m³):</span>
                  <span className="font-medium">{pricing.volumeCost} kr</span>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm">Total:</span>
                <span className="text-2xl font-black">{pricing.total.toLocaleString('da-DK')} kr</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Heraf moms (25%):</span>
                <span>{pricing.vat.toLocaleString('da-DK')} kr</span>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
              <p className="text-xs text-indigo-900 text-center">
                <span className="font-semibold">Demo mode:</span> Tilbuddet sendes ikke. Opret en konto for at bruge systemet!
              </p>
            </div>

            <Button
              onClick={() => setStep(2)}
              variant="outline"
              className="w-full h-10 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbage til møbler
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}