// src/app/services/driver.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout, retry, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Driver {
  id: string;
  nombre: string;
  apellido: string;
  licencia: string;
  tipoLicencia: string;
  fechaVencimientoLicencia: string;
  telefono: string;
  email: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
  disponibilidad: 'DISPONIBLE' | 'EN_RUTA' | 'DESCANSO' | 'NO_DISPONIBLE';
  licenciaVigente: boolean;
  disponibleParaRuta: boolean;
}

export interface DriverResponse {
  drivers: Driver[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
}

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private readonly BASE_URL = environment.apiUrl;
  private readonly DRIVERS_URL = `${this.BASE_URL}/drivers`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  private readonly TIMEOUT_MS = 10000;
  private readonly RETRY_COUNT = 2;

  constructor(private http: HttpClient) {
    console.log('🚀 DriverService inicializado');
    console.log('📡 Drivers URL:', this.DRIVERS_URL);
    this.testConnection();
  }

  // ===== PRUEBA DE CONEXIÓN =====
  private testConnection() {
    console.log('🔍 Probando conexión con API de conductores...');

    this.http.get(`${this.DRIVERS_URL}/test`, { responseType: 'text' })
      .pipe(
        timeout(3000),
        catchError(() => {
          console.warn('⚠️ Endpoint /drivers/test no disponible');
          return throwError(() => new Error('Backend no disponible'));
        })
      )
      .subscribe({
        next: (response) => console.log('✅ API de conductores conectada:', response),
        error: (error) => console.error('❌ Error conectando API conductores:', error.message)
      });
  }

