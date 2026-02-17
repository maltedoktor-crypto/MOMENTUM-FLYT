import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  CheckCircle2, 
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  Clock,
  Package,
  Truck,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Square,
  FileText,
  Users
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

const jobStatusConfig = {
  scheduled: { label: 'Planlagt', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Bekræftet', color: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: 'I gang', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Færdig', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulleret', color: 'bg-red-100 text-red-700' },
  invoiced: { label: 'Faktureret', color: 'bg-violet-100 text-violet-700' },
  paid: { label: 'Betalt', color: 'bg-emerald-100 text-emerald-700' },
};

const specialItemNames = {
  piano: 'Klaver/Flygel',
  safe: 'Pengeskab',
  artwork: 'Kunstværk',
  antique: 'Antikvitet',
  aquarium: 'Akvarium',
  pool_table: 'Poolbord',
  other: 'Andet',
};

export default function JobDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0] || null;
    },
    enabled: !!jobId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name'),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list('name'),
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Job.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job opdateret');
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id) => {
      const jobData = await base44.entities.Job.filter({ id });
      const currentJob = jobData[0];
      
      // Delete the job first
      await base44.entities.Job.delete(id);
      
      // If job has a quote, delete it too
      if (currentJob?.quote_id) {
        await base44.entities.Quote.delete(currentJob.quote_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Job og relateret tilbud slettet');
      navigate(createPageUrl('Calendar'));
    },
  });

  const handleStatusChange = (newStatus) => {
    const updates = { status: newStatus };
    
    if (newStatus === 'in_progress') {
      updates.actual_start_time = format(new Date(), 'HH:mm');
    }
    if (newStatus === 'completed') {
      updates.actual_end_time = format(new Date(), 'HH:mm');
    }
    
    updateJobMutation.mutate({ id: job.id, data: updates });
  };

  const handleAssign = () => {
    const updates = {};
    if (selectedTeam) updates.assigned_team_id = selectedTeam;
    if (selectedVehicle) updates.assigned_vehicle_id = selectedVehicle;
    
    updateJobMutation.mutate({ id: job.id, data: updates });
    setAssignDialogOpen(false);
  };

  const handleChecklistToggle = (index) => {
    const checklist = [...(job.checklist || [])];
    checklist[index] = {
      ...checklist[index],
      completed: !checklist[index].completed,
      completed_at: !checklist[index].completed ? new Date().toISOString() : null,
    };
    updateJobMutation.mutate({ id: job.id, data: { checklist } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-16">
        <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-slate-900">Job ikke fundet</h2>
        <Link to={createPageUrl("Calendar")}>
          <Button variant="link" className="mt-2">Tilbage til kalender</Button>
        </Link>
      </div>
    );
  }

  const status = jobStatusConfig[job.status] || jobStatusConfig.scheduled;
  const assignedTeam = teams.find(t => t.id === job.assigned_team_id);
  const assignedVehicle = vehicles.find(v => v.id === job.assigned_vehicle_id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Calendar"))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{job.job_number}</h1>
              <Badge className={`${status.color} font-medium`}>
                {status.label}
              </Badge>
            </div>
            <p className="text-slate-500 mt-1">
              {job.scheduled_date && format(new Date(job.scheduled_date), 'd. MMMM yyyy', { locale: da })}
              {job.start_time && ` kl. ${job.start_time}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.status === 'scheduled' && (
            <Button 
              onClick={() => handleStatusChange('confirmed')}
              variant="outline"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Bekræft
            </Button>
          )}
          {job.status === 'confirmed' && (
            <Button 
              onClick={() => handleStatusChange('in_progress')}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Start job
            </Button>
          )}
          {job.status === 'in_progress' && (
            <Button 
              onClick={() => handleStatusChange('completed')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Square className="w-4 h-4 mr-2" />
              Afslut job
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setAssignDialogOpen(true)}>
                <Users className="w-4 h-4 mr-2" />
                Tildel team/køretøj
              </DropdownMenuItem>
              {job.quote_id && (
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl(`QuoteDetail?id=${job.quote_id}`)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Se tilbud
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Slet job
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" />
                Kunde
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Navn</p>
                  <p className="font-medium text-slate-900">{job.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <a href={`mailto:${job.customer_email}`} className="font-medium text-indigo-600 hover:underline">
                    {job.customer_email || '-'}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Telefon</p>
                  <a href={`tel:${job.customer_phone}`} className="font-medium text-indigo-600 hover:underline">
                    {job.customer_phone || '-'}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-slate-400" />
                Rute
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 font-bold text-sm">Fra</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{job.from_address}</p>
                    <div className="flex gap-3 mt-1 text-sm text-slate-500">
                      <span>Etage: {job.from_floor || 0}</span>
                      <span>•</span>
                      <span>Elevator: {job.from_elevator ? 'Ja' : 'Nej'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="ml-5 border-l-2 border-dashed border-slate-200 h-4" />
                
                {job.extra_stops && job.extra_stops.map((stop, index) => (
                  <React.Fragment key={index}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-700 font-bold text-xs">Stop</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{stop.address}</p>
                        {stop.description && (
                          <p className="text-sm text-slate-500 mt-1">{stop.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="ml-5 border-l-2 border-dashed border-slate-200 h-4" />
                  </React.Fragment>
                ))}
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-700 font-bold text-sm">Til</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{job.to_address}</p>
                    <div className="flex gap-3 mt-1 text-sm text-slate-500">
                      <span>Etage: {job.to_floor || 0}</span>
                      <span>•</span>
                      <span>Elevator: {job.to_elevator ? 'Ja' : 'Nej'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services & Special Items */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-400" />
                Services & genstande
              </CardTitle>
            </CardHeader>
            <CardContent>
              {job.services && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {job.services.packing && <Badge variant="outline">Nedpakning</Badge>}
                  {job.services.unpacking && <Badge variant="outline">Udpakning</Badge>}
                  {job.services.disassembly && <Badge variant="outline">Demontering</Badge>}
                  {job.services.reassembly && <Badge variant="outline">Montering</Badge>}
                  {job.services.storage && <Badge variant="outline">Opbevaring</Badge>}
                </div>
              )}

              {job.special_items && job.special_items.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Specielle genstande</p>
                  <div className="flex flex-wrap gap-2">
                    {job.special_items.map((item, i) => (
                      <Badge key={i} className="bg-amber-100 text-amber-800">
                        {specialItemNames[item.type] || item.type}
                        {item.quantity > 1 && ` (${item.quantity})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {job.customer_notes && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-2">Kundens noter</p>
                  <p className="text-slate-700">{job.customer_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checklist */}
          {job.checklist && job.checklist.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-slate-400" />
                  Tjekliste
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {job.checklist.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => handleChecklistToggle(index)}
                      />
                      <span className={item.completed ? 'line-through text-slate-400' : 'text-slate-700'}>
                        {item.task}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {job.notes && (
            <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
              <CardContent className="py-4">
                <p className="text-sm font-medium text-amber-700 mb-1">Noter til teamet</p>
                <p className="text-slate-700">{job.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Time & Team */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Detaljer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Dato</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <p className="font-medium text-slate-900">
                    {job.scheduled_date 
                      ? format(new Date(job.scheduled_date), 'd. MMMM yyyy', { locale: da })
                      : '-'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">Tid</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <p className="font-medium text-slate-900">
                    {job.start_time || 'Ikke angivet'}
                    {job.end_time && ` - ${job.end_time}`}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">Mandskab</p>
                <p className="font-medium text-slate-900">{job.crew_size || 2} mand</p>
              </div>
              
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-500">Team</p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setAssignDialogOpen(true)}
                    className="text-xs h-7"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Ændre
                  </Button>
                </div>
                {assignedTeam ? (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${assignedTeam.color}20` }}
                    >
                      <Users className="w-4 h-4" style={{ color: assignedTeam.color }} />
                    </div>
                    <p className="font-medium text-slate-900">{assignedTeam.name}</p>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Ikke tildelt</p>
                )}
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Køretøj</p>
                {assignedVehicle ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{assignedVehicle.name}</p>
                      <p className="text-xs text-slate-500">{assignedVehicle.license_plate}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Ikke tildelt</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Price */}
          {job.quoted_price && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-4">
                <p className="text-sm text-slate-500">Pris fra tilbud</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {job.quoted_price?.toLocaleString('da-DK')} kr
                </p>
              </CardContent>
            </Card>
          )}

          {/* Status Timeline */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    job.status !== 'cancelled' ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    <CheckCircle2 className={`w-4 h-4 ${job.status !== 'cancelled' ? 'text-green-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Oprettet</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(job.created_date), 'd. MMM yyyy HH:mm', { locale: da })}
                    </p>
                  </div>
                </div>

                {job.actual_start_time && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Startet</p>
                      <p className="text-xs text-slate-500">kl. {job.actual_start_time}</p>
                    </div>
                  </div>
                )}

                {job.actual_end_time && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Square className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Afsluttet</p>
                      <p className="text-xs text-slate-500">kl. {job.actual_end_time}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tildel team og køretøj</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Team</label>
              <Select
                value={selectedTeam || job.assigned_team_id || ''}
                onValueChange={setSelectedTeam}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Vælg team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Køretøj</label>
              <Select
                value={selectedVehicle || job.assigned_vehicle_id || ''}
                onValueChange={setSelectedVehicle}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Vælg køretøj" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} ({vehicle.license_plate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Annuller
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={updateJobMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {updateJobMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : 'Gem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slet job</DialogTitle>
            <DialogDescription>
              Er du sikker på, at du vil slette dette job? Denne handling kan ikke fortrydes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuller
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteJobMutation.mutate(job.id)}
              disabled={deleteJobMutation.isPending}
            >
              {deleteJobMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : 'Slet job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}