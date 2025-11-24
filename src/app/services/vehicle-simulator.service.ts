import { Injectable, inject } from '@angular/core';
import { RealTimeRoutingService, VehiclePosition } from './real-time-routing.service';
import { RouteService } from './route.service';
import { RoutingService } from './routing.service';
import * as L from 'leaflet';
import { interval, Subject, Subscription } from 'rxjs';

interface SimulatedVehicle {
  position: VehiclePosition;
  marker: L.Marker;
  path: [number, number][];
  currentPathIndex: number;
  routePolyline?: L.Polyline;
  speed: number;
  routeId: string;
  routeName: string;
  stops: any[];
  currentStopIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleSimulatorService {
  private realtimeService = inject(RealTimeRoutingService);
  private routeService = inject(RouteService);
  private routingService = inject(RoutingService);

  private simulatedVehicles: Map<string, SimulatedVehicle> = new Map();
  private updateSubscription?: Subscription;
  private map?: L.Map;
  private isSimulating = false;

  public positionUpdates$ = new Subject<VehiclePosition>();

  constructor() {
    console.log('🎮 VehicleSimulator - RUTAS REALES del módulo');
  }

  /**
   * ✅ Cargar SOLO rutas REALES del módulo de Rutas
   */
  startSimulation(map?: L.Map) {
    if (this.isSimulating) {
      console.warn('⚠️ Ya está en ejecución');
      return;
    }

    this.map = map;
    this.isSimulating = true;

    console.log('🚀 Cargando rutas REALES desde el backend...');

    // Cargar SOLO rutas IN_PROGRESS
    this.routeService.getAllRoutes().subscribe({
      next: (routes) => {
        const activeRoutes = routes.filter(r =>
          r.status === 'IN_PROGRESS' &&
          r.stops &&
          r.stops.length >= 2
        );

        console.log(`📦 Total de rutas: ${routes.length}`);
        console.log(`✅ Rutas activas (IN_PROGRESS): ${activeRoutes.length}`);

        if (activeRoutes.length === 0) {
          console.warn('⚠️ NO HAY RUTAS ACTIVAS');
          console.log('💡 Pasos para ver vehículos:');
          console.log('   1. Ve al módulo de Rutas');
          console.log('   2. Crea una nueva ruta');
          console.log('   3. Asigna conductor y vehículo');
          console.log('   4. Haz clic en "Asignar Ruta e Iniciar Recorrido"');
          console.log('   5. Vuelve al Dashboard');
          return;
        }

        // Crear vehículos para cada ruta activa
        this.createVehiclesFromRealRoutes(activeRoutes);

        // Actualizar posiciones cada 2 segundos
        this.updateSubscription = interval(2000).subscribe(() => {
          this.updateAllVehicles();
        });
      },
      error: (error) => {
        console.error('❌ Error cargando rutas:', error);
      }
    });
  }

  /**
   * 🚗 Crear vehículos desde rutas REALES
   */
  private async createVehiclesFromRealRoutes(routes: any[]) {
    console.log('🚗 Creando vehículos desde rutas reales...');

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];

      try {
        if (!route.stops || route.stops.length < 2) {
          console.warn(`⚠️ Ruta ${route.name} sin suficientes paradas`);
          continue;
        }

        // Ordenar paradas
        const sortedStops = [...route.stops].sort((a, b) => a.stopOrder - b.stopOrder);

        const vehicleId = route.vehicle || `VEH-${route.id}`;
        const driverId = this.extractDriverId(route);
        const driverName = this.extractDriverName(route);

        console.log(`📍 Creando vehículo para: ${route.name}`);
        console.log(`   - Vehículo: ${vehicleId}`);
        console.log(`   - Conductor: ${driverName}`);
        console.log(`   - Paradas: ${sortedStops.length}`);

        // Posición inicial: primera parada
        const firstStop = sortedStops[0];
        const speed = 40; // Velocidad constante

        const position: VehiclePosition = {
          vehicleId,
          driverId,
          driverName,
          latitude: firstStop.latitude,
          longitude: firstStop.longitude,
          speed,
          status: 'BUSY',
          lastUpdate: new Date(),
          heading: 0,
          eta: route.estimatedDuration,
          distanceToDestination: route.distance,
          currentRouteId: route.id
        };

        // Crear marcador
        const marker = this.createVehicleMarker(position);
        if (!marker) continue;

        // Calcular ruta REAL completa con OSRM
        await this.calculateAndAssignRoute(
          vehicleId,
          position,
          marker,
          route,
          sortedStops,
          speed,
          i
        );

      } catch (error) {
        console.error(`❌ Error con ruta ${route.name}:`, error);
      }
    }

