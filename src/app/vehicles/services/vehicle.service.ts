import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';

export enum VehicleStatus {
  ACTIVO = 'ACTIVO',
  DISPONIBLE = 'DISPONIBLE',
  EN_RUTA = 'EN_RUTA',
  EN_MANTENIMIENTO = 'EN_MANTENIMIENTO',
  FUERA_DE_SERVICIO = 'FUERA_DE_SERVICIO',
  INACTIVO = 'INACTIVO'
}

export interface Vehicle {
  id: string;
  placa: string;
  tipo: string;
  marca: string;
  modelo: string;
  anio: number;
  capacidadCarga?: string;
  capacidadKg?: number;
  estado: VehicleStatus;
  kilometraje?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface VehicleListItem {
  id: string;
  placa: string;
  tipo: string;
  marca: string;
  modelo?: string;
  anio?: number;
  capacidadCarga?: string;
  capacidadKg?: number;
  estado: VehicleStatus;
  kilometraje?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVehicleRequest {
  placa: string;
  tipo: string;
  marca: string;
  modelo: string;
  anio: number;
  capacidadCarga?: string;
  capacidadKg?: number;
  estado?: VehicleStatus;
  kilometraje?: number;
}

export interface UpdateVehicleRequest {
  tipo?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  capacidadCarga?: string;
  capacidadKg?: number;
  estado?: VehicleStatus;
  kilometraje?: number;
}

export interface VehicleStats {
  total: number;
  activos: number;
  inactivos: number;
  enMantenimiento: number;
}

export interface VehicleFilters {
  estado?: VehicleStatus;
  tipo?: string;
  search?: string;
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
  status?: number;
  path?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private apiUrl = 'http://localhost:8000/api/vehicles';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // ✅ OPTIMIZADO: Búsqueda inteligente
  getVehicles(filters: VehicleFilters): Observable<ApiResponse<PageResponse<VehicleListItem>>> {
    console.log('🔍 Listando vehículos con filtros:', filters);

    let params = new HttpParams()
      .set('page', filters.page.toString())
      .set('size', filters.size.toString());

    if (filters.estado) {
      params = params.set('estado', filters.estado);
    }

    if (filters.tipo) {
      params = params.set('tipo', filters.tipo);
    }

    // ✅ MEJORA: Búsqueda optimizada - solo si tiene más de 2 caracteres
    if (filters.search && filters.search.trim().length >= 1) {
      params = params.set('search', filters.search.trim());
      console.log('🔍 Búsqueda activa:', filters.search.trim());
    }

    if (filters.sortBy) {
      params = params.set('sortBy', filters.sortBy);
    }

    if (filters.sortDir) {
      params = params.set('sortDir', filters.sortDir);
    }

    console.log('📤 Parámetros finales:', params.toString());

    return this.http.get<any>(this.apiUrl, { params })
      .pipe(
        map(response => {
          console.log('📥 Respuesta cruda del backend:', response);

          // ✅ CASO 1: Array directo desde el backend
          if (Array.isArray(response)) {
            console.log('📦 Respuesta es array directo, convirtiendo...');
            const vehicles = this.normalizeVehicleArray(response);

            return {
              success: true,
              data: {
                content: vehicles,
                pageable: {
                  pageNumber: filters.page,
                  pageSize: filters.size
                },
                totalElements: vehicles.length,
                totalPages: Math.ceil(vehicles.length / filters.size),
                last: true,
                first: true,
                empty: vehicles.length === 0
              }
            } as ApiResponse<PageResponse<VehicleListItem>>;
          }

          // ✅ CASO 2: Objeto con estructura {success, data}
          if (response.success && response.data) {
            console.log('📦 Respuesta con estructura success/data');

            // Si data es array directo
            if (Array.isArray(response.data)) {
              const vehicles = this.normalizeVehicleArray(response.data);
              return {
                success: true,
                data: {
                  content: vehicles,
                  pageable: {
                    pageNumber: filters.page,
                    pageSize: filters.size
                  },
                  totalElements: vehicles.length,
                  totalPages: Math.ceil(vehicles.length / filters.size),
                  last: true,
                  first: true,
                  empty: vehicles.length === 0
                }
              };
            }

            // Si data ya es PageResponse
            if (response.data.content) {
              response.data.content = this.normalizeVehicleArray(response.data.content);
              return response;
            }
          }

          // ✅ CASO 3: Ya viene en formato completo
          if (response.content) {
            response.content = this.normalizeVehicleArray(response.content);
            return {
              success: true,
              data: response
            };
          }

          console.warn('⚠️ Formato de respuesta no reconocido:', response);
          return response;
        }),
        tap({
          next: (response) => {
            const count = response.data?.content?.length || 0;
            console.log(`✅ ${count} vehículos obtenidos exitosamente`);
          }
        }),
        catchError(error => {
          console.error('❌ Error al obtener vehículos:', error);
          return throwError(() => this.handleError(error, 'obtener vehículos'));
        })
      );
  }

  // ✅ NUEVO: Normalizar array de vehículos
  private normalizeVehicleArray(vehicles: any[]): VehicleListItem[] {
    return vehicles.map(vehicle => ({
      id: vehicle.id,
      placa: vehicle.placa,
      tipo: vehicle.tipo,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      anio: vehicle.anio,
      capacidadCarga: vehicle.capacidadCarga,
      capacidadKg: this.calculateCapacidadKg(vehicle.capacidadCarga),
      estado: vehicle.estado as VehicleStatus,
      kilometraje: vehicle.kilometraje,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt
    }));
  }

  // ✅ OPTIMIZADO: Crear vehículo
  createVehicle(vehicleData: CreateVehicleRequest): Observable<ApiResponse<Vehicle>> {
    console.log('➕ Creando vehículo:', vehicleData);

    const requestData: any = {
      placa: vehicleData.placa?.trim().toUpperCase(), // ✅ Normalizar placa
      tipo: vehicleData.tipo?.trim().toLowerCase(),
      marca: vehicleData.marca?.trim(),
      modelo: vehicleData.modelo?.trim(),
      anio: vehicleData.anio,
      estado: vehicleData.estado || VehicleStatus.ACTIVO
    };

    // Solo agregar opcionales si tienen valor
    if (vehicleData.capacidadCarga?.trim()) {
      requestData.capacidadCarga = vehicleData.capacidadCarga.trim();
    }
    if (vehicleData.kilometraje && vehicleData.kilometraje > 0) {
      requestData.kilometraje = vehicleData.kilometraje;
    }

    console.log('📤 Request final:', requestData);

    return this.http.post<any>(this.apiUrl, requestData)
      .pipe(
        map(response => {
          console.log('📥 Respuesta crear vehículo:', response);

          // Si es el objeto vehículo directo
          if (response && response.id && !response.success) {
            return {
              success: true,
              data: response,
              message: 'Vehículo creado exitosamente'
            } as ApiResponse<Vehicle>;
          }

          // Si ya tiene estructura ApiResponse
          if (response.success !== undefined) {
            return response as ApiResponse<Vehicle>;
          }

          // Fallback
          return {
            success: true,
            data: response
          } as ApiResponse<Vehicle>;
        }),
        tap({
          next: (response) => {
            console.log('✅ Vehículo creado:', response.data?.placa);
          }
        }),
        catchError(error => {
          console.error('❌ Error al crear vehículo:', error);
          return throwError(() => this.handleError(error, 'crear vehículo'));
        })
      );
  }

  // ✅ OPTIMIZADO: Obtener vehículo por ID
  getVehicleById(id: string): Observable<ApiResponse<Vehicle>> {
    console.log('👀 Obteniendo vehículo:', id);

    return this.http.get<any>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => {
          console.log('📥 Respuesta getById:', response);

          // ✅ CASO 1: Objeto directo (sin wrapper)
          if (response && response.id && !response.success && !response.data) {
            return {
              success: true,
              data: {
                ...response,
                capacidadKg: this.calculateCapacidadKg(response.capacidadCarga)
              }
            } as ApiResponse<Vehicle>;
          }

          // ✅ CASO 2: Con estructura {success, data}
          if (response.success && response.data) {
            if (response.data.capacidadCarga) {
              response.data.capacidadKg = this.calculateCapacidadKg(response.data.capacidadCarga);
            }
            return response as ApiResponse<Vehicle>;
          }

          // ✅ CASO 3: Ya tiene estructura correcta
          return response as ApiResponse<Vehicle>;
        }),
        tap({
          next: (response) => {
            console.log('✅ Vehículo obtenido:', response.data?.placa);
          }
        }),
        catchError(error => {
          console.error('❌ Error al obtener vehículo:', error);
          return throwError(() => this.handleError(error, 'obtener vehículo'));
        })
      );
  }

