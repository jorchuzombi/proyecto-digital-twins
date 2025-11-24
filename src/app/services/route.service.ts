// src/app/services/route.service.ts - COMPLETO Y CORREGIDO
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, timeout, retry, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment'; // ✅ IMPORT AÑADIDO

export interface Route {
  id: string;
  name: string;
  driver: any;
  driverId?: string;
  vehicle: string;
  city: string;
  distance: number;
  estimatedDuration?: string;
  startTime: string;
  endTime: string;
  fuelCost: number;
  revenue: number;
  notes?: string;
  status: string;
  stops?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class RouteService {
  // ✅ USA environment EN VEZ DE HARDCODEAR
  private readonly BASE_URL = environment.apiUrl;
  private readonly ROUTES_URL = `${this.BASE_URL}/routes`;
  private readonly DRIVERS_URL = `${this.BASE_URL}/drivers`;
  private readonly VEHICLES_URL = `${this.BASE_URL}/vehicles`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  private readonly TIMEOUT_MS = 10000;
  private readonly RETRY_COUNT = 2;

  constructor(private http: HttpClient) {
    console.log('🚀 RouteService inicializado');
    console.log('📡 Backend URL:', this.BASE_URL);
    this.checkBackendConnection();
  }

  // ===== VERIFICACIÓN DE CONEXIÓN =====

  private checkBackendConnection() {
    console.log('🔍 Verificando conexión con backend...');

    this.http.get(`${this.ROUTES_URL}/test`, { responseType: 'text' })
      .pipe(
        timeout(3000),
        catchError(() => of(null))
      )
      .subscribe({
        next: (response) => {
          if (response) {
            console.log('✅ Backend conectado:', response);
          } else {
            console.warn('⚠️ Backend no responde');
          }
        }
      });
  }

  // ===== MÉTODOS DE RUTAS =====

  getAllRoutes(): Observable<Route[]> {
    console.log(`📡 GET ${this.ROUTES_URL}`);

    return this.http.get<Route[]>(this.ROUTES_URL, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((routes: any[]) => {
          console.log(`✅ ${routes.length} rutas recibidas`);
        }),
        catchError(this.handleError<Route[]>('getAllRoutes', []))
      );
  }

  getRouteById(id: string): Observable<Route> {
    console.log(`📡 GET ${this.ROUTES_URL}/${id}`);

    return this.http.get<Route>(`${this.ROUTES_URL}/${id}`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((route: any) => {
          console.log('✅ Ruta recibida:', route);
        }),
        catchError((error) => {
          console.error(`❌ Error obteniendo ruta ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  createRoute(route: any): Observable<any> {
    console.log(`📡 POST ${this.ROUTES_URL}`);
    console.log('📤 Datos enviados:', route);

    return this.http.post<any>(this.ROUTES_URL, route, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        tap((response: any) => {
          console.log('✅ Ruta creada exitosamente:', response);
        }),
        catchError((error) => {
          console.error('❌ Error creando ruta:', error);
          return throwError(() => error);
        })
      );
  }

  updateRoute(id: string, route: any): Observable<any> {
    console.log(`📡 PUT ${this.ROUTES_URL}/${id}`);
    console.log('📤 Datos enviados:', route);

    return this.http.put<any>(`${this.ROUTES_URL}/${id}`, route, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        tap((response: any) => {
          console.log('✅ Ruta actualizada exitosamente:', response);
        }),
        catchError((error) => {
          console.error(`❌ Error actualizando ruta ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  deleteRoute(id: string): Observable<any> {
    console.log(`📡 DELETE ${this.ROUTES_URL}/${id}`);

    return this.http.delete<any>(`${this.ROUTES_URL}/${id}`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        tap(() => {
          console.log(`✅ Ruta ${id} eliminada exitosamente`);
        }),
        catchError((error) => {
          console.error(`❌ Error eliminando ruta ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  getRouteStops(routeId: string): Observable<any[]> {
    console.log(`📡 GET ${this.ROUTES_URL}/${routeId}/stops`);

    return this.http.get<any[]>(`${this.ROUTES_URL}/${routeId}/stops`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((stops: any[]) => {
          console.log(`✅ ${stops.length} paradas recibidas`);
        }),
        catchError(this.handleError<any[]>('getRouteStops', []))
      );
  }

  optimizeRoute(routeId: string): Observable<any> {
    console.log(`📡 POST ${this.ROUTES_URL}/${routeId}/optimize`);

    return this.http.post<any>(`${this.ROUTES_URL}/${routeId}/optimize`, {}, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        tap((response: any) => {
          console.log('✅ Ruta optimizada:', response);
        }),
        catchError((error) => {
          console.error('❌ Error optimizando ruta:', error);
          return throwError(() => error);
        })
      );
  }

  // ===== MÉTODOS DE CONDUCTORES =====

  getAvailableDrivers(): Observable<any[]> {
    console.log(`📡 GET ${this.DRIVERS_URL}/available`);

    return this.http.get<any[]>(`${this.DRIVERS_URL}/available`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((drivers: any[]) => {
          console.log(`✅ ${drivers.length} conductores recibidos`);
        }),
        catchError(this.handleError<any[]>('getAvailableDrivers', []))
      );
  }

  // ===== MÉTODOS DE VEHÍCULOS =====

  getAvailableVehicles(): Observable<any[]> {
    console.log(`📡 GET ${this.VEHICLES_URL}/available`);

    return this.http.get<any[]>(`${this.VEHICLES_URL}/available`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((vehicles: any[]) => {
          console.log(`✅ ${vehicles.length} vehículos recibidos`);
        }),
        catchError(this.handleError<any[]>('getAvailableVehicles', []))
      );
  }

  // ===== MÉTODOS DE UTILIDAD =====

  getStatusColor(status: string): string {
    switch (status) {
      case 'IN_PROGRESS': return '#10b981';
      case 'COMPLETED': return '#3b82f6';
      case 'PENDING': return '#f59e0b';
      case 'CANCELLED': return '#ef4444';
      case 'OPTIMIZED': return '#8b5cf6';
      default: return '#6b7280';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'IN_PROGRESS': return '🚚';
      case 'COMPLETED': return '✅';
      case 'PENDING': return '⏱️';
      case 'CANCELLED': return '❌';
      case 'OPTIMIZED': return '⚡';
      default: return '📦';
    }
  }

  calculateRouteProgress(route: any): number {
    if (!route.stops || route.stops.length === 0) return 0;
    if (route.status === 'COMPLETED') return 100;
    if (route.status === 'PENDING') return 0;

    const completedStops = Math.floor(Math.random() * route.stops.length);
    return Math.round((completedStops / route.stops.length) * 100);
  }

  getActiveRoutes(routes: Route[]): Route[] {
    return routes.filter(r =>
      r.status === 'IN_PROGRESS' || r.status === 'PENDING'
    );
  }

  calculateEfficiencyMetrics(routes: Route[]): any {
    if (routes.length === 0) {
      return {
        averageDistance: 0,
        averageFuelCost: 0,
        averageRevenue: 0,
        totalProfit: 0
      };
    }

    const totalDistance = routes.reduce((sum, r) => sum + (r.distance || 0), 0);
    const totalFuelCost = routes.reduce((sum, r) => sum + (r.fuelCost || 0), 0);
    const totalRevenue = routes.reduce((sum, r) => sum + (r.revenue || 0), 0);

    return {
      averageDistance: Math.round(totalDistance / routes.length),
      averageFuelCost: Math.round(totalFuelCost / routes.length),
      averageRevenue: Math.round(totalRevenue / routes.length),
      totalProfit: totalRevenue - totalFuelCost
    };
  }

  // ===== MANEJO DE ERRORES =====

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`❌ Error en ${operation}:`, error);

      if (error.status === 0) {
        console.error('🔌 Error de red - Backend no disponible');
        console.error('💡 Verifica que el backend esté corriendo en:', this.BASE_URL);
        console.error('💡 Comando: ./mvnw spring-boot:run');
      } else if (error.status >= 500) {
        console.error('🔥 Error del servidor:', error.status);
      } else if (error.status >= 400) {
        console.error('⚠️ Error del cliente:', error.status);
      }

      return result !== undefined ? of(result as T) : throwError(() => error);
    };
  }

  testConnection(): Observable<boolean> {
    console.log('🧪 Probando conexión con API...');

    return this.http.get(`${this.ROUTES_URL}/test`, { responseType: 'text' })
      .pipe(
        timeout(3000),
        map(() => {
          console.log('✅ API conectada correctamente');
          return true;
        }),
        catchError(() => {
          console.warn('⚠️ No se pudo conectar con la API');
          return of(false);
        })
      );
  }
}
