import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VehicleService, Vehicle, VehicleStatus, VehicleFilters, CreateVehicleRequest, UpdateVehicleRequest, VehicleListItem } from '../../services/vehicle.service';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './vehicle-list.component.html',
  styleUrls: ['./vehicle-list.component.scss']
})
export class VehicleListComponent implements OnInit, OnDestroy {
  vehicles: VehicleListItem[] = [];
  allVehicles: VehicleListItem[] = []; // 🔥 TODOS los vehículos sin filtrar
  loading = false;
  error = '';

  private destroy$ = new Subject<void>();

  // Filtros
  filters: VehicleFilters = {
    page: 0,
    size: 10,
    search: '',
    estado: undefined,
    tipo: undefined
  };

  // Búsqueda mejorada
  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  // Opciones para selects
  statusOptions = Object.values(VehicleStatus);
  tipoOptions = ['camion', 'van', 'moto', 'furgon', 'pickup', 'furgoneta'];

  // Para el formulario
  showForm = false;
  editingVehicle: Vehicle | null = null;
  formData: any = {
    placa: '',
    tipo: '',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    capacidadCarga: '',
    capacidadKg: 0,
    estado: VehicleStatus.ACTIVO,
    kilometraje: 0
  };

  // Para operaciones masivas
  selectedVehicles: Set<string> = new Set();
  selectAll = false;
  private originalStates: Map<string, VehicleStatus> = new Map();

  VehicleStatus = VehicleStatus;

  constructor(private vehicleService: VehicleService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadVehicles();

    // Búsqueda local instantánea - 300ms
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      console.log('🔍 Filtrando localmente:', searchTerm);
      this.applyLocalFilters();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 📋 CARGAR VEHÍCULOS - UNA SOLA VEZ
  loadVehicles() {
    this.loading = true;
    this.error = '';
    console.log('🔄 Cargando TODOS los vehículos del backend...');

    // Cargar TODOS los vehículos sin filtros
    const emptyFilters: VehicleFilters = {
      page: 0,
      size: 1000, // Cargar todos
      search: '',
      estado: undefined,
      tipo: undefined
    };

    this.vehicleService.getVehicles(emptyFilters).subscribe({
      next: (response) => {
        console.log('📥 Respuesta completa:', response);

        let loadedVehicles: VehicleListItem[] = [];

        if (response && response.success && response.data && response.data.content) {
          loadedVehicles = response.data.content;
        } else if (response && response.success && Array.isArray(response.data)) {
          loadedVehicles = response.data;
        } else if (Array.isArray(response)) {
          loadedVehicles = response as any;
        } else if (response && (response as any).content) {
          loadedVehicles = (response as any).content;
        }

        // Guardar TODOS los vehículos
        this.allVehicles = loadedVehicles;
        console.log(`✅ ${this.allVehicles.length} vehículos cargados del backend`);

        // Aplicar filtros locales
        this.applyLocalFilters();

        this.selectedVehicles.clear();
        this.selectAll = false;
        this.originalStates.clear();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.error = 'Error de conexión al cargar vehículos';
        this.loading = false;
        console.error('❌ Error HTTP:', error);

        Swal.fire({
          icon: 'error',
          title: 'Error de conexión',
          text: 'No se pudo conectar con el servidor',
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false
        });
      }
    });
  }

  // 🔍 FILTRADO LOCAL - INSTANTÁNEO
  applyLocalFilters() {
    console.log('🎯 Aplicando filtros locales...');
    console.log('   - Búsqueda:', this.searchTerm);
    console.log('   - Estado:', this.filters.estado);
    console.log('   - Tipo:', this.filters.tipo);

    let filtered = [...this.allVehicles];

    // Filtro de búsqueda (placa, marca, modelo, tipo)
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const search = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(v => {
        const placa = (v.placa || '').toLowerCase();
        const marca = (v.marca || '').toLowerCase();
        const modelo = (v.modelo || '').toLowerCase();
        const tipo = (v.tipo || '').toLowerCase();

        const match = placa.includes(search) ||
                     marca.includes(search) ||
                     modelo.includes(search) ||
                     tipo.includes(search);

        if (match) {
          console.log(`   ✅ Coincide: ${v.placa} (${v.marca} ${v.modelo})`);
        }

        return match;
      });
    }

    // Filtro de estado
    if (this.filters.estado) {
      filtered = filtered.filter(v => v.estado === this.filters.estado);
    }

    // Filtro de tipo
    if (this.filters.tipo) {
      filtered = filtered.filter(v => v.tipo === this.filters.tipo);
    }

    this.vehicles = filtered;
    console.log(`📊 Resultado: ${this.vehicles.length} vehículos filtrados de ${this.allVehicles.length} totales`);
    this.cdr.detectChanges();
  }

