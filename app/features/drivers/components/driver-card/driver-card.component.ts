// src/app/features/drivers/components/driver-card/driver-card.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Driver } from '../../models/driver.model';

@Component({
  selector: 'app-driver-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-card.component.html',
  styleUrls: ['./driver-card.component.scss']
})
export class DriverCardComponent {
  @Input() driver!: Driver;
  @Output() view = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<Driver>();

  onView(): void {
    this.view.emit(this.driver.id);
  }

  onEdit(): void {
    this.edit.emit(this.driver.id);
  }

  onDelete(): void {
    this.delete.emit(this.driver);
  }

  getEstadoBadgeClass(): string {
    switch (this.driver.estado) {
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
    switch (this.driver.disponibilidad) {
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
    return this.driver.disponibilidad.replace('_', ' ');
  }

  getInitials(): string {
    return this.driver.nombre.charAt(0) + this.driver.apellido.charAt(0);
  }

  getStatusIcon(): string {
    if (!this.driver.licenciaVigente) {
      return 'fa-exclamation-circle';
    }
    if (this.driver.disponibleParaRuta) {
      return 'fa-check-circle';
    }
    return 'fa-info-circle';
  }

  getStatusColor(): string {
    if (!this.driver.licenciaVigente) {
      return 'status-error';
    }
    if (this.driver.disponibleParaRuta) {
      return 'status-success';
    }
    return 'status-warning';
  }
}
