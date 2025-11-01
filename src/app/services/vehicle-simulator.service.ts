// src/app/services/vehicle-simulator.service.ts
import { Injectable, inject } from '@angular/core';
import { RealTimeRoutingService, VehiclePosition } from './real-time-routing.service';
import * as L from 'leaflet';
import { interval, Subject, Subscription } from 'rxjs';

interface SimulatedVehicle {
  position: VehiclePosition;
  target: { lat: number; lng: number };
  marker: L.Marker;
  path: [number, number][];
  currentPathIndex: number;
  routePolyline?: L.Polyline;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleSimulatorService {
  private realtimeService = inject(RealTimeRoutingService);

  private simulatedVehicles: Map<string, SimulatedVehicle> = new Map();
  private updateSubscription?: Subscription;
  private map?: L.Map;
  private isSimulating = false;

  // Sujeto para emitir actualizaciones
  public positionUpdates$ = new Subject<VehiclePosition>();

  // Configuración de Bogotá
  private readonly BOGOTA_BOUNDS = {
    north: 4.8,
    south: 4.5,
    east: -73.95,
    west: -74.15
  };

  constructor() {
    console.log('🎮 VehicleSimulatorService inicializado');
  }

  /**
   * Iniciar simulación de vehículos
   */
  startSimulation(vehicleCount: number = 5, map?: L.Map) {
    if (this.isSimulating) {
      console.warn('⚠️ La simulación ya está en curso');
      return;
    }

    this.map = map;
    this.isSimulating = true;

    console.log(`🚀 Iniciando simulación con ${vehicleCount} vehículos`);

    // Crear vehículos simulados
    this.createSimulatedVehicles(vehicleCount);

    // Actualizar posiciones cada 2 segundos
    this.updateSubscription = interval(2000).subscribe(() => {
      this.updateAllVehicles();
    });
  }

  /**
   * Detener simulación
   */
  stopSimulation() {
    console.log('🛑 Deteniendo simulación...');

    this.isSimulating = false;
    this.updateSubscription?.unsubscribe();

    // Remover todos los marcadores y polylines del mapa
    if (this.map) {
      this.simulatedVehicles.forEach(vehicle => {
        this.map!.removeLayer(vehicle.marker);
        if (vehicle.routePolyline) {
          this.map!.removeLayer(vehicle.routePolyline);
        }
      });
    }

    this.simulatedVehicles.clear();
  }

  /**
   * Obtener posiciones actuales
   */
  getCurrentPositions(): VehiclePosition[] {
    return Array.from(this.simulatedVehicles.values()).map(v => v.position);
  }

  /**
   * Crear vehículos simulados
   */
  private createSimulatedVehicles(count: number) {
    const statuses: ('AVAILABLE' | 'BUSY' | 'OFFLINE')[] = ['BUSY', 'BUSY', 'AVAILABLE', 'BUSY', 'AVAILABLE'];

    for (let i = 0; i < count; i++) {
      const vehicleId = `vehicle-${String(i + 1).padStart(3, '0')}`;
      const status = statuses[i % statuses.length];

      // Posición inicial aleatoria en Bogotá
      const startLat = this.randomInRange(this.BOGOTA_BOUNDS.south, this.BOGOTA_BOUNDS.north);
      const startLng = this.randomInRange(this.BOGOTA_BOUNDS.west, this.BOGOTA_BOUNDS.east);

      // Destino aleatorio en Bogotá
      const targetLat = this.randomInRange(this.BOGOTA_BOUNDS.south, this.BOGOTA_BOUNDS.north);
      const targetLng = this.randomInRange(this.BOGOTA_BOUNDS.west, this.BOGOTA_BOUNDS.east);

      const position: VehiclePosition = {
        vehicleId,
        vehicleName: `Vehículo ${i + 1}`,
        lat: startLat,
        lng: startLng,
        latitude: startLat,
        longitude: startLng,
        speed: status === 'BUSY' ? this.randomInRange(30, 60) : 0,
        status,
        lastUpdate: new Date(),
        heading: 0,
        eta: status === 'BUSY' ? Math.ceil(this.randomInRange(10, 45)) : 0,
        distance: status === 'BUSY' ? this.randomInRange(5, 25) : 0,
        driverName: `Conductor ${i + 1}`,
        distanceToDestination: status === 'BUSY' ? this.randomInRange(5, 25) : 0
      };

      // Crear marcador en el mapa
      let marker: L.Marker | undefined;
      if (this.map) {
        marker = this.createVehicleMarker(position);
      }

      // Generar path simple (línea recta interpolada)
      const path = this.generatePath(startLat, startLng, targetLat, targetLng);

      if (marker) {
        // Crear polyline para la ruta
        const routePolyline = this.createRoutePolyline(path);

        this.simulatedVehicles.set(vehicleId, {
          position,
          target: { lat: targetLat, lng: targetLng },
          marker,
          path,
          currentPathIndex: 0,
          routePolyline
        });
      }

      console.log(`✅ Vehículo ${vehicleId} creado - Estado: ${status}`);
    }
  }

  /**
   * Generar path interpolado entre dos puntos
   */
  private generatePath(startLat: number, startLng: number, endLat: number, endLng: number): [number, number][] {
    const steps = 50; // Número de puntos intermedios
    const path: [number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lat = startLat + (endLat - startLat) * ratio;
      const lng = startLng + (endLng - startLng) * ratio;
      path.push([lat, lng]);
    }

    return path;
  }

  /**
   * Actualizar todos los vehículos
   */
  private updateAllVehicles() {
    this.simulatedVehicles.forEach((vehicle, vehicleId) => {
      if (vehicle.position.status === 'BUSY') {
        // Mover al siguiente punto del path
        vehicle.currentPathIndex++;

        if (vehicle.currentPathIndex >= vehicle.path.length) {
          // Llegó al destino, asignar nuevo destino
          this.assignNewTarget(vehicle);
        } else {
          // Actualizar posición
          const [lat, lng] = vehicle.path[vehicle.currentPathIndex];

          // Calcular heading
          const prevPosition = vehicle.position;
          const heading = this.realtimeService.calculateHeading(
            prevPosition.lat,
            prevPosition.lng,
            lat,
            lng
          );

          // Actualizar posición
          vehicle.position = {
            ...vehicle.position,
            lat,
            lng,
            latitude: lat,
            longitude: lng,
            heading,
            lastUpdate: new Date(),
            eta: Math.max(0, (vehicle.position.eta || 0) - 0.5), // Reducir ETA
            distance: Math.max(0, (vehicle.position.distance || 0) - 0.1), // Reducir distancia
            distanceToDestination: Math.max(0, (vehicle.position.distanceToDestination || 0) - 0.1)
          };

          // Actualizar marcador en el mapa
          if (this.map && vehicle.marker) {
            vehicle.marker.setLatLng([lat, lng]);

            // Actualizar icono con rotación
            const icon = this.createVehicleIcon(vehicle.position);
            vehicle.marker.setIcon(icon);

            // Actualizar popup
            const popupContent = this.createPopupContent(vehicle.position);
            vehicle.marker.setPopupContent(popupContent);
          }

          // Emitir actualización
          this.positionUpdates$.next(vehicle.position);
        }
      }
    });
  }

  /**
   * Asignar nuevo destino a un vehículo
   */
  private assignNewTarget(vehicle: SimulatedVehicle) {
    const targetLat = this.randomInRange(this.BOGOTA_BOUNDS.south, this.BOGOTA_BOUNDS.north);
    const targetLng = this.randomInRange(this.BOGOTA_BOUNDS.west, this.BOGOTA_BOUNDS.east);

    vehicle.target = { lat: targetLat, lng: targetLng };
    vehicle.path = this.generatePath(
      vehicle.position.lat,
      vehicle.position.lng,
      targetLat,
      targetLng
    );
    vehicle.currentPathIndex = 0;

    // Actualizar ETA y distancia
    const distance = this.realtimeService['calculateDistance'](
      vehicle.position.lat,
      vehicle.position.lng,
      targetLat,
      targetLng
    );

    vehicle.position.distance = distance;
    vehicle.position.distanceToDestination = distance;
    vehicle.position.eta = Math.ceil((distance / vehicle.position.speed) * 60);

    // Actualizar polyline de la ruta
    if (vehicle.routePolyline && this.map) {
      this.map.removeLayer(vehicle.routePolyline);
    }
    vehicle.routePolyline = this.createRoutePolyline(vehicle.path);

    console.log(`🎯 Nuevo destino asignado a ${vehicle.position.vehicleId}`);
  }

  /**
   * Crear marcador de vehículo
   */
  private createVehicleMarker(position: VehiclePosition): L.Marker {
    const icon = this.createVehicleIcon(position);
    const marker = L.marker([position.lat, position.lng], { icon });

    if (this.map) {
      marker.addTo(this.map);
    }

    const popupContent = this.createPopupContent(position);
    marker.bindPopup(popupContent);

    return marker;
  }

  /**
   * Crear polyline para la ruta del vehículo
   */
  private createRoutePolyline(path: [number, number][]): L.Polyline | undefined {
    if (!this.map || path.length < 2) return undefined;

    const latlngs = path.map(point => L.latLng(point[0], point[1]));

    const polyline = L.polyline(latlngs, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.6,
      dashArray: '5, 10',
      lineJoin: 'round',
      lineCap: 'round'
    });

    polyline.addTo(this.map);
    return polyline;
  }

