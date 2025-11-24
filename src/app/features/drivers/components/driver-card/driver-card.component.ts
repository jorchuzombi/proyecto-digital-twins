// src/app/features/drivers/components/driver-card/driver-card.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Driver } from '../../models/driver.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-driver-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-card.component.html',
  styleUrls: ['./driver-card.component.scss']
})
export class DriverCardComponent {
  @Input() driver!: Driver;
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<Driver>();
  @Output() view = new EventEmitter<string>();

  constructor(private router: Router) {}

  // Utility methods for the template
  getInitials(): string {
    if (!this.driver) return '';
    return `${this.driver.nombre?.charAt(0) || ''}${this.driver.apellido?.charAt(0) || ''}`.toUpperCase();
  }

  getEstadoBadgeClass(): string {
    switch (this.driver?.estado) {
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

  getDisponibilidadBadgeClass(): string {
    switch (this.driver?.disponibilidad) {
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

  formatDisponibilidad(): string {
    return this.driver?.disponibilidad?.replace('_', ' ') || '';
  }

  getStatusColor(): string {
    switch (this.driver?.disponibilidad) {
      case 'DISPONIBLE':
        return 'status-available';
      case 'EN_RUTA':
        return 'status-busy';
      case 'DESCANSO':
        return 'status-rest';
      default:
        return 'status-offline';
    }
  }

  getStatusIcon(): string {
    switch (this.driver?.disponibilidad) {
      case 'DISPONIBLE':
        return 'fa-check-circle';
      case 'EN_RUTA':
        return 'fa-route';
      case 'DESCANSO':
        return 'fa-bed';
      default:
        return 'fa-times-circle';
    }
  }

  // Event handlers
  onView(): void {
    this.view.emit(this.driver.id);
  }

  onEdit(): void {
    this.edit.emit(this.driver.id);
  }

  onDelete(): void {
    this.delete.emit(this.driver);
  }
}
