import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Building2,
  Search,
  Trash2,
  Users,
  Crown,
  Edit
} from "lucide-react";
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// NOTE: Admin-approval flow has been removed. Access is controlled by email verification only.

export default function Administration() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, company: null });
  const [subscriptionDialog, setSubscriptionDialog] = useState({ open: false, company: null });
  const [subscriptionForm, setSubscriptionForm] = useState({
    subscription_status: '',
    subscription_plan: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        if (!currentUser.is_platform_admin) {
          navigate(createPageUrl('Dashboard'));
          return;
        }
        
        setUser(currentUser);
      } catch (e) {
        navigate(createPageUrl('Login'));
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: !!user?.is_platform_admin
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list('-created_date'),
    enabled: !!user?.is_platform_admin
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ companyId, data }) => base44.entities.Company.update(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Abonnement opdateret');
      setSubscriptionDialog({ open: false, company: null });
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId) => {
      // Delete all users for this company
      const companyUsers = users.filter(u => u.company_id === companyId);
      for (const user of companyUsers) {
        await base44.entities.User.delete(user.id);
      }
      
      // Delete all quotes for this company
      const quotes = await base44.entities.Quote.filter({ organization_id: companyId });
      for (const quote of quotes) {
        await base44.entities.Quote.delete(quote.id);
      }
      
      // Delete all jobs for this company
      const jobs = await base44.entities.Job.filter({ organization_id: companyId });
      for (const job of jobs) {
        await base44.entities.Job.delete(job.id);
      }
      
      // Delete company
      await base44.entities.Company.delete(companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Virksomhed slettet');
      setDeleteDialog({ open: false, company: null });
    }
  });

  const openSubscriptionDialog = (company) => {
    setSubscriptionDialog({ open: true, company });
    setSubscriptionForm({
      subscription_status: company.subscription_status || '',
      subscription_plan: company.subscription_plan || '',
    });
  };

  const handleSubscriptionUpdate = () => {
    if (!subscriptionDialog.company) return;
    
    updateSubscriptionMutation.mutate({
      companyId: subscriptionDialog.company.id,
      data: subscriptionForm
    });
  };

  const filteredCompanies = companies.filter(c => 
    searchTerm === '' || 
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUsersForCompany = (companyId) => {
    return users.filter(u => u.company_id === companyId);
  };

  if (!user?.is_platform_admin) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Administration</h1>
          <p className="text-slate-600">Administrer virksomheder og abonnementer</p>
        </div>
      </div>

      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="w-4 h-4" />
            Virksomheder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Alle virksomheder ({companies.length})</CardTitle>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Søg efter virksomhed..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredCompanies.map(company => {
                  const companyUsers = getUsersForCompany(company.id);

                  return (
                    <div key={company.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{company.company_name}</h3>
                            <Badge variant="outline" className="gap-1">
                              <Users className="w-3 h-3" />
                              {companyUsers.length}
                            </Badge>
                            {company.subscription_status && (
                              <Badge variant="outline" className="gap-1">
                                <Crown className="w-3 h-3" />
                                {company.subscription_plan || company.subscription_status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{company.contact_name} · {company.email}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Oprettet: {format(new Date(company.created_date), 'PPP', { locale: da })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openSubscriptionDialog(company)}
                          variant="outline"
                          size="sm"
                          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Abonnement
                        </Button>
                        <Button
                          onClick={() => setDeleteDialog({ open: true, company })}
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Slet
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={subscriptionDialog.open} onOpenChange={(open) => setSubscriptionDialog({ open, company: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Administrer abonnement</DialogTitle>
            <DialogDescription>
              Opdater abonnementsstatus for {subscriptionDialog.company?.company_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Abonnement status</Label>
              <Select
                value={subscriptionForm.subscription_status}
                onValueChange={(value) => setSubscriptionForm({ ...subscriptionForm, subscription_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vælg status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trialing">Prøveperiode</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="past_due">Betaling fejlet</SelectItem>
                  <SelectItem value="canceled">Opsagt</SelectItem>
                  <SelectItem value="unpaid">Ubetalt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-2 block">Plan</Label>
              <Select
                value={subscriptionForm.subscription_plan}
                onValueChange={(value) => setSubscriptionForm({ ...subscriptionForm, subscription_plan: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vælg plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubscriptionDialog({ open: false, company: null })}
            >
              Annuller
            </Button>
            <Button
              onClick={handleSubscriptionUpdate}
              disabled={updateSubscriptionMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {updateSubscriptionMutation.isPending ? 'Gemmer...' : 'Gem ændringer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, company: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet virksomhed?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette <strong>{deleteDialog.company?.company_name}</strong>?
              Dette vil permanent slette virksomheden, alle tilknyttede brugere, tilbud og jobs.
              Denne handling kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCompanyMutation.mutate(deleteDialog.company?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Slet virksomhed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}