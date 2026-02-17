import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  FileText,
  MoreHorizontal,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  Filter,
  Calendar,
  MapPin
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

const statusConfig = {
  draft: { label: 'Kladde', color: 'bg-slate-100 text-slate-700', icon: FileText },
  sent: { label: 'Sendt', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Set', color: 'bg-amber-100 text-amber-700', icon: Eye },
  accepted: { label: 'Accepteret', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  declined: { label: 'Afvist', color: 'bg-red-100 text-red-700', icon: XCircle },
  expired: { label: 'Udløbet', color: 'bg-slate-100 text-slate-500', icon: Clock },
  converted: { label: 'Konverteret', color: 'bg-violet-100 text-violet-700', icon: CheckCircle2 },
};

export default function Quotes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('-created_date');
  const [user, setUser] = useState(null);

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
      try {
        return base44.entities.Organization.filter({ company_id: user.company_id });
      } catch (e) {
        return [];
      }
    },
    enabled: !!user?.company_id,
  });

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes', sortOrder, organizations[0]?.id],
    queryFn: async () => {
      if (!organizations[0]) return [];
      return base44.entities.Quote.filter({ organization_id: organizations[0].id }, sortOrder, 100);
    },
    enabled: !!organizations[0],
  });

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = !searchQuery || 
      quote.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.from_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.to_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.quote_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const QuoteCard = ({ quote }) => {
    const status = statusConfig[quote.status] || statusConfig.draft;
    const StatusIcon = status.icon;

    return (
      <Link to={createPageUrl(`QuoteDetail?id=${quote.id}`)}>
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{quote.customer_name}</p>
                  <p className="text-sm text-slate-500">{quote.quote_number}</p>
                </div>
              </div>
              <Badge className={`${status.color} font-medium`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-slate-600 truncate">{quote.from_address}</p>
                  <p className="text-slate-400">↓</p>
                  <p className="text-slate-600 truncate">{quote.to_address}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="w-4 h-4" />
                {quote.preferred_date 
                  ? format(new Date(quote.preferred_date), 'd. MMM yyyy', { locale: da })
                  : 'Ikke angivet'}
              </div>
              {quote.total_price ? (
                <p className="text-lg font-semibold text-slate-900">
                  {quote.total_price.toLocaleString('da-DK')} kr
                </p>
              ) : (
                <p className="text-sm text-slate-400">Ikke prissat</p>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tilbud</h1>
          <p className="text-slate-500 mt-1">
            Administrer og opret tilbud til dine kunder
          </p>
        </div>
        <Link to={createPageUrl("QuoteBuilder")}>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nyt tilbud
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Søg på navn, adresse eller tilbudsnummer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-50 border-0"
              />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-slate-50 border-0">
                  <Filter className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle status</SelectItem>
                  <SelectItem value="draft">Kladde</SelectItem>
                  <SelectItem value="sent">Sendt</SelectItem>
                  <SelectItem value="viewed">Set</SelectItem>
                  <SelectItem value="accepted">Accepteret</SelectItem>
                  <SelectItem value="declined">Afvist</SelectItem>
                  <SelectItem value="converted">Konverteret</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-44 bg-slate-50 border-0">
                  <ArrowUpDown className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Sortering" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_date">Nyeste først</SelectItem>
                  <SelectItem value="created_date">Ældste først</SelectItem>
                  <SelectItem value="-total_price">Højeste pris</SelectItem>
                  <SelectItem value="total_price">Laveste pris</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="border-0 shadow-sm animate-pulse">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-slate-200 rounded-xl" />
                  <div>
                    <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-24" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredQuotes.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {searchQuery || statusFilter !== 'all' 
                ? 'Ingen tilbud matcher din søgning' 
                : 'Ingen tilbud endnu'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Prøv at ændre dine søgekriterier'
                : 'Opret dit første tilbud for at komme i gang'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link to={createPageUrl("QuoteBuilder")}>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Opret tilbud
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotes.map(quote => (
            <QuoteCard key={quote.id} quote={quote} />
          ))}
        </div>
      )}
    </div>
  );
}