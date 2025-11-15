// src/app/features/drivers/pages/driver-list/driver-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DriverService } from '../../../../services/driver.service';
import {
  Driver,
  DriverStatus,
  DriverAvailability
} from '../../models/driver.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './driver-list.component.html',
  styleUrls: ['./driver-list.component.scss']
})
export class DriverListComponent implements OnInit {
  drivers: Driver[] = [];
  loading = false;

  // Paginación
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  // Filtros
  searchTerm = '';
  selectedEstado = '';
  selectedDisponibilidad = '';

  // Opciones para los filtros
  estados = Object.values(DriverStatus);
  disponibilidades = Object.values(DriverAvailability);

  constructor(
    private driverService: DriverService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDrivers();
  }

  loadDrivers(): void {
  this.loading = true;

  this.driverService.getAllDrivers(
    this.currentPage,
    this.pageSize,
    this.searchTerm || undefined,
    this.selectedEstado || undefined,
    this.selectedDisponibilidad || undefined
  ).subscribe({
    next: (response) => {
      this.drivers = response.drivers as Driver[];
      this.totalPages = response.totalPages;
      this.totalElements = response.totalElements;
      this.currentPage = response.currentPage;
      this.loading = false;
    },
    error: (error) => {
      console.error('Error al cargar conductores:', error);
      this.loading = false;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los conductores'
      });
    }
  });
}

  onSearch(): void {
    this.currentPage = 0;
    this.loadDrivers();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadDrivers();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedEstado = '';
    this.selectedDisponibilidad = '';
    this.currentPage = 0;
    this.loadDrivers();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadDrivers();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadDrivers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadDrivers();
    }
  }

  createDriver(): void {
    this.router.navigate(['/drivers/new']);
  }

  editDriver(id: string): void {
    this.router.navigate(['/drivers/edit', id]);
  }

  viewDriver(id: string): void {
    this.router.navigate(['/drivers', id]);
  }

  deleteDriver(driver: Driver): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar al conductor ${driver.nombre} ${driver.apellido}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.driverService.deleteDriver(driver.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'El conductor ha sido eliminado exitosamente',
              timer: 2000
            });
            this.loadDrivers();
          },
          error: (error) => {
            console.error('Error al eliminar conductor:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar el conductor'
            });
          }
        });
      }
    });
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'ACTIVO':
        return 'badge-success';
      case 'INACTIVO':
        return 'badge-secondary';
      case 'SUSPENDIDO':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  getDisponibilidadBadgeClass(disponibilidad: string): string {
    switch (disponibilidad) {
      case 'DISPONIBLE':
        return 'badge-success';
      case 'EN_RUTA':
        return 'badge-warning';
      case 'DESCANSO':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  formatDisponibilidad(disponibilidad: string): string {
    return disponibilidad.replace('_', ' ');
  }

  get pages(): number[] {
    const pages: number[] = [];
    for (let i = 0; i < this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }
}
