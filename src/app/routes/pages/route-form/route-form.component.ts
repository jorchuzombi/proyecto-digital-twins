import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';
import { RouteService } from '../../../services/route.service';
import { GeocodingService, GeocodingResult } from '../../../services/geocoding.service';
import { AddressAutocompleteComponent } from '../../../components/address-autocomplete/address-autocomplete';

interface RouteForm {
  id?: string;
  name: string;
  driver: string;
  vehicle: string;
  city: string;
  stops: Stop[];
  distance: number;
  estimatedDuration?: string;
  startTime: string;
  endTime: string;
  fuelCost: number;
  revenue: number;
  notes: string;
  status?: string;
}

interface Stop {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'PICKUP' | 'DELIVERY' | 'STOP';
  stopOrder: number;
}

@Component({
  selector: 'app-route-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './route-form.component.html',
  styleUrls: ['./route-form.component.scss']
})
export class RouteFormComponent implements OnInit, AfterViewInit, OnDestroy {
  private routeService = inject(RouteService);
  private geocodingService = inject(GeocodingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  isEditMode = false;
  routeId: string | null = null;
  loading = false;
  map: L.Map | null = null;
  markers: L.Marker[] = [];
  routeLayer: L.Polyline | null = null;
  mapInitialized = false;

  editingStopIndex: number | null = null;

  formData: RouteForm = {
    name: '',
    driver: '',
    vehicle: '',
    city: '',
    stops: [],
    distance: 0,
    startTime: '',
    endTime: '',
    fuelCost: 0,
    revenue: 0,
    notes: ''
  };

  currentStop: Stop = {
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    type: 'DELIVERY',
    stopOrder: 0
  };

  driverOptions: string[] = [];
  vehicleOptions: string[] = [];
  driverObjects: any[] = [];
  vehicleObjects: any[] = [];

  cityOptions = ['Bogotá', 'Medellín', 'Cali'];
  stopTypeOptions = ['PICKUP', 'DELIVERY', 'STOP'];

  cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
    'Bogotá': { lat: 4.6097, lng: -74.0817 },
    'Medellín': { lat: 6.2442, lng: -75.5812 },
    'Cali': { lat: 3.4516, lng: -76.5320 }
  };

  // ✅ Address search properties
  addressSearchResults: GeocodingResult[] = [];
  isSearchingAddress = false;
  showAddressResults = false;