  /**
   * Crear icono de vehículo con rotación
   */
  private createVehicleIcon(position: VehiclePosition): L.DivIcon {
    const colors: any = {
      'AVAILABLE': '#22c55e',
      'BUSY': '#f59e0b',
      'OFFLINE': '#6b7280'
    };
    const color = colors[position.status] || '#3b82f6';

    return L.divIcon({
      html: `
        <div class="vehicle-marker-realtime" style="transform: rotate(${position.heading || 0}deg);">
          <div class="vehicle-icon" style="background: ${color};">
            🚚
          </div>
          <div class="pulse-ring" style="border-color: ${color};"></div>
        </div>
      `,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  /**
   * Crear contenido del popup
   */
  private createPopupContent(position: VehiclePosition): string {
    const statusColors: any = {
      'AVAILABLE': '#22c55e',
      'BUSY': '#f59e0b',
      'OFFLINE': '#6b7280'
    };
    const statusColor = statusColors[position.status] || '#3b82f6';

    const statusTexts: any = {
      'AVAILABLE': 'Disponible',
      'BUSY': 'En ruta',
      'OFFLINE': 'Desconectado'
    };
    const statusText = statusTexts[position.status] || 'Desconocido';

    return `
      <div class="vehicle-popup-realtime">
        <h4>🚚 ${position.vehicleName}</h4>
        <div class="popup-status" style="background: ${statusColor}20; color: ${statusColor};">
          ${statusText}
        </div>
        <div class="popup-info">
          <p><strong>Velocidad:</strong> ${position.speed.toFixed(1)} km/h</p>
          ${position.eta ? `<p><strong>ETA:</strong> ${position.eta} min</p>` : ''}
          ${position.distance ? `<p><strong>Distancia:</strong> ${position.distance.toFixed(1)} km</p>` : ''}
          <p><strong>Actualizado:</strong> ${this.getTimeAgo(position.lastUpdate)}</p>
        </div>
      </div>
    `;
  }

  /**
   * Calcular "hace cuánto"
   */
  private getTimeAgo(timestamp: Date): string {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diff = Math.floor((now - time) / 1000);

    if (diff < 5) return 'Ahora mismo';
    if (diff < 60) return `Hace ${diff}s`;
    return 'Hace un momento';
  }

  /**
   * Generar número aleatorio en un rango
   */
  private randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
