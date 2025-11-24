// src/app/components/dashboard/dashboard.component.ts
import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RouteService } from '../services/route.service';
import { DriverService } from '../services/driver.service';
import { RealTimeRoutingService, VehiclePosition, OptimizedRoute } from '../services/real-time-routing.service';
import { RoutingService } from '../services/routing.service';
import Swal from 'sweetalert2';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VehicleSimulatorService } from '../services/vehicle-simulator.service';

// Corrección para íconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/marker-icon-2x.png',
  iconUrl: 'assets/marker-icon.png',
  shadowUrl: 'assets/marker-shadow.png',
});

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private routeService = inject(RouteService);
  private authService = inject(AuthService);
  private driverService = inject(DriverService);
  private realtimeService = inject(RealTimeRoutingService);
  private routingService = inject(RoutingService);
  private router = inject(Router);
  private simulator = inject(VehicleSimulatorService);
  private destroy$ = new Subject<void>();

  private isComponentDestroyed = false; // Nueva bandera
  currentUser: any;
  map: L.Map | null = null;
  isLoading = true;
  mapLoading = false;
  mapInitialized = false;
  apiConnected = false;

  private vehicleMarkers = new Map<string, L.Marker>();
  private routePolylines = new Map<string, L.Polyline>();
  private routeBorders = new Map<string, L.Polyline>();

  stats = {
    vehicles: 0,
    deliveries: 0,
    optimized: 0,
    savings: 42,
    drivers: 0,
    activeDrivers: 0,
    availableDrivers: 0
  };

  // NUEVAS PROPIEDADES UNIFICADAS
  activeRoutes: any[] = [];
  allRoutes: any[] = [];
  driversInRoute: any[] = [];
  availableDrivers: any[] = [];
  vehiclePositions = new Map<string, VehiclePosition>();
  trafficStatus: Map<string, any> = new Map();

  availableCities = [
    { id: 'bogota', name: 'Bogotá, Colombia', lat: 4.6097, lng: -74.0817, zoom: 13 },
    { id: 'medellin', name: 'Medellín, Colombia', lat: 6.2442, lng: -75.5812, zoom: 13 },
    { id: 'cali', name: 'Cali, Colombia', lat: 3.4516, lng: -76.5320, zoom: 13 }
  ];
  selectedCity = 'bogota';

  constructor() {
    (window as any).angularComponent = this;
  }

  ngOnInit() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch (e) {
        this.router.navigate(['/login']);
        return;
      }
    }
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadUnifiedData();
    this.subscribeToRealTimeUpdates();
    this.startPeriodicSync();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (!this.isLoading && !this.mapInitialized) {
        console.log('🗺️ Iniciando mapa desde AfterViewInit');
        this.initWorldMap();
      }
    }, 800);
  }

  ngOnDestroy() {
    console.log('🧹 Limpiando componente Dashboard...');
    // Detener simulador
    this.simulator.stopSimulation();
    // Marcar componente como destruido PRIMERO
    this.isComponentDestroyed = true;
    this.mapInitialized = false;
    // Desuscribirse de observables
    this.destroy$.next();
    this.destroy$.complete();
    // Limpieza completa del mapa
    this.cleanupMap();
  }

  private async loadUnifiedData() {
    console.log('🔄 Cargando datos unificados desde sistema de rutas...');
    try {
      this.routeService.getAllRoutes().subscribe({
        next: (routes: any[]) => {
          console.log(`📦 ${routes.length} rutas totales recibidas`);
          this.allRoutes = routes;
          this.activeRoutes = routes.filter(r =>
            r.status === 'IN_PROGRESS' || r.status === 'PENDING'
          );
          console.log(`🚚 ${this.activeRoutes.length} rutas activas`);
          this.extractDriversFromRoutes();
          this.loadAvailableDriversOnly();
          this.updateStats();
          setTimeout(() => this.checkAndStartPendingRoutes(), 2000);
          this.apiConnected = true;
        },
        error: (error) => {
          console.error('❌ Error cargando rutas:', error);
          this.apiConnected = false;
        }
      });

      this.realtimeService.getVehiclePositions().subscribe({
        next: (positions: Map<string, VehiclePosition>) => {
          this.vehiclePositions = positions;
          this.updateDriversInRouteWithPositions(positions);
          console.log(`✅ ${positions.size} posiciones iniciales cargadas`);
        },
        error: (error) => {
          console.error('❌ Error cargando posiciones iniciales:', error);
          this.vehiclePositions.clear();
        }
      });
    } catch (error) {
      console.error('❌ Error en carga unificada:', error);
    }
    this.isLoading = false;
    setTimeout(() => {
      this.initWorldMap();
      setTimeout(() => this.syncDriverStatusWithRoutes(), 2000);
    }, 300);
  }

  private extractDriversFromRoutes() {
    console.log('👥 Extrayendo conductores desde rutas activas...');
    this.driversInRoute = [];
    const processedDrivers = new Set<string>();

    this.activeRoutes.forEach(route => {
      if (!route.driverId || processedDrivers.has(route.driverId)) {
        return;
      }

      const vehiclePosition = this.vehiclePositions.get(route.vehicle) || this.vehiclePositions.get(route.driverId);

      const driverInRoute = {
        id: route.driverId,
        name: vehiclePosition?.driverName || route.driverId,
        vehicle: route.vehicle,
        routeId: route.id,
        routeName: route.name,
        status: 'EN_RUTA',
        speed: vehiclePosition?.speed || 0,
        location: vehiclePosition ? { lat: vehiclePosition.latitude, lng: vehiclePosition.longitude } : null,
        trafficLevel: vehiclePosition?.trafficLevel || 'UNKNOWN',
        stops: route.stops?.length || 0,
        completedStops: route.stops ? route.stops.completedStops : route.stops?.filter((s: any) => s.completed).length || 0,
        eta: vehiclePosition?.eta,
        lastUpdate: vehiclePosition?.lastUpdate || new Date(),
        routeStatus: route.status,
        distance: route.distance,
        estimatedDuration: route.estimatedDuration
      };

      this.driversInRoute.push(driverInRoute);
      processedDrivers.add(route.driverId);
      console.log(`✅ Conductor agregado: ${driverInRoute.name} - Ruta: ${route.name}`);
    });

    console.log(`📊 Total conductores en ruta: ${this.driversInRoute.length}`);
    this.stats.activeDrivers = this.driversInRoute.length;
  }

  private loadAvailableDriversOnly() {
    console.log('🔍 Buscando conductores disponibles (sin rutas)...');
    this.driverService.getAvailableDrivers().subscribe({
      next: (allDrivers: any[]) => {
        const driversInRouteIds = new Set(this.driversInRoute.map(d => d.id));
        this.availableDrivers = allDrivers.filter(driver => {
          if (driversInRouteIds.has(driver.id)) {
            return false;
          }
          return driver.disponibilidad === 'DISPONIBLE' && driver.estado === 'ACTIVO';
        }).map(driver => ({
          id: driver.id,
          name: `${driver.nombre} ${driver.apellido}`,
          email: driver.email,
          phone: driver.telefono,
          license: driver.licencia,
          status: 'DISPONIBLE',
          vehicleType: driver.vehicleType || 'N/A'
        }));

        console.log(`✅ ${this.availableDrivers.length} conductores disponibles (sin rutas)`);
        this.stats.availableDrivers = this.availableDrivers.length;
        this.stats.drivers = this.availableDrivers.length + this.driversInRoute.length;
      },
      error: (error) => {
        console.error('❌ Error cargando conductores disponibles:', error);
        this.availableDrivers = [];
      }
    });
  }

  private updateDriversInRouteWithPositions(positions: Map<string, VehiclePosition>) {
    this.driversInRoute.forEach(driver => {
      const position = positions.get(driver.vehicle) || positions.get(driver.id);
      if (position) {
        driver.speed = position.speed;
        driver.location = { lat: position.latitude, lng: position.longitude };
        driver.trafficLevel = position.trafficLevel;
        driver.eta = position.eta;
        driver.lastUpdate = position.lastUpdate;

        this.trafficStatus.set(driver.id, {
          level: position.trafficLevel || 'UNKNOWN',
          icon: this.getTrafficIcon(position.trafficLevel || 'UNKNOWN'),
          color: this.getTrafficColor(position.trafficLevel || 'UNKNOWN'),
          lastUpdate: position.lastUpdate
        });
      }
    });
  }

  private subscribeToRealTimeUpdates() {
    console.log('📡 Suscribiendo a actualizaciones en tiempo real...');
    this.realtimeService.getVehiclePositions().pipe(takeUntil(this.destroy$)).subscribe({
      next: (positions: Map<string, VehiclePosition>) => {
        this.vehiclePositions = positions;
        this.updateDriversInRouteWithPositions(positions);

        // Solo actualizar marcadores si el mapa está completamente inicializado
        if (this.mapInitialized && this.map) {
          this.updateVehicleMarkersRealTime(positions);
        } else {
          console.log('⏳ Mapa no inicializado, esperando para actualizar marcadores...');
          // Intentar actualizar marcadores una vez que el mapa esté listo
          this.waitForMapAndUpdateMarkers(positions);
        }

        console.log(`🚗 ${positions.size} posiciones actualizadas`);
      },
      error: (error: any) => {
        console.error('❌ Error obteniendo posiciones:', error);
        this.apiConnected = false;
      }
    });

    setInterval(() => {
      if (this.apiConnected) {
        this.loadUnifiedData();
      }
    }, 15000);
  }

  private startPeriodicSync() {
    setInterval(() => {
      if (this.apiConnected && this.mapInitialized) {
        console.log('🔄 Sincronización periódica...');
        this.syncDriverStatusWithRoutes();
      }
    }, 30000);
  }

  private syncDriverStatusWithRoutes() {
    console.log('🔄 Sincronizando estados con rutas activas...');
    const driversWithActiveRoutes = new Set(this.activeRoutes.filter(r => r.status === 'IN_PROGRESS' && r.driverId).map(r => r.driverId));

    this.vehiclePositions.forEach((position, vehicleId) => {
      const hasActiveRoute = driversWithActiveRoutes.has(position.driverName) || driversWithActiveRoutes.has(vehicleId);

      if (position.status === 'BUSY' && !hasActiveRoute) {
        console.warn(`⚠️ ${position.driverName} marcado EN_RUTA sin ruta activa`);
        this.updateDriverAvailabilityFull(vehicleId, position.driverName, 'DISPONIBLE');
      }

      if (position.status !== 'BUSY' && hasActiveRoute) {
        console.warn(`⚠️ ${position.driverName} tiene ruta pero no marcado EN_RUTA`);
        this.updateDriverAvailabilityFull(vehicleId, position.driverName, 'EN_RUTA');
      }
    });
  }

  private updateDriverAvailabilityFull(vehicleId: string, driverName: string, disponibilidad: 'DISPONIBLE' | 'EN_RUTA' | 'DESCANSO') {
    console.log(`🔄 Actualizando ${driverName} a ${disponibilidad}`);
    this.vehiclePositions.forEach((position, vId) => {
      if (vId === vehicleId || position.driverName === driverName) {
        const newStatus = disponibilidad === 'DISPONIBLE' ? 'AVAILABLE' : 'BUSY';
        position.status = newStatus;
        const marker = this.vehicleMarkers.get(vId);
        if (marker) {
          this.updateVehicleIcon(marker, position);
          this.updateVehiclePopup(vId, position);
        }
      }
    });
    console.log(`ℹ️ Actualización solo local (backend desactivado para demo)`);
  }

  private waitForMapAndUpdateMarkers(positions: Map<string, VehiclePosition>) {
    if (this.mapInitialized && this.map) {
      // Mapa ya está listo, actualizar inmediatamente
      this.updateVehicleMarkersRealTime(positions);
      return;
    }

    // Esperar hasta que el mapa esté inicializado
    const checkMapReady = () => {
      if (this.mapInitialized && this.map && !this.isComponentDestroyed) {
        console.log('✅ Mapa listo, actualizando marcadores pendientes...');
        this.updateVehicleMarkersRealTime(positions);
      } else if (!this.isComponentDestroyed) {
        // Seguir esperando
        setTimeout(checkMapReady, 100);
      }
    };

    setTimeout(checkMapReady, 100);
  }

  checkAndStartPendingRoutes() {
    console.log('🔍 Verificando rutas pendientes...');
    const pendingRoutes = this.allRoutes.filter(route =>
      route.status === 'PENDING' &&
      route.driverId &&
      route.vehicle &&
      Array.isArray(route.stops) &&
      route.stops.length > 0
    );
    console.log(`📋 ${pendingRoutes.length} rutas pendientes encontradas`);
    if (pendingRoutes.length === 0) return;

    pendingRoutes.forEach((route, index) => {
      setTimeout(() => {
        this.assignAndStartRoute(route);
      }, index * 1500);
    });
  }

  private assignAndStartRoute(route: any) {
    console.log(`🔄 Asignando e iniciando ruta: ${route.name}`);
    if (!route.id || !route.vehicle || !route.driverId || !route.stops?.length) {
      console.error('❌ Datos de ruta incompletos');
      return;
    }

    this.realtimeService.assignRouteToVehicle(route.id, route.vehicle, route.driverId, route.stops).subscribe({
      next: (optimizedRoute) => {
        console.log('✅ Ruta asignada');
        setTimeout(() => {
          this.realtimeService.startRoute(route.id).subscribe({
            next: (success) => {
              if (success) {
                console.log('✅ Ruta iniciada');
                route.status = 'IN_PROGRESS';
                if (route.driverId) {
                  this.updateDriverAvailabilityFull(route.driverId, route.driverId, 'EN_RUTA');
                }
                Swal.fire({
                  title: '¡Ruta Iniciada! 🚀',
                  text: route.name,
                  icon: 'success',
                  timer: 2000,
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false
                });

                if (this.mapInitialized && route.stops?.length > 1) {
                  const waypoints = route.stops.map((stop: any) => L.latLng(stop.latitude, stop.longitude));
                  this.drawRealRoute(route.id, waypoints);
                }
                setTimeout(() => this.loadUnifiedData(), 1000);
              }
            },
            error: (error) => {
              console.error('❌ Error iniciando ruta:', error);
            }
          });
        }, 500);
      },
      error: (error) => {
        console.error('❌ Error asignando ruta:', error);
      }
    });
  }

  completeRouteManually(route: any) {
    if (!route || !route.id) return;
    console.log(`🏁 Completando ruta: ${route.id}`);

    this.realtimeService.completeRoute(route.id).subscribe({
      next: (success) => {
        if (success) {
          route.status = 'COMPLETED';
          if (route.driverId) {
            this.updateDriverAvailabilityFull(route.driverId, route.driverId, 'DISPONIBLE');
          }
          Swal.fire({
            title: '¡Ruta Completada! 🎉',
            text: `${route.name || 'Ruta'} completada`,
            icon: 'success',
            timer: 2500,
            toast: true,
            position: 'top-end',
            showConfirmButton: false
          });
          setTimeout(() => this.loadUnifiedData(), 1000);
        }
      },
      error: (error) => {
        console.error('❌ Error completando ruta:', error);
        Swal.fire('Error', 'No se pudo completar la ruta', 'error');
      }
    });
  }

  // ================================================================
  // MÉTODOS DE MAPA (CORREGIDOS)
  // ================================================================
  private initWorldMap() {
    // Evitar múltiples inicializaciones
    if (this.mapInitialized || this.isComponentDestroyed) {
      console.log('⚠️ Mapa ya inicializado o componente destruido, saltando...');
      return;
    }

    setTimeout(() => {
      // Verificar nuevamente después del timeout
      if (this.isComponentDestroyed) {
        console.log('⚠️ Componente destruido durante inicialización, abortando...');
        return;
      }

      const mapElement = document.getElementById('map');
      if (!mapElement || mapElement.offsetWidth === 0) {
        console.log('⏳ Esperando elemento del mapa...');
        // CRITICAL FIX: Reset the flag here so the next call can proceed.
        this.mapInitialized = false; // <-- Add this line
        if (!this.isComponentDestroyed) {
          setTimeout(() => this.initWorldMap(), 300);
        }
        return;
      }

      try {
        // Limpieza completa del mapa anterior
        if (this.map) {
          console.log('🧹 Limpiando mapa anterior...');
          try {
            // Desactivar eventos
            this.map.off();
            this.map.stop();
            // Remover marcadores
            this.vehicleMarkers.forEach(marker => {
              try {
                marker.off();
                marker.remove();
              } catch (e) { }
            });
            this.vehicleMarkers.clear();
            // Remover rutas
            this.routePolylines.forEach(polyline => {
              try {
                polyline.off();
                polyline.remove();
              } catch (e) { }
            });
            this.routePolylines.clear();
            this.routeBorders.forEach(border => {
              try {
                border.off();
                border.remove();
              } catch (e) { }
            });
            this.routeBorders.clear();
            // Remover todas las capas
            this.map.eachLayer((layer) => {
              try {
                this.map?.removeLayer(layer);
              } catch (e) { }
            });
            // Remover el mapa
            this.map.remove();
          } catch (e) {
            console.warn('Error limpiando mapa:', e);
          }
          this.map = null;
          this.mapInitialized = false; // Asegura que se reinicie si la limpieza falla
        }

        // Verificar si el componente fue destruido durante la limpieza
        if (this.isComponentDestroyed) {
          console.log('⚠️ Componente destruido durante limpieza, abortando...');
          return;
        }

        // Limpiar el contenedor HTML
        mapElement.innerHTML = '';
        (mapElement as any)._leaflet_id = null;
        delete (mapElement as any)._leaflet_id;

        this.mapLoading = true;
        mapElement.style.height = '550px';
        console.log('🗺️ Inicializando nuevo mapa...');

        const selectedCity = this.availableCities.find(city => city.id === this.selectedCity) || this.availableCities[0];
        this.map = L.map('map', {
          center: [selectedCity.lat, selectedCity.lng],
          zoom: selectedCity.zoom,
          zoomControl: true,
          attributionControl: true,
          // Prevenir interacciones durante la inicialización
          dragging: false,
          touchZoom: false,
          doubleClickZoom: false,
          scrollWheelZoom: false,
          boxZoom: false,
          keyboard: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 3
        }).addTo(this.map);

        // Habilitar interacciones después de que el mapa esté completamente cargado
        setTimeout(() => {
          if (this.map && !this.isComponentDestroyed) {
            this.map.dragging.enable();
            this.map.touchZoom.enable();
            this.map.doubleClickZoom.enable();
            this.map.scrollWheelZoom.enable();
            this.map.boxZoom.enable();
            this.map.keyboard.enable();
            this.map.invalidateSize(true);
            // Solo se marca como inicializado DESPUÉS de que todo esté listo
            this.mapInitialized = true;
            this.mapLoading = false;
            console.log('✅ Mapa inicializado correctamente');
            this.drawActiveRoutes();

            // Después de que el mapa se inicialice completamente
            setTimeout(() => {
              if (this.mapInitialized && this.map && !this.isComponentDestroyed) {
                console.log('✅ Mapa listo, iniciando visualización de vehículos del BACKEND...');

                // ✅ NUEVA VERSIÓN - Solo visualiza, no simula
                this.simulator.startSimulation(this.map);

                // Suscribirse a actualizaciones
                this.simulator.positionUpdates$.pipe(
                  takeUntil(this.destroy$)
                ).subscribe(position => {
                  this.vehiclePositions.set(position.vehicleId, position);
                });
              }
            }, 500);
          } else if (this.isComponentDestroyed) {
            console.log('⚠️ Componente destruido, no se finalizó inicialización del mapa');
          }
        }, 200);

      } catch (error) {
        console.error('❌ Error inicializando mapa:', error);
        this.mapLoading = false;
        this.mapInitialized = false; // Asegura que se pueda reintentar
        if (error instanceof Error && error.message.includes('already initialized')) {
          console.log('🔄 Intentando recuperación del mapa...');
          this.cleanupMap();
          setTimeout(() => this.initWorldMap(), 500);
        }
      }
    }, 300);
  }

  /**
   * 🔄 Actualizar marcadores de vehículos (SOLO UNO POR RUTA)
   */
  private updateVehicleMarkersRealTime(positions: Map<string, VehiclePosition>) {
    if (!this.map || !this.mapInitialized) {
      console.warn('⚠️ Mapa no inicializado');
      return;
    }

    try {
      // 🔥 CRÍTICO: Filtrar para mostrar SOLO UN vehículo por ruta
      const uniqueVehicles = new Map<string, VehiclePosition>();

      positions.forEach((position, vehicleId) => {
        const routeId = position.currentRouteId;

        // Si ya existe un vehículo para esta ruta, mantener el primero
        if (routeId) {
          if (!uniqueVehicles.has(routeId)) {
            uniqueVehicles.set(vehicleId, position);
          }
        } else {
          // Vehículos sin ruta se agregan normalmente
          uniqueVehicles.set(vehicleId, position);
        }
      });

      console.log(`🚗 Mostrando ${uniqueVehicles.size} vehículos únicos (de ${positions.size} totales)`);

      // Actualizar o crear marcadores SOLO para vehículos únicos
      uniqueVehicles.forEach((position, vehicleId) => {
        const existingMarker = this.vehicleMarkers.get(vehicleId);

        if (existingMarker) {
          try {
            if (existingMarker.getElement()) {
              this.animateMarkerMovement(existingMarker, L.latLng(position.latitude, position.longitude), position.heading || 0);
              this.updateVehicleIcon(existingMarker, position);
              this.updateVehiclePopup(vehicleId, position);
            } else {
              this.vehicleMarkers.delete(vehicleId);
              this.createVehicleMarker(position);
            }
          } catch (e) {
            console.warn(`Error actualizando marcador ${vehicleId}:`, e);
            this.vehicleMarkers.delete(vehicleId);
            this.createVehicleMarker(position);
          }
        } else {
          this.createVehicleMarker(position);
        }
      });

      // Limpiar marcadores que ya no existen
      this.vehicleMarkers.forEach((marker, vehicleId) => {
        if (!uniqueVehicles.has(vehicleId)) {
          try {
            if (this.map && marker.getElement()) {
              this.map.removeLayer(marker);
            }
            this.vehicleMarkers.delete(vehicleId);
          } catch (error) {
            console.warn(`Error removiendo marcador ${vehicleId}:`, error);
            this.vehicleMarkers.delete(vehicleId);
          }
        }
      });

    } catch (error) {
      console.error('Error actualizando marcadores:', error);
    }
  }

  private createVehicleMarker(position: VehiclePosition) {
    if (!this.map || !this.mapInitialized) {
      console.warn('⚠️ Mapa no inicializado, no se puede crear marcador');
      return;
    }

    try {
      const icon = this.getVehicleIcon(position);
      const marker = L.marker([position.latitude, position.longitude], {
        icon,
        // Prevenir errores de interacción
        interactive: true
      }).addTo(this.map);

      // Verificar que el marcador se agregó correctamente
      if (marker && this.map) {
        this.vehicleMarkers.set(position.vehicleId, marker);
        this.updateVehiclePopup(position.vehicleId, position);
      }
    } catch (error) {
      console.error('Error creando marcador:', error);
    }
  }

  private getVehicleIcon(position: VehiclePosition): L.DivIcon {
    const statusColor = this.getStatusColor(position.status);
    const rotation = position.heading || 0;
    let vehicleIcon = position.status === 'BUSY' ? '🚚' : '🚗';
    let pulseClass = position.status === 'BUSY' ? 'pulse-busy' : 'pulse-available';

    // Agregar animación aleatoria para vehículos
    const vehicleAnimations = ['vehicle-teleport', 'vehicle-starburst', 'vehicle-heartbeat'];
    const randomVehicleAnimation = vehicleAnimations[Math.floor(Math.random() * vehicleAnimations.length)];

    return L.divIcon({
      html: `<div class="vehicle-marker-realtime ${pulseClass} ${randomVehicleAnimation}"
                  style="transform: rotate(${rotation}deg);">
                  <div class="vehicle-icon-large" style="background: ${statusColor};">
                    <span style="font-size: 24px;">${vehicleIcon}</span>
                  </div>
                  <div class="pulse-ring" style="border-color: ${statusColor};"></div>
                 </div>`,
      className: 'custom-moving-vehicle',
      iconSize: [50, 50],
      iconAnchor: [25, 25]
    });
  }

  private updateVehicleIcon(marker: L.Marker, position: VehiclePosition) {
    try {
      marker.setIcon(this.getVehicleIcon(position));
    } catch (error) {
      console.error('Error actualizando icono:', error);
    }
  }

  private animateMarkerMovement(marker: L.Marker, newPos: L.LatLng, heading: number) {
    if (!this.mapInitialized) return;

    try {
      // Verificar que el marcador todavía existe y está en el mapa
      if (!marker.getElement()) {
        console.warn('Marcador no está en el DOM, omitiendo animación');
        return;
      }

      const currentPos = marker.getLatLng();
      const steps = 10;
      let currentStep = 0;

      const latStep = (newPos.lat - currentPos.lat) / steps;
      const lngStep = (newPos.lng - currentPos.lng) / steps;

      const animate = () => {
        if (!this.mapInitialized || !marker.getElement()) {
          return; // Detener animación si el mapa se destruyó
        }
        if (currentStep >= steps) return;
        currentStep++;

        try {
          marker.setLatLng(L.latLng(
            currentPos.lat + (latStep * currentStep),
            currentPos.lng + (lngStep * currentStep)
          ));
          requestAnimationFrame(animate);
        } catch (e) {
          console.warn('Error durante animación de marcador:', e);
        }
      };
      animate();
    } catch (error) {
      console.error('Error animando marcador:', error);
    }
  }

  private updateVehiclePopup(vehicleId: string, position: VehiclePosition) {
    if (!this.mapInitialized) return;
    const marker = this.vehicleMarkers.get(vehicleId);
    if (!marker) return;

    try {
      // Verificar que el marcador todavía está en el mapa
      if (!marker.getElement()) {
        console.warn('Marcador no está en el DOM, omitiendo actualización de popup');
        return;
      }

      marker.bindPopup(`<div class="vehicle-popup-realtime">
                          <h4>🚗 ${position.driverName}</h4>
                          <p><strong>Estado:</strong> ${this.getStatusText(position.status)}</p>
                          <p><strong>Velocidad:</strong> ${position.speed.toFixed(0)} km/h</p>
                          ${position.eta ? `<p><strong>ETA:</strong> ${position.eta}</p>` : ''}
                          ${position.currentRouteId ? `<p><strong>Ruta:</strong> ${position.currentRouteId}</p>` : ''}
                        </div>`, {
        maxWidth: 320,
        closeButton: true,
        autoClose: false
      });
    } catch (error) {
      console.error('Error actualizando popup:', error);
    }
  }

  /**
   * 🗺️ Dibujar ruta REAL con banderas, marcadores y animaciones
   */
  drawRealRoute(routeId: string, waypoints: L.LatLng[]) {
    if (!this.map || !this.mapInitialized || waypoints.length < 2) {
      console.warn('⚠️ No se puede dibujar ruta: mapa no listo o waypoints insuficientes');
      return;
    }

    const coordinates = waypoints.map(wp => [wp.lat, wp.lng] as [number, number]);

    this.routingService.getRealRoute(coordinates).subscribe({
      next: (realRoute) => {
        if (!realRoute || !realRoute.coordinates.length || !this.map || !this.mapInitialized) {
          return;
        }

        try {
          const routeCoordinates = realRoute.coordinates.map(coord => L.latLng(coord[0], coord[1]));

          // Limpiar ruta anterior si existe
          const existingPolyline = this.routePolylines.get(routeId);
          if (existingPolyline && this.map) {
            try { existingPolyline.remove(); } catch (e) {}
          }

          // 🎨 Dibujar ruta con animaciones INTERACTIVAS
          if (this.map) {
            // Borde/sombra de la ruta
            const routeBorder = L.polyline(routeCoordinates, {
              color: '#1e293b',
              weight: 10,
              opacity: 0.3,
              lineJoin: 'round',
              lineCap: 'round',
              className: 'route-shadow'
            }).addTo(this.map);

            // Ruta principal con animación
            const routeAnimations = [
              'route-snake',
              'route-energy',
              'route-rainbow',
              'route-fire'
            ];
            const randomAnimation = routeAnimations[Math.floor(Math.random() * routeAnimations.length)];

            const polyline = L.polyline(routeCoordinates, {
              color: '#3b82f6',
              weight: 6,
              opacity: 0.9,
              interactive: true,
              className: `route-drawing ${randomAnimation}`,
              lineJoin: 'round',
              lineCap: 'round'
            }).addTo(this.map);

            // Popup para la ruta
            polyline.bindPopup(`
              <div class="route-popup-enhanced">
                <h4>🛣️ ${routeId}</h4>
                <p><strong>Distancia:</strong> ${(realRoute.distance / 1000).toFixed(2)} km</p>
                <p><strong>Duración:</strong> ${Math.ceil(realRoute.duration / 60)} min</p>
                <p><strong>Puntos:</strong> ${routeCoordinates.length}</p>
                <p><strong>Animación:</strong> ${randomAnimation.replace('route-', '').toUpperCase()}</p>
              </div>
            `);

            // Efecto hover para resaltar la ruta
            polyline.on('mouseover', () => {
              polyline.setStyle({ weight: 8, opacity: 1 });
            });
            polyline.on('mouseout', () => {
              polyline.setStyle({ weight: 6, opacity: 0.9 });
            });

            this.routePolylines.set(routeId, polyline);
            this.routeBorders.set(routeId, routeBorder);

            // 🚩 BANDERAS DE INICIO Y FIN
            this.addStartAndEndFlags(waypoints);

            // 🔢 MARCADORES NUMERADOS PARA LAS PARADAS
            this.addStopMarkers(waypoints);

            console.log(`✅ Ruta ${routeId} dibujada con ${randomAnimation}`);
          }
        } catch (error) {
          console.error(`Error dibujando ruta ${routeId}:`, error);
        }
      },
      error: (error) => console.error('Error calculando ruta:', error)
    });
  }

  /**
   * 🚩 Agregar banderas de inicio y fin
   */
  private addStartAndEndFlags(waypoints: L.LatLng[]) {
    if (!this.map || waypoints.length < 2) return;

    // BANDERA DE INICIO (Verde)
    const startFlag = L.marker([waypoints[0].lat, waypoints[0].lng], {
      icon: L.divIcon({
        html: `
          <div class="custom-flag start-flag">
            <div class="flag-pole"></div>
            <div class="flag-banner">🏁 INICIO</div>
          </div>
        `,
        className: 'custom-flag-marker',
        iconSize: [80, 80],
        iconAnchor: [4, 80]
      }),
      zIndexOffset: 2000
    }).addTo(this.map);

    startFlag.bindPopup(`
      <div class="flag-popup">
        <h4>🏁 Punto de Inicio</h4>
        <p><strong>Coordenadas:</strong><br>${waypoints[0].lat.toFixed(4)}, ${waypoints[0].lng.toFixed(4)}</p>
      </div>
    `);

    // BANDERA DE FIN (Roja)
    const endPoint = waypoints[waypoints.length - 1];
    const endFlag = L.marker([endPoint.lat, endPoint.lng], {
      icon: L.divIcon({
        html: `
          <div class="custom-flag end-flag">
            <div class="flag-pole"></div>
            <div class="flag-banner">🏁 META</div>
          </div>
        `,
        className: 'custom-flag-marker',
        iconSize: [80, 80],
        iconAnchor: [4, 80]
      }),
      zIndexOffset: 2000
    }).addTo(this.map);

    endFlag.bindPopup(`
      <div class="flag-popup">
        <h4>🏁 Punto Final</h4>
        <p><strong>Coordenadas:</strong><br>${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}</p>
      </div>
    `);
  }

  /**
   * 🔢 Agregar marcadores numerados para cada parada
   */
  private addStopMarkers(waypoints: L.LatLng[]) {
    if (!this.map) return;

    waypoints.forEach((point, index) => {
      // No agregar marcador para el último punto (ya tiene bandera de meta)
      if (index === 0 || index === waypoints.length - 1) return;

      const stopMarker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          html: `
            <div class="stop-marker">
              <div class="stop-number">${index}</div>
            </div>
          `,
          className: 'custom-stop-marker',
          iconSize: [36, 48],
          iconAnchor: [18, 48]
        }),
        zIndexOffset: 1500
      }).addTo(this.map!);

      stopMarker.bindPopup(`
        <div class="stop-popup">
          <h4>📍 Parada #${index}</h4>
          <p><strong>Orden:</strong> ${index} de ${waypoints.length - 1}</p>
          <p><strong>Coordenadas:</strong><br>${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}</p>
        </div>
      `);

      // Efecto hover
      stopMarker.on('mouseover', () => {
        stopMarker.openPopup();
      });
    });
  }

  private drawActiveRoutes() {
    if (!this.map || !this.mapInitialized) return;
    this.activeRoutes.forEach(route => {
      if (route.stops && route.stops.length > 1) {
        const waypoints = route.stops.map((stop: any) => L.latLng(stop.latitude, stop.longitude));
        this.drawRealRoute(route.id, waypoints);
      }
    });
  }

  centerMap() {
    if (this.map && this.mapInitialized) {
      const selectedCity = this.availableCities.find(city => city.id === this.selectedCity);
      if (selectedCity) {
        try {
          this.map.setView([selectedCity.lat, selectedCity.lng], selectedCity.zoom, { animate: true, duration: 0.5 });
        } catch (error) {
          console.error('Error centrando mapa:', error);
        }
      }
    }
  }

  // ================================================================
  // MÉTODOS AUXILIARES Y UI
  // ================================================================
  hasActiveRoute(vehicleId: string): boolean {
    return this.driversInRoute.some(d => d.vehicle === vehicleId || d.id === vehicleId);
  }

  getActiveRouteForDriver(vehicleId: string): any | null {
    const driver = this.driversInRoute.find(d => d.vehicle === vehicleId || d.id === vehicleId);
    return driver ? this.activeRoutes.find(r => r.id === driver.routeId) : null;
  }

  getDriverInconsistencies(): Array<{ vehicleId: string, driverName: string, issue: string }> {
    const inconsistencies: Array<{ vehicleId: string, driverName: string, issue: string }> = [];

    this.vehiclePositions.forEach((position, vehicleId) => {
      const hasRoute = this.hasActiveRoute(vehicleId);
      if (position.status === 'BUSY' && !hasRoute) {
        inconsistencies.push({
          vehicleId,
          driverName: position.driverName,
          issue: 'Marcado EN_RUTA pero sin ruta activa'
        });
      }
    });

    return inconsistencies;
  }

  getTrafficForDriver(driverId: string): any {
    return this.trafficStatus.get(driverId) || { level: 'UNKNOWN', icon: '⚪', color: '#6b7280' };
  }

  getTrafficColor(level: string): string {
    const colors: any = {
      'LOW': '#22c55e',
      'NORMAL': '#3b82f6',
      'MEDIUM': '#f59e0b',
      'HIGH': '#ef4444',
      'HEAVY': '#dc2626',
      'UNKNOWN': '#6b7280'
    };
    return colors[level] || '#6b7280';
  }

  getTrafficIcon(level: string): string {
    const icons: any = {
      'LOW': '🟢',
      'NORMAL': '🔵',
      'MEDIUM': '🟡',
      'HIGH': '🟠',
      'HEAVY': '🔴',
      'UNKNOWN': '⚪'
    };
    return icons[level] || '⚪';
  }

  getTrafficBadgeStatus(level: string): { icon: string, color: string } {
    return {
      icon: this.getTrafficIcon(level),
      color: this.getTrafficColor(level)
    };
  }

  refreshUnifiedData() {
    this.loadUnifiedData();
  }

  showSystemStatus() {
    const status = {
      totalRoutes: this.allRoutes.length,
      activeRoutes: this.activeRoutes.length,
      driversInRoute: this.driversInRoute.length,
      availableDrivers: this.availableDrivers.length,
      vehiclePositions: this.vehiclePositions.size,
      apiConnected: this.apiConnected,
      mapInitialized: this.mapInitialized
    };

    console.log('📊 Estado del Sistema:', status);

    Swal.fire({
      title: '📊 Estado del Sistema',
      html: `<div style="text-align: left;">
               <p><strong>Rutas Totales:</strong> ${status.totalRoutes}</p>
               <p><strong>Rutas Activas:</strong> ${status.activeRoutes}</p>
               <p><strong>Conductores en Ruta:</strong> ${status.driversInRoute}</p>
               <p><strong>Conductores Disponibles:</strong> ${status.availableDrivers}</p>
               <p><strong>Posiciones Rastreadas:</strong> ${status.vehiclePositions}</p>
               <p><strong>Mapa:</strong> ${status.mapInitialized ? '✅ Inicializado' : '❌ No inicializado'}</p>
               <p><strong>API:</strong> ${status.apiConnected ? '✅ Conectada' : '❌ Desconectada'}</p>
             </div>`,
      icon: 'info'
    });
  }

  resetDriverStatus(driverName: string) {
    Swal.fire({
      title: '¿Corregir estado?',
      text: `Marcar a ${driverName} como DISPONIBLE`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, corregir',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        let vehicleId = '';
        this.vehiclePositions.forEach((pos, vId) => {
          if (pos.driverName === driverName) {
            vehicleId = vId;
          }
        });

        if (vehicleId) {
          this.updateDriverAvailabilityFull(vehicleId, driverName, 'DISPONIBLE');
        }

        Swal.fire({
          title: '✅ Corregido',
          text: `${driverName} ahora DISPONIBLE`,
          icon: 'success',
          timer: 2000
        });
      }
    });
  }

  showInconsistenciesReport() {
    const inconsistencies = this.getDriverInconsistencies();

    if (inconsistencies.length === 0) {
      Swal.fire({
        title: '✅ Todo en Orden',
        text: 'No hay inconsistencias detectadas',
        icon: 'success',
        timer: 2000
      });
      return;
    }

    const html = `<div style="text-align: left; max-height: 400px; overflow-y: auto;">
                    <p><strong>${inconsistencies.length} inconsistencia(s) detectada(s):</strong></p>
                    <ul style="padding-left: 20px;">
                      ${inconsistencies.map(inc => `<li style="margin: 10px 0;">
                                                      <strong>${inc.driverName}</strong><br>
                                                      <span style="color: #f59e0b;">${inc.issue}</span>
                                                    </li>`).join('')}
                    </ul>
                  </div>`;

    Swal.fire({
      title: '⚠️ Inconsistencias Detectadas',
      html,
      icon: 'warning',
      width: 600
    });
  }

  private updateStats() {
    this.stats.vehicles = new Set(this.allRoutes.map(r => r.vehicle)).size;
    this.stats.deliveries = this.allRoutes.filter(r => r.status === 'COMPLETED').reduce((sum, r) => sum + (r.stops?.length || 0), 0);
    this.stats.optimized = this.allRoutes.filter(r => r.status === 'COMPLETED').length;
  }

  getStatusColor(status: string): string {
    const colors: any = {
      'AVAILABLE': '#22c55e',
      'BUSY': '#f59e0b',
      'OFFLINE': '#6b7280'
    };
    return colors[status] || '#6b7280';
  }

  getStatusText(status: string): string {
    const texts: any = {
      'AVAILABLE': '✅ Disponible',
      'BUSY': '🚗 En ruta',
      'OFFLINE': '⭕ Offline'
    };
    return texts[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: any = {
      'AVAILABLE': '✅',
      'BUSY': '🚚',
      'OFFLINE': '⭕'
    };
    return icons[status] || '❓';
  }

  getTimeAgo(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    try {
      const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
      if (seconds < 60) return 'Ahora';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `Hace ${minutes}min`;
      const hours = Math.floor(minutes / 60);
      return `Hace ${hours}h`;
    } catch (error) {
      return 'N/A';
    }
  }

  refreshData() {
    this.refreshUnifiedData();
  }

  viewVehicleDetails(vehicleId: string) {
    const position = this.vehiclePositions.get(vehicleId);
    if (position) {
      Swal.fire({
        title: `🚗 ${position.driverName}`,
        html: `<div style="text-align: left;">
                 <p><strong>Estado:</strong> ${this.getStatusText(position.status)}</p>
                 <p><strong>Velocidad:</strong> ${position.speed.toFixed(0)} km/h</p>
                 <p><strong>Posición:</strong> ${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}</p>
                 ${position.eta ? `<p><strong>ETA:</strong> ${position.eta}</p>` : ''}
                 ${position.currentRouteId ? `<p><strong>Ruta:</strong> ${position.currentRouteId}</p>` : ''}
                 ${position.trafficLevel ? `<p><strong>Tráfico:</strong> ${this.getTrafficIcon(position.trafficLevel)} ${position.trafficLevel}</p>` : ''}
               </div>`,
        icon: 'info',
        width: 500
      });
    } else {
      Swal.fire({
        title: 'No Disponible',
        text: 'No se encontró información para este vehículo',
        icon: 'warning',
        timer: 2000
      });
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(route: string) {
    this.router.navigate([`/${route}`]);
  }

  getInitials(name: string | undefined): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
  }

  getFirstLetter(text: string | undefined): string {
    if (!text || text.length === 0) return '?';
    return text.charAt(0).toUpperCase();
  }

  private cleanupMap() {
    if (this.map) {
      try {
        // Desactivar todas las interacciones del mapa primero
        this.map.off();
        this.map.stop();
        // Remover marcadores
        this.vehicleMarkers.forEach(marker => {
          try {
            marker.off(); // Desactivar eventos del marcador
            marker.remove();
          } catch (e) {
            console.warn('Error removiendo marcador:', e);
          }
        });
        this.vehicleMarkers.clear();
        // Remover rutas
        this.routePolylines.forEach(polyline => {
          try {
            polyline.off();
            polyline.remove();
          } catch (e) {
            console.warn('Error removiendo polyline:', e);
          }
        });
        this.routePolylines.clear();
        this.routeBorders.forEach(border => {
          try {
            border.off();
            border.remove();
          } catch (e) {
            console.warn('Error removiendo border:', e);
          }
        });
        this.routeBorders.clear();
        // Remover todas las capas del mapa
        this.map.eachLayer((layer) => {
          try {
            this.map?.removeLayer(layer);
          } catch (e) {
            console.warn('Error removiendo capa:', e);
          }
        });
        // Finalmente, remover el mapa
        this.map.remove();
        this.map = null;
      } catch (e) {
        console.error('Error durante limpieza del mapa:', e);
        this.map = null;
      }
    }
    // Limpiar el contenedor HTML al final
    setTimeout(() => {
      const mapElement = document.getElementById('map');
      if (mapElement) {
        mapElement.innerHTML = '';
        (mapElement as any)._leaflet_id = null;
        delete (mapElement as any)._leaflet_id;
      }
    }, 100);
    console.log('✅ Limpieza completada');
  }

  // ================================================================
  // FUNCIONALIDADES ADICIONALES PARA RUTAS Y MAPAS
  // ================================================================

  // Navegar a crear nueva ruta con conductor preseleccionado
  navigateToCreateRouteWithDriver(driverId: string) {
    this.router.navigate(['/routes/create'], {
      queryParams: { driver: driverId }
    });
  }

  // Mostrar detalles de ruta
  viewRouteDetails(routeId: string) {
    const route = this.allRoutes.find(r => r.id === routeId);
    if (!route) {
      Swal.fire('Error', 'Ruta no encontrada', 'error');
      return;
    }

    const routeInfo = {
      id: route.id,
      name: route.name || 'Sin nombre',
      status: route.status,
      vehicle: route.vehicle,
      driverId: route.driverId,
      stops: route.stops?.length || 0,
      distance: route.distance || 'N/A',
      estimatedDuration: route.estimatedDuration || 'N/A',
      createdAt: route.createdAt || 'N/A'
    };

    Swal.fire({
      title: `📍 Detalles de Ruta`,
      html: `
        <div style="text-align: left; font-size: 14px;">
          <p><strong>Nombre:</strong> ${routeInfo.name}</p>
          <p><strong>Estado:</strong> ${routeInfo.status}</p>
          <p><strong>Vehículo:</strong> ${routeInfo.vehicle}</p>
          <p><strong>Conductor:</strong> ${routeInfo.driverId}</p>
          <p><strong>Paradas:</strong> ${routeInfo.stops}</p>
          <p><strong>Distancia:</strong> ${routeInfo.distance}</p>
          <p><strong>Duración estimada:</strong> ${routeInfo.estimatedDuration}</p>
          <p><strong>Creada:</strong> ${routeInfo.createdAt}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar'
    });
  }

  // Centrar mapa en vehículo específico
  centerMapOnVehicle(vehicleId: string) {
    const position = this.vehiclePositions.get(vehicleId);
    if (position && this.map && this.mapInitialized) {
      try {
        this.map.setView([position.latitude, position.longitude], 16, {
          animate: true,
          duration: 1
        });

        // Resaltar el marcador temporalmente
        const marker = this.vehicleMarkers.get(vehicleId);
        if (marker) {
          // Agregar una animación temporal al marcador
          const element = marker.getElement();
          if (element) {
            element.style.animation = 'pulse 1s ease-in-out';
            setTimeout(() => {
              if (element) element.style.animation = '';
            }, 1000);
          }
        }

        Swal.fire({
          title: '📍 Centrado en Vehículo',
          text: `Mostrando ubicación de ${position.driverName}`,
          icon: 'success',
          timer: 1500,
          toast: true,
          position: 'top-end',
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error centrando mapa en vehículo:', error);
      }
    } else {
      Swal.fire('Error', 'Vehículo no encontrado o mapa no inicializado', 'warning');
    }
  }

  // Mostrar rutas activas en el mapa
  showActiveRoutesOnMap() {
    if (!this.map || !this.mapInitialized) {
      Swal.fire('Error', 'Mapa no inicializado', 'warning');
      return;
    }

    // Limpiar rutas existentes
    this.routePolylines.forEach(polyline => {
      try { polyline.remove(); } catch (e) {}
    });
    this.routePolylines.clear();

    // Dibujar todas las rutas activas
    this.activeRoutes.forEach(route => {
      if (route.stops && route.stops.length > 1) {
        const waypoints = route.stops.map((stop: any) => L.latLng(stop.latitude, stop.longitude));
        this.drawRealRoute(route.id, waypoints);
      }
    });

    // Ajustar vista para mostrar todas las rutas
    if (this.activeRoutes.length > 0) {
      const allCoordinates: L.LatLng[] = [];
      this.activeRoutes.forEach(route => {
        if (route.stops) {
          route.stops.forEach((stop: any) => {
            allCoordinates.push(L.latLng(stop.latitude, stop.longitude));
          });
        }
      });

      if (allCoordinates.length > 0) {
        const bounds = L.latLngBounds(allCoordinates);
        this.map.fitBounds(bounds, { padding: [20, 20] });
      }
    }

    Swal.fire({
      title: '🗺️ Rutas Mostradas',
      text: `${this.activeRoutes.length} rutas activas en el mapa`,
      icon: 'success',
      timer: 2000,
      toast: true,
      position: 'top-end',
      showConfirmButton: false
    });
  }

  // Exportar datos del dashboard
  exportDashboardData() {
    const exportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRoutes: this.allRoutes.length,
        activeRoutes: this.activeRoutes.length,
        driversInRoute: this.driversInRoute.length,
        availableDrivers: this.availableDrivers.length,
        vehiclesTracked: this.vehiclePositions.size
      },
      activeRoutes: this.activeRoutes.map(route => ({
        id: route.id,
        name: route.name,
        vehicle: route.vehicle,
        driverId: route.driverId,
        stops: route.stops?.length || 0,
        status: route.status
      })),
      driversInRoute: this.driversInRoute.map(driver => ({
        name: driver.name,
        vehicle: driver.vehicle,
        routeName: driver.routeName,
        speed: driver.speed,
        trafficLevel: driver.trafficLevel,
        lastUpdate: driver.lastUpdate
      })),
      vehiclePositions: Array.from(this.vehiclePositions.entries()).map(([id, pos]) => ({
        vehicleId: id,
        driverName: pos.driverName,
        latitude: pos.latitude,
        longitude: pos.longitude,
        speed: pos.speed,
        status: pos.status,
        trafficLevel: pos.trafficLevel
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `dashboard-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
      title: '✅ Datos Exportados',
      text: 'Los datos del dashboard han sido descargados',
      icon: 'success',
      timer: 2000,
      toast: true,
      position: 'top-end',
      showConfirmButton: false
    });
  }

  // Mostrar estadísticas detalladas
  showDetailedStats() {
    const stats = {
      routes: {
        total: this.allRoutes.length,
        active: this.activeRoutes.length,
        completed: this.allRoutes.filter(r => r.status === 'COMPLETED').length,
        pending: this.allRoutes.filter(r => r.status === 'PENDING').length
      },
      drivers: {
        total: this.stats.drivers,
        active: this.driversInRoute.length,
        available: this.availableDrivers.length
      },
      vehicles: {
        tracked: this.vehiclePositions.size,
        inRoute: new Set(this.driversInRoute.map(d => d.vehicle)).size
      },
      performance: {
        avgStopsPerRoute: this.allRoutes.length > 0 ?
          (this.allRoutes.reduce((sum, r) => sum + (r.stops?.length || 0), 0) / this.allRoutes.length).toFixed(1) : 0,
        completionRate: this.allRoutes.length > 0 ?
          ((this.allRoutes.filter(r => r.status === 'COMPLETED').length / this.allRoutes.length) * 100).toFixed(1) : 0
      }
    };

    Swal.fire({
      title: '📊 Estadísticas Detalladas',
      html: `
        <div style="text-align: left; font-size: 14px; max-height: 400px; overflow-y: auto;">
          <h4>🛣️ Rutas</h4>
          <p><strong>Total:</strong> ${stats.routes.total}</p>
          <p><strong>Activas:</strong> ${stats.routes.active}</p>
          <p><strong>Completadas:</strong> ${stats.routes.completed}</p>
          <p><strong>Pendientes:</strong> ${stats.routes.pending}</p>

          <h4>👥 Conductores</h4>
          <p><strong>Total:</strong> ${stats.drivers.total}</p>
          <p><strong>En ruta:</strong> ${stats.drivers.active}</p>
          <p><strong>Disponibles:</strong> ${stats.drivers.available}</p>

          <h4>🚗 Vehículos</h4>
          <p><strong>Rastreados:</strong> ${stats.vehicles.tracked}</p>
          <p><strong>En ruta:</strong> ${stats.vehicles.inRoute}</p>

          <h4>📈 Rendimiento</h4>
          <p><strong>Paradas promedio por ruta:</strong> ${stats.performance.avgStopsPerRoute}</p>
          <p><strong>Tasa de completación:</strong> ${stats.performance.completionRate}%</p>
        </div>
      `,
      width: 600,
      confirmButtonText: 'Cerrar'
    });
  }

  // Alternar vista del mapa (ruta vs general)
  toggleMapView(viewType: 'routes' | 'general') {
    if (!this.map || !this.mapInitialized) return;

    if (viewType === 'routes') {
      this.showActiveRoutesOnMap();
    } else {
      this.centerMap();
    }
  }

  // Buscar vehículo por nombre o ID
  searchVehicle(searchTerm: string) {
    const vehicle = Array.from(this.vehiclePositions.entries()).find(([id, pos]) =>
      pos.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (vehicle) {
      this.centerMapOnVehicle(vehicle[0]);
    } else {
      Swal.fire('No encontrado', 'Vehículo no encontrado', 'warning');
    }
  }

  // Mostrar ayuda del dashboard
  showDashboardHelp() {
    Swal.fire({
      title: 'ℹ️ Ayuda del Dashboard',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <h4>🗺️ Mapa Interactivo</h4>
          <p>• <strong>Clic en marcadores:</strong> Ver detalles del vehículo</p>
          <p>• <strong>Clic en rutas:</strong> Ver información de la ruta</p>
          <p>• <strong>Centro del mapa:</strong> Cambiar ciudad</p>

          <h4>👥 Conductores</h4>
          <p>• <strong>En ruta:</strong> Conductores activos con rutas asignadas</p>
          <p>• <strong>Disponibles:</strong> Conductores listos para nuevas rutas</p>
          <p>• <strong>Completar:</strong> Finalizar ruta manualmente</p>

          <h4>⚡ Acciones Rápidas</h4>
          <p>• <strong>Nueva ruta:</strong> Crear ruta desde cero</p>
          <p>• <strong>Ver rutas:</strong> Gestionar rutas existentes</p>
          <p>• <strong>Actualizar:</strong> Refrescar datos en tiempo real</p>
        </div>
      `,
      width: 600,
      confirmButtonText: 'Entendido'
    });
  }

  // Calcular distancia total de una ruta
  private calculateTotalDistance(coordinates: L.LatLng[]): number {
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      totalDistance += coordinates[i - 1].distanceTo(coordinates[i]);
    }
    // Convertir de metros a kilómetros
    return totalDistance / 1000;
  }

}