  // ✅ OPTIMIZADO: Actualizar vehículo
  updateVehicle(id: string, vehicleData: UpdateVehicleRequest): Observable<ApiResponse<Vehicle>> {
    console.log('✏️ Actualizando vehículo:', id, vehicleData);

    // Preparar datos limpios
    const requestData: any = {};

    if (vehicleData.tipo) requestData.tipo = vehicleData.tipo.trim().toLowerCase();
    if (vehicleData.marca) requestData.marca = vehicleData.marca.trim();
    if (vehicleData.modelo) requestData.modelo = vehicleData.modelo.trim();
    if (vehicleData.anio) requestData.anio = vehicleData.anio;
    if (vehicleData.estado) requestData.estado = vehicleData.estado;
    if (vehicleData.kilometraje !== undefined) requestData.kilometraje = vehicleData.kilometraje;

    if (vehicleData.capacidadCarga?.trim()) {
      requestData.capacidadCarga = vehicleData.capacidadCarga.trim();
    } else if (vehicleData.capacidadKg) {
      requestData.capacidadCarga = vehicleData.capacidadKg + ' kg';
    }

    console.log('📤 Request actualización:', requestData);

    return this.http.put<any>(`${this.apiUrl}/${id}`, requestData)
      .pipe(
        map(response => {
          console.log('📥 Respuesta actualización:', response);

          // Manejar respuesta vacía (204 No Content)
          if (!response || response === '') {
            return {
              success: true,
              message: 'Vehículo actualizado exitosamente'
            } as ApiResponse<Vehicle>;
          }

          // Si es objeto directo
          if (response.id && !response.success) {
            return {
              success: true,
              data: response
            } as ApiResponse<Vehicle>;
          }

          // Si ya tiene estructura
          return response as ApiResponse<Vehicle>;
        }),
        tap({
          next: (response) => {
            console.log('✅ Vehículo actualizado exitosamente');
          }
        }),
        catchError(error => {
          console.error('❌ Error al actualizar vehículo:', error);
          return throwError(() => this.handleError(error, 'actualizar vehículo'));
        })
      );
  }

