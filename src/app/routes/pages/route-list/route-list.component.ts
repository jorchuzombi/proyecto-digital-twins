  // route-list.component.ts
  import { Component, OnInit, inject } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { FormsModule } from '@angular/forms';
  import { Router, RouterModule } from '@angular/router';
  // Importa RouteService en lugar de solo ListService para las acciones que lo necesitan
  import { RouteService } from '../../../services/route.service'; // Asegúrate de importar RouteService
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
    private routeService = inject(RouteService); // Inyecta RouteService
    private driverService = inject(DriverService);
    private listService = inject(ListService);
    private router = inject(Router);

    routes: any[] = [];
    filteredRoutes: any[] = [];
    drivers: any[] = [];
    loading = false;
    apiConnected = false;

    filters = {
      status: '',
      city: '',
      driver: ''
    };

    statusOptions = ['IN_PROGRESS', 'COMPLETED', 'PENDING', 'CANCELLED'];
    cityOptions: string[] = [];
    driverOptions: string[] = [];

    async ngOnInit() {
      console.log('🚀 Inicializando RouteListComponent...');
      await this.loadDrivers();
      await this.loadRoutes();
    }

    loadDrivers(): Promise<void> {
      return new Promise((resolve) => {
        console.log('👥 Cargando conductores...');

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

    loadRoutes(): Promise<void> {
      return new Promise((resolve) => {
        this.loading = true;
        console.log('🔄 Cargando rutas con paradas...');

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

            this.routes = routes.map(route => {
              const mapped = { ...route };

              // Mapear conductor
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

              // Procesar paradas
              mapped.stopsCount = 0;
              mapped.stopsNames = 'Sin paradas';

              if (route.stops && Array.isArray(route.stops) && route.stops.length > 0) {
                mapped.stopsCount = route.stops.length;
                const stopNames = route.stops
                  .slice(0, 3)
                  .map((stop: any) => {
                    if (typeof stop === 'object' && stop !== null) {
                      return stop.name || stop.address || 'Parada';
                    }
                    if (typeof stop === 'string') {
                      return stop;
                    }
                    return 'Parada';
                  })
                  .join(', ');
                mapped.stopsNames = stopNames;
                if (route.stops.length > 3) {
                  mapped.stopsNames += ` +${route.stops.length - 3} más`;
                }
              } else if (route.stopsNames && typeof route.stopsNames === 'string') {
                // Si ya viene procesado desde el API, usarlo directamente
                mapped.stopsNames = route.stopsNames;
              } else {
                // Si no hay paradas en la ruta actual, intentar cargarlas
                this.loadRouteStops(route.id).then(stops => {
                  if (stops && stops.length > 0) {
                    mapped.stopsCount = stops.length;
                    const stopNames = stops
                      .slice(0, 3)
                      .map((stop: any) => stop.name || stop.address || 'Parada')
                      .join(', ');
                    mapped.stopsNames = stopNames;
                    if (stops.length > 3) {
                      mapped.stopsNames += ` +${stops.length - 3} más`;
                    }
                  }
                });
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

    private loadRouteStops(routeId: string): Promise<any[]> {
      return new Promise((resolve) => {
        this.routeService.getRouteStops(routeId).subscribe({
          next: (stops: any[]) => {
            resolve(stops || []);
          },
          error: () => {
            resolve([]);
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
      // Valida que el ID exista antes de navegar
      if (!route.id) {
        console.error('❌ Intento de navegar a una ruta sin ID:', route);
        Swal.fire('Error', 'La ruta no tiene un ID válido.', 'error');
        return;
      }
      this.router.navigate(['/routes', route.id]);
    }

    editRoute(route: any) {
      // Valida que el ID exista antes de navegar
      if (!route.id) {
        console.error('❌ Intento de editar una ruta sin ID:', route);
        Swal.fire('Error', 'La ruta no tiene un ID válido.', 'error');
        return;
      }
      // Navega a la ruta de edición
      this.router.navigate(['/routes', route.id, 'edit']);
    }

    deleteRoute(route: any) {
      // Valida que el ID exista antes de intentar eliminar
      if (!route.id) {
        console.error('❌ Intento de eliminar una ruta sin ID:', route);
        Swal.fire('Error', 'La ruta no tiene un ID válido.', 'error');
        return;
      }

      Swal.fire({
        title: '¿Eliminar ruta?',
        text: `"${route.name || 'Ruta sin nombre'}"`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          // Usar routeService para eliminar
          this.routeService.deleteRoute(route.id).subscribe({
            next: () => {
              // Filtra la ruta eliminada de ambas listas
              this.routes = this.routes.filter(r => r.id !== route.id);
              this.filteredRoutes = this.filteredRoutes.filter(r => r.id !== route.id);
              Swal.fire('¡Eliminada!', '', 'success');
            },
            error: (error) => {
              console.error('❌ Error eliminando ruta:', error);
              Swal.fire('Error', 'No se pudo eliminar la ruta del servidor.', 'error');
            }
          });
        }
      });
    }

    optimizeRoute(route: any) {
      // Valida que el ID exista antes de intentar optimizar
      if (!route.id) {
        console.error('❌ Intento de optimizar una ruta sin ID:', route);
        Swal.fire('Error', 'La ruta no tiene un ID válido.', 'error');
        return;
      }

      if (route.status === 'COMPLETED') {
        Swal.fire('✅', 'Esta ruta ya está optimizada o completada.', 'info');
        return;
      }

      Swal.fire({
        title: '¿Optimizar ruta?',
        text: `"${route.name || 'Ruta sin nombre'}"`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Optimizar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          // Usar routeService para llamar al backend
          this.routeService.optimizeRoute(route.id).subscribe({
            next: (optimizedRouteData) => {
              console.log('✅ Ruta optimizada en backend:', optimizedRouteData);
              // Actualiza la ruta en la lista local con los datos optimizados
              const idx = this.routes.findIndex(r => r.id === route.id);
              if (idx !== -1) {
                // Actualiza solo los campos relevantes de la respuesta
                this.routes[idx].distance = optimizedRouteData.distance || this.routes[idx].distance;
                this.routes[idx].estimatedDuration = optimizedRouteData.estimatedDuration || this.routes[idx].estimatedDuration;
                this.routes[idx].stops = optimizedRouteData.stops || this.routes[idx].stops;
                this.routes[idx].status = optimizedRouteData.status || this.routes[idx].status; // O 'COMPLETED' si es el estado nuevo
                // Actualiza la vista
                this.filteredRoutes = [...this.routes];
              }
              Swal.fire({
                title: '✅ Ruta Optimizada',
                text: 'La secuencia de paradas ha sido optimizada exitosamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
            },
            error: (error) => {
              console.error('❌ Error optimizando ruta:', error);
              Swal.fire('Error', 'No se pudo optimizar la ruta en el servidor.', 'error');
            }
          });
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
          text: `${this.routes.length} rutas cargadas`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    }

    // ===== NUEVO MÉTODO =====
    /**
     * Método para actualizar la lista de rutas (alias de refreshData)
     */
    refreshRoutes() {
      this.refreshData();
    }
  }
