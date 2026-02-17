import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  Users, 
  Truck, 
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Building2,
  Shield,
  Crown,
  Sparkles,
  Zap,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import UpgradeOverlay from "@/components/UpgradeOverlay";

// Public pages that should not be wrapped in the authenticated app layout
const publicPages = ['Landing', 'PublicQuote', 'PublicQuoteRequest', 'CompanySignup', 'EmailSent', 'UserLogin', 'EmailVerification'];

const allNavigation = [
  { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard, requiredPlan: null },
  { name: 'Tilbud', href: 'Quotes', icon: FileText, requiredPlan: 'Starter' },
  { name: 'Kalender', href: 'Calendar', icon: Calendar, requiredPlan: 'Enterprise' },
  { name: 'Kunder', href: 'Customers', icon: Users, requiredPlan: 'Starter' },
  { name: 'Ressourcer', href: 'Resources', icon: Truck, requiredPlan: 'Enterprise' },
  { name: 'Min profil', href: 'Profile', icon: Settings, requiredPlan: null },
];

const planHierarchy = {
  'Starter': 1,
  'Professional': 2,
  'Enterprise': 3
};

const hasAccessToPage = (currentPlan, requiredPlan, isAdmin) => {
  if (!requiredPlan) return true;
  if (isAdmin) return true; // Admins always have full access
  if (!currentPlan) return false;
  return planHierarchy[currentPlan] >= planHierarchy[requiredPlan];
};