    if (this.simulatedVehicles.size === 0) {
      console.warn('❌ NO SE CREÓ NINGÚN VEHÍCULO');
    } else {
      console.log(`✅ ${this.simulatedVehicles.size} vehículo(s) en movimiento`);
    }
  }

  /**
   * 🗺️ Calcular ruta REAL con OSRM
   */
  private async calculateAndAssignRoute(
    vehicleId: string,
    position: VehiclePosition,
    marker: L.Marker,
    route: any,
    stops: any[],
    speed: number,
    colorIndex: number
  ) {
    const waypoints: [number, number][] = stops.map(s => [s.latitude, s.longitude]);

    console.log(`🗺️ Calculando ruta OSRM para ${route.name}...`);

    return new Promise<void>((resolve) => {
      this.routingService.getRealRoute(waypoints).subscribe({
        next: (routeData) => {
          if (!routeData || !routeData.coordinates || routeData.coordinates.length === 0) {
            console.error(`❌ OSRM no devolvió ruta para ${route.name}`);
            resolve();
            return;
          }

          const realPath: [number, number][] = routeData.coordinates.map(
            coord => [coord[0], coord[1]] as [number, number]
          );

          console.log(`✅ Ruta REAL calculada: ${realPath.length} puntos`);

          // Dibujar ruta en el mapa
          const routePolyline = this.drawRoute(realPath, colorIndex, route.name);

          // Guardar vehículo
          this.simulatedVehicles.set(vehicleId, {
            position,
            marker,
            path: realPath,
            currentPathIndex: 0,
            routePolyline,
            speed,
            routeId: route.id,
            routeName: route.name,
            stops: stops,
            currentStopIndex: 0
          });

          console.log(`🎯 Vehículo ${vehicleId} listo en ruta: ${route.name}`);
          resolve();
        },
        error: (error) => {
          console.error(`❌ Error OSRM para ${route.name}:`, error);
          resolve();
        }
      });
    });
  }

  /**
   * 🎨 Dibujar ruta en el mapa
   */
  private drawRoute(path: [number, number][], colorIndex: number, routeName: string): L.Polyline | undefined {
    if (!this.map) return undefined;

    const latlngs = path.map(p => L.latLng(p[0], p[1]));
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const color = colors[colorIndex % colors.length];

    const polyline = L.polyline(latlngs, {
      color: color,
      weight: 4,
      opacity: 0.7,
      className: 'route-realistic'
    }).addTo(this.map);

    polyline.bindTooltip(routeName, {
      permanent: false,
      direction: 'center'
    });

    return polyline;
  }

  /**
   * 🔄 Actualizar posiciones
   */
  private updateAllVehicles() {
    this.simulatedVehicles.forEach((vehicle, vehicleId) => {
      if (vehicle.path.length === 0) return;

      vehicle.currentPathIndex++;

      if (vehicle.currentPathIndex >= vehicle.path.length) {
        console.log(`🏁 ${vehicle.routeName} completada`);
        this.completeRoute(vehicle, vehicleId);
        return;
      }

      const [lat, lng] = vehicle.path[vehicle.currentPathIndex];
      const heading = this.calculateHeading(
        vehicle.position.latitude,
        vehicle.position.longitude,
        lat,
        lng
      );

      vehicle.position = {
        ...vehicle.position,
        latitude: lat,
        longitude: lng,
        heading,
        lastUpdate: new Date()
      };

      // Actualizar marcador
      if (this.map && vehicle.marker) {
        vehicle.marker.setLatLng([lat, lng]);
        vehicle.marker.setIcon(this.createVehicleIcon(vehicle.position));
        this.updatePopup(vehicle.marker, vehicle);
      }

      this.positionUpdates$.next(vehicle.position);
    });
  }

  /**
   * 🏁 Completar ruta
   */
  private completeRoute(vehicle: SimulatedVehicle, vehicleId: string) {
    if (this.map) {
      if (vehicle.marker) this.map.removeLayer(vehicle.marker);
      if (vehicle.routePolyline) this.map.removeLayer(vehicle.routePolyline);
    }

    this.simulatedVehicles.delete(vehicleId);

    this.realtimeService.completeRoute(vehicle.routeId).subscribe({
      next: () => console.log(`✅ Ruta ${vehicle.routeId} completada en backend`),
      error: (e) => console.error('Error completando ruta:', e)
    });
  }

  stopSimulation() {
    console.log('🛑 Deteniendo simulación...');
    this.isSimulating = false;
    this.updateSubscription?.unsubscribe();

    if (this.map) {
      this.simulatedVehicles.forEach(v => {
        if (v.marker) this.map!.removeLayer(v.marker);
        if (v.routePolyline) this.map!.removeLayer(v.routePolyline);
      });
    }

    this.simulatedVehicles.clear();
  }

  getCurrentPositions(): VehiclePosition[] {
    return Array.from(this.simulatedVehicles.values()).map(v => v.position);
  }

  private createVehicleMarker(position: VehiclePosition): L.Marker | undefined {
    if (!this.map) return undefined;

    const icon = this.createVehicleIcon(position);
    return L.marker([position.latitude, position.longitude], {
      icon,
      zIndexOffset: 1000
    }).addTo(this.map);
  }

  private createVehicleIcon(position: VehiclePosition): L.DivIcon {
    const color = position.status === 'BUSY' ? '#3b82f6' : '#22c55e';
    const rotation = position.heading || 0;

    return L.divIcon({
      html: `
        <div class="vehicle-marker-indrive" style="transform: rotate(${rotation}deg);">
          <div class="vehicle-body" style="background: ${color};">
            <span class="vehicle-icon">🚗</span>
          </div>
          <div class="vehicle-shadow"></div>
        </div>
      `,
      className: 'custom-vehicle-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  private updatePopup(marker: L.Marker, vehicle: SimulatedVehicle) {
    marker.bindPopup(`
      <div class="vehicle-popup-indrive">
        <div class="popup-header">
          <h4>🚗 ${vehicle.position.driverName}</h4>
          <span class="status-badge" style="background: #3b82f620; color: #3b82f6;">En ruta</span>
        </div>
        <div class="popup-body">
          <div class="info-row">
            <span class="label">Ruta:</span>
            <span class="value">${vehicle.routeName}</span>
          </div>
          <div class="info-row">
            <span class="label">Velocidad:</span>
            <span class="value">${vehicle.speed} km/h</span>
          </div>
          <div class="info-row">
            <span class="label">Paradas:</span>
            <span class="value">${vehicle.currentStopIndex}/${vehicle.stops.length}</span>
          </div>
        </div>
      </div>
    `);
  }

  private extractDriverId(route: any): string {
    if (route.driverId) return route.driverId;
    if (route.driver?.id) return route.driver.id;
    return `DRIVER-${route.id}`;
  }

  private extractDriverName(route: any): string {
    if (!route.driver) return 'Conductor';

    if (typeof route.driver === 'string') {
      return route.driver.split('-')[0]?.trim() || route.driver;
    }

    if (route.driver.nombre && route.driver.apellido) {
      return `${route.driver.nombre} ${route.driver.apellido}`;
    }

    return route.driver.name || 'Conductor';
  }

  private calculateHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = lng2 - lng1;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    let heading = Math.atan2(y, x) * (180 / Math.PI);
    return (heading + 360) % 360;
  }
} 
