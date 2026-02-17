import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import QuoteRequestForm from '../components/QuoteRequestForm';

export default function PublicQuoteRequest() {
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      const loadCompany = async () => {
        try {
          // Get token from URL
          const params = new URLSearchParams(window.location.search);
          const token = params.get('token');

          if (!token) {
            setError('Token mangler. Kontakt virksomheden for at få et gyldigt link.');
            setLoading(false);
            return;
          }

          // Validate token and get company
          const response = await base44.functions.invoke('validateEmbedToken', { token });
          
          if (response?.data?.success) {
            setCompany(response.data.company);
          } else {
            setError('Ugyldigt token. Kontakt virksomheden.');
          }
        } catch (err) {
          console.error('Error loading company:', err);
          setError('Der skete en fejl. Prøv igen senere.');
        } finally {
          setLoading(false);
        }
      };

      loadCompany();
    }, []);

    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
          <div className="text-slate-600">Indlæser...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
          <div className="max-w-md p-6 bg-white rounded-lg shadow-lg text-center">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Fejl</h2>
            <p className="text-slate-600">{error}</p>
          </div>
        </div>
      );
    }

    if (!company) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
          <div className="text-slate-600">Virksomhed ikke fundet</div>
        </div>
      );
    }

    return <QuoteRequestForm organization={company} />;
}