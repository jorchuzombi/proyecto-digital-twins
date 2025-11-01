import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RouteService } from '../../../services/route.service';
import { DriverService } from '../../../services/driver.service';
import { ListService } from '../../../services/list.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-route-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './route-list.component.html',
  styleUrls: ['./route-list.component.scss']
})
export class RouteListComponent implements OnInit {
  private routeService = inject(RouteService);
  private driverService = inject(DriverService);
  private listService = inject(ListService);
  private router = inject(Router);

  routes: any[] = [];
  filteredRoutes: any[] = [];
  drivers: any[] = [];
  loading = false;
  apiConnected = false;

  // Filtros
  filters = {
    status: '',
    city: '',
    driver: ''
  };

  // Opciones para filtros
  statusOptions = ['IN_PROGRESS', 'COMPLETED', 'PENDING', 'CANCELLED'];
  cityOptions: string[] = [];
  driverOptions: string[] = [];

  async ngOnInit() {
    console.log('🚀 Inicializando RouteListComponent...');
    await this.loadDrivers();
    await this.loadRoutes();
  }

  // ===== CARGAR CONDUCTORES =====
  loadDrivers(): Promise<void> {
    return new Promise((resolve) => {
      console.log('👥 Cargando conductores...');

      // Intentar primero con ListService (más rápido para disponibles)
      this.listService.getAvailableDrivers().subscribe({
        next: (drivers: any[]) => {
          this.drivers = drivers;
          this.driverOptions = drivers.map((d: any) =>
            `${d.nombre} ${d.apellido} - ${d.licencia}`
          );
          console.log(`✅ ${this.drivers.length} conductores cargados`);
          this.apiConnected = true;
          resolve();
        },
        error: () => {
          // Fallback a DriverService
          console.log('🔄 Intentando con DriverService...');
          this.driverService.getAllDrivers(0, 100).subscribe({
            next: (response: any) => {
              this.drivers = response.drivers || [];
              this.driverOptions = this.drivers.map((d: any) =>
                `${d.nombre} ${d.apellido} - ${d.licencia}`
              );
              console.log(`✅ ${this.drivers.length} conductores cargados`);
              this.apiConnected = true;
              resolve();
            },
            error: (error: any) => {
              console.error('❌ Error cargando conductores:', error);
              this.drivers = [];
              this.driverOptions = [];
              this.apiConnected = false;
              resolve();
            }
          });
        }
      });
    });
  }

  // ===== CARGAR RUTAS =====
  loadRoutes(): Promise<void> {
    return new Promise((resolve) => {
      this.loading = true;
      console.log('🔄 Cargando rutas...');

      this.listService.getAllRoutes().subscribe({
        next: (routes: any[]) => {
          console.log('📥 Rutas recibidas:', routes);

          if (!routes || routes.length === 0) {
            console.warn('⚠️ No hay rutas');
            this.routes = [];
            this.filteredRoutes = [];
            this.loading = false;
            resolve();
            return;
          }

          // Mapear con conductores
          this.routes = routes.map(route => {
            const mapped = { ...route };

            if (route.driverId && this.drivers.length > 0) {
              const driver = this.drivers.find(d => d.id === route.driverId);
              if (driver) {
                mapped.driver = driver;
                mapped.driverName = `${driver.nombre} ${driver.apellido} - ${driver.licencia}`;
              } else {
                mapped.driverName = 'Sin conductor asignado';
              }
            } else {
              mapped.driverName = 'Sin conductor asignado';
            }

            return mapped;
          });

          console.log(`✅ ${this.routes.length} rutas procesadas`);
          this.filteredRoutes = [...this.routes];
          this.extractCitiesFromData();
          this.loading = false;
          this.apiConnected = true;
          resolve();
        },
        error: (error: any) => {
          console.error('❌ Error:', error);
          this.routes = [];
          this.filteredRoutes = [];
          this.loading = false;
          this.apiConnected = false;

          Swal.fire({
            icon: 'error',
            title: 'Error de Conexión',
            text: 'No se pudieron cargar las rutas',
            confirmButtonText: 'Reintentar',
            showCancelButton: true
          }).then((result) => {
            if (result.isConfirmed) this.refreshData();
          });

          resolve();
        }
      });
    });
  }

