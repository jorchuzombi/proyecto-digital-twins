// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { VehicleListComponent } from './vehicles/pages/vehicle-list/vehicle-list.component';
import { RouteListComponent } from './routes/pages/route-list/route-list.component';
import { RouteFormComponent } from './routes/pages/route-form/route-form.component';
import { ReportListComponent } from './reports/pages/report-list/report-list.component';

// Importar componentes de conductores
import { DriverListComponent } from './features/drivers/pages/driver-list/driver-list.component';
import { DriverFormComponent } from './features/drivers/pages/driver-form/driver-form.component';

// Placeholder components for missing features - these will need to be created
const TrackingDashboardComponent = DashboardComponent; // Temporary alias
const RouteTrackingComponent = DashboardComponent; // Temporary alias
const MaintenanceListComponent = DashboardComponent; // Temporary alias
const MaintenanceScheduleComponent = DashboardComponent; // Temporary alias
const MaintenanceDetailComponent = DashboardComponent; // Temporary alias
const ProfileViewComponent = DashboardComponent; // Temporary alias
const ProfileSettingsComponent = DashboardComponent; // Temporary alias
const ProfileSecurityComponent = DashboardComponent; // Temporary alias
const NotificationsCenterComponent = DashboardComponent; // Temporary alias
const UserManagementComponent = DashboardComponent; // Temporary alias
const SystemSettingsComponent = DashboardComponent; // Temporary alias
const SystemLogsComponent = DashboardComponent; // Temporary alias
const HelpCenterComponent = DashboardComponent; // Temporary alias
const DocumentationComponent = DashboardComponent; // Temporary alias
const FaqComponent = DashboardComponent; // Temporary alias
const ContactSupportComponent = DashboardComponent; // Temporary alias
const NotFoundComponent = DashboardComponent; // Temporary alias

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'vehicles', component: VehicleListComponent },

  // Rutas para gestión de rutas
  { path: 'routes', component: RouteListComponent },
  { path: 'routes/new', component: RouteFormComponent },
  { path: 'routes/:id', component: RouteFormComponent },
  { path: 'routes/:id/edit', component: RouteFormComponent },

  // Rutas para gestión de conductores
  { path: 'drivers', component: DriverListComponent },
  { path: 'drivers/new', component: DriverFormComponent },
  { path: 'drivers/edit/:id', component: DriverFormComponent },

  // Reportes
  { path: 'reports', component: ReportListComponent },

  // Analytics (alias para reportes)
  { path: 'analytics', redirectTo: '/reports', pathMatch: 'full' },

  // Feature routes with placeholder components
  { path: 'tracking/dashboard', component: TrackingDashboardComponent },
  { path: 'tracking/route-tracking', component: RouteTrackingComponent },
  { path: 'maintenance/list', component: MaintenanceListComponent },
  { path: 'maintenance/schedule', component: MaintenanceScheduleComponent },
  { path: 'maintenance/detail/:id', component: MaintenanceDetailComponent },
  { path: 'profile/view', component: ProfileViewComponent },
  { path: 'profile/settings', component: ProfileSettingsComponent },
  { path: 'profile/security', component: ProfileSecurityComponent },
  { path: 'notifications/center', component: NotificationsCenterComponent },
  { path: 'admin/user-management', component: UserManagementComponent },
  { path: 'admin/system-settings', component: SystemSettingsComponent },
  { path: 'admin/system-logs', component: SystemLogsComponent },
  { path: 'help/center', component: HelpCenterComponent },
  { path: 'help/documentation', component: DocumentationComponent },
  { path: 'help/faq', component: FaqComponent },
  { path: 'help/contact-support', component: ContactSupportComponent },

  // 404 Not Found
  { path: 'not-found', component: NotFoundComponent },
  { path: '**', redirectTo: '/not-found' }
];
