import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Plus, Trash2, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EmbedTokens() {
  const [user, setUser] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [copied, setCopied] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const users = await base44.entities.User.list();
      setCustomers(users);
    };
    loadData();
  }, []);

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['embedTokens', selectedCustomer?.id],
    queryFn: () => selectedCustomer ? base44.entities.EmbedToken.filter({ customer_id: selectedCustomer.id }) : [],
    enabled: !!selectedCustomer
  });

  const createTokenMutation = useMutation({
    mutationFn: async (name) => {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
       return base44.entities.EmbedToken.create({
         company_id: organization.id,
         token,
         name
       });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embedTokens'] });
    }
  });

  const deleteTokenMutation = useMutation({
    mutationFn: (tokenId) => base44.entities.EmbedToken.delete(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embedTokens'] });
    }
  });

  const toggleTokenMutation = useMutation({
    mutationFn: (token) => base44.entities.EmbedToken.update(token.id, { active: !token.active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embedTokens'] });
    }
  });

  const copyToken = (token) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };



  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Embed Tokens</h1>
        <p className="text-slate-600">Administrer tokens til iframe-embeddings på kunders hjemmesider</p>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Vælg bruger</label>
          <Select value={selectedCustomer?.id || ''} onValueChange={(userId) => {
            const selected = customers.find(u => u.id === userId);
            setSelectedCustomer(selected);
          }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Vælg bruger" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={!selectedCustomer}>
              <Plus className="w-4 h-4 mr-2" />
              Nyt Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opret nyt Embed Token</DialogTitle>
              <DialogDescription>Token oprettes for {selectedCustomer?.full_name}</DialogDescription>
            </DialogHeader>
            <CreateTokenForm 
              companyId={selectedCustomer?.company_id}
              customer={selectedCustomer}
              queryClient={queryClient}
              onSuccess={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-slate-600">Indlæser tokens...</div>
      ) : tokens.length === 0 ? (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <p className="text-slate-600">Ingen tokens oprettet endnu. Opret et nyt token for at starte.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tokens.map((tokenItem) => (
            <Card key={tokenItem.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-slate-900">{tokenItem.name || 'Unavngivet'}</h3>
                      <Badge variant={tokenItem.active ? 'default' : 'destructive'}>
                        {tokenItem.active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                      {tokenItem.expires_at && (
                        <Badge variant="outline">
                          Udløber: {new Date(tokenItem.expires_at).toLocaleDateString('da-DK')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                      <code className="font-mono text-sm text-slate-700 flex-1 truncate">{tokenItem.token}</code>
                      <button
                        onClick={() => copyToken(tokenItem.token)}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        {copied === tokenItem.token ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleTokenMutation.mutate(tokenItem)}
                    >
                      {tokenItem.active ? 'Deaktiver' : 'Aktiver'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteTokenMutation.mutate(tokenItem.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateTokenForm({ companyId, customer, queryClient, onSuccess }) {
  const createMutation = useMutation({
    mutationFn: async () => {
       const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
       return base44.entities.EmbedToken.create({
         company_id: companyId,
         customer_id: customer.id,
         token,
         name: customer.full_name
       });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embedTokens'] });
      onSuccess();
    }
  });

  return (
    <div className="space-y-4 mt-4">
      <Button 
        onClick={() => createMutation.mutate()}
        disabled={createMutation.isPending}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        {createMutation.isPending ? 'Opretter...' : 'Opret Token'}
      </Button>
    </div>
  );
}