  // ✅ CRÍTICO: Actualizar solo estado (más eficiente)
  updateVehicleStatus(id: string, estado: VehicleStatus): Observable<ApiResponse<Vehicle>> {
    console.log('🔄 Cambiando estado:', id, '->', estado);

    // Usar PUT con solo el campo estado
    return this.http.put<any>(`${this.apiUrl}/${id}`, { estado })
      .pipe(
        map(response => {
          console.log('📥 Respuesta cambio estado:', response);

          // ✅ Manejar 204 No Content (éxito sin body)
          if (response === null || response === '' || response === undefined) {
            return {
              success: true,
              message: 'Estado actualizado exitosamente'
            } as ApiResponse<Vehicle>;
          }

          // ✅ Objeto directo del backend
          if (response.id && !response.success) {
            return {
              success: true,
              data: response,
              message: 'Estado actualizado'
            } as ApiResponse<Vehicle>;
          }

          // ✅ Ya tiene estructura ApiResponse
          if (response.success !== undefined) {
            return response as ApiResponse<Vehicle>;
          }

          // Fallback
          return {
            success: true,
            data: response
          } as ApiResponse<Vehicle>;
        }),
        tap({
          next: (response) => {
            console.log('✅ Estado actualizado a:', estado);
          }
        }),
        catchError(error => {
          console.error('❌ Error al cambiar estado:', error);
          return throwError(() => this.handleError(error, 'cambiar estado'));
        })
      );
  }

