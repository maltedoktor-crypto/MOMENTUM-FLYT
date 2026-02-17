import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import QuoteRequestForm from '../components/QuoteRequestForm';

export default function EmbedQuote() {
  const [orgId, setOrgId] = useState(null);
  const [error, setError] = useState(null);

  // Get token from URL params and lookup organization
  useEffect(() => {
    const loadOrganization = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      
      if (!token) {
        setError('Token er påkrævet');
        return;
      }

      try {
        const embedTokens = await base44.entities.EmbedToken.filter({ token, active: true });
        console.log('Found tokens:', embedTokens);
        
        if (!embedTokens || embedTokens.length === 0) {
          setError('Token ikke fundet eller inaktiv');
          return;
        }

        console.log('Token company_id:', embedTokens[0].company_id);
        const companies = await base44.entities.Company.filter({ id: embedTokens[0].company_id });
        console.log('Found companies:', companies);
        
        if (companies && companies.length > 0) {
          setOrgId(companies[0].id);
        } else {
          setError('Virksomhed ikke fundet');
        }
      } catch (err) {
        console.error('Error loading organization:', err);
        setError('Fejl ved indlæsning: ' + err.message);
      }
    };

    loadOrganization();
  }, []);

  // Fetch company to verify it exists
   const { data: organization, isLoading, isError } = useQuery({
     queryKey: ['organization', orgId],
     queryFn: () => base44.entities.Company.filter({ id: orgId }).then(companies => companies[0]),
     enabled: !!orgId,
   });

  if (!orgId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Token er påkrævet. Kontakt support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-slate-600">Indlæser...</div>
      </div>
    );
  }

  if (isError || !organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Token ikke fundet eller inaktiv.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <QuoteRequestForm organization={organization} />
    </div>
  );
}