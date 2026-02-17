import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Truck,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

const licenseTypes = [
  { value: 'none', label: 'Ingen' },
  { value: 'b_license', label: 'B-kørekort' },
  { value: 'c_license', label: 'C-kørekort' },
  { value: 'ce_license', label: 'CE-kørekort' },
];

const vehicleTypes = [
  { value: 'van', label: 'Varevogn' },
  { value: 'small_truck', label: 'Lille lastbil' },
  { value: 'large_truck', label: 'Stor lastbil' },
  { value: 'trailer', label: 'Trailer' },
];

export default function Resources() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('workers');
  const [user, setUser] = React.useState(null);
  
  // Workers
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [workerForm, setWorkerForm] = useState({ 
    full_name: '', 
    email: '', 
    phone: '', 
    license_type: 'none',
    active: true 
  });

  // Vehicles
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ 
    name: '', 
    license_plate: '', 
    type: 'van', 
    capacity_m3: '', 
    active: true 
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

  const { data: workers = [], isLoading: workersLoading } = useQuery({
    queryKey: ['workers', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];
      return base44.entities.Worker.filter({ company_id: user.company_id }, 'full_name');
    },
    enabled: !!user?.company_id,
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return [];
      return base44.entities.Vehicle.filter({ company_id: user.company_id }, 'name');
    },
    enabled: !!user?.company_id,
  });

  // Worker mutations
  const createWorkerMutation = useMutation({
    mutationFn: (data) => base44.entities.Worker.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setWorkerDialogOpen(false);
      resetWorkerForm();
      toast.success('Medarbejder oprettet');
    },
  });

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Worker.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setWorkerDialogOpen(false);
      resetWorkerForm();
      toast.success('Medarbejder opdateret');
    },
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: (id) => base44.entities.Worker.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success('Medarbejder slettet');
    },
  });

  // Vehicle mutations
  const createVehicleMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setVehicleDialogOpen(false);
      resetVehicleForm();
      toast.success('Køretøj oprettet');
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setVehicleDialogOpen(false);
      resetVehicleForm();
      toast.success('Køretøj opdateret');
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Køretøj slettet');
    },
  });

  const resetWorkerForm = () => {
    setWorkerForm({ full_name: '', email: '', phone: '', license_type: 'none', active: true });
    setEditingWorker(null);
  };

  const resetVehicleForm = () => {
    setVehicleForm({ name: '', license_plate: '', type: 'van', capacity_m3: '', active: true });
    setEditingVehicle(null);
  };

  const handleEditWorker = (worker) => {
    setEditingWorker(worker);
    setWorkerForm({
      full_name: worker.full_name || '',
      email: worker.email || '',
      phone: worker.phone || '',
      license_type: worker.license_type || 'none',
      active: worker.active !== false,
    });
    setWorkerDialogOpen(true);
  };

  const handleEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      name: vehicle.name || '',
      license_plate: vehicle.license_plate || '',
      type: vehicle.type || 'van',
      capacity_m3: vehicle.capacity_m3 || '',
      active: vehicle.active !== false,
    });
    setVehicleDialogOpen(true);
  };

  const handleWorkerSubmit = () => {
    if (!workerForm.full_name || !workerForm.email) {
      toast.error('Navn og email er påkrevede');
      return;
    }
    if (editingWorker) {
      updateWorkerMutation.mutate({ id: editingWorker.id, data: workerForm });
    } else {
      createWorkerMutation.mutate({ ...workerForm, company_id: user.company_id });
    }
  };

  const handleVehicleSubmit = () => {
    const data = { ...vehicleForm, capacity_m3: parseFloat(vehicleForm.capacity_m3) || null };
    if (!data.name || !data.license_plate) {
      toast.error('Navn og nummerplade er påkrevede');
      return;
    }
    if (editingVehicle) {
      updateVehicleMutation.mutate({ id: editingVehicle.id, data });
    } else {
      createVehicleMutation.mutate({ ...data, company_id: user.company_id });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ressourcer</h1>
          <p className="text-slate-500 mt-1">
            Administrer medarbejdere og køretøjer
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="workers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Medarbejdere
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Køretøjer
          </TabsTrigger>
        </TabsList>

        {/* Workers Tab */}
        <TabsContent value="workers" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button 
              onClick={() => { resetWorkerForm(); setWorkerDialogOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ny medarbejder
            </Button>
          </div>

          {workersLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <Card key={i} className="border-0 shadow-sm animate-pulse">
                  <CardContent className="p-5">
                    <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : workers.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Ingen medarbejdere endnu</h3>
                <p className="text-slate-500 mb-6">Tilføj medarbejdere for at tildele dem jobs</p>
                <Button 
                  onClick={() => { resetWorkerForm(); setWorkerDialogOpen(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Opret medarbejder
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workers.map(worker => (
                <Card key={worker.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{worker.full_name}</p>
                          <Badge variant={worker.active !== false ? 'default' : 'secondary'} className="mt-1">
                            {worker.active !== false ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditWorker(worker)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Rediger
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => deleteWorkerMutation.mutate(worker.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Slet
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>📧 {worker.email}</p>
                      {worker.phone && <p>📞 {worker.phone}</p>}
                      {worker.license_type && worker.license_type !== 'none' && (
                        <p>🚗 {licenseTypes.find(l => l.value === worker.license_type)?.label}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button 
              onClick={() => { resetVehicleForm(); setVehicleDialogOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nyt køretøj
            </Button>
          </div>

          {vehiclesLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <Card key={i} className="border-0 shadow-sm animate-pulse">
                  <CardContent className="p-5">
                    <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : vehicles.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center">
                <Truck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Ingen køretøjer endnu</h3>
                <p className="text-slate-500 mb-6">Tilføj køretøjer for at holde styr på din flåde</p>
                <Button 
                  onClick={() => { resetVehicleForm(); setVehicleDialogOpen(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tilføj køretøj
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map(vehicle => (
                <Card key={vehicle.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Truck className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{vehicle.name}</p>
                          <p className="text-sm text-slate-500">{vehicle.license_plate}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditVehicle(vehicle)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Rediger
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => deleteVehicleMutation.mutate(vehicle.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Slet
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {vehicleTypes.find(t => t.value === vehicle.type)?.label || vehicle.type}
                      </Badge>
                      {vehicle.capacity_m3 && (
                        <span className="text-sm text-slate-500">{vehicle.capacity_m3} m³</span>
                      )}
                      <Badge variant={vehicle.active !== false ? 'default' : 'secondary'} className="ml-auto">
                        {vehicle.active !== false ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Worker Dialog */}
      <Dialog open={workerDialogOpen} onOpenChange={setWorkerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWorker ? 'Rediger medarbejder' : 'Ny medarbejder'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="full-name">Fulde navn *</Label>
              <Input
                id="full-name"
                placeholder="Jens Hansen"
                className="mt-1.5"
                value={workerForm.full_name}
                onChange={(e) => setWorkerForm({ ...workerForm, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jens@gmail.com"
                className="mt-1.5"
                value={workerForm.email}
                onChange={(e) => setWorkerForm({ ...workerForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefonnummer</Label>
              <Input
                id="phone"
                placeholder="40 40 40 40"
                className="mt-1.5"
                value={workerForm.phone}
                onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Kørekorttype</Label>
              <Select
                value={workerForm.license_type}
                onValueChange={(v) => setWorkerForm({ ...workerForm, license_type: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {licenseTypes.map(license => (
                    <SelectItem key={license.value} value={license.value}>
                      {license.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktiv</Label>
              <Switch
                checked={workerForm.active}
                onCheckedChange={(v) => setWorkerForm({ ...workerForm, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkerDialogOpen(false)}>
              Annuller
            </Button>
            <Button 
              onClick={handleWorkerSubmit}
              disabled={createWorkerMutation.isPending || updateWorkerMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {(createWorkerMutation.isPending || updateWorkerMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingWorker ? 'Gem ændringer' : 'Opret medarbejder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'Rediger køretøj' : 'Nyt køretøj'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="vehicle-name">Navn/beskrivelse *</Label>
              <Input
                id="vehicle-name"
                placeholder="MAN 7.5t"
                className="mt-1.5"
                value={vehicleForm.name}
                onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="license-plate">Nummerplade *</Label>
              <Input
                id="license-plate"
                placeholder="AB 12 345"
                className="mt-1.5"
                value={vehicleForm.license_plate}
                onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={vehicleForm.type}
                onValueChange={(v) => setVehicleForm({ ...vehicleForm, type: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="capacity">Kapacitet (m³)</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="35"
                className="mt-1.5"
                value={vehicleForm.capacity_m3}
                onChange={(e) => setVehicleForm({ ...vehicleForm, capacity_m3: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktiv</Label>
              <Switch
                checked={vehicleForm.active}
                onCheckedChange={(v) => setVehicleForm({ ...vehicleForm, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleDialogOpen(false)}>
              Annuller
            </Button>
            <Button 
              onClick={handleVehicleSubmit}
              disabled={createVehicleMutation.isPending || updateVehicleMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {(createVehicleMutation.isPending || updateVehicleMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingVehicle ? 'Gem ændringer' : 'Tilføj køretøj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}