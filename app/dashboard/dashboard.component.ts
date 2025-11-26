import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RouteService } from '../services/route.service';
import { DriverService } from '../services/driver.service';
import { RealTimeRoutingService, VehiclePosition, OptimizedRoute } from '../services/real-time-routing.service';
import { VehicleSimulatorService } from '../services/vehicle-simulator.service';
import Swal from 'sweetalert2';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  private simulatorService = inject(VehicleSimulatorService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  currentUser: any;
  map: L.Map | null = null;
  isLoading = true;
  mapLoading = false;
  mapInitialized = false;
  apiConnected = false;

  // 🔥 MARCADORES EN TIEMPO REAL
  private vehicleMarkers = new Map<string, L.Marker>();
  private routePolylines = new Map<string, L.Polyline>();
  private driverMarkers = new Map<string, L.Marker>();

  // Estadísticas EN TIEMPO REAL
  stats = {
    vehicles: 0,
    deliveries: 0,
    optimized: 0,
    savings: 42,
    drivers: 0,
    activeDrivers: 0,
    availableDrivers: 0
  };

  // Datos en tiempo real
  activeRoutes: any[] = [];
  allRoutes: any[] = [];
  availableDrivers: any[] = [];
  activeDrivers: any[] = [];
  vehiclePositions = new Map<string, VehiclePosition>();

  // Ciudades
  availableCities = [
    { id: 'bogota', name: 'Bogotá, Colombia', lat: 4.6097, lng: -74.0817, zoom: 12 },
    { id: 'medellin', name: 'Medellín, Colombia', lat: 6.2442, lng: -75.5812, zoom: 12 },
    { id: 'cali', name: 'Cali, Colombia', lat: 3.4516, lng: -76.5320, zoom: 12 }
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

    this.loadInitialData();
    this.subscribeToRealTimeUpdates();

    // 🎮 Iniciar simulación después de 2 segundos
    setTimeout(() => {
      console.log('🎮 Iniciando simulación de vehículos...');
      this.simulatorService.startSimulation(5, this.map || undefined);
    }, 2000);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (!this.isLoading && !this.mapInitialized) {
        this.initWorldMap();
      }
    }, 800);
  }

  ngOnDestroy() {
    console.log('🛑 Deteniendo simulación...');
    this.simulatorService.stopSimulation();

    this.destroy$.next();
    this.destroy$.complete();

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.mapInitialized = false;
  }

  // ===== CARGAR DATOS INICIALES =====
  private async loadInitialData() {
    console.log('🔄 Cargando datos iniciales...');

    try {
      // Cargar rutas
      this.routeService.getAllRoutes().subscribe({
        next: (routes: any[]) => {
          this.allRoutes = routes;
          this.activeRoutes = routes.filter(r =>
            r.status === 'IN_PROGRESS' || r.status === 'PENDING'
          );
          this.updateStats();
          this.apiConnected = true;
          console.log(`✅ ${routes.length} rutas cargadas`);
        },
        error: (error) => {
          console.error('❌ Error cargando rutas:', error);
          this.apiConnected = false;
        }
      });

      // Cargar conductores
      this.driverService.getAvailableDrivers().subscribe({
        next: (drivers: any[]) => {
          this.availableDrivers = drivers;
          this.stats.drivers = drivers.length;
          console.log(`✅ ${drivers.length} conductores cargados`);
        },
        error: (error) => {
          console.error('❌ Error cargando conductores:', error);
        }
      });

    } catch (error) {
      console.error('❌ Error en carga inicial:', error);
    }

    this.isLoading = false;
    setTimeout(() => this.initWorldMap(), 300);
  }

  // ===== SUSCRIBIRSE A ACTUALIZACIONES EN TIEMPO REAL =====
  private subscribeToRealTimeUpdates() {
    console.log('📡 Suscribiendo a actualizaciones en tiempo real...');

    // Actualizar posiciones de vehículos desde el simulador
    this.simulatorService.positionUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (position: VehiclePosition) => {
          // Convertir posición individual a Map
          const positions = new Map<string, VehiclePosition>();
          positions.set(position.vehicleId, position);

          // Actualizar el mapa de posiciones
          this.vehiclePositions.set(position.vehicleId, position);

          this.updateVehicleMarkersRealTime(positions);
          this.updateDriverStats(this.vehiclePositions);
          console.log(`🚗 Vehículo ${position.vehicleId} actualizado`);
        },
        error: (error: any) => {
          console.error('❌ Error en tiempo real:', error);
        }
      });

    // También intentar obtener posiciones del servicio real-time (fallback)
    this.realtimeService.getVehiclePositions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (positions: Map<string, VehiclePosition>) => {
          // Solo usar si no tenemos posiciones del simulador
          if (this.vehiclePositions.size === 0) {
            this.vehiclePositions = positions;
            this.updateVehicleMarkersRealTime(positions);
            this.updateDriverStats(positions);
            console.log(`🚗 ${positions.size} vehículos cargados desde servicio`);
          }
        },
        error: (error: any) => {
          console.error('❌ Error obteniendo posiciones del servicio:', error);
        }
      });
  }

  // ===== ACTUALIZAR MARCADORES EN TIEMPO REAL =====
  private updateVehicleMarkersRealTime(positions: Map<string, VehiclePosition>) {
    if (!this.map) return;

    positions.forEach((position, vehicleId) => {
      const existingMarker = this.vehicleMarkers.get(vehicleId);

      if (existingMarker) {
        // Animar movimiento suave
        this.animateMarkerMovement(
          existingMarker,
          L.latLng(position.latitude, position.longitude),
          position.heading || 0
        );
      } else {
        // Crear nuevo marcador
        this.createVehicleMarker(position);
      }

      // Actualizar popup
      this.updateVehiclePopup(vehicleId, position);
    });

    // Remover marcadores de vehículos que ya no existen
    this.vehicleMarkers.forEach((marker, vehicleId) => {
      if (!positions.has(vehicleId)) {
        this.map!.removeLayer(marker);
        this.vehicleMarkers.delete(vehicleId);
      }
    });
  }

  // ===== CREAR MARCADOR DE VEHÍCULO =====
  private createVehicleMarker(position: VehiclePosition) {
    if (!this.map) return;

    const icon = this.getVehicleIcon(position);

    const marker = L.marker([position.latitude, position.longitude], { icon })
      .addTo(this.map);

    this.vehicleMarkers.set(position.vehicleId, marker);
    this.updateVehiclePopup(position.vehicleId, position);
  }

  // ===== ICONO DE VEHÍCULO =====
  private getVehicleIcon(position: VehiclePosition): L.DivIcon {
    const statusColor = this.getStatusColor(position.status);
    const rotation = position.heading || 0;

    return L.divIcon({
      html: `
        <div class="vehicle-marker-realtime" style="transform: rotate(${rotation}deg);">
          <div class="vehicle-icon" style="background: ${statusColor};">
            🚗
          </div>
          <div class="pulse-ring" style="border-color: ${statusColor};"></div>
        </div>
      `,
      className: 'custom-vehicle-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  // ===== ANIMAR MOVIMIENTO DEL MARCADOR =====
  private animateMarkerMovement(marker: L.Marker, newPos: L.LatLng, heading: number) {
    const currentPos = marker.getLatLng();
    const steps = 10;
    let currentStep = 0;

    const latStep = (newPos.lat - currentPos.lat) / steps;
    const lngStep = (newPos.lng - currentPos.lng) / steps;

    const animate = () => {
      if (currentStep >= steps) return;

      currentStep++;
      const lat = currentPos.lat + (latStep * currentStep);
      const lng = currentPos.lng + (lngStep * currentStep);

      marker.setLatLng(L.latLng(lat, lng));

      // Actualizar rotación
      const element = marker.getElement();
      if (element) {
        const vehicleDiv = element.querySelector('.vehicle-marker-realtime') as HTMLElement;
        if (vehicleDiv) {
          vehicleDiv.style.transform = `rotate(${heading}deg)`;
        }
      }

      requestAnimationFrame(animate);
    };

    animate();
  }

  // ===== ACTUALIZAR POPUP DEL VEHÍCULO =====
  private updateVehiclePopup(vehicleId: string, position: VehiclePosition) {
    const marker = this.vehicleMarkers.get(vehicleId);
    if (!marker) return;

    const statusText = this.getStatusText(position.status);
    const statusColor = this.getStatusColor(position.status);

    marker.bindPopup(`
      <div class="vehicle-popup-realtime">
        <h4>🚗 ${position.driverName}</h4>
        <div class="popup-status" style="background: ${statusColor}20; color: ${statusColor};">
          ${statusText}
        </div>
        <div class="popup-info">
          <p><strong>Velocidad:</strong> ${position.speed.toFixed(0)} km/h</p>
          <p><strong>Última actualización:</strong> ${this.getTimeAgo(position.lastUpdate)}</p>
          ${position.eta ? `<p><strong>ETA:</strong> ${position.eta}</p>` : ''}
          ${position.distanceToDestination ? `<p><strong>Distancia:</strong> ${position.distanceToDestination.toFixed(1)} km</p>` : ''}
        </div>
        <button class="popup-btn" onclick="angularComponent.viewVehicleDetails('${vehicleId}')">
          Ver Detalles
        </button>
      </div>
    `, {
      maxWidth: 300,
      className: 'custom-popup'
    });
  }

  // ===== DIBUJAR RUTA EN CALLES REALES =====
  drawRealRoute(routeId: string, waypoints: L.LatLng[]) {
    if (!this.map || waypoints.length < 2) return;

    console.log(`🗺️ Dibujando ruta real para ${routeId}...`);

    const oldPolyline = this.routePolylines.get(routeId);
    if (oldPolyline) {
      this.map.removeLayer(oldPolyline);
    }

    this.realtimeService.calculateOptimizedMultiRoute(waypoints)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (optimizedRoute: OptimizedRoute) => {
          if (!this.map) return;

          const polyline = L.polyline(optimizedRoute.geometry, {
            color: '#3b82f6',
            weight: 5,
            opacity: 0.7,
            smoothFactor: 1,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(this.map);

          this.animateRoutePolyline(polyline);
          this.routePolylines.set(routeId, polyline);

          console.log(`✅ Ruta dibujada: ${optimizedRoute.distance.toFixed(1)} km, ${optimizedRoute.duration.toFixed(0)} min`);
        },
        error: (error) => {
          console.error('❌ Error dibujando ruta:', error);
        }
      });
  }

  // ===== ANIMAR POLYLINE =====
  private animateRoutePolyline(polyline: L.Polyline) {
    const originalLatLngs = polyline.getLatLngs() as L.LatLng[];
    const animatedLatLngs: L.LatLng[] = [];
    let currentIndex = 0;

    const animate = () => {
      if (currentIndex >= originalLatLngs.length) return;

      animatedLatLngs.push(originalLatLngs[currentIndex]);
      polyline.setLatLngs(animatedLatLngs);
      currentIndex++;

      if (currentIndex < originalLatLngs.length) {
        setTimeout(animate, 20);
      }
    };

    animate();
  }

  // ===== INICIALIZAR MAPA =====
  private initWorldMap() {
    setTimeout(() => {
      const mapElement = document.getElementById('map');

      if (!mapElement || mapElement.offsetWidth === 0) {
        setTimeout(() => this.initWorldMap(), 300);
        return;
      }

      try {
        if (this.map) {
          this.map.remove();
          this.map = null;
        }

        this.mapLoading = true;
        mapElement.style.height = '500px';
        mapElement.style.background = '#f8fafc';

        // Centrar mapa en Bogotá con zoom óptimo
        console.log('🗺️ Creando mapa en Bogotá...');
        this.map = L.map('map').setView([4.6097, -74.0817], 13);
        console.log('🗺️ Mapa creado:', this.map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // Fallback para tiles faltantes
        }).addTo(this.map);

        console.log('🗺️ TileLayer agregado al mapa');

        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize(true);
            console.log('🗺️ Mapa inicializado correctamente');

            // Forzar redibujo del mapa
            setTimeout(() => {
              if (this.map) {
                this.map.invalidateSize();
                console.log('🗺️ Mapa redibujado');
              }
            }, 200);

            this.mapInitialized = true;
            this.mapLoading = false;
            this.drawActiveRoutes();
          }
        }, 100);

      } catch (error) {
        console.error('❌ Error inicializando mapa:', error);
        this.mapLoading = false;
      }
    }, 100);
  }

  // ===== DIBUJAR RUTAS ACTIVAS =====
  private drawActiveRoutes() {
    if (!this.map) return;

    this.activeRoutes.forEach(route => {
      if (route.stops && route.stops.length > 1) {
        const waypoints = route.stops.map((stop: any) =>
          L.latLng(stop.latitude, stop.longitude)
        );

        this.drawRealRoute(route.id, waypoints);
      }
    });
  }

  // ===== ACTUALIZAR ESTADÍSTICAS =====
  private updateStats() {
    this.stats.vehicles = new Set(this.allRoutes.map(r => r.vehicle)).size;
    this.stats.deliveries = this.allRoutes
      .filter(r => r.status === 'COMPLETED')
      .reduce((sum, r) => sum + (r.stops?.length || 0), 0);
    this.stats.optimized = this.allRoutes.filter(r => r.status === 'COMPLETED').length;
  }

  private updateDriverStats(positions: Map<string, VehiclePosition>) {
    this.stats.activeDrivers = Array.from(positions.values())
      .filter(v => v.status === 'BUSY').length;
    this.stats.availableDrivers = Array.from(positions.values())
      .filter(v => v.status === 'AVAILABLE').length;
  }

  // ===== HELPERS - TODOS LOS MÉTODOS PÚBLICOS =====
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

  getRouteIcon(status: string): string {
    const icons: any = {
      'active': '🚚',
      'IN_PROGRESS': '🚚',
      'completed': '✅',
      'COMPLETED': '✅',
      'pending': '⏱️',
      'PENDING': '⏱️'
    };
    return icons[status] || '📦';
  }

  getRouteColor(status: string): string {
    const colors: any = {
      'active': '#22c55e',
      'IN_PROGRESS': '#22c55e',
      'completed': '#3b82f6',
      'COMPLETED': '#3b82f6',
      'pending': '#f59e0b',
      'PENDING': '#f59e0b'
    };
    return colors[status] || '#6b7280';
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Ahora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours}h`;
  }

  // ===== MÉTODOS PÚBLICOS DE NAVEGACIÓN =====
  centerMap() {
    if (this.map) {
      // Centrar siempre en Bogotá
      this.map.setView([4.6097, -74.0817], 13);
    }
  }

  refreshData() {
    this.loadInitialData();
    Swal.fire({
      title: '🔄 Actualizando',
      text: 'Datos actualizados',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  }

  viewVehicleDetails(vehicleId: string) {
    const position = this.vehiclePositions.get(vehicleId);
    if (position) {
      Swal.fire({
        title: `🚗 ${position.driverName}`,
        html: `
          <p><strong>Estado:</strong> ${this.getStatusText(position.status)}</p>
          <p><strong>Velocidad:</strong> ${position.speed.toFixed(0)} km/h</p>
          ${position.eta ? `<p><strong>ETA:</strong> ${position.eta}</p>` : ''}
        `,
        icon: 'info'
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
}
