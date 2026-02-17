import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Plus,
  ArrowRight,
  CheckCircle2,
  Eye,
  Send,
  AlertCircle
} from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { da } from 'date-fns/locale';

const statusConfig = {
  draft: { label: 'Kladde', color: 'bg-slate-100 text-slate-700', icon: FileText },
  sent: { label: 'Sendt', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Set', color: 'bg-amber-100 text-amber-700', icon: Eye },
  accepted: { label: 'Accepteret', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  declined: { label: 'Afvist', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  expired: { label: 'Udløbet', color: 'bg-slate-100 text-slate-500' },
  converted: { label: 'Konverteret', color: 'bg-violet-100 text-violet-700' },
};

const jobStatusConfig = {
  scheduled: { label: 'Planlagt', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Bekræftet', color: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: 'I gang', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Færdig', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulleret', color: 'bg-red-100 text-red-700' },
};

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        // Not logged in
      }
    };
    loadUser();
  }, []);

  const { data: company = null } = useQuery({
    queryKey: ['company', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return null;
      const companies = await base44.entities.Company.filter({ id: user.company_id });
      return companies.length > 0 ? companies[0] : null;
    },
    enabled: !!user?.company_id,
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ['quotes', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];
      return base44.entities.Quote.filter({ company_id: user.company_id }, '-created_date', 50);
    },
    enabled: !!user?.company_id,
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];
      return base44.entities.Job.filter({ company_id: user.company_id }, '-scheduled_date', 50);
    },
    enabled: !!user?.company_id,
  });

  // Calculate stats
  const thisMonthQuotes = quotes.filter(q => {
    const created = new Date(q.created_date);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  });

  const acceptedQuotes = thisMonthQuotes.filter(q => q.status === 'accepted' || q.status === 'converted');
  const conversionRate = thisMonthQuotes.length > 0 
    ? Math.round((acceptedQuotes.length / thisMonthQuotes.length) * 100) 
    : 0;

  const pendingQuotes = quotes.filter(q => ['draft', 'sent', 'viewed'].includes(q.status));
  const recentQuotes = quotes.slice(0, 5);

  const upcomingJobs = jobs
    .filter(j => ['scheduled', 'confirmed'].includes(j.status) && new Date(j.scheduled_date) >= new Date())
    .slice(0, 5);

  const todayJobs = jobs.filter(j => j.scheduled_date && isToday(new Date(j.scheduled_date)));

  const totalRevenue = thisMonthQuotes
    .filter(q => q.status === 'accepted' || q.status === 'converted')
    .reduce((sum, q) => sum + (q.total_price || 0), 0);

  const stats = [
    {
      title: 'Åbne tilbud',
      value: pendingQuotes.length,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Jobs i dag',
      value: todayJobs.length,
      icon: Calendar,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Konvertering',
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Omsætning (måned)',
      value: `${(totalRevenue / 1000).toFixed(0)}k`,
      icon: Clock,
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50',
      suffix: 'kr',
    },
  ];

  const getDateLabel = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isToday(d)) return 'I dag';
    if (isTomorrow(d)) return 'I morgen';
    return format(d, 'd. MMM', { locale: da });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">
             Velkommen tilbage{company?.company_name ? `, ${company.company_name}` : ''}
           </h1>
          <p className="text-slate-500 mt-1">
            Her er overblikket over din dag
          </p>
        </div>
        <div className="flex gap-3">
          <Link to={createPageUrl("QuoteBuilder")}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nyt tilbud
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {stat.value}
                    {stat.suffix && <span className="text-lg font-normal text-slate-400 ml-1">{stat.suffix}</span>}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} style={{color: stat.color.includes('blue') ? '#3b82f6' : stat.color.includes('indigo') ? '#6366f1' : stat.color.includes('green') ? '#22c55e' : '#8b5cf6'}} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Seneste tilbud</CardTitle>
              <Link to={createPageUrl("Quotes")}>
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                  Se alle
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {quotesLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentQuotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Ingen tilbud endnu</p>
                <Link to={createPageUrl("QuoteBuilder")}>
                  <Button variant="link" className="text-indigo-600 mt-2">
                    Opret dit første tilbud
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentQuotes.map((quote) => {
                  const status = statusConfig[quote.status] || statusConfig.draft;
                  return (
                    <Link 
                      key={quote.id} 
                      to={createPageUrl(`QuoteDetail?id=${quote.id}`)}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{quote.customer_name}</p>
                        <p className="text-sm text-slate-500 truncate">
                          {quote.from_address?.split(',')[0]} → {quote.to_address?.split(',')[0]}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={`${status.color} font-medium`}>
                          {status.label}
                        </Badge>
                        {quote.total_price && (
                          <p className="text-sm font-medium text-slate-900 mt-1">
                            {quote.total_price.toLocaleString('da-DK')} kr
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Jobs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Kommende jobs</CardTitle>
              <Link to={createPageUrl("Calendar")}>
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                  Se kalender
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {jobsLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingJobs.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Ingen planlagte jobs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingJobs.map((job) => {
                  const status = jobStatusConfig[job.status] || jobStatusConfig.scheduled;
                  return (
                    <Link 
                      key={job.id} 
                      to={createPageUrl(`JobDetail?id=${job.id}`)}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl flex flex-col items-center justify-center">
                        <span className="text-xs text-indigo-600 font-medium">
                          {getDateLabel(job.scheduled_date)}
                        </span>
                        {job.start_time && (
                          <span className="text-[10px] text-slate-500">{job.start_time}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{job.customer_name}</p>
                        <p className="text-sm text-slate-500 truncate">
                          {job.from_address?.split(',')[0]}
                        </p>
                      </div>
                      <Badge className={`${status.color} font-medium`}>
                        {status.label}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}