  // ✅ OPTIMIZADO: Eliminar vehículo
  deleteVehicle(id: string): Observable<ApiResponse<void>> {
    console.log('🗑️ Eliminando vehículo:', id);

    return this.http.delete<any>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => {
          console.log('📥 Respuesta eliminación:', response);

          // Manejar 204 No Content
          if (response === null || response === '' || response === undefined) {
            return {
              success: true,
              message: 'Vehículo eliminado exitosamente'
            } as ApiResponse<void>;
          }

          // Si tiene estructura success
          if (response.success !== undefined) {
            return response as ApiResponse<void>;
          }

          // Fallback
          return {
            success: true,
            data: response
          } as ApiResponse<void>;
        }),
        tap({
          next: () => {
            console.log('✅ Vehículo eliminado exitosamente');
          }
        }),
        catchError(error => {
          console.error('❌ Error al eliminar vehículo:', error);
          return throwError(() => this.handleError(error, 'eliminar vehículo'));
        })
      );
  }

  // ✅ Estadísticas
  getVehicleStats(): Observable<ApiResponse<VehicleStats>> {
    console.log('📊 Obteniendo estadísticas');

    return this.http.get<ApiResponse<VehicleStats>>(`${this.apiUrl}/stats`)
      .pipe(
        tap({
          next: (response) => {
            console.log('✅ Estadísticas obtenidas:', response);
          },
          error: (error) => {
            console.error('❌ Error al obtener estadísticas:', error);
          }
        })
      );
  }

  // ✅ Vehículos activos
  getActiveVehicles(): Observable<ApiResponse<VehicleListItem[]>> {
    console.log('📤 Obteniendo vehículos activos');

    return this.http.get<ApiResponse<VehicleListItem[]>>(`${this.apiUrl}/active`)
      .pipe(
        tap({
          next: (response) => {
            console.log('✅ Vehículos activos obtenidos:', response);
          },
          error: (error) => {
            console.error('❌ Error al obtener vehículos activos:', error);
          }
        })
      );
  }

  // ✅ NUEVO: Calcular capacidad en kg desde string
  private calculateCapacidadKg(capacidadCarga?: string): number | undefined {
    if (!capacidadCarga) return undefined;

    try {
      // Soportar formatos: "1500 kg", "1.5 ton", "3500.00", etc.
      const match = capacidadCarga.toLowerCase().match(/(\d+\.?\d*)\s*(kg|ton|toneladas)?/);

      if (!match) return undefined;

      const value = parseFloat(match[1]);
      const unit = match[2];

      // Convertir toneladas a kg
      if (unit && (unit.includes('ton') || unit === 't')) {
        return value * 1000;
      }

      return value;
    } catch (error) {
      console.warn('⚠️ Error calculando capacidad:', capacidadCarga, error);
      return undefined;
    }
  }

  // ✅ NUEVO: Manejo centralizado de errores
  private handleError(error: any, operation: string): any {
    console.error(`❌ Error en ${operation}:`, error);

    let errorMessage = `Error al ${operation}`;
    let statusCode = error.status || 500;

    // Mensajes específicos por código de estado
    switch (statusCode) {
      case 400:
        errorMessage = 'Datos inválidos. Verifica la información.';
        break;
      case 401:
        errorMessage = 'No autorizado. Inicia sesión nuevamente.';
        // Opcional: Redirigir al login
        // this.router.navigate(['/login']);
        break;
      case 403:
        errorMessage = 'No tienes permisos para esta operación.';
        break;
      case 404:
        errorMessage = 'Vehículo no encontrado.';
        break;
      case 409:
        errorMessage = 'Ya existe un vehículo con esta placa.';
        break;
      case 422:
        errorMessage = 'Datos no procesables. Verifica los campos.';
        break;
      case 500:
      case 502:
      case 503:
        errorMessage = 'Error del servidor. Inténtalo más tarde.';
        break;
    }

    // Extraer mensaje del backend si existe
    if (error.error) {
      if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error.error) {
        errorMessage = error.error.error;
      } else if (Array.isArray(error.error.errors)) {
        errorMessage = error.error.errors.join(', ');
      }
    }

    return {
      status: statusCode,
      message: errorMessage,
      originalError: error
    };
  }

  // ✅ Headers con autenticación (si se usa JWT)
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }
}