  // ✅ Address input handler
  onAddressInput(address: string) {
    if (address.length < 3) {
      this.showAddressResults = false;
      this.addressSearchResults = [];
      return;
    }

    this.isSearchingAddress = true;
    this.geocodingService.searchAddress(address, this.formData.city).subscribe({
      next: (results: GeocodingResult[]) => {
        this.addressSearchResults = results.slice(0, 5); // Limit to 5 results
        this.showAddressResults = results.length > 0;
        this.isSearchingAddress = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error searching address:', error);
        this.isSearchingAddress = false;
        this.showAddressResults = false;
        this.addressSearchResults = [];
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit() {
    this.loadOptions();
    this.setupAddressSearch();

    this.route.params.subscribe(params => {
      this.routeId = params['id'];
      this.isEditMode = !!this.routeId;

      if (this.isEditMode && this.routeId) {
        this.loadRouteData();
      } else {
        this.setDefaultTimes();
        this.resetCurrentStop();
        this.formData.city = 'Bogotá';
      }
    });
  }

  ngAfterViewInit() {
    (window as any).angularComponent = this;
    this.initializeMapWithRetry();
  }

  ngOnDestroy() {
    console.log('🔴 Component destroying, cleaning up map...');
    if (this.map) {
      try {
        this.map.remove();
        this.map = null;
      } catch (error) {
        console.error('Error removing map:', error);
      }
    }
    this.mapInitialized = false;
    this.markers = [];
    this.routeLayer = null;
  }

  // ✅ CONFIGURAR BÚSQUEDA DE DIRECCIONES EN TIEMPO REAL
  private setupAddressSearch() {
    // This method is not needed anymore since we're using the component
  }

  // ✅ SELECCIONAR UNA DIRECCIÓN DE LOS RESULTADOS
  selectAddress(result: GeocodingResult) {
    this.currentStop.address = result.display_name;
    this.currentStop.latitude = parseFloat(result.lat);
    this.currentStop.longitude = parseFloat(result.lon);

    this.showAddressResults = false;
    this.addressSearchResults = [];

    if (this.map) {
      this.map.setView([this.currentStop.latitude, this.currentStop.longitude], 16);
      this.addTemporaryMarker(L.latLng(this.currentStop.latitude, this.currentStop.longitude));
    }

    if (!this.currentStop.name) {
      const nameFromAddress = this.extractLocationName(result);
      if (nameFromAddress) {
        this.currentStop.name = nameFromAddress;
      }
    }

    this.cdr.detectChanges();

    Swal.fire({
      title: '✅ Dirección Seleccionada',
      text: 'La dirección ha sido validada correctamente',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  }

  private extractLocationName(result: GeocodingResult): string {
    if (result.address.road) {
      return result.address.road + (result.address.house_number ? ' ' + result.address.house_number : '');
    }
    if (result.address.suburb) {
      return result.address.suburb;
    }
    if (result.address.city) {
      return result.address.city;
    }
    return '';
  }

  private loadOptions() {
    console.log('🔄 Cargando opciones desde API...');

    // ✅ CARGAR CONDUCTORES DESDE API - SIN FALLBACK
    this.routeService.getAvailableDrivers().subscribe({
      next: (drivers: any[]) => {
        console.log('👥 Conductores recibidos de la API:', drivers);

        if (drivers && drivers.length > 0) {
          this.driverObjects = drivers;
          this.driverOptions = drivers.map(driver =>
            `${driver.nombre} ${driver.apellido} - ${driver.licencia}`
          );
          console.log(`✅ ${this.driverOptions.length} conductores cargados`);

          if (!this.isEditMode && this.driverOptions.length > 0) {
            this.formData.driver = this.driverOptions[0];
          }
        } else {
          console.warn('⚠️ No hay conductores disponibles en la API');
          this.driverOptions = [];
        }

        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Error cargando conductores desde API:', error);
        this.driverOptions = [];

        Swal.fire({
          title: '⚠️ Error',
          text: 'No se pudieron cargar los conductores. Verifica que el backend esté funcionando.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        });

        this.cdr.detectChanges();
      }
    });

    // ✅ CARGAR VEHÍCULOS DESDE API - SIN FALLBACK
    this.routeService.getAvailableVehicles().subscribe({
      next: (vehicles: any[]) => {
        console.log('🚛 Vehículos recibidos de la API:', vehicles);

        if (vehicles && vehicles.length > 0) {
          this.vehicleObjects = vehicles;
          this.vehicleOptions = vehicles.map(vehicle =>
            `${vehicle.placa} - ${vehicle.marca} ${vehicle.modelo}`
          );
          console.log(`✅ ${this.vehicleOptions.length} vehículos cargados`);

          if (!this.isEditMode && this.vehicleOptions.length > 0) {
            this.formData.vehicle = this.vehicleOptions[0];
          }
        } else {
          console.warn('⚠️ No hay vehículos disponibles en la API');
          this.vehicleOptions = [];
        }

        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Error cargando vehículos desde API:', error);
        this.vehicleOptions = [];

        Swal.fire({
          title: '⚠️ Error',
          text: 'No se pudieron cargar los vehículos. Verifica que el backend esté funcionando.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        });

        this.cdr.detectChanges();
      }
    });
  }

  private getSelectedDriverId(): string {
    if (!this.formData.driver || this.driverObjects.length === 0) {
      return '';
    }

    const selectedDriver = this.driverObjects.find(driver =>
      `${driver.nombre} ${driver.apellido} - ${driver.licencia}` === this.formData.driver
    );

    return selectedDriver ? selectedDriver.id : '';
  }

  private getSelectedVehicle(): string {
    if (!this.formData.vehicle || this.vehicleObjects.length === 0) {
      return this.formData.vehicle;
    }

    const selectedVehicle = this.vehicleObjects.find(vehicle =>
      `${vehicle.placa} - ${vehicle.marca} ${vehicle.modelo}` === this.formData.vehicle
    );

    return selectedVehicle ? selectedVehicle.placa : this.formData.vehicle;
  }

  private prepareRouteData() {
    const driverId = this.getSelectedDriverId();
    const vehicle = this.getSelectedVehicle();

    console.log('📤 Preparando datos para enviar al backend:', {
      driverText: this.formData.driver,
      driverId: driverId,
      vehicleText: this.formData.vehicle,
      vehicle: vehicle
    });

    return {
      name: this.formData.name,
      driverId: driverId,
      vehicle: vehicle,
      city: this.formData.city,
      distance: this.formData.distance,
      estimatedDuration: this.calculateDuration(),
      startTime: `${this.formData.startTime}:00`,
      endTime: `${this.formData.endTime}:00`,
      fuelCost: this.formData.fuelCost,
      revenue: this.formData.revenue,
      notes: this.formData.notes,
      status: 'PENDING',
      stops: this.formData.stops.map(stop => ({
        name: stop.name,
        address: stop.address,
        latitude: stop.latitude,
        longitude: stop.longitude,
        type: stop.type,
        stopOrder: stop.stopOrder
      }))
    };
  }

  isEditingStop(): boolean {
    return this.editingStopIndex !== null;
  }

  editStop(index: number) {
    const stop = this.formData.stops[index];
    if (stop) {
      this.editingStopIndex = index;
      this.currentStop = { ...stop };
      this.cdr.detectChanges();

      if (this.map) {
        this.map.setView([stop.latitude, stop.longitude], 15);
      }

      setTimeout(() => {
        const nameInput = document.getElementById('stop-name') as HTMLInputElement;
        if (nameInput) nameInput.focus();
      }, 100);
    }
  }

  updateStop() {
    if (this.editingStopIndex !== null) {
      this.formData.stops[this.editingStopIndex] = { ...this.currentStop };

      this.drawStops();
      this.drawRoute();
      this.resetCurrentStop();

      Swal.fire('✅', 'Parada actualizada exitosamente', 'success');
      this.cdr.detectChanges();
    }
  }

  removeStop(index: number) {
    Swal.fire({
      title: '¿Eliminar parada?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        this.formData.stops.splice(index, 1);

        if (this.editingStopIndex === index) {
          this.resetCurrentStop();
        } else if (this.editingStopIndex !== null && this.editingStopIndex > index) {
          this.editingStopIndex--;
        }

        this.formData.stops.forEach((stop, idx) => {
          stop.stopOrder = idx + 1;
        });

        await this.ensureMapInitialized();
        this.drawStops();
        this.drawRoute();

        Swal.fire('✅', 'Parada eliminada exitosamente', 'success');
        this.cdr.detectChanges();
      }
    });
  }

  resetCurrentStop() {
    this.editingStopIndex = null;
    this.currentStop = {
      name: '',
      address: '',
      latitude: 0,
      longitude: 0,
      type: 'DELIVERY',
      stopOrder: this.formData.stops.length + 1
    };
    this.clearTemporaryMarkers();
    this.cdr.detectChanges();
  }

  isFormValid(): boolean {
    const hasBasicInfo = !!this.formData.name?.trim() &&
                        !!this.formData.driver?.trim() &&
                        !!this.formData.vehicle?.trim() &&
                        !!this.formData.city?.trim();

    const hasStops = this.formData.stops.length >= 1;

    return hasBasicInfo && hasStops;
  }

  isCurrentStopValid(): boolean {
    return !!this.currentStop.name?.trim() &&
           !!this.currentStop.address?.trim() &&
           this.currentStop.latitude !== 0 &&
           this.currentStop.longitude !== 0;
  }

  onFormChange(): void {
    this.cdr.detectChanges();
  }

  onStopFormChange(): void {
    this.cdr.detectChanges();
  }

  private loadRouteData() {
    if (!this.routeId) return;

    this.loading = true;
    console.log('📥 Cargando ruta desde API:', this.routeId);

    this.routeService.getRouteById(this.routeId).subscribe({
      next: (routeData: any) => {
        console.log('✅ Datos de ruta recibidos:', routeData);

        if (routeData) {
          this.mapRouteData(routeData);
          this.loadRouteStops();
        } else {
          console.error('❌ No se recibieron datos de la ruta');
          this.loading = false;
          Swal.fire('Error', 'No se encontró la ruta solicitada', 'error');
        }
      },
      error: (error: any) => {
        console.error('❌ Error cargando ruta:', error);
        this.loading = false;
        Swal.fire('Error', 'No se pudo cargar la ruta desde el servidor', 'error');
      }
    });
  }

  private loadRouteStops() {
    if (!this.routeId) return;

    console.log('📥 Cargando paradas desde API:', this.routeId);

    this.routeService.getRouteStops(this.routeId).subscribe({
      next: (stopsData: any[]) => {
        console.log('✅ Paradas recibidas:', stopsData);

        this.formData.stops = stopsData.map((stop: any) => ({
          id: stop.id,
          name: stop.name,
          address: stop.address,
          latitude: stop.latitude,
          longitude: stop.longitude,
          type: stop.type,
          stopOrder: stop.stopOrder
        }));

        this.loading = false;
        this.initializeMapWithData();
      },
      error: (error: any) => {
        console.error('❌ Error cargando paradas:', error);
        this.loading = false;
        this.initializeMapWithData();
      }
    });
  }

  private mapRouteData(routeData: any) {
    let driverText = '';
    if (routeData.driverId && this.driverObjects.length > 0) {
      const driver = this.driverObjects.find(d => d.id === routeData.driverId);
      if (driver) {
        driverText = `${driver.nombre} ${driver.apellido} - ${driver.licencia}`;
      }
    }

    let vehicleText = '';
    if (routeData.vehicle && this.vehicleObjects.length > 0) {
      const vehicle = this.vehicleObjects.find(v => v.placa === routeData.vehicle);
      if (vehicle) {
        vehicleText = `${vehicle.placa} - ${vehicle.marca} ${vehicle.modelo}`;
      } else {
        vehicleText = routeData.vehicle;
      }
    }

    this.formData = {
      id: routeData.id,
      name: routeData.name || '',
      driver: driverText || routeData.driver || '',
      vehicle: vehicleText || routeData.vehicle || '',
      city: routeData.city || 'Bogotá',
      stops: [],
      distance: routeData.distance || 0,
      estimatedDuration: routeData.estimatedDuration,
      startTime: routeData.startTime ? routeData.startTime.substring(0, 5) : '08:00',
      endTime: routeData.endTime ? routeData.endTime.substring(0, 5) : '17:00',
      fuelCost: routeData.fuelCost || 0,
      revenue: routeData.revenue || 0,
      notes: routeData.notes || '',
      status: routeData.status
    };
  }

  private initializeMapWithRetry(attempt = 0) {
    const maxAttempts = 5;

    if (this.map) {
      this.mapInitialized = true;
      return;
    }

    if (attempt >= maxAttempts) {
      console.error('❌ No se pudo inicializar el mapa después de varios intentos');
      return;
    }

    try {
      const mapContainer = document.getElementById('route-map');

      if (!mapContainer) {
        setTimeout(() => this.initializeMapWithRetry(attempt + 1), 300);
        return;
      }

      if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
        setTimeout(() => this.initializeMapWithRetry(attempt + 1), 300);
        return;
      }

      this.initMap();
      this.mapInitialized = true;

    } catch (error) {
      console.error('Error inicializando mapa:', error);
      setTimeout(() => this.initializeMapWithRetry(attempt + 1), 500);
    }
  }

  private initMap() {
    if (this.map) return;

    const defaultCity = this.formData.city || 'Bogotá';
    const coordinates = this.cityCoordinates[defaultCity];

    try {
      const container = document.getElementById('route-map');
      if (!container) {
        throw new Error('Contenedor del mapa no encontrado');
      }

      (container as any)._leaflet_id = undefined;

      this.map = L.map('route-map').setView([coordinates.lat, coordinates.lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);

      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.onMapClick(e);
      });

      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);

      if (this.formData.stops.length > 0) {
        setTimeout(() => {
          this.drawStops();
          this.drawRoute();
        }, 200);
      }
    } catch (error) {
      console.error('Error creando mapa:', error);
      throw error;
    }
  }

  private initializeMapWithData() {
    if (!this.mapInitialized) {
      this.initializeMapWithRetry();
    } else {
      setTimeout(() => {
        this.drawStops();
        this.drawRoute();
      }, 100);
    }
  }

  async onMapClick(e: L.LeafletMouseEvent) {
    if (!this.map) {
      await this.ensureMapInitialized();
    }

    Swal.fire({
      title: '📍 Obteniendo Dirección',
      text: 'Buscando la dirección de esta ubicación...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const result = await this.geocodingService.reverseGeocode(
        e.latlng.lat,
        e.latlng.lng
      ).toPromise();

      Swal.close();

      if (result) {
        this.currentStop.latitude = parseFloat(result.lat);
        this.currentStop.longitude = parseFloat(result.lon);
        this.currentStop.address = result.display_name;

        if (!this.currentStop.name) {
          const nameFromAddress = this.extractLocationName(result);
          if (nameFromAddress) {
            this.currentStop.name = nameFromAddress;
          }
        }

        this.addTemporaryMarker(e.latlng);
        this.cdr.detectChanges();

        await Swal.fire({
          title: '✅ Ubicación y Dirección Obtenidas',
          html: `
            <p><strong>Dirección:</strong> ${result.display_name}</p>
            <p>Completa los datos restantes en el formulario.</p>
          `,
          icon: 'success',
          confirmButtonText: 'Continuar'
        });
      }
    } catch (error) {
      console.error('Error en geocodificación reversa:', error);
      Swal.close();

      this.currentStop.latitude = e.latlng.lat;
      this.currentStop.longitude = e.latlng.lng;
      this.addTemporaryMarker(e.latlng);
      this.cdr.detectChanges();

      await Swal.fire({
        title: '📍 Ubicación Seleccionada',
        html: `<p>Coordenadas: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}</p>
               <p>Por favor ingresa la dirección manualmente.</p>`,
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  private addTemporaryMarker(latlng: L.LatLng) {
    if (!this.map) return;

    this.clearTemporaryMarkers();

    const marker = L.marker(latlng, {
      icon: L.divIcon({
        html: '📍',
        className: 'temporary-marker',
        iconSize: [25, 25]
      })
    }).addTo(this.map);

    this.markers.push(marker);
  }

  private clearTemporaryMarkers() {
    if (!this.map) return;

    this.markers.forEach(marker => {
      this.map!.removeLayer(marker);
    });
    this.markers = this.markers.filter(m => {
      const icon = m.getIcon() as L.DivIcon;
      return !icon.options.className?.includes('temporary-marker');
    });
  }

  private drawStops() {
    if (!this.map) return;

    this.clearTemporaryMarkers();

    this.formData.stops.forEach((stop, index) => {
      try {
        let iconHtml = '';
        switch (stop.type) {
          case 'PICKUP': iconHtml = '🟢'; break;
          case 'DELIVERY': iconHtml = '🔵'; break;
          case 'STOP': iconHtml = '🟡'; break;
        }

        const marker = L.marker([stop.latitude, stop.longitude], {
          icon: L.divIcon({
            html: `${iconHtml} ${index + 1}`,
            className: 'stop-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          })
        }).addTo(this.map!);

        marker.bindPopup(`
          <div class="stop-popup">
            <h4>${stop.name}</h4>
            <p><strong>Dirección:</strong> ${stop.address}</p>
            <p><strong>Tipo:</strong> ${this.getStopTypeText(stop.type)}</p>
            <p><strong>Orden:</strong> ${stop.stopOrder}</p>
            <button onclick="window.angularComponent?.editStop(${index})">✏️ Editar</button>
            <button onclick="window.angularComponent?.removeStop(${index})">🗑️ Eliminar</button>
          </div>
        `);

        this.markers.push(marker);
      } catch (error) {
        console.error('Error dibujando parada:', error);
      }
    });
  }

  private drawRoute() {
    if (!this.map) return;

    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
    }

    if (this.formData.stops.length > 1) {
      const coordinates: L.LatLngExpression[] = this.formData.stops.map(stop =>
        [stop.latitude, stop.longitude] as L.LatLngExpression
      );

      this.routeLayer = L.polyline(coordinates, {
        color: '#3b82f6',
        weight: 6,
        opacity: 0.7,
        lineJoin: 'round'
      }).addTo(this.map);

      this.calculateRouteDistance();
    }
  }

  async addStop() {
    if (!this.isCurrentStopValid()) {
      Swal.fire('Error', 'Por favor completa todos los campos de la parada', 'error');
      return;
    }

    if (!this.formData.city) {
      Swal.fire('Error', 'Primero selecciona una ciudad', 'warning');
      return;
    }

    await this.ensureMapInitialized();

    this.currentStop.stopOrder = this.formData.stops.length + 1;
    this.formData.stops.push({ ...this.currentStop });

    this.drawStops();
    this.drawRoute();
    this.resetCurrentStop();

    Swal.fire('✅', 'Parada agregada exitosamente', 'success');
    this.cdr.detectChanges();
  }

  async clearStops() {
    if (this.formData.stops.length === 0) return;

    Swal.fire({
      title: '¿Eliminar todas las paradas?',
      text: 'Se eliminarán todas las paradas de la ruta',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar todas',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        this.formData.stops = [];
        this.formData.distance = 0;
        this.resetCurrentStop();
        this.clearTemporaryMarkers();

        await this.ensureMapInitialized();

        if (this.routeLayer && this.map) {
          this.map.removeLayer(this.routeLayer);
          this.routeLayer = null;
        }

        Swal.fire('✅', 'Todas las paradas han sido eliminadas', 'success');
        this.cdr.detectChanges();
      }
    });
  }

  private calculateRouteDistance() {
    if (this.formData.stops.length < 2) {
      this.formData.distance = 0;
      return;
    }

    let totalDistance = 0;
    for (let i = 0; i < this.formData.stops.length - 1; i++) {
      const stop1 = this.formData.stops[i];
      const stop2 = this.formData.stops[i + 1];
      totalDistance += this.calculateDistance(stop1.latitude, stop1.longitude, stop2.latitude, stop2.longitude);
    }

    this.formData.distance = Math.round(totalDistance * 100) / 100;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  calculateDuration(): string {
    if (!this.formData.startTime || !this.formData.endTime) return '0h 0m';

    const start = new Date(`2000-01-01T${this.formData.startTime}`);
    const end = new Date(`2000-01-01T${this.formData.endTime}`);
    const diff = end.getTime() - start.getTime();

    if (diff < 0) return '0h 0m';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  calculateProfit(): number {
    return (this.formData.revenue || 0) - (this.formData.fuelCost || 0);
  }

  getStopTypeText(type: string): string {
    switch (type) {
      case 'PICKUP': return 'Recogida';
      case 'DELIVERY': return 'Entrega';
      case 'STOP': return 'Parada';
      default: return type;
    }
  }

  setDefaultTimes() {
    this.formData.startTime = '08:00';
    this.formData.endTime = '17:00';
  }

  onCityChange() {
    if (this.map && this.formData.city) {
      const coordinates = this.cityCoordinates[this.formData.city];
      this.map.setView([coordinates.lat, coordinates.lng], 13);
    }
  }

  async onSubmit() {
    console.log('📤 Preparando envío al backend...');

    if (!this.isFormValid()) {
      Swal.fire({
        title: '❌ Formulario incompleto',
        text: 'Por favor completa todos los campos obligatorios y agrega al menos 1 parada',
        icon: 'error'
      });
      return;
    }

    this.loading = true;

    try {
      const routeData = this.prepareRouteData();
      console.log('📤 DATOS A ENVIAR AL BACKEND:', routeData);

      if (this.isEditMode && this.routeId) {
        await this.updateRoute(routeData);
      } else {
        await this.createRoute(routeData);
      }
    } catch (error) {
      console.error('❌ Error guardando ruta:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo guardar la ruta. Verifica tu conexión con el servidor.',
        icon: 'error'
      });
    } finally {
      this.loading = false;
    }
  }

  private async createRoute(routeData: any): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('➕ Creando nueva ruta...');

      this.routeService.createRoute(routeData).subscribe({
        next: (result: any) => {
          console.log('✅ Ruta creada exitosamente:', result);
          this.showSuccess('Nueva ruta creada exitosamente');
          resolve();
        },
        error: (error: any) => {
          console.error('❌ Error creando ruta:', error);
          reject(error);
        }
      });
    });
  }

  private async updateRoute(routeData: any): Promise<void> {
    if (!this.routeId) return Promise.reject('No route ID');

    return new Promise((resolve, reject) => {
      console.log('✏️ Actualizando ruta existente...');

      this.routeService.updateRoute(this.routeId!, routeData).subscribe({
        next: (result: any) => {
          console.log('✅ Ruta actualizada exitosamente:', result);
          this.showSuccess('Ruta actualizada exitosamente');
          resolve();
        },
        error: (error: any) => {
          console.error('❌ Error actualizando ruta:', error);
          reject(error);
        }
      });
    });
  }

  private showSuccess(message: string) {
    Swal.fire({
      title: '✅ Éxito',
      text: message,
      icon: 'success',
      confirmButtonText: 'Continuar'
    }).then(() => {
      this.router.navigate(['/routes']);
    });
  }

  async onOptimize() {
    if (this.formData.stops.length < 2) {
      Swal.fire('Info', 'Agrega al menos 2 paradas para optimizar la ruta', 'info');
      return;
    }

    if (!this.routeId) {
      Swal.fire({
        title: '⚠️ Ruta no guardada',
        text: 'Primero debes guardar la ruta antes de optimizarla',
        icon: 'warning'
      });
      return;
    }

    Swal.fire({
      title: '🔧 Optimizando ruta...',
      text: 'Enviando solicitud al servidor...',
      icon: 'info',
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.routeService.optimizeRoute(this.routeId).subscribe({
      next: (optimizedRoute: any) => {
        console.log('✅ Ruta optimizada:', optimizedRoute);

        // Actualizar datos locales con la respuesta del servidor
        if (optimizedRoute.stops) {
          this.formData.stops = optimizedRoute.stops;
        }
        if (optimizedRoute.distance) {
          this.formData.distance = optimizedRoute.distance;
        }
        if (optimizedRoute.fuelCost) {
          this.formData.fuelCost = optimizedRoute.fuelCost;
        }

        this.drawStops();
        this.drawRoute();

        Swal.fire({
          title: '✅ Ruta Optimizada',
          html: `
            <p>¡Ruta optimizada exitosamente!</p>
            <ul style="text-align: left;">
              <li>Distancia: ${this.formData.distance} km</li>
              <li>Combustible estimado: $${this.formData.fuelCost}</li>
              <li>${this.formData.stops.length} paradas reorganizadas</li>
            </ul>
          `,
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
      },
      error: (error: any) => {
        console.error('❌ Error optimizando ruta:', error);

        Swal.fire({
          title: 'Error',
          text: 'No se pudo optimizar la ruta. Verifica tu conexión con el servidor.',
          icon: 'error'
        });
      }
    });
  }

  onCancel() {
    Swal.fire({
      title: '¿Cancelar cambios?',
      text: 'Los cambios no guardados se perderán',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Seguir editando'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/routes']);
      }
    });
  }

  private ensureMapInitialized(): Promise<void> {
    return new Promise((resolve) => {
      if (this.map) {
        resolve();
      } else {
        const checkMap = () => {
          if (this.map) {
            resolve();
          } else {
            setTimeout(checkMap, 100);
          }
        };
        checkMap();
      }
    });
  }

  resetMap() {
    console.log('🔄 Reiniciando mapa...');

    if (this.map) {
      try {
        this.map.remove();
        this.map = null;
      } catch (error) {
        console.error('Error removiendo mapa:', error);
      }
    }

    this.markers = [];
    this.routeLayer = null;
    this.mapInitialized = false;

    const container = document.getElementById('route-map');
    if (container) {
      (container as any)._leaflet_id = undefined;
    }

    setTimeout(() => {
      this.initializeMapWithRetry();
    }, 500);

    Swal.fire('🔄', 'Mapa reiniciado', 'info');
  }
}


