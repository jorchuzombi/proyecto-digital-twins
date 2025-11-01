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

  private searchSubject = new Subject<string>();

  // Opciones para selects - TODOS los estados del backend
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

    // Búsqueda con debounce - 800ms para búsqueda más pausada
    this.searchSubject.pipe(
      debounceTime(800),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filters.search = searchTerm;
      this.applyFilters();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 📋 CARGAR VEHÍCULOS
  loadVehicles() {
    this.loading = true;
    this.error = '';
    console.log('🔄 Cargando vehículos...');

    this.vehicleService.getVehicles(this.filters).subscribe({
      next: (response) => {
        console.log('📥 Respuesta completa:', response);

        // ✅ CASO 1: Respuesta con estructura {success, data, content}
        if (response && response.success && response.data && response.data.content) {
          this.vehicles = response.data.content;
          console.log(`✅ ${this.vehicles.length} vehículos cargados (estructura completa)`);
        }
        // ✅ CASO 2: Respuesta con {success, data} donde data es array
        else if (response && response.success && Array.isArray(response.data)) {
          this.vehicles = response.data;
          console.log(`✅ ${this.vehicles.length} vehículos cargados (data array)`);
        }
        // ✅ CASO 3: Array directo sin wrapper
        else if (Array.isArray(response)) {
          this.vehicles = response as any;
          console.log(`✅ ${this.vehicles.length} vehículos cargados (array directo)`);
        }
        // ✅ CASO 4: Response es el objeto data directamente
        else if (response && (response as any).content) {
          this.vehicles = (response as any).content;
          console.log(`✅ ${this.vehicles.length} vehículos cargados (content directo)`);
        }
        else {
          this.vehicles = [];
          console.warn('⚠️ Formato de respuesta no reconocido:', response);
        }

        this.selectedVehicles.clear();
        this.selectAll = false;
        this.originalStates.clear();
        this.loading = false;
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

  // 🔍 APLICAR FILTROS
  applyFilters() {
    this.filters.page = 0;
    console.log('🔍 Aplicando filtros:', this.filters);
    this.loadVehicles();
  }

  // 🔍 BÚSQUEDA CON DEBOUNCE
  onSearchChange(searchTerm: string) {
    this.searchSubject.next(searchTerm);
  }

  // 🔍 BÚSQUEDA INSTANTÁNEA POR PLACA
  onPlacaSearch(searchTerm: string) {
    if (searchTerm.length >= 1) {
      this.filters.search = searchTerm;
      this.applyFilters();
    } else if (searchTerm.length === 0) {
      this.filters.search = '';
      this.applyFilters();
    }
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

          setTimeout(() => this.loadVehicles(), 500);
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
      console.log(`🔄 Estado revertido para ${vehicleId}: ${originalStatus}`);
    }
    this.originalStates.delete(vehicleId);
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
    console.log('✅ Formulario nuevo inicializado:', this.formData);
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

        // ✅ CASO 1: {success: true, data: {...}}
        if (response && response.success && response.data) {
          vehicleData = response.data;
        }
        // ✅ CASO 2: Objeto vehículo directo (sin wrapper)
        else if (response && (response as any).id && (response as any).placa) {
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
          setTimeout(() => {
            this.cdr.detectChanges();
            console.log('📝 Editando vehículo:', this.formData);
            console.log('📝 isFormValid:', this.isFormValid());
          }, 0);
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

    console.log('💾 Guardando vehículo:', this.formData);

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
          console.log('✅ Respuesta actualización:', response);
          Swal.close();

          const isSuccess = response === null || response?.success === true;

          if (isSuccess) {
            this.showForm = false;
            Swal.fire('¡Actualizado!', 'Vehículo actualizado exitosamente', 'success');
            this.loadVehicles();
            this.cdr.detectChanges();
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
          console.log('✅ Respuesta creación:', response);
          Swal.close();

          const isSuccess = response?.success === true || (response?.data && response.data.id);

          if (isSuccess) {
            this.showForm = false;
            Swal.fire('¡Creado!', 'Vehículo creado exitosamente', 'success');
            this.loadVehicles();
            this.cdr.detectChanges();
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
          this.cdr.detectChanges();
        }
      });
    } else {
      this.showForm = false;
      this.editingVehicle = null;
      this.cdr.detectChanges();
    }
  }

  // ✅ VERIFICAR CAMBIOS SIN GUARDAR
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

  // 🔄 FORZAR DETECCIÓN DE CAMBIOS
  onFormInputChange(): void {
    this.cdr.detectChanges();
    console.log('📝 Formulario actualizado');
  }

  // 🔄 LIMPIAR FILTROS
  clearFilters() {
    this.filters = {
      page: 0,
      size: 10,
      search: '',
      estado: undefined,
      tipo: undefined
    };
    this.selectedVehicles.clear();
    this.selectAll = false;
    this.loadVehicles();
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

    selectedIds.forEach(id => {
      const vehicle = this.vehicles.find(v => v.id === id);
      if (vehicle) {
        this.originalStates.set(id, vehicle.estado);
      }
    });

    Swal.fire({
      title: 'Actualizando...',
      text: `Cambiando estado de ${selectedIds.length} vehículo(s)`,
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => Swal.showLoading()
    });

    selectedIds.forEach((id) => {
      const vehicleIndex = this.vehicles.findIndex(v => v.id === id);
      if (vehicleIndex !== -1) {
        this.vehicles[vehicleIndex].estado = newStatus;
      }

      this.vehicleService.updateVehicleStatus(id, newStatus).subscribe({
        next: (response) => {
          if (response === null || response?.success === true) {
            completed++;
            this.originalStates.delete(id);
          } else {
            errors++;
            const original = this.originalStates.get(id);
            if (original && vehicleIndex !== -1) {
              this.vehicles[vehicleIndex].estado = original;
            }
          }

          if (completed + errors === selectedIds.length) {
            this.handleBulkStatusResult(completed, errors, newStatus);
          }
        },
        error: () => {
          errors++;
          const original = this.originalStates.get(id);
          if (original && vehicleIndex !== -1) {
            this.vehicles[vehicleIndex].estado = original;
          }

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

  // 🏷️ BADGE DE ESTADO - Todos los estados del backend
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

  // ESTADÍSTICAS - Conteo correcto según estados del backend
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

  // VALIDACIÓN
  isFormValid(): boolean {
    const placaValida = this.formData.placa && this.formData.placa.trim().length > 0;
    const tipoValido = this.formData.tipo && this.formData.tipo.trim().length > 0;
    const marcaValida = this.formData.marca && this.formData.marca.trim().length > 0;
    const modeloValido = this.formData.modelo && this.formData.modelo.trim().length > 0;
    const anioValido = this.formData.anio &&
                       this.formData.anio >= 2000 &&
                       this.formData.anio <= this.getMaxYear();

    const isValid = placaValida && tipoValido && marcaValida && modeloValido && anioValido;

    if (!isValid) {
      console.log('🔍 Validación del formulario:', {
        placaValida,
        tipoValido,
        marcaValida,
        modeloValido,
        anioValido,
        formData: this.formData
      });
    }

    return isValid;
  }

  getMaxYear(): number {
    return new Date().getFullYear() + 1;
  }
}
