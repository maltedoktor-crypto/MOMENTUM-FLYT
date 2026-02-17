import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  Users,
  User,
  Mail,
  Phone,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Customers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    notes: '',
  });

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];
      return base44.entities.Organization.filter({ company_id: user.company_id });
    },
    enabled: !!user?.company_id,
  });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', organizations[0]?.id],
    queryFn: async () => {
      if (!organizations[0]) return [];
      return base44.entities.Customer.filter({ organization_id: organizations[0].id }, '-created_date', 100);
    },
    enabled: !!organizations[0],
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes', organizations[0]?.id],
    queryFn: async () => {
      if (!organizations[0]) return [];
      return base44.entities.Quote.filter({ organization_id: organizations[0].id }, '-created_date', 500);
    },
    enabled: !!organizations[0],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Find customer
      const customerData = customers.find(c => c.id === id);
      if (!customerData) return;
      
      // Find and delete related quotes
      const relatedQuotes = await base44.entities.Quote.filter({ customer_id: id });
      for (const quote of relatedQuotes) {
        // Find and delete jobs for each quote
        const jobs = await base44.entities.Job.filter({ quote_id: quote.id });
        for (const job of jobs) {
          await base44.entities.Job.delete(job.id);
        }
        // Delete the quote
        await base44.entities.Quote.delete(quote.id);
      }
      
      // Delete the customer
      await base44.entities.Customer.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Kunde og relaterede tilbud/jobs slettet');
    },
  });

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', company_name: '', notes: '' });
    setEditingCustomer(null);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      company_name: customer.company_name || '',
      notes: customer.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, organization_id: organizations[0]?.id });
    }
  };

  const getCustomerQuotes = (email) => {
    return quotes.filter(q => q.customer_email === email);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchQuery || 
      customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery) ||
      customer.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kunder</h1>
          <p className="text-slate-500 mt-1">
            Administrer dine kundeoplysninger
          </p>
        </div>
        <Button 
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ny kunde
        </Button>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Søg på navn, email, telefon eller firma..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-50 border-0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="border-0 shadow-sm animate-pulse">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                  <div>
                    <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-40" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {searchQuery ? 'Ingen kunder matcher din søgning' : 'Ingen kunder endnu'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchQuery 
                ? 'Prøv at ændre dine søgekriterier'
                : 'Kunder oprettes automatisk når du laver tilbud, eller du kan tilføje dem manuelt'}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => { resetForm(); setDialogOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tilføj kunde
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => {
            const customerQuotes = getCustomerQuotes(customer.email);
            const totalValue = customerQuotes.reduce((sum, q) => sum + (q.total_price || 0), 0);
            
            return (
              <Card key={customer.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <span className="text-indigo-700 font-semibold text-lg">
                          {customer.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{customer.name}</p>
                        {customer.company_name && (
                          <p className="text-sm text-slate-500">{customer.company_name}</p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(customer)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Rediger
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => deleteMutation.mutate(customer.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Slet
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${customer.email}`} className="hover:text-indigo-600 truncate">
                        {customer.email}
                      </a>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <a href={`tel:${customer.phone}`} className="hover:text-indigo-600">
                          {customer.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <FileText className="w-4 h-4" />
                      {customerQuotes.length} tilbud
                    </div>
                    {totalValue > 0 && (
                      <p className="text-sm font-medium text-slate-900">
                        {totalValue.toLocaleString('da-DK')} kr
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Rediger kunde' : 'Ny kunde'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Navn *</Label>
              <Input
                id="name"
                placeholder="Jens Hansen"
                className="mt-1.5"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jens@email.dk"
                className="mt-1.5"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                placeholder="12 34 56 78"
                className="mt-1.5"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="company_name">Firmanavn</Label>
              <Input
                id="company_name"
                placeholder="Firma ApS"
                className="mt-1.5"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuller
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || !formData.name || !formData.email}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingCustomer ? 'Gem ændringer' : 'Opret kunde'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}