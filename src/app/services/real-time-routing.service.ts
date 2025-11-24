import * as L from 'leaflet';

// src/app/services/real-time-routing.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, of, throwError } from 'rxjs';
import { map, switchMap, catchError, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface VehiclePosition {
  vehicleId: string;
  driverId: string;
  driverName: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  lastUpdate: Date;
  currentRouteId?: string;
  nextStop?: string;
  eta?: string;
  distanceToDestination?: number;
  trafficLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'HEAVY';
  vehicleType?: string;
}

export interface OptimizedRoute {
  id: string;
  vehicleId: string;
  driverId: string;
  waypoints: L.LatLng[];
  distance: number;
  duration: number;
  optimizedOrder: number[];
}

export interface RouteStop {
  latitude: number;
  longitude: number;
  address?: string;
  order?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealTimeRoutingService {
  private apiUrl = `${environment.apiUrl}/tracking`;
  private vehiclePositionsSubject = new BehaviorSubject<Map<string, VehiclePosition>>(new Map());
  public vehiclePositions$ = this.vehiclePositionsSubject.asObservable();
  private activeRoutes = new Map<string, OptimizedRoute>();

  constructor(private http: HttpClient) {
    console.log('🚀 RealTimeRoutingService inicializado');
    console.log('📍 API URL:', this.apiUrl);
    this.startPositionPolling();
  }

  /**
   * Asigna una ruta a un vehículo
   */
  assignRouteToVehicle(
    routeId: string,
    vehicleId: string,
    driverId: string,
    stops: RouteStop[]
  ): Observable<OptimizedRoute> {
    console.log('🔧 assignRouteToVehicle - LLAMADA AL SERVICIO');
    console.log('📦 Parámetros recibidos:', { routeId, vehicleId, driverId, stops: stops?.length || 0 });

    if (!routeId) {
      console.error('❌ routeId es undefined o vacío');
      return throwError(() => new Error('routeId es requerido'));
    }
    if (!vehicleId) {
      console.error('❌ vehicleId es undefined o vacío');
      return throwError(() => new Error('vehicleId es requerido'));
    }
    if (!driverId) {
      console.error('❌ driverId es undefined o vacío');
      return throwError(() => new Error('driverId es requerido'));
    }
    if (!stops || stops.length === 0) {
      console.error('❌ stops está vacío o undefined');
      return throwError(() => new Error('stops es requerido'));
    }

    const url = `${this.apiUrl}/assign-route`;
    const payload = { routeId, vehicleId, driverId, stops };

    console.log('📤 Enviando POST a:', url);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    return this.http.post<any>(url, payload).pipe(
      tap(response => console.log('✅ Respuesta recibida:', response)),
      map(response => {
        const optimizedRoute: OptimizedRoute = {
          id: routeId,
          vehicleId: vehicleId,
          driverId: driverId,
          waypoints: stops.map(stop => L.latLng(stop.latitude, stop.longitude)),
          distance: response.distance || 0,
          duration: response.duration || 0,
          optimizedOrder: response.optimizedOrder || stops.map((_, i) => i)
        };
        this.activeRoutes.set(routeId, optimizedRoute);
        console.log(`✅ Ruta ${routeId} guardada en caché local`);
        return optimizedRoute;
      }),
      catchError(error => {
        console.error('❌ Error en assignRouteToVehicle:', error);
        throw error;
      })
    );
  }

  /**
   * Inicia una ruta
   */
  startRoute(routeId: string): Observable<boolean> {
    console.log(`🚀 startRoute - Iniciando ruta ${routeId}`);
    if (!routeId) {
      console.error('❌ routeId es undefined');
      return of(false);
    }
    const url = `${environment.apiUrl}/routes/${routeId}/start`;
    console.log('📤 POST a:', url);
    return this.http.post<any>(url, {}).pipe(
      tap(response => console.log('✅ Ruta iniciada, respuesta:', response)),
      map(response => response.success !== false),
      catchError(error => {
        console.error('❌ Error iniciando ruta:', error);
        return of(false);
      })
    );
  }

  /**
   * Completa una ruta
   */
  completeRoute(routeId: string): Observable<boolean> {
    console.log(`✅ completeRoute - Completando ruta ${routeId}`);
    if (!routeId) {
      console.error('❌ routeId es undefined');
      return of(false);
    }
    const url = `${environment.apiUrl}/routes/${routeId}/complete`;
    console.log('📤 POST a:', url);
    return this.http.post<any>(url, {}).pipe(
      tap(response => console.log('✅ Ruta completada, respuesta:', response)),
      map(response => response.success !== false),
      catchError(error => {
        console.error('❌ Error completando ruta:', error);
        return of(false);
      })
    );
  }

  /**
   * Obtiene las posiciones de todos los vehículos
   */
  getVehiclePositions(): Observable<Map<string, VehiclePosition>> {
    return this.http.get<any[]>(`${this.apiUrl}/positions`).pipe(
      map(positions => {
        const positionsMap = new Map<string, VehiclePosition>();
        positions.forEach(pos => {
          const vehiclePosition: VehiclePosition = {
            vehicleId: pos.vehicleId || pos.id,
            driverId: pos.driverId || `driver-${pos.vehicleId}`,
            driverName: pos.driverName || 'Conductor',
            latitude: pos.latitude,
            longitude: pos.longitude,
            speed: pos.speed || 0,
            heading: pos.heading || 0,
            status: pos.status || 'OFFLINE',
            lastUpdate: new Date(pos.lastUpdate || Date.now()),
            currentRouteId: pos.currentRouteId,
            nextStop: pos.nextStop,
            eta: pos.eta,
            distanceToDestination: pos.distanceToDestination,
            trafficLevel: pos.trafficLevel,
            vehicleType: pos.vehicleType
          };
          positionsMap.set(vehiclePosition.vehicleId, vehiclePosition);
        });
        this.vehiclePositionsSubject.next(positionsMap);
        return positionsMap;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo posiciones:', error);
        return of(new Map<string, VehiclePosition>());
      }),
      shareReplay(1)
    );
  }

  /**
   * Obtiene solo las posiciones activas
   */
  getActivePositions(): Observable<Map<string, VehiclePosition>> {
    return this.http.get<any[]>(`${this.apiUrl}/positions/active`).pipe(
      map(positions => {
        const positionsMap = new Map<string, VehiclePosition>();
        positions.forEach(pos => {
          const vehiclePosition: VehiclePosition = {
            vehicleId: pos.vehicleId || pos.id,
            driverId: pos.driverId || `driver-${pos.vehicleId}`,
            driverName: pos.driverName || 'Conductor',
            latitude: pos.latitude,
            longitude: pos.longitude,
            speed: pos.speed || 0,
            heading: pos.heading || 0,
            status: pos.status || 'OFFLINE',
            lastUpdate: new Date(pos.lastUpdate || Date.now()),
            currentRouteId: pos.currentRouteId,
            nextStop: pos.nextStop,
            eta: pos.eta,
            distanceToDestination: pos.distanceToDestination,
            trafficLevel: pos.trafficLevel,
            vehicleType: pos.vehicleType
          };
          positionsMap.set(vehiclePosition.vehicleId, vehiclePosition);
        });
        return positionsMap;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo posiciones activas:', error);
        return of(new Map<string, VehiclePosition>());
      })
    );
  }

  /**
   * Obtiene el progreso de una ruta
   */
  getRouteProgress(routeId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/progress/${routeId}`).pipe(
      catchError(error => {
        console.error(`❌ Error obteniendo progreso de ruta ${routeId}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Health check del servicio de tracking
   */
  healthCheck(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/health`).pipe(
      tap(response => console.log('✅ Health check:', response)),
      catchError(error => {
        console.error('❌ Health check falló:', error);
        return of({ status: 'error' });
      })
    );
  }

  /**
   * Inicia el polling automático de posiciones cada 5 segundos
   */
  private startPositionPolling() {
    console.log('📡 Iniciando polling de posiciones cada 5 segundos...');
    interval(5000).pipe(
      switchMap(() => this.getVehiclePositions())
    ).subscribe({
      next: (positions) => console.log(`🔄 Polling: ${positions.size} vehículos actualizados`),
      error: (error) => console.error('❌ Error en polling:', error)
    });
  }

  /**
   * Obtiene una ruta por ID desde el caché local
   */
  getRouteById(routeId: string): OptimizedRoute | undefined {
    return this.activeRoutes.get(routeId);
  }

  /**
   * Limpia todas las rutas del caché
   */
  clearRoutes() {
    this.activeRoutes.clear();
    console.log('🧹 Caché de rutas limpiado');
  }

  /**
   * Obtiene todas las rutas activas
   */
  getActiveRoutes(): OptimizedRoute[] {
    return Array.from(this.activeRoutes.values());
  }
}