const adminNavigation = [
  { name: 'Administration', href: 'Administration', icon: Shield, adminOnly: true },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false);
  const [overlayData, setOverlayData] = useState({});
  const location = useLocation();

  // Check access and update overlay state
  useEffect(() => {
    const currentPage = allNavigation.find(nav => nav.href === currentPageName);
    
    // If no page found or no plan required, hide overlay
    if (!currentPage || !currentPage.requiredPlan) {
      setShowUpgradeOverlay(false);
      return;
    }

    // If organization not loaded yet, don't show overlay (wait for data)
    if (!organization) {
      return;
    }

    const hasAccess = hasAccessToPage(organization.subscription_plan, currentPage.requiredPlan, user?.is_platform_admin);
    
    if (!hasAccess) {
      setShowUpgradeOverlay(true);
      setOverlayData({
        requiredPlan: currentPage.requiredPlan,
        currentPlan: organization.subscription_plan,
        feature: currentPage.name
      });
    } else {
      setShowUpgradeOverlay(false);
    }
  }, [organization, currentPageName]);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Link user to company if not already linked
        if (currentUser && !currentUser.company_id) {
          try {
            await base44.functions.invoke('linkUserToCompany', {});
            // Reload user to get updated company_id
            const updatedUser = await base44.auth.me();
            setUser(updatedUser);
          } catch (e) {
            console.log('Could not auto-link user to company:', e);
          }
        }
      } catch (e) {
        // Silent fail for public pages (no user authenticated)
      }
    };
    loadUser();
  }, []);

  // Load company when user changes
  useEffect(() => {
    const loadCompany = async () => {
      const companyId = user?.company_id;
      console.log('loadCompany: companyId =', companyId);

      if (!companyId) {
        console.log('No company_id in user, trying to load by email instead');
        // Try to load company by email if no company_id
        if (user?.email) {
          try {
            const companies = await base44.entities.Company.filter({ email: user.email });
            if (companies.length > 0) {
              console.log('Found company by email:', companies[0]);
              setOrganization(companies[0]);
            }
          } catch (e) {
            console.error('Failed to load company by email:', e);
          }
        }
        return;
      }

     try {
       // Add a small delay if coming from checkout to allow webhook to process
       const params = new URLSearchParams(window.location.search);
       if (params.get('session_id')) {
         await new Promise(resolve => setTimeout(resolve, 2000));
       }

       const companies = await base44.entities.Company.filter({ id: companyId });
       if (companies.length > 0) {
         setOrganization(companies[0]);
         console.log('Loaded company by ID:', companies[0]);
       }
     } catch (e) {
       console.error('Failed to load company:', e);
     }
   };

   loadCompany();

    // Clean up URL after loading
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user?.company_id]);

  // Real-time subscription to Company changes
  useEffect(() => {
    const companyId = user?.company_id;
    if (!companyId) return;
    
    const unsubscribe = base44.entities.Company.subscribe((event) => {
      if (event.id === companyId && (event.type === 'update' || event.type === 'create')) {
        console.log('Company real-time update:', event.data);
        setOrganization(event.data);
      }
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.company_id, user?.data?.company_id]);

  // Public pages without layout - bypass everything
  if (publicPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Landing"));
  };

  const handleSubscribe = async (priceId, planName) => {
   try {
     // Check if running in iframe
     if (window.self !== window.top) {
       alert('Checkout fungerer kun fra den udgivne app. Besøg venligst appen direkte for at købe.');
       return;
     }

     // If not authenticated or no company, redirect to signup
     if (!user || !user.company_id) {
       window.location.href = createPageUrl('CompanySignup');
       return;
     }

     setCheckoutLoading(priceId);
     const response = await base44.functions.invoke('createCheckoutSession', {
       priceId,
       planName,
       companyId: user.company_id
     });

     console.log('Checkout response:', response);

     if (response?.data?.url) {
       console.log('Redirecting to:', response.data.url);
       window.location.href = response.data.url;
     } else {
       alert('Ingen checkout URL modtaget');
     }
   } catch (error) {
     console.error('Checkout error:', error);
     alert('Der opstod en fejl: ' + (error.message || 'Prøv igen'));
   } finally {
     setCheckoutLoading(null);
   }
  };

  const plans = [
    {
      name: 'Starter',
      price: '799',
      priceId: 'price_1T091uEhfL10WmXc3ossclnq',
      icon: Sparkles,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Enterprise',
      price: '2.000',
      priceId: 'price_1T0942EhfL10WmXcZ63sji1x',
      icon: Crown,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      highlighted: true
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">M</span>
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">MOMENTUM</span>
            </Link>
            <button 
              className="lg:hidden p-1 rounded-lg hover:bg-slate-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Organization info */}
          {organization && (
            <div className="px-4 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{organization.company_name}</p>
                  <p className="text-xs text-slate-500">{organization.cvr || 'Ingen CVR'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Current Plan Display */}
          {organization?.subscription_plan && (
            <div className="px-4 py-4 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-4">
                Din nuværende plan
              </h3>
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/20">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{organization.subscription_plan}</p>
                    <p className="text-xs text-white/80">
                      {organization.subscription_status === 'trialing' ? 'Prøveperiode' : 'Aktiv'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Plans - Only show if no active subscription */}
          {!organization?.subscription_plan && (
            <div className="px-4 py-4 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-4">
                Skift plan
              </h3>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <button
                    key={plan.name}
                    onClick={() => handleSubscribe(plan.priceId, plan.name)}
                    disabled={checkoutLoading === plan.priceId}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] bg-slate-50 hover:bg-slate-100"
                  >
                    <div className={`p-2 rounded-lg ${plan.bgColor}`}>
                      <plan.icon className={`w-4 h-4 ${plan.color}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-slate-900">
                        {plan.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {plan.price} kr/md
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3 px-2 text-center">
                14 dages gratis prøveperiode
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {allNavigation.map((item) => {
              const isActive = currentPageName === item.href;
              const hasAccess = hasAccessToPage(organization?.subscription_plan, item.requiredPlan, user?.is_platform_admin);
              
              console.log(`Nav item ${item.name}: currentPlan=${organization?.subscription_plan}, requiredPlan=${item.requiredPlan}, hasAccess=${hasAccess}`);
              
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.href)}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : hasAccess
                        ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        : 'text-slate-400 hover:bg-slate-50'}
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : hasAccess ? 'text-slate-400' : 'text-slate-300'}`} />
                  {item.name}
                  {!hasAccess && <Lock className="w-3 h-3 ml-auto text-slate-300" />}
                </Link>
              );
            })}
            
            {user?.is_platform_admin && (
              <>
                <div className="my-4 border-t border-slate-200" />
                {adminNavigation.map((item) => {
                  const isActive = currentPageName === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={createPageUrl(item.href)}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                        ${isActive 
                          ? 'bg-violet-50 text-violet-700' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                      `}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-slate-100">
            <Button 
              onClick={handleLogout}
              variant="outline" 
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log ud
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center px-6">
          <button 
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="p-6">
          <SubscriptionBanner company={organization} />
          {showUpgradeOverlay ? (
            <>
              <div className="blur-sm pointer-events-none select-none">
                {children}
              </div>
              <UpgradeOverlay 
                {...overlayData}
                onClose={() => setShowUpgradeOverlay(false)}
              />
            </>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}