  private extractCitiesFromData() {
    const cities = new Set(
      this.routes
        .map(route => route.city)
        .filter(city => city && city !== 'No especificada')
    );
    this.cityOptions = Array.from(cities) as string[];
  }

  getActiveRoutesCount(): number {
    return this.routes.filter(r => r.status === 'IN_PROGRESS').length;
  }

  getOptimizedRoutesCount(): number {
    return this.routes.filter(r => r.status === 'COMPLETED').length;
  }

  getTotalRevenue(): number {
    return this.routes.reduce((t, r) => t + (r.revenue || 0), 0);
  }

  getTotalProfit(): number {
    return this.routes.reduce((t, r) =>
      t + ((r.revenue || 0) - (r.fuelCost || 0)), 0
    );
  }

  applyFilters() {
    this.filteredRoutes = this.routes.filter(route => {
      return (!this.filters.status || route.status === this.filters.status) &&
             (!this.filters.city || route.city === this.filters.city) &&
             (!this.filters.driver || route.driverName === this.filters.driver);
    });
  }

  clearFilters() {
    this.filters = { status: '', city: '', driver: '' };
    this.filteredRoutes = [...this.routes];
  }

  getStatusBadgeClass(status: string): string {
    const classes: any = {
      'IN_PROGRESS': 'badge-success',
      'COMPLETED': 'badge-primary',
      'PENDING': 'badge-warning',
      'CANCELLED': 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
  }

  getStatusText(status: string): string {
    const texts: any = {
      'IN_PROGRESS': 'En Progreso',
      'COMPLETED': 'Completada',
      'PENDING': 'Pendiente',
      'CANCELLED': 'Cancelada'
    };
    return texts[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: any = {
      'IN_PROGRESS': '🚚',
      'COMPLETED': '✅',
      'PENDING': '⏱️',
      'CANCELLED': '❌'
    };
    return icons[status] || '📦';
  }

  viewRoute(route: any) {
    this.router.navigate(['/routes', route.id]);
  }

  editRoute(route: any) {
    this.router.navigate(['/routes', route.id, 'edit']);
  }

  deleteRoute(route: any) {
    Swal.fire({
      title: '¿Eliminar ruta?',
      text: `"${route.name}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Eliminar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.listService.deleteRoute(route.id).subscribe({
          next: () => {
            this.routes = this.routes.filter(r => r.id !== route.id);
            this.filteredRoutes = this.filteredRoutes.filter(r => r.id !== route.id);
            Swal.fire('¡Eliminada!', '', 'success');
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
        });
      }
    });
  }

  optimizeRoute(route: any) {
    if (route.status === 'COMPLETED') {
      Swal.fire('✅', 'Ya está optimizada', 'info');
      return;
    }

    Swal.fire({
      title: '¿Optimizar?',
      text: `"${route.name}"`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Optimizar'
    }).then((result) => {
      if (result.isConfirmed) {
        const idx = this.routes.findIndex(r => r.id === route.id);
        if (idx !== -1) {
          this.routes[idx].status = 'COMPLETED';
          this.filteredRoutes = [...this.routes];
        }
        Swal.fire('⚡ Optimizada', '', 'success');
      }
    });
  }

  navigateToNewRoute() {
    this.router.navigate(['/routes/new']);
  }

  calculateProfit(route: any): number {
    return (route.revenue || 0) - (route.fuelCost || 0);
  }

  getProfitPercentage(route: any): number {
    if (!route.revenue) return 0;
    return (this.calculateProfit(route) / route.revenue) * 100;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  async refreshData() {
    Swal.fire({
      title: 'Actualizando...',
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => Swal.showLoading()
    });

    await this.loadDrivers();
    await this.loadRoutes();

    Swal.close();

    if (this.apiConnected) {
      Swal.fire({
        title: '✅ Actualizado',
        text: `${this.routes.length} rutas`,
        icon: 'success',
        timer: 1500
      });
    }
  }
}
