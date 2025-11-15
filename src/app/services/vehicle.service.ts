// src/app/vehicles/models/vehicle.models.ts

export enum VehicleStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  MANTENIMIENTO = 'MANTENIMIENTO'
}

export interface Vehicle {
  id: string;
  placa: string;
  tipo: string;
  marca: string;
  modelo: string;
  anio: number;
  capacidadKg: number;
  capacidadM3: number;
  estado: VehicleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleListItem {
  id: string;
  placa: string;
  tipo: string;
  marca: string;
  capacidadKg: number;
  estado: VehicleStatus;
}

export interface CreateVehicleRequest {
  placa: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  capacidadKg: number;
  capacidadM3?: number;
}

export interface UpdateVehicleRequest {
  tipo?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  capacidadKg?: number;
  capacidadM3?: number;
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
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