  // 🔍 BÚSQUEDA MEJORADA
  onSearch(event: any) {
    const value = event.target.value;
    this.searchTerm = value;
    console.log('🔎 Búsqueda digitada:', value);
    this.searchSubject.next(value);
  }

  // 🔄 APLICAR FILTROS DE SELECT
  applyFilters() {
    console.log('🔍 Cambiaron filtros de select');
    this.applyLocalFilters();
  }

  // 🔄 CAMBIAR ESTADO
  changeStatus(vehicle: VehicleListItem, nuevoEstado: VehicleStatus) {
    const estadoAnterior = vehicle.estado;
    console.log(`🔄 Cambiando estado de ${vehicle.placa}: ${estadoAnterior} -> ${nuevoEstado}`);

    this.originalStates.set(vehicle.id, estadoAnterior);

    const index = this.vehicles.findIndex(v => v.id === vehicle.id);
    if (index !== -1) {
      this.vehicles[index].estado = nuevoEstado;
    }

    const allIndex = this.allVehicles.findIndex(v => v.id === vehicle.id);
    if (allIndex !== -1) {
      this.allVehicles[allIndex].estado = nuevoEstado;
    }

    this.vehicleService.updateVehicleStatus(vehicle.id, nuevoEstado).subscribe({
      next: (response) => {
        console.log('✅ Respuesta cambio estado:', response);

        const isSuccess = response === null ||
                         response?.success === true ||
                         (response?.data && response.data.estado === nuevoEstado);

        if (isSuccess) {
          console.log('✅ Estado actualizado exitosamente');
          this.originalStates.delete(vehicle.id);

          Swal.fire({
            title: '¡Estado actualizado!',
            text: `${vehicle.placa} ahora está ${nuevoEstado}`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
        } else {
          this.revertStatusChange(vehicle.id, estadoAnterior);
          console.error('❌ Error en respuesta:', response);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: response?.message || 'No se pudo cambiar el estado',
            toast: true,
            position: 'top-end',
            timer: 3000
          });
        }
      },
      error: (error) => {
        console.error('❌ Error HTTP al cambiar estado:', error);
        this.revertStatusChange(vehicle.id, estadoAnterior);

        let errorMessage = 'No se pudo cambiar el estado del vehículo';
        if (error.status === 404) {
          errorMessage = 'Vehículo no encontrado';
        } else if (error.status === 403) {
          errorMessage = 'No tienes permisos';
        } else if (error.status >= 500) {
          errorMessage = 'Error del servidor';
        }

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          toast: true,
          position: 'top-end',
          timer: 3000
        });
      }
    });
  }

  // 🔄 REVERTIR CAMBIO DE ESTADO
  private revertStatusChange(vehicleId: string, originalStatus: VehicleStatus) {
    const index = this.vehicles.findIndex(v => v.id === vehicleId);
    if (index !== -1) {
      this.vehicles[index].estado = originalStatus;
    }

    const allIndex = this.allVehicles.findIndex(v => v.id === vehicleId);
    if (allIndex !== -1) {
      this.allVehicles[allIndex].estado = originalStatus;
    }

    this.originalStates.delete(vehicleId);
    console.log(`🔄 Estado revertido para ${vehicleId}: ${originalStatus}`);
  }

  // 🗑️ ELIMINAR VEHÍCULO
  deleteVehicle(vehicle: VehicleListItem) {
    Swal.fire({
      title: '¿Eliminar vehículo?',
      text: `¿Deseas eliminar el vehículo ${vehicle.placa}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.vehicleService.deleteVehicle(vehicle.id).subscribe({
          next: (response) => {
            console.log('✅ Respuesta eliminación:', response);

            const isSuccess = response === null || response?.success === true;

            if (isSuccess) {
              Swal.fire('¡Eliminado!', 'Vehículo eliminado exitosamente', 'success');
              // Recargar desde el backend
              this.loadVehicles();
            } else {
              Swal.fire('Error', response?.message || 'No se pudo eliminar', 'error');
            }
          },
          error: (error) => {
            console.error('❌ Error al eliminar:', error);
            Swal.fire('Error', 'No se pudo eliminar el vehículo', 'error');
          }
        });
      }
    });
  }

  // ➕ NUEVO VEHÍCULO
  newVehicle() {
    this.editingVehicle = null;
    this.formData = {
      placa: '',
      tipo: '',
      marca: '',
      modelo: '',
      anio: new Date().getFullYear(),
      capacidadCarga: '',
      capacidadKg: 0,
      estado: VehicleStatus.ACTIVO,
      kilometraje: 0
    };
    this.showForm = true;
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  // ✏️ EDITAR VEHÍCULO
  editVehicle(vehicle: VehicleListItem) {
    Swal.fire({
      title: 'Cargando...',
      text: 'Obteniendo datos del vehículo',
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      }
    });

    this.vehicleService.getVehicleById(vehicle.id).subscribe({
      next: (response) => {
        console.log('✅ Respuesta getById:', response);
        Swal.close();

        let vehicleData: Vehicle | null = null;

        if (response && response.success && response.data) {
          vehicleData = response.data;
        } else if (response && (response as any).id && (response as any).placa) {
          vehicleData = response as any;
        }

        if (vehicleData) {
          this.editingVehicle = vehicleData;
          this.formData = {
            placa: vehicleData.placa || '',
            tipo: vehicleData.tipo || '',
            marca: vehicleData.marca || '',
            modelo: vehicleData.modelo || '',
            anio: vehicleData.anio || new Date().getFullYear(),
            capacidadCarga: vehicleData.capacidadCarga || '',
            capacidadKg: vehicleData.capacidadKg || 0,
            estado: vehicleData.estado || VehicleStatus.ACTIVO,
            kilometraje: vehicleData.kilometraje || 0
          };
          this.showForm = true;
          setTimeout(() => this.cdr.detectChanges(), 0);
        } else {
          Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
        }
      },
      error: (error) => {
        Swal.close();
        console.error('❌ Error al cargar vehículo:', error);
        Swal.fire('Error', 'No se pudo cargar el vehículo', 'error');
      }
    });
  }

  // 💾 GUARDAR VEHÍCULO
  saveVehicle() {
    if (!this.isFormValid()) {
      Swal.fire('Campos incompletos', 'Completa todos los campos obligatorios', 'warning');
      return;
    }

    Swal.fire({
      title: this.editingVehicle ? 'Actualizando...' : 'Creando...',
      text: 'Procesando información',
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      }
    });

    if (this.editingVehicle) {
      const updateData: UpdateVehicleRequest = {
        tipo: this.formData.tipo,
        marca: this.formData.marca,
        modelo: this.formData.modelo,
        anio: this.formData.anio,
        capacidadCarga: this.formData.capacidadCarga,
        capacidadKg: this.formData.capacidadKg,
        estado: this.formData.estado,
        kilometraje: this.formData.kilometraje
      };

      this.vehicleService.updateVehicle(this.editingVehicle.id, updateData).subscribe({
        next: (response) => {
          Swal.close();

          const isSuccess = response === null || response?.success === true;

          if (isSuccess) {
            this.showForm = false;
            Swal.fire('¡Actualizado!', 'Vehículo actualizado exitosamente', 'success');
            this.loadVehicles();
          } else {
            Swal.fire('Error', response?.message || 'No se pudo actualizar', 'error');
          }
        },
        error: (error) => {
          Swal.close();
          console.error('❌ Error al actualizar:', error);
          Swal.fire('Error', 'No se pudo actualizar el vehículo', 'error');
        }
      });
    } else {
      const createData: CreateVehicleRequest = {
        placa: this.formData.placa,
        tipo: this.formData.tipo,
        marca: this.formData.marca,
        modelo: this.formData.modelo,
        anio: this.formData.anio,
        capacidadCarga: this.formData.capacidadCarga,
        capacidadKg: this.formData.capacidadKg,
        estado: this.formData.estado,
        kilometraje: this.formData.kilometraje
      };

      this.vehicleService.createVehicle(createData).subscribe({
        next: (response) => {
          Swal.close();

          const isSuccess = response?.success === true || (response?.data && response.data.id);

          if (isSuccess) {
            this.showForm = false;
            Swal.fire('¡Creado!', 'Vehículo creado exitosamente', 'success');
            this.loadVehicles();
          } else {
            Swal.fire('Error', response?.message || 'No se pudo crear', 'error');
          }
        },
        error: (error) => {
          Swal.close();
          console.error('❌ Error al crear:', error);
          Swal.fire('Error', 'No se pudo crear el vehículo', 'error');
        }
      });
    }
  }

  // ❌ CANCELAR FORMULARIO
  cancelForm() {
    if (this.hasUnsavedChanges()) {
      Swal.fire({
        title: '¿Descartar cambios?',
        text: 'Tienes cambios sin guardar',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, descartar',
        cancelButtonText: 'Continuar editando'
      }).then((result) => {
        if (result.isConfirmed) {
          this.showForm = false;
          this.editingVehicle = null;
        }
      });
    } else {
      this.showForm = false;
      this.editingVehicle = null;
    }
  }

  hasUnsavedChanges(): boolean {
    if (!this.editingVehicle) return false;

    return this.formData.placa !== this.editingVehicle.placa ||
           this.formData.tipo !== this.editingVehicle.tipo ||
           this.formData.marca !== this.editingVehicle.marca ||
           this.formData.modelo !== this.editingVehicle.modelo ||
           this.formData.anio !== this.editingVehicle.anio ||
           this.formData.capacidadCarga !== this.editingVehicle.capacidadCarga ||
           this.formData.estado !== this.editingVehicle.estado ||
           this.formData.kilometraje !== this.editingVehicle.kilometraje;
  }

  onFormInputChange(): void {
    this.cdr.detectChanges();
  }

  // 🔄 LIMPIAR FILTROS
  clearFilters() {
    this.searchTerm = '';
    this.filters = {
      page: 0,
      size: 10,
      search: '',
      estado: undefined,
      tipo: undefined
    };
    this.selectedVehicles.clear();
    this.selectAll = false;
    this.applyLocalFilters();
  }

  // ✅ SELECCIÓN MASIVA
  toggleSelectAll() {
    if (this.selectAll) {
      this.selectedVehicles.clear();
    } else {
      this.vehicles.forEach(v => this.selectedVehicles.add(v.id));
    }
    this.selectAll = !this.selectAll;
  }

  toggleVehicleSelection(vehicleId: string) {
    if (this.selectedVehicles.has(vehicleId)) {
      this.selectedVehicles.delete(vehicleId);
    } else {
      this.selectedVehicles.add(vehicleId);
    }
    this.selectAll = this.selectedVehicles.size === this.vehicles.length;
  }

  isVehicleSelected(vehicleId: string): boolean {
    return this.selectedVehicles.has(vehicleId);
  }

  getSelectedCount(): number {
    return this.selectedVehicles.size;
  }

  // 🗑️ ELIMINACIÓN MASIVA
  deleteSelectedVehicles() {
    const count = this.getSelectedCount();
    if (count === 0) {
      Swal.fire('Selección requerida', 'Selecciona al menos un vehículo', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Eliminar vehículos?',
      text: `¿Eliminar ${count} vehículo(s)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.performBulkDelete();
      }
    });
  }

  private performBulkDelete() {
    const selectedIds = Array.from(this.selectedVehicles);
    let completed = 0;
    let errors = 0;

    Swal.fire({
      title: 'Eliminando...',
      text: `Eliminando ${selectedIds.length} vehículo(s)`,
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => Swal.showLoading()
    });

    selectedIds.forEach(id => {
      this.vehicleService.deleteVehicle(id).subscribe({
        next: (response) => {
          if (response === null || response?.success) completed++;
          else errors++;

          if (completed + errors === selectedIds.length) {
            this.handleBulkDeleteResult(completed, errors);
          }
        },
        error: () => {
          errors++;
          if (completed + errors === selectedIds.length) {
            this.handleBulkDeleteResult(completed, errors);
          }
        }
      });
    });
  }

  private handleBulkDeleteResult(completed: number, errors: number) {
    Swal.close();
    this.selectedVehicles.clear();
    this.selectAll = false;

    if (errors === 0) {
      Swal.fire('¡Eliminados!', `${completed} vehículo(s) eliminado(s)`, 'success');
    } else if (completed === 0) {
      Swal.fire('Error', 'No se pudo eliminar ningún vehículo', 'error');
    } else {
      Swal.fire('Parcial', `${completed} eliminados, ${errors} errores`, 'warning');
    }

    this.loadVehicles();
  }

  // 📊 CAMBIO MASIVO DE ESTADO
  bulkChangeStatus(newStatus: VehicleStatus) {
    const count = this.getSelectedCount();
    if (count === 0) {
      Swal.fire('Selección requerida', 'Selecciona al menos un vehículo', 'warning');
      return;
    }

    Swal.fire({
      title: 'Cambiar estado',
      text: `¿Cambiar ${count} vehículo(s) a ${newStatus}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.performBulkStatusChange(newStatus);
      }
    });
  }

  private performBulkStatusChange(newStatus: VehicleStatus) {
    const selectedIds = Array.from(this.selectedVehicles);
    let completed = 0;
    let errors = 0;

    Swal.fire({
      title: 'Actualizando...',
      text: `Cambiando estado de ${selectedIds.length} vehículo(s)`,
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => Swal.showLoading()
    });

    selectedIds.forEach((id) => {
      this.vehicleService.updateVehicleStatus(id, newStatus).subscribe({
        next: (response) => {
          if (response === null || response?.success === true) {
            completed++;
          } else {
            errors++;
          }

          if (completed + errors === selectedIds.length) {
            this.handleBulkStatusResult(completed, errors, newStatus);
          }
        },
        error: () => {
          errors++;
          if (completed + errors === selectedIds.length) {
            this.handleBulkStatusResult(completed, errors, newStatus);
          }
        }
      });
    });
  }

  private handleBulkStatusResult(completed: number, errors: number, newStatus: VehicleStatus) {
    Swal.close();
    this.selectedVehicles.clear();
    this.selectAll = false;

    if (errors === 0) {
      Swal.fire('¡Actualizado!', `${completed} vehículo(s) cambiados a ${newStatus}`, 'success');
    } else if (completed === 0) {
      Swal.fire('Error', 'No se pudo cambiar ningún estado', 'error');
    } else {
      Swal.fire('Parcial', `${completed} actualizados, ${errors} errores`, 'warning');
    }

    this.loadVehicles();
  }

  // 📄 EXPORTAR CSV
  exportVehicles() {
    if (this.vehicles.length === 0) {
      Swal.fire('Sin datos', 'No hay vehículos para exportar', 'info');
      return;
    }

    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `vehiculos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire('¡Exportado!', 'Datos exportados a CSV', 'success');
  }

  private generateCSV(): string {
    const headers = ['Placa', 'Tipo', 'Marca', 'Modelo', 'Año', 'Capacidad', 'Estado', 'Kilometraje'];
    const rows = this.vehicles.map(v => [
      v.placa,
      v.tipo,
      v.marca || '',
      v.modelo || '',
      v.anio?.toString() || '',
      this.getCapacidadDisplay(v),
      v.estado,
      v.kilometraje?.toString() || ''
    ]);

    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  }

  getStatusBadgeClass(status: VehicleStatus): string {
    switch (status) {
      case VehicleStatus.ACTIVO:
      case VehicleStatus.DISPONIBLE:
        return 'badge-success';
      case VehicleStatus.INACTIVO:
      case VehicleStatus.FUERA_DE_SERVICIO:
        return 'badge-danger';
      case VehicleStatus.EN_MANTENIMIENTO:
        return 'badge-warning';
      case VehicleStatus.EN_RUTA:
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  getActiveVehiclesCount(): number {
    return this.vehicles.filter(v =>
      v.estado === VehicleStatus.ACTIVO || v.estado === VehicleStatus.DISPONIBLE
    ).length;
  }

  getMaintenanceVehiclesCount(): number {
    return this.vehicles.filter(v => v.estado === VehicleStatus.EN_MANTENIMIENTO).length;
  }

  getInRouteVehiclesCount(): number {
    return this.vehicles.filter(v => v.estado === VehicleStatus.EN_RUTA).length;
  }

  getAverageCapacity(): string {
    const withCapacity = this.vehicles.filter(v => v.capacidadKg && v.capacidadKg > 0);
    if (withCapacity.length === 0) return '0 kg';

    const total = withCapacity.reduce((sum, v) => sum + v.capacidadKg!, 0);
    return Math.round(total / withCapacity.length) + ' kg';
  }

  getCapacidadDisplay(vehicle: VehicleListItem): string {
    if (vehicle.capacidadCarga) return vehicle.capacidadCarga;
    if (vehicle.capacidadKg) return vehicle.capacidadKg + ' kg';
    return 'N/A';
  }

  isFormValid(): boolean {
    const placaValida = this.formData.placa && this.formData.placa.trim().length > 0;
    const tipoValido = this.formData.tipo && this.formData.tipo.trim().length > 0;
    const marcaValida = this.formData.marca && this.formData.marca.trim().length > 0;
    const modeloValido = this.formData.modelo && this.formData.modelo.trim().length > 0;
    const anioValido = this.formData.anio &&
                       this.formData.anio >= 2000 &&
                       this.formData.anio <= this.getMaxYear();

    return placaValida && tipoValido && marcaValida && modeloValido && anioValido;
  }

  getMaxYear(): number {
    return new Date().getFullYear() + 1;
  }
}
