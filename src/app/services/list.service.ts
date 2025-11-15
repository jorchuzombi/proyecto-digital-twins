// src/app/services/list.service.ts - PUERTO CORREGIDO
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout, retry, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ListService {
  // ✅ USAR ENVIRONMENT PARA LA URL
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
    console.log('🚀 ListService inicializado');
    console.log('📡 Backend URL:', this.BASE_URL);
    console.log('🛣️  Routes URL:', this.ROUTES_URL);
    console.log('👥 Drivers URL:', this.DRIVERS_URL);
    console.log('🚚 Vehicles URL:', this.VEHICLES_URL);
    this.testConnection();
  }

  // ===== PRUEBA DE CONEXIÓN =====

  private testConnection() {
    console.log('🔍 Probando conexión con backend...');

    // Probar endpoint de test
    this.http.get(`${this.ROUTES_URL}/test`, { responseType: 'text' })
      .pipe(
        timeout(3000),
        catchError(() => {
          console.warn('⚠️ Backend no responde en /routes/test');
          return throwError(() => new Error('Backend no disponible'));
        })
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Backend conectado:', response);
        },
        error: (error) => {
          console.error('❌ Error conectando al backend:', error.message);
          console.error('💡 Verifica que el backend esté corriendo en:', this.BASE_URL);
        }
      });
  }

  // ===== MÉTODOS DE RUTAS =====

  getAllRoutes(): Observable<any[]> {
    console.log(`📡 GET ${this.ROUTES_URL}`);

    return this.http.get<any[]>(this.ROUTES_URL, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((routes) => {
          console.log(`✅ ${routes.length} rutas recibidas del backend`);
          if (routes.length > 0) {
            console.log('📊 Primera ruta:', routes[0]);
          }
        }),
        catchError((error) => this.handleError('getAllRoutes', error))
      );
  }

  getRouteById(id: string): Observable<any> {
    console.log(`📡 GET ${this.ROUTES_URL}/${id}`);

    return this.http.get<any>(`${this.ROUTES_URL}/${id}`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((route) => {
          console.log('✅ Ruta recibida:', route);
        }),
        catchError((error) => this.handleError('getRouteById', error))
      );
  }

  createRoute(routeData: any): Observable<any> {
    console.log(`📡 POST ${this.ROUTES_URL}`);
    console.log('📤 Datos a enviar:', routeData);

    return this.http.post<any>(this.ROUTES_URL, routeData, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        tap((response) => {
          console.log('✅ Ruta creada exitosamente:', response);
        }),
        catchError((error) => this.handleError('createRoute', error))
      );
  }

  updateRoute(id: string, routeData: any): Observable<any> {
    console.log(`📡 PUT ${this.ROUTES_URL}/${id}`);
    console.log('📤 Datos a actualizar:', routeData);

    return this.http.put<any>(`${this.ROUTES_URL}/${id}`, routeData, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        tap((response) => {
          console.log('✅ Ruta actualizada exitosamente:', response);
        }),
        catchError((error) => this.handleError('updateRoute', error))
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
        catchError((error) => this.handleError('deleteRoute', error))
      );
  }

  getRouteStops(routeId: string): Observable<any[]> {
    console.log(`📡 GET ${this.ROUTES_URL}/${routeId}/stops`);

    return this.http.get<any[]>(`${this.ROUTES_URL}/${routeId}/stops`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((stops) => {
          console.log(`✅ ${stops.length} paradas recibidas`);
        }),
        catchError((error) => this.handleError('getRouteStops', error))
      );
  }

  // ===== MÉTODOS DE CONDUCTORES =====

  getAvailableDrivers(): Observable<any[]> {
    console.log(`📡 GET ${this.DRIVERS_URL}/available`);

    return this.http.get<any[]>(`${this.DRIVERS_URL}/available`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((drivers) => {
          console.log(`✅ ${drivers.length} conductores disponibles recibidos`);
        }),
        catchError((error) => this.handleError('getAvailableDrivers', error))
      );
  }

  getDriverById(id: string): Observable<any> {
    console.log(`📡 GET ${this.DRIVERS_URL}/${id}`);

    return this.http.get<any>(`${this.DRIVERS_URL}/${id}`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((driver) => {
          console.log('✅ Conductor recibido:', driver);
        }),
        catchError((error) => this.handleError('getDriverById', error))
      );
  }

  // ===== MÉTODOS DE VEHÍCULOS =====

  getAvailableVehicles(): Observable<any[]> {
    console.log(`📡 GET ${this.VEHICLES_URL}/available`);

    return this.http.get<any[]>(`${this.VEHICLES_URL}/available`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((vehicles) => {
          console.log(`✅ ${vehicles.length} vehículos disponibles recibidos`);
        }),
        catchError((error) => this.handleError('getAvailableVehicles', error))
      );
  }

  getAllVehicles(): Observable<any[]> {
    console.log(`📡 GET ${this.VEHICLES_URL}`);

    return this.http.get<any[]>(this.VEHICLES_URL, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((vehicles) => {
          console.log(`✅ ${vehicles.length} vehículos recibidos`);
        }),
        catchError((error) => this.handleError('getAllVehicles', error))
      );
  }

  getVehicleByPlate(plate: string): Observable<any> {
    console.log(`📡 GET ${this.VEHICLES_URL}/placa/${plate}`);

    return this.http.get<any>(`${this.VEHICLES_URL}/placa/${plate}`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((vehicle) => {
          console.log('✅ Vehículo recibido:', vehicle);
        }),
        catchError((error) => this.handleError('getVehicleByPlate', error))
      );
  }

  // ===== MANEJO DE ERRORES =====

  private handleError(operation: string, error: HttpErrorResponse): Observable<never> {
    console.error(`❌ Error en ${operation}:`, error);

    let errorMessage = 'Error desconocido';

    if (error.status === 0) {
      errorMessage = 'No se puede conectar al backend';
      console.error('🔌 Error de red - Verifica que el backend esté corriendo en:', this.BASE_URL);
      console.error('💡 URL esperada:', this.BASE_URL);
      console.error('💡 Comando para iniciar backend: ./mvnw spring-boot:run');
    } else if (error.status >= 500) {
      errorMessage = `Error del servidor: ${error.status}`;
      console.error('🔥 Error del servidor:', error.status, error.statusText);
    } else if (error.status >= 400) {
      errorMessage = `Error del cliente: ${error.status}`;
      console.error('⚠️ Error del cliente:', error.status, error.statusText);
      if (error.error) {
        console.error('📋 Detalles:', error.error);
      }
    }

    return throwError(() => new Error(errorMessage));
  }

  // ===== UTILIDADES =====

  isBackendAvailable(): Observable<boolean> {
    console.log('🔍 Verificando disponibilidad del backend...');

    return new Observable(observer => {
      this.http.get(`${this.ROUTES_URL}/test`, {
        responseType: 'text',
        observe: 'response'
      })
        .pipe(timeout(3000))
        .subscribe({
          next: (response) => {
            const available = response.status === 200;
            console.log(`${available ? '✅' : '❌'} Backend ${available ? 'disponible' : 'no disponible'}`);
            observer.next(available);
            observer.complete();
          },
          error: () => {
            console.log('❌ Backend no disponible');
            observer.next(false);
            observer.complete();
          }
        });
    });
  }

  refreshAllData(): Observable<{routes: any[], drivers: any[], vehicles: any[]}> {
    console.log('🔄 Refrescando todos los datos...');

    return new Observable(observer => {
      Promise.all([
        this.getAllRoutes().toPromise(),
        this.getAvailableDrivers().toPromise(),
        this.getAvailableVehicles().toPromise()
      ]).then(([routes, drivers, vehicles]) => {
        console.log('✅ Datos refrescados exitosamente');
        observer.next({
          routes: routes || [],
          drivers: drivers || [],
          vehicles: vehicles || []
        });
        observer.complete();
      }).catch(error => {
        console.error('❌ Error refrescando datos:', error);
        observer.error(error);
      });
    });
  }
}
