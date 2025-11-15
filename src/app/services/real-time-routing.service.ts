// src/app/services/real-time-routing.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import * as L from 'leaflet';

export interface VehiclePosition {
  vehicleId: string;
  vehicleName: string;
  lat: number;
  lng: number;
  latitude: number; // Alias for lat
  longitude: number; // Alias for lng
  speed: number;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  lastUpdate: Date;
  heading?: number; // Dirección en grados (0-360)
  eta?: number; // Tiempo estimado de llegada en minutos
  distance?: number; // Distancia restante en km
  driverName: string;
  distanceToDestination?: number;
}

export interface RouteResponse {
  coordinates: [number, number][];
  distance: number;
  duration: number;
}

export interface OptimizedRoute {
  geometry: L.LatLng[];
  distance: number;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealTimeRoutingService {
  private http = inject(HttpClient);

  // API URLs
  private readonly API_URL = 'http://localhost:8000/api';
  private readonly OSRM_API = 'https://router.project-osrm.org/route/v1/driving';

  constructor() {
    console.log('🚀 RealTimeRoutingService inicializado');
    console.log('📡 API URL:', this.API_URL);
  }

  /**
   * Obtener todas las posiciones de vehículos
   */
  getAllVehiclePositions(): Observable<VehiclePosition[]> {
    const url = `${this.API_URL}/vehicles/positions`;
    console.log('📍 Solicitando posiciones:', url);

    return this.http.get<VehiclePosition[]>(url).pipe(
      tap(positions => {
        console.log(`✅ ${positions.length} posiciones recibidas`);
      }),
      map(positions => positions.map(pos => ({
        ...pos,
        lastUpdate: new Date(pos.lastUpdate),
        latitude: pos.lat, // Alias
        longitude: pos.lng, // Alias
        driverName: pos.vehicleName, // Alias for now
        distanceToDestination: pos.distance
      }))),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error obteniendo posiciones:', error);

        // Si el backend no está disponible, usar datos simulados
        if (error.status === 0 || error.status === 404) {
          console.warn('⚠️ Backend no disponible, usando datos simulados');
          return of(this.getSimulatedPositions());
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Alias for getAllVehiclePositions (used in dashboard)
   */
  getVehiclePositions(): Observable<Map<string, VehiclePosition>> {
    return this.getAllVehiclePositions().pipe(
      map(positions => {
        const positionMap = new Map<string, VehiclePosition>();
        positions.forEach(pos => {
          positionMap.set(pos.vehicleId, pos);
        });
        return positionMap;
      })
    );
  }

  /**
   * Obtener posición de un vehículo específico
   */
  getVehiclePosition(vehicleId: string): Observable<VehiclePosition | null> {
    return this.getAllVehiclePositions().pipe(
      map(positions => positions.find(p => p.vehicleId === vehicleId) || null),
      catchError(error => {
        console.error('Error obteniendo posición del vehículo:', error);
        return of(null);
      })
    );
  }

  /**
   * Calcular ruta entre dos puntos usando OSRM
   */
  calculateRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Observable<RouteResponse> {
    const url = `${this.OSRM_API}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.code === 'Ok' && response.routes.length > 0) {
          const route = response.routes[0];
          return {
            coordinates: route.geometry.coordinates.map((coord: number[]) =>
              [coord[1], coord[0]] as [number, number]
            ),
            distance: route.distance / 1000, // Convertir a kilómetros
            duration: route.duration / 60 // Convertir a minutos
          };
        }
        throw new Error('No se pudo calcular la ruta');
      }),
      catchError(error => {
        console.error('Error calculando ruta con OSRM:', error);
        // Retornar ruta directa como fallback
        return of({
          coordinates: [[startLat, startLng], [endLat, endLng]] as [number, number][],
          distance: this.calculateDistance(startLat, startLng, endLat, endLng),
          duration: 30 // Estimación por defecto
        });
      })
    );
  }

  /**
   * Calcular distancia entre dos puntos (fórmula de Haversine)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calcular dirección (heading) entre dos puntos
   */
  calculateHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = this.toRadians(lng2 - lng1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    let heading = Math.atan2(y, x);
    heading = heading * (180 / Math.PI);
    heading = (heading + 360) % 360;

    return heading;
  }

  /**
   * Datos simulados para pruebas (cuando el backend no está disponible)
   */
  private getSimulatedPositions(): VehiclePosition[] {
    const bogotaCenter = { lat: 4.6097, lng: -74.0817 };

    return [
      {
        vehicleId: 'vehicle-001',
        vehicleName: 'Vehículo Norte',
        lat: bogotaCenter.lat + 0.05,
        lng: bogotaCenter.lng,
        latitude: bogotaCenter.lat + 0.05,
        longitude: bogotaCenter.lng,
        speed: 45,
        status: 'BUSY',
        lastUpdate: new Date(),
        heading: 180,
        eta: 15,
        distance: 12.5,
        driverName: 'Juan Pérez',
        distanceToDestination: 12.5
      },
      {
        vehicleId: 'vehicle-002',
        vehicleName: 'Vehículo Sur',
        lat: bogotaCenter.lat - 0.03,
        lng: bogotaCenter.lng - 0.02,
        latitude: bogotaCenter.lat - 0.03,
        longitude: bogotaCenter.lng - 0.02,
        speed: 35,
        status: 'BUSY',
        lastUpdate: new Date(),
        heading: 90,
        eta: 25,
        distance: 18.3,
        driverName: 'María García',
        distanceToDestination: 18.3
      },
      {
        vehicleId: 'vehicle-003',
        vehicleName: 'Vehículo Centro',
        lat: bogotaCenter.lat,
        lng: bogotaCenter.lng + 0.01,
        latitude: bogotaCenter.lat,
        longitude: bogotaCenter.lng + 0.01,
        speed: 0,
        status: 'AVAILABLE',
        lastUpdate: new Date(),
        heading: 0,
        eta: 0,
        distance: 0,
        driverName: 'Carlos Rodríguez',
        distanceToDestination: 0
      }
    ];
  }

  /**
   * Calcular ruta optimizada multi-parada
   */
  calculateOptimizedMultiRoute(waypoints: L.LatLng[]): Observable<OptimizedRoute> {
    if (waypoints.length < 2) {
      return of({
        geometry: [],
        distance: 0,
        duration: 0
      });
    }

    // Para simplificar, calcular ruta punto a punto
    const routePromises: Observable<RouteResponse>[] = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];
      routePromises.push(
        this.calculateRoute(start.lat, start.lng, end.lat, end.lng)
      );
    }

    return of(...routePromises).pipe(
      map(responses => {
        const allCoordinates: L.LatLng[] = [];
        let totalDistance = 0;
        let totalDuration = 0;

        responses.forEach(response => {
          response.coordinates.forEach(coord => {
            allCoordinates.push(L.latLng(coord[0], coord[1]));
          });
          totalDistance += response.distance;
          totalDuration += response.duration;
        });

        return {
          geometry: allCoordinates,
          distance: totalDistance,
          duration: totalDuration
        };
      }),
      catchError(error => {
        console.error('Error calculating optimized multi-route:', error);
        // Fallback: ruta directa
        return of({
          geometry: waypoints,
          distance: this.calculateDistance(
            waypoints[0].lat, waypoints[0].lng,
            waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng
          ),
          duration: 30
        });
      })
    );
  }

  /**
   * Simular actualización de posición (para pruebas)
   */
  simulatePositionUpdate(
    currentPosition: VehiclePosition,
    targetLat: number,
    targetLng: number,
    speed: number = 40
  ): VehiclePosition {
    // Calcular siguiente posición basada en velocidad
    const distance = this.calculateDistance(
      currentPosition.lat,
      currentPosition.lng,
      targetLat,
      targetLng
    );

    // Movimiento en km (speed en km/h, intervalo de actualización en segundos)
    const moveDistance = (speed / 3600) * 2; // 2 segundos de intervalo

    if (distance <= moveDistance) {
      // Ya llegó al destino
      return {
        ...currentPosition,
        lat: targetLat,
        lng: targetLng,
        latitude: targetLat,
        longitude: targetLng,
        speed: 0,
        status: 'AVAILABLE',
        lastUpdate: new Date(),
        heading: currentPosition.heading || 0,
        eta: 0,
        distance: 0,
        distanceToDestination: 0
      };
    }

    // Calcular nueva posición
    const ratio = moveDistance / distance;
    const newLat = currentPosition.lat + (targetLat - currentPosition.lat) * ratio;
    const newLng = currentPosition.lng + (targetLng - currentPosition.lng) * ratio;

    // Calcular heading
    const heading = this.calculateHeading(
      currentPosition.lat,
      currentPosition.lng,
      newLat,
      newLng
    );

    // Calcular ETA y distancia restante
    const remainingDistance = distance - moveDistance;
    const eta = Math.ceil((remainingDistance / speed) * 60); // En minutos

    return {
      ...currentPosition,
      lat: newLat,
      lng: newLng,
      latitude: newLat,
      longitude: newLng,
      speed: speed,
      status: 'BUSY',
      lastUpdate: new Date(),
      heading: heading,
      eta: eta,
      distance: remainingDistance,
      distanceToDestination: remainingDistance
    };
  }
}