  // ===== OBTENER TODOS LOS CONDUCTORES (CON PAGINACIÓN Y FILTROS) =====
  getAllDrivers(
    page: number = 0,
    size: number = 100,
    search?: string,
    estado?: string,
    disponibilidad?: string
  ): Observable<DriverResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search) params = params.set('search', search);
    if (estado) params = params.set('estado', estado);
    if (disponibilidad) params = params.set('disponibilidad', disponibilidad);

    console.log(`📡 GET ${this.DRIVERS_URL}`, { page, size, search, estado, disponibilidad });

    return this.http.get<DriverResponse>(this.DRIVERS_URL, {
      ...this.httpOptions,
      params
    }).pipe(
      timeout(this.TIMEOUT_MS),
      retry(this.RETRY_COUNT),
      tap((response) => {
        console.log(`✅ ${response.drivers?.length || 0} conductores recibidos (página ${response.currentPage + 1}/${response.totalPages})`);
      }),
      catchError((error) => this.handleError('getAllDrivers', error))
    );
  }

  // ===== OBTENER CONDUCTORES DISPONIBLES =====
  getAvailableDrivers(): Observable<Driver[]> {
    console.log(`📡 GET ${this.DRIVERS_URL}/available`);

    return this.http.get<Driver[]>(`${this.DRIVERS_URL}/available`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((drivers) => {
          console.log(`✅ ${drivers.length} conductores disponibles recibidos`);
          if (drivers.length > 0) {
            console.log('👤 Primer conductor:', drivers[0]);
          }
        }),
        catchError((error) => this.handleError('getAvailableDrivers', error))
      );
  }

  // ===== OBTENER CONDUCTOR POR ID =====
  getDriver(id: string): Observable<Driver> {
    console.log(`📡 GET ${this.DRIVERS_URL}/${id}`);

    return this.http.get<Driver>(`${this.DRIVERS_URL}/${id}`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((driver) => {
          console.log('✅ Conductor recibido:', driver);
        }),
        catchError((error) => this.handleError('getDriver', error))
      );
  }

  // ===== CREAR CONDUCTOR =====
  createDriver(driverData: Partial<Driver>): Observable<Driver> {
    console.log(`📡 POST ${this.DRIVERS_URL}`);
    console.log('📤 Datos del conductor:', driverData);

    return this.http.post<Driver>(this.DRIVERS_URL, driverData, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        tap((response) => {
          console.log('✅ Conductor creado exitosamente:', response);
        }),
        catchError((error) => this.handleError('createDriver', error))
      );
  }

  // ===== ACTUALIZAR CONDUCTOR =====
  updateDriver(id: string, driverData: Partial<Driver>): Observable<Driver> {
    console.log(`📡 PUT ${this.DRIVERS_URL}/${id}`);
    console.log('📤 Datos a actualizar:', driverData);

    return this.http.put<Driver>(`${this.DRIVERS_URL}/${id}`, driverData, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        tap((response) => {
          console.log('✅ Conductor actualizado exitosamente:', response);
        }),
        catchError((error) => this.handleError('updateDriver', error))
      );
  }

  // ===== ELIMINAR CONDUCTOR =====
  deleteDriver(id: string): Observable<void> {
    console.log(`📡 DELETE ${this.DRIVERS_URL}/${id}`);

    return this.http.delete<void>(`${this.DRIVERS_URL}/${id}`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        tap(() => {
          console.log(`✅ Conductor ${id} eliminado exitosamente`);
        }),
        catchError((error) => this.handleError('deleteDriver', error))
      );
  }

  // ===== OBTENER CONDUCTOR POR LICENCIA =====
  getDriverByLicense(licencia: string): Observable<Driver> {
    console.log(`📡 GET ${this.DRIVERS_URL}/licencia/${licencia}`);

    return this.http.get<Driver>(`${this.DRIVERS_URL}/licencia/${licencia}`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((driver) => {
          console.log('✅ Conductor encontrado por licencia:', driver);
        }),
        catchError((error) => this.handleError('getDriverByLicense', error))
      );
  }

  // ===== ACTUALIZAR ESTADO DE CONDUCTOR =====
  updateDriverStatus(driverId: string, status: 'DISPONIBLE' | 'EN_RUTA' | 'DESCANSO' | 'NO_DISPONIBLE'): Observable<any> {
    console.log(`🔄 Actualizando estado del conductor ${driverId} a: ${status}`);

    return this.http.patch(
      `${this.DRIVERS_URL}/${driverId}/estado`,
      { estado: status },
      this.httpOptions
    ).pipe(
      tap(() => {
        console.log(`✅ Estado del conductor ${driverId} actualizado a: ${status}`);
      }),
      catchError((error) => this.handleError('updateDriverStatus', error))
    );
  }

  // ===== CAMBIAR DISPONIBILIDAD =====
  updateAvailability(id: string, disponibilidad: string): Observable<Driver> {
    console.log(`📡 PATCH ${this.DRIVERS_URL}/${id}/disponibilidad`);

    return this.http.patch<Driver>(
      `${this.DRIVERS_URL}/${id}/disponibilidad`,
      { disponibilidad },
      this.httpOptions
    ).pipe(
      timeout(this.TIMEOUT_MS),
      tap((driver) => {
        console.log(`✅ Disponibilidad actualizada: ${disponibilidad}`);
      }),
      catchError((error) => this.handleError('updateAvailability', error))
    );
  }

  // ===== CAMBIAR ESTADO =====
  updateStatus(id: string, estado: string): Observable<Driver> {
    console.log(`📡 PATCH ${this.DRIVERS_URL}/${id}/estado`);

    return this.http.patch<Driver>(
      `${this.DRIVERS_URL}/${id}/estado`,
      { estado },
      this.httpOptions
    ).pipe(
      timeout(this.TIMEOUT_MS),
      tap((driver) => {
        console.log(`✅ Estado actualizado: ${estado}`);
      }),
      catchError((error) => this.handleError('updateStatus', error))
    );
  }

  // ===== VALIDAR DISPONIBILIDAD PARA RUTA =====
  checkDriverAvailability(id: string): Observable<{ available: boolean; reason?: string }> {
    console.log(`📡 GET ${this.DRIVERS_URL}/${id}/check-availability`);

    return this.http.get<{ available: boolean; reason?: string }>(
      `${this.DRIVERS_URL}/${id}/check-availability`,
      this.httpOptions
    ).pipe(
      timeout(this.TIMEOUT_MS),
      tap((result) => {
        console.log(`✅ Disponibilidad verificada:`, result);
      }),
      catchError((error) => this.handleError('checkDriverAvailability', error))
    );
  }

  // ===== OBTENER ESTADÍSTICAS =====
  getDriverStats(): Observable<any> {
    console.log(`📡 GET ${this.DRIVERS_URL}/stats`);

    return this.http.get<any>(`${this.DRIVERS_URL}/stats`, this.httpOptions)
      .pipe(
        timeout(this.TIMEOUT_MS),
        retry(this.RETRY_COUNT),
        tap((stats) => {
          console.log('✅ Estadísticas de conductores:', stats);
        }),
        catchError((error) => this.handleError('getDriverStats', error))
      );
  }

  // ===== MANEJO DE ERRORES =====
  private handleError(operation: string, error: HttpErrorResponse): Observable<never> {
    console.error(`❌ Error en ${operation}:`, error);

    let errorMessage = 'Error desconocido';
    let userMessage = 'Ocurrió un error inesperado';

    if (error.status === 0) {
      errorMessage = 'No se puede conectar al servidor';
      userMessage = 'No se puede conectar con el servidor. Verifica tu conexión.';
      console.error('🔌 Error de red - Backend no disponible en:', this.BASE_URL);
    } else if (error.status === 404) {
      errorMessage = 'Conductor no encontrado';
      userMessage = 'El conductor solicitado no existe';
    } else if (error.status === 400) {
      errorMessage = 'Datos inválidos';
      userMessage = error.error?.message || 'Los datos proporcionados son inválidos';
      console.error('📋 Detalles del error:', error.error);
    } else if (error.status === 409) {
      errorMessage = 'Conflicto - Conductor duplicado';
      userMessage = error.error?.message || 'Ya existe un conductor con esa licencia';
    } else if (error.status >= 500) {
      errorMessage = `Error del servidor: ${error.status}`;
      userMessage = 'Error en el servidor. Intenta nuevamente más tarde.';
      console.error('🔥 Error del servidor:', error.status, error.statusText);
    }

    return throwError(() => ({
      message: errorMessage,
      userMessage: userMessage,
      status: error.status,
      details: error.error
    }));
  }

  // ===== UTILIDADES =====

  // Verificar si el backend está disponible
  isBackendAvailable(): Observable<boolean> {
    return new Observable(observer => {
      this.http.get(`${this.DRIVERS_URL}/test`, {
        responseType: 'text',
        observe: 'response'
      })
        .pipe(timeout(3000))
        .subscribe({
          next: (response) => {
            observer.next(response.status === 200);
            observer.complete();
          },
          error: () => {
            observer.next(false);
            observer.complete();
          }
        });
    });
  }

  // Formatear nombre completo
  getFullName(driver: Driver): string {
    return `${driver.nombre} ${driver.apellido}`;
  }

  // Obtener iniciales
  getInitials(driver: Driver): string {
    return `${driver.nombre.charAt(0)}${driver.apellido.charAt(0)}`.toUpperCase();
  }

  // Verificar si licencia está vigente
  isLicenseValid(driver: Driver): boolean {
    if (!driver.fechaVencimientoLicencia) return false;
    const expiryDate = new Date(driver.fechaVencimientoLicencia);
    return expiryDate > new Date();
  }

  // Días hasta vencimiento de licencia
  getDaysUntilExpiry(driver: Driver): number {
    if (!driver.fechaVencimientoLicencia) return -1;
    const expiryDate = new Date(driver.fechaVencimientoLicencia);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Obtener color de estado
  getStatusColor(estado: string): string {
    switch (estado) {
      case 'ACTIVO': return '#48bb78';
      case 'INACTIVO': return '#a0aec0';
      case 'SUSPENDIDO': return '#e53e3e';
      default: return '#718096';
    }
  }

  // Obtener color de disponibilidad
  getAvailabilityColor(disponibilidad: string): string {
    switch (disponibilidad) {
      case 'DISPONIBLE': return '#48bb78';
      case 'EN_RUTA': return '#ed8936';
      case 'DESCANSO': return '#d7dde2ff';
      case 'NO_DISPONIBLE': return '#e53e3e';
      default: return '#718096';
    }
  }
}
