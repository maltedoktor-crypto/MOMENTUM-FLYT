import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  startOfDay,
  parseISO
} from 'date-fns';
import { da } from 'date-fns/locale';

const jobStatusConfig = {
  scheduled: { label: 'Planlagt', color: 'bg-blue-500' },
  confirmed: { label: 'Bekræftet', color: 'bg-indigo-500' },
  in_progress: { label: 'I gang', color: 'bg-amber-500' },
  completed: { label: 'Færdig', color: 'bg-green-500' },
  cancelled: { label: 'Annulleret', color: 'bg-slate-400' },
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week
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
      return base44.entities.Organization.filter({ company_id: user.company_id });
    },
    enabled: !!user?.company_id,
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', organizations[0]?.id],
    queryFn: async () => {
      if (!organizations[0]) return [];
      return base44.entities.Job.filter({ organization_id: organizations[0].id }, '-scheduled_date', 200);
    },
    enabled: !!organizations[0],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', organizations[0]?.id],
    queryFn: async () => {
      if (!organizations[0]) return [];
      return base44.entities.Team.filter({ organization_id: organizations[0].id });
    },
    enabled: !!organizations[0],
  });

  // Month view helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: da });
  const calendarEnd = endOfWeek(monthEnd, { locale: da });

  // Week view helpers
  const weekStart = startOfWeek(currentDate, { locale: da });
  const weekEnd = endOfWeek(currentDate, { locale: da });

  const navigate = (direction) => {
    if (view === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  const getJobsForDate = (date) => {
    return jobs.filter(job => {
      if (!job.scheduled_date) return false;
      const jobDate = parseISO(job.scheduled_date);
      return isSameDay(jobDate, date);
    });
  };

  const generateMonthDays = () => {
    const days = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const generateWeekDays = () => {
    const days = [];
    let day = weekStart;
    while (day <= weekEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const weekDays = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];

  const MonthView = () => (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {weekDays.map(day => (
          <div key={day} className="p-4 text-center text-sm font-medium text-slate-500 uppercase">
            {day}
          </div>
        ))}
      </div>
      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {generateMonthDays().map((day, index) => {
          const dayJobs = getJobsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          
          return (
            <div 
              key={index}
              className={`
                min-h-[120px] p-2 border-b border-r border-slate-100
                ${!isCurrentMonth ? 'bg-slate-50' : 'bg-white'}
                ${index % 7 === 6 ? 'border-r-0' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`
                  text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                  ${isCurrentDay ? 'bg-indigo-600 text-white' : isCurrentMonth ? 'text-slate-900' : 'text-slate-400'}
                `}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-1">
                {dayJobs.slice(0, 3).map(job => {
                  const status = jobStatusConfig[job.status] || jobStatusConfig.scheduled;
                  return (
                    <Link
                      key={job.id}
                      to={createPageUrl(`JobDetail?id=${job.id}`)}
                      className={`
                        block text-xs p-1.5 rounded-lg text-white truncate hover:opacity-90 transition-opacity
                        ${status.color}
                      `}
                    >
                      {job.start_time && <span className="font-medium">{job.start_time} </span>}
                      {job.customer_name}
                    </Link>
                  );
                })}
                {dayJobs.length > 3 && (
                  <p className="text-xs text-slate-500 pl-1">+{dayJobs.length - 3} mere</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const WeekView = () => (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {generateWeekDays().map((day, index) => (
          <div key={index} className="p-4 text-center border-r border-slate-100 last:border-r-0">
            <p className="text-sm text-slate-500 uppercase">{weekDays[index]}</p>
            <p className={`
              text-2xl font-bold mt-1 w-10 h-10 flex items-center justify-center rounded-full mx-auto
              ${isToday(day) ? 'bg-indigo-600 text-white' : 'text-slate-900'}
            `}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>
      {/* Jobs */}
      <div className="grid grid-cols-7 min-h-[500px]">
        {generateWeekDays().map((day, index) => {
          const dayJobs = getJobsForDate(day);
          return (
            <div key={index} className="border-r border-slate-100 last:border-r-0 p-2 space-y-2">
              {dayJobs.map(job => {
                const status = jobStatusConfig[job.status] || jobStatusConfig.scheduled;
                return (
                  <Link
                    key={job.id}
                    to={createPageUrl(`JobDetail?id=${job.id}`)}
                    className="block p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${status.color}`} />
                      <span className="text-xs font-medium text-slate-500">
                        {job.start_time || 'Ikke angivet'}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 text-sm truncate">{job.customer_name}</p>
                    <p className="text-xs text-slate-500 truncate mt-1">{job.from_address?.split(',')[0]}</p>
                  </Link>
                );
              })}
              {dayJobs.length === 0 && (
                <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Link to={createPageUrl("QuoteBuilder")}>
                    <Button variant="ghost" size="sm" className="text-slate-400">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kalender</h1>
          <p className="text-slate-500 mt-1">
            Oversigt over alle planlagte jobs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-32">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Måned</SelectItem>
              <SelectItem value="week">Uge</SelectItem>
            </SelectContent>
          </Select>
          <Link to={createPageUrl("QuoteBuilder")}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nyt tilbud
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            I dag
          </Button>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 capitalize">
          {view === 'month' 
            ? format(currentDate, 'MMMM yyyy', { locale: da })
            : `Uge ${format(currentDate, 'w')} - ${format(weekStart, 'd. MMM', { locale: da })} - ${format(weekEnd, 'd. MMM yyyy', { locale: da })}`
          }
        </h2>
        <div className="w-32" /> {/* Spacer for centering */}
      </div>

      {/* Calendar View */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-slate-500 mt-4">Indlæser kalender...</p>
          </CardContent>
        </Card>
      ) : (
        view === 'month' ? <MonthView /> : <WeekView />
      )}

      {/* Legend */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-slate-500">Status:</span>
            {Object.entries(jobStatusConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${config.color}`} />
                <span className="text-sm text-slate-600">{config.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}