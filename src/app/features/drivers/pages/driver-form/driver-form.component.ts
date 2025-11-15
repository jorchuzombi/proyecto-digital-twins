// src/app/features/drivers/pages/driver-form/driver-form.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DriverService } from '../../../../services/driver.service';
import {
  TIPOS_LICENCIA,
  DriverStatus,
  DriverAvailability
} from '../../models/driver.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-driver-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './driver-form.component.html',
  styleUrls: ['./driver-form.component.scss']
})
export class DriverFormComponent implements OnInit {
  driverForm!: FormGroup;
  isEditMode = false;
  driverId: string | null = null;
  loading = false;
  submitting = false;

  tiposLicencia = TIPOS_LICENCIA;
  estados = Object.values(DriverStatus);
  disponibilidades = Object.values(DriverAvailability);

  constructor(
    private fb: FormBuilder,
    private driverService: DriverService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
  }

  initForm(): void {
    this.driverForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      licencia: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/)]],
      tipoLicencia: ['', Validators.required],
      fechaVencimientoLicencia: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      estado: ['ACTIVO'],
      disponibilidad: ['DISPONIBLE']
    });
  }

  checkEditMode(): void {
    this.driverId = this.route.snapshot.paramMap.get('id');
    if (this.driverId) {
      this.isEditMode = true;
      this.loadDriver();
    }
  }

  loadDriver(): void {
    if (!this.driverId) return;

    this.loading = true;
    this.driverService.getDriver(this.driverId).subscribe({
      next: (driver) => {
        this.driverForm.patchValue({
          nombre: driver.nombre,
          apellido: driver.apellido,
          licencia: driver.licencia,
          tipoLicencia: driver.tipoLicencia,
          fechaVencimientoLicencia: driver.fechaVencimientoLicencia,
          telefono: driver.telefono,
          email: driver.email,
          estado: driver.estado,
          disponibilidad: driver.disponibilidad
        });

        // Deshabilitar licencia en modo edición
        this.driverForm.get('licencia')?.disable();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar conductor:', error);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el conductor'
        });
        this.goBack();
      }
    });
  }

  onSubmit(): void {
    if (this.driverForm.invalid) {
      this.markFormGroupTouched(this.driverForm);
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor, completa todos los campos requeridos'
      });
      return;
    }

    this.submitting = true;
    const formData = this.driverForm.getRawValue();

    if (this.isEditMode && this.driverId) {
      this.updateDriver(formData);
    } else {
      this.createDriver(formData);
    }
  }

  createDriver(data: any): void {
    this.driverService.createDriver(data).subscribe({
      next: (driver) => {
        this.submitting = false;
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Conductor creado exitosamente',
          timer: 2000,
          showConfirmButton: false
        });
        this.router.navigate(['/drivers']);
      },
      error: (error) => {
        console.error('Error al crear conductor:', error);
        this.submitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.message || 'No se pudo crear el conductor'
        });
      }
    });
  }

  updateDriver(data: any): void {
    if (!this.driverId) return;

    this.driverService.updateDriver(this.driverId, data).subscribe({
      next: (driver) => {
        this.submitting = false;
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Conductor actualizado exitosamente',
          timer: 2000,
          showConfirmButton: false
        });
        this.router.navigate(['/drivers']);
      },
      error: (error) => {
        console.error('Error al actualizar conductor:', error);
        this.submitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.message || 'No se pudo actualizar el conductor'
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/drivers']);
  }

  resetForm(): void {
    this.driverForm.reset({
      estado: 'ACTIVO',
      disponibilidad: 'DISPONIBLE'
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.driverForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.driverForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      if (field.errors['pattern']) {
        if (fieldName === 'licencia') return 'Solo letras mayúsculas, números y guiones';
        if (fieldName === 'telefono') return 'Formato de teléfono inválido';
      }
    }
    return '';
  }
}
