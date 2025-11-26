// src/app/features/drivers/models/driver.model.ts

export interface Driver {
  id: string;
  nombre: string;
  apellido: string;
  licencia: string;
  tipoLicencia: string;
  fechaVencimientoLicencia: string;
  telefono: string;
  email: string;
  estado: DriverStatus;
  disponibilidad: DriverAvailability;
  licenciaVigente: boolean;
  disponibleParaRuta: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverRequest {
  nombre: string;
  apellido: string;
  licencia: string;
  tipoLicencia: string;
  fechaVencimientoLicencia: string;
  telefono: string;
  email: string;
}

export interface UpdateDriverRequest {
  nombre: string;
  apellido: string;
  tipoLicencia: string;
  fechaVencimientoLicencia: string;
  telefono: string;
  email: string;
  estado?: string;
  disponibilidad?: string;
}

export interface DriverListResponse {
  drivers: Driver[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
}

export enum DriverStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO'
}

export enum DriverAvailability {
  DISPONIBLE = 'DISPONIBLE',
  EN_RUTA = 'EN_RUTA',
  DESCANSO = 'DESCANSO'
}

export const TIPOS_LICENCIA = [
  { value: 'A1', label: 'A1 - Motocicletas hasta 125cc' },
  { value: 'A2', label: 'A2 - Motocicletas mayores a 125cc' },
  { value: 'B1', label: 'B1 - Automóviles particulares' },
  { value: 'B2', label: 'B2 - Camionetas y camperos' },
  { value: 'C1', label: 'C1 - Vehículos de carga liviana' },
  { value: 'C2', label: 'C2 - Vehículos de carga pesada' },
  { value: 'C3', label: 'C3 - Tractocamiones' }
];
