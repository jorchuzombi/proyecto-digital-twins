import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';
import { RouteService } from '../../../services/route.service';
import { GeocodingService, GeocodingResult } from '../../../services/geocoding.service';
import { RoutingService } from '../../../services/routing.service';
import { RealTimeRoutingService } from '../../../services/real-time-routing.service';
import { DriverService } from '../../../services/driver.service';

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
  private routingService = inject(RoutingService);
  private realtimeService = inject(RealTimeRoutingService);
  private driverService = inject(DriverService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  isEditMode = false;
  routeId: string | null = null;
  loading = false;
  map: L.Map | null = null;
  markers: L.Marker[] = [];
  routeLayer: L.Polyline | null = null;
  routeBorderLayer: L.Polyline | null = null;
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
  selectedDriver: any = null;
  selectedVehicle: any = null;
  selectedCity: string = 'Bogotá';
  cityOptions = ['Bogotá', 'Medellín', 'Cali'];
  stopTypeOptions = ['PICKUP', 'DELIVERY', 'STOP'];

  cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
    'Bogotá': { lat: 4.6097, lng: -74.0817 },
    'Medellín': { lat: 6.2442, lng: -75.5812 },
    'Cali': { lat: 3.4516, lng: -76.5320 }
  };

  addressSearchResults: GeocodingResult[] = [];
  isSearchingAddress = false;
  showAddressResults = false;
  isCalculatingRoute = false;

  ngOnInit() {
    this.loadOptions();

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
    this.routeBorderLayer = null;
  }

  // ===== BÚSQUEDA DE DIRECCIONES =====
  onAddressInput(address: string) {
    if (address.length < 3) {
      this.showAddressResults = false;
      this.addressSearchResults = [];
      return;
    }

    this.isSearchingAddress = true;
    this.geocodingService.searchAddress(address, this.formData.city).subscribe({
      next: (results: GeocodingResult[]) => {
        this.addressSearchResults = results.slice(0, 5);
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
    if (result.address.suburb) return result.address.suburb;
    if (result.address.city) return result.address.city;
    return '';
  }

  // ===== CARGAR DATOS =====
  private loadOptions() {
    this.routeService.getAvailableDrivers().subscribe({
      next: (drivers: any[]) => {
        if (drivers && drivers.length > 0) {
          // ✅ FILTRAR NULOS Y VALIDAR
          this.driverObjects = drivers.filter(driver => driver && driver.id && driver.nombre && driver.apellido);
          this.driverOptions = this.driverObjects.map(driver =>
            `${driver.nombre} ${driver.apellido} - ${driver.licencia}`
          );
          if (!this.isEditMode && this.driverOptions.length > 0) {
            this.formData.driver = this.driverOptions[0];
            this.selectedDriver = this.driverObjects[0];
          }
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error cargando conductores:', error);
        this.driverObjects = [];
        this.driverOptions = [];
      }
    });

    this.routeService.getAvailableVehicles().subscribe({
      next: (vehicles: any[]) => {
        if (vehicles && vehicles.length > 0) {
          // ✅ FILTRAR NULOS Y VALIDAR
          this.vehicleObjects = vehicles.filter(vehicle => vehicle && vehicle.id && vehicle.placa);
          this.vehicleOptions = this.vehicleObjects.map(vehicle =>
            `${vehicle.placa} - ${vehicle.marca} ${vehicle.modelo}`
          );
          if (!this.isEditMode && this.vehicleOptions.length > 0) {
            this.formData.vehicle = this.vehicleOptions[0];
            this.selectedVehicle = this.vehicleObjects[0];
          }
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error cargando vehículos:', error);
        this.vehicleObjects = [];
        this.vehicleOptions = [];
      }
    });
  }

  private loadRouteData() {
    if (!this.routeId) return;

    this.loading = true;
    this.routeService.getRouteById(this.routeId).subscribe({
      next: (routeData: any) => {
        if (routeData) {
          this.mapRouteData(routeData);
          this.loadRouteStops();
        }
      }
    });
  }

  private loadRouteStops() {
    if (!this.routeId) return;

    this.routeService.getRouteStops(this.routeId).subscribe({
      next: (stopsData: any[]) => {
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
      }
    });
  }

  private mapRouteData(routeData: any) {
    let driverText = '';
    if (routeData.driverId && this.driverObjects.length > 0) {
      // ✅ VALIDACIÓN SEGURA CON FILTRO DE NULOS
      const driver = this.driverObjects.find(d => d && d.id === routeData.driverId);
      if (driver) {
        driverText = `${driver.nombre} ${driver.apellido} - ${driver.licencia}`;
      }
    }

    let vehicleText = '';
    if (routeData.vehicle && this.vehicleObjects.length > 0) {
      // ✅ VALIDACIÓN SEGURA CON FILTRO DE NULOS
      const vehicle = this.vehicleObjects.find(v => v && v.placa === routeData.vehicle);
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

  // ===== MAPA =====
  private initializeMapWithRetry(attempt = 0) {
    const maxAttempts = 10;

    if (this.map) {
      this.mapInitialized = true;
      return;
    }

    if (attempt >= maxAttempts) {
      console.error('❌ No se pudo inicializar el mapa después de', maxAttempts, 'intentos');
      return;
    }

    try {
      const mapContainer = document.getElementById('route-map');

      if (!mapContainer) {
        console.warn(`Intento ${attempt + 1}: Contenedor del mapa no encontrado`);
        setTimeout(() => this.initializeMapWithRetry(attempt + 1), 500);
        return;
      }

      const style = window.getComputedStyle(mapContainer);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
      const hasDimensions = mapContainer.offsetWidth > 0 && mapContainer.offsetHeight > 0;

      if (!isVisible || !hasDimensions) {
        console.warn(`Intento ${attempt + 1}: Contenedor no visible o sin dimensiones`);
        setTimeout(() => this.initializeMapWithRetry(attempt + 1), attempt < 3 ? 300 : 1000);
        return;
      }

      console.log(`✅ Inicializando mapa en intento ${attempt + 1}`);
      this.initMap();
      this.mapInitialized = true;

    } catch (error) {
      console.error(`Error en intento ${attempt + 1} inicializando mapa:`, error);
      setTimeout(() => this.initializeMapWithRetry(attempt + 1), 1000);
    }
  }

  private initMap() {
    if (this.map) return;

    const defaultCity = this.formData.city || 'Bogotá';
    const coordinates = this.cityCoordinates[defaultCity];

    const container = document.getElementById('route-map');
    if (!container) throw new Error('Contenedor del mapa no encontrado');

    (container as any)._leaflet_id = undefined;

    this.map = L.map('route-map', {
      center: [coordinates.lat, coordinates.lng],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true,
      touchZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 3
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.onMapClick(e);
    });

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        console.log('✅ Mapa inicializado correctamente');
      }
    }, 100);

    if (this.formData.stops.length > 0) {
      setTimeout(() => {
        this.drawStops();
        this.drawRoute();
      }, 200);
    }
  }

  private initializeMapWithData() {
    if (!this.mapInitialized) {
      this.initializeMapWithRetry();
    } else {
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          this.drawStops();
          this.drawRoute();
        }
      }, 100);
    }
  }

  async onMapClick(e: L.LeafletMouseEvent) {
    Swal.fire({
      title: '📍 Obteniendo Dirección',
      text: 'Buscando la dirección...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const result = await this.geocodingService.reverseGeocode(e.latlng.lat, e.latlng.lng).toPromise();

      Swal.close();

      if (result) {
        this.currentStop.latitude = parseFloat(result.lat);
        this.currentStop.longitude = parseFloat(result.lon);
        this.currentStop.address = result.display_name;

        if (!this.currentStop.name) {
          const nameFromAddress = this.extractLocationName(result);
          if (nameFromAddress) this.currentStop.name = nameFromAddress;
        }

        this.addTemporaryMarker(e.latlng);
        this.cdr.detectChanges();

        await Swal.fire({
          title: '✅ Ubicación Obtenida',
          html: `<p><strong>Dirección:</strong> ${result.display_name}</p>`,
          icon: 'success'
        });
      }
    } catch (error) {
      Swal.close();
      this.currentStop.latitude = e.latlng.lat;
      this.currentStop.longitude = e.latlng.lng;
      this.addTemporaryMarker(e.latlng);
      this.cdr.detectChanges();

      await Swal.fire({
        title: '📍 Ubicación Seleccionada',
        html: `<p>Por favor ingresa la dirección manualmente.</p>`,
        icon: 'info'
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
          <button onclick="window.angularComponent?.editStop(${index})">✏️ Editar</button>
          <button onclick="window.angularComponent?.removeStop(${index})">🗑️ Eliminar</button>
        </div>
      `);

      this.markers.push(marker);
    });
  }

  private drawRoute() {
    if (!this.map) return;

    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }
    if (this.routeBorderLayer) {
      this.map.removeLayer(this.routeBorderLayer);
      this.routeBorderLayer = null;
    }

    if (this.formData.stops.length < 2) return;

    console.log('🗺️ Calculando ruta real con OSRM...');

    Swal.fire({
      title: '🗺️ Calculando Ruta',
      text: 'Obteniendo la mejor ruta por las calles...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const waypoints: [number, number][] = this.formData.stops.map(stop =>
      [stop.latitude, stop.longitude]
    );

    this.routingService.getRealRoute(waypoints).subscribe({
      next: (realRoute) => {
        Swal.close();

        if (!realRoute || !this.map) {
          console.warn('⚠️ No se pudo obtener ruta, usando línea directa');
          this.drawStraightRoute();
          return;
        }

        this.routeBorderLayer = L.polyline(realRoute.coordinates, {
          color: '#ffffff',
          weight: 10,
          opacity: 0.5,
          smoothFactor: 1,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(this.map!);

        this.routeLayer = L.polyline(realRoute.coordinates, {
          color: '#667eea',
          weight: 6,
          opacity: 0.9,
          smoothFactor: 1,
          lineJoin: 'round',
          lineCap: 'round',
          dashArray: '10, 5'
        }).addTo(this.map!);

        let offset = 0;
        const animateRoute = () => {
          if (!this.routeLayer) return;
          offset = (offset + 1) % 15;
          this.routeLayer.setStyle({ dashOffset: String(offset) });
          requestAnimationFrame(animateRoute);
        };
        animateRoute();

        this.formData.distance = parseFloat((realRoute.distance / 1000).toFixed(2));
        this.formData.estimatedDuration = this.routingService.formatDuration(realRoute.duration);

        const bounds = L.latLngBounds(realRoute.coordinates);
        this.map!.fitBounds(bounds, { padding: [50, 50] });

        console.log(`✅ Ruta real: ${this.formData.distance} km, ${this.formData.estimatedDuration}`);

        Swal.fire({
          title: '✅ Ruta Calculada',
          html: `
            <p><strong>Distancia:</strong> ${this.formData.distance} km</p>
            <p><strong>Tiempo estimado:</strong> ${this.formData.estimatedDuration}</p>
            <p><strong>Puntos de ruta:</strong> ${realRoute.coordinates.length}</p>
            <p style="color: #10b981; margin-top: 12px;">
              ✨ Ruta optimizada siguiendo calles reales
            </p>
          `,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error calculando ruta:', error);
        Swal.close();
        this.drawStraightRoute();

        Swal.fire({
          title: '⚠️ Usando Ruta Aproximada',
          text: 'No se pudo calcular la ruta por calles. Se usará una aproximación.',
          icon: 'warning',
          timer: 2000
        });
      }
    });
  }

  private drawStraightRoute() {
    if (!this.map) return;

    const coordinates: L.LatLngExpression[] = this.formData.stops.map(stop =>
      [stop.latitude, stop.longitude] as L.LatLngExpression
    );

    this.routeLayer = L.polyline(coordinates, {
      color: '#f59e0b',
      weight: 5,
      opacity: 0.7,
      dashArray: '10, 10',
      lineJoin: 'round'
    }).addTo(this.map);

    this.calculateRouteDistance();
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

  // ===== GESTIÓN DE PARADAS =====
  async addStop() {
    if (!this.isCurrentStopValid()) {
      Swal.fire('Error', 'Completa todos los campos', 'error');
      return;
    }

    await this.ensureMapInitialized();

    this.currentStop.stopOrder = this.formData.stops.length + 1;
    this.formData.stops.push({ ...this.currentStop });

    this.drawStops();
    this.drawRoute();
    this.resetCurrentStop();

    Swal.fire('✅', 'Parada agregada', 'success');
    this.cdr.detectChanges();
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
    }
  }

  updateStop() {
    if (this.editingStopIndex !== null) {
      this.formData.stops[this.editingStopIndex] = { ...this.currentStop };
      this.drawStops();
      this.drawRoute();
      this.resetCurrentStop();
      Swal.fire('✅', 'Parada actualizada', 'success');
      this.cdr.detectChanges();
    }
  }

  removeStop(index: number) {
    Swal.fire({
      title: '¿Eliminar parada?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        this.formData.stops.splice(index, 1);

        if (this.editingStopIndex === index) {
          this.resetCurrentStop();
        }

        this.formData.stops.forEach((stop, idx) => {
          stop.stopOrder = idx + 1;
        });

        await this.ensureMapInitialized();
        this.drawStops();
        this.drawRoute();

        Swal.fire('✅', 'Parada eliminada', 'success');
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

  async clearStops() {
    if (this.formData.stops.length === 0) return;

    Swal.fire({
      title: '¿Eliminar todas las paradas?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar todas'
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
        if (this.routeBorderLayer && this.map) {
          this.map.removeLayer(this.routeBorderLayer);
          this.routeBorderLayer = null;
        }

        Swal.fire('✅', 'Todas las paradas eliminadas', 'success');
        this.cdr.detectChanges();
      }
    });
  }

  clearForm() {
    this.formData = {
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
    this.selectedDriver = null;
    this.selectedVehicle = null;
    this.currentStop = {
      name: '',
      address: '',
      latitude: 0,
      longitude: 0,
      type: 'DELIVERY',
      stopOrder: 0
    };
    this.clearTemporaryMarkers();
    this.cdr.detectChanges();
  }

  // ===== HELPERS =====
  isFormValid(): boolean {
    // Verifica que formData esté definido
    if (!this.formData) return false;

    // Verifica que driver sea un string antes de usar .trim()
    const driverValue = this.formData.driver;
    const driverIsValid = typeof driverValue === 'string' && driverValue.trim().length > 0;

    // Verifica otros campos
    const nameIsValid = !!this.formData.name?.trim();
    const vehicleIsValid = !!this.formData.vehicle?.trim();
    const cityIsValid = !!this.formData.city?.trim();

    // Verifica paradas
    const stopsAreValid = this.formData.stops.length > 0;

    return nameIsValid && vehicleIsValid && cityIsValid && driverIsValid && stopsAreValid;
  }

  isCurrentStopValid(): boolean {
    return !!this.currentStop.name?.trim() &&
           !!this.currentStop.address?.trim() &&
           this.currentStop.latitude !== 0 &&
           this.currentStop.longitude !== 0;
  }

  isEditingStop(): boolean {
    return this.editingStopIndex !== null;
  }

  getStopTypeText(type: string): string {
    switch (type) {
      case 'PICKUP': return 'Recogida';
      case 'DELIVERY': return 'Entrega';
      case 'STOP': return 'Parada';
      default: return type;
    }
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

  onFormChange(): void {
    // ✅ VALIDACIÓN SEGURA: Verificar que los arrays no estén vacíos y filtrar nulos
    if (this.formData.driver && this.driverObjects.length > 0) {
      this.selectedDriver = this.driverObjects
        .filter(driver => driver && driver.id) // Filtrar nulos primero
        .find(driver =>
          `${driver.nombre} ${driver.apellido} - ${driver.licencia}` === this.formData.driver
        ) || null;
    } else {
      this.selectedDriver = null;
    }

    if (this.formData.vehicle && this.vehicleObjects.length > 0) {
      this.selectedVehicle = this.vehicleObjects
        .filter(vehicle => vehicle && vehicle.id) // Filtrar nulos primero
        .find(vehicle =>
          `${vehicle.placa} - ${vehicle.marca} ${vehicle.modelo}` === this.formData.vehicle
        ) || null;
    } else {
      this.selectedVehicle = null;
    }

    // Check real-time availability when selections change
    this.checkRealTimeAvailability();

    this.cdr.detectChanges();
  }

  onStopFormChange(): void {
    this.cdr.detectChanges();
  }

  // ===== ASIGNAR RUTA Y COMENZAR RECORRIDO =====
  assignRouteAndStart() {
    if (!this.selectedDriver || !this.selectedVehicle || this.formData.stops.length < 2) {
      Swal.fire('Error', 'Selecciona conductor, vehículo y agrega al menos 2 paradas', 'warning');
      return;
    }

    this.isCalculatingRoute = true;
    console.log('🚀 Asignando ruta y comenzando recorrido...');

    Swal.fire({
      title: 'Asignando Ruta...',
      text: 'Preparando vehículo y conductor',
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => Swal.showLoading()
    });

    const routeData = {
      name: this.formData.name || `Ruta ${new Date().toLocaleDateString()}`,
      driverId: this.selectedDriver.id,
      vehicle: this.selectedVehicle.placa,
      city: this.formData.city,
      distance: this.formData.distance,
      estimatedDuration: this.formData.estimatedDuration || this.calculateDuration(),
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

    console.log('📤 Enviando datos de ruta:', routeData);

    this.routeService.createRoute(routeData).subscribe({
      next: (createdRoute) => {
        console.log('✅ Ruta creada:', createdRoute);

        this.realtimeService.assignRouteToVehicle(
          createdRoute.id,
          this.selectedVehicle!.id,
          this.selectedDriver!.id,
          this.formData.stops
        ).subscribe({
          next: (optimizedRoute) => {
            console.log('✅ Ruta asignada en tiempo real:', optimizedRoute);

            this.realtimeService.startRoute(createdRoute.id).subscribe({
              next: (started) => {
                Swal.close();

                if (started) {
                  this.isCalculatingRoute = false;
                  Swal.fire({
                    title: '¡Ruta Iniciada! 🚀',
                    html: `
                      <div style="text-align: left;">
                        <p><strong>Conductor:</strong> ${this.selectedDriver?.nombre} ${this.selectedDriver?.apellido}</p>
                        <p><strong>Vehículo:</strong> ${this.selectedVehicle?.placa}</p>
                        <p><strong>Paradas:</strong> ${this.formData.stops.length}</p>
                        <p><strong>Estado:</strong> <span style="color: #22c55e;">EN RUTA 🚗</span></p>
                        <p><strong>El conductor y vehículo ya no están disponibles</strong></p>
                      </div>
                    `,
                    icon: 'success',
                    confirmButtonText: 'Ver en Dashboard'
                  }).then((result) => {
                    if (result.isConfirmed) {
                      this.router.navigate(['/dashboard']);
                    }
                  });

                  this.clearForm();
                } else {
                  this.isCalculatingRoute = false;
                  Swal.fire('Error', 'No se pudo iniciar la ruta', 'error');
                }
              },
              error: (error) => {
                this.isCalculatingRoute = false;
                Swal.close();
                console.error('❌ Error iniciando ruta:', error);
                Swal.fire('Error', `No se pudo iniciar la ruta: ${error.message || 'Error desconocido'}`, 'error');
              }
            });
          },
          error: (error) => {
            this.isCalculatingRoute = false;
            Swal.close();
            console.error('❌ Error asignando ruta:', error);
            Swal.fire('Error', `No se pudo asignar la ruta: ${error.message || 'Error desconocido'}`, 'error');
          }
        });
      },
      error: (error) => {
        this.isCalculatingRoute = false;
        Swal.close();
        console.error('❌ Error creando ruta:', error);

        let errorMessage = 'No se pudo crear la ruta';
        if (error.error && typeof error.error === 'object') {
          errorMessage += ': ' + JSON.stringify(error.error);
        } else if (error.error) {
          errorMessage += ': ' + error.error;
        } else if (error.message) {
          errorMessage += ': ' + error.message;
        }

        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  // ===== VERIFICAR DISPONIBILIDAD EN TIEMPO REAL =====
  checkRealTimeAvailability() {
    if (this.selectedDriver && this.selectedVehicle) {
      this.realtimeService.getVehiclePositions().subscribe({
        next: (positions) => {
          // ✅ VALIDACIÓN SEGURA: Verificar que positions no sea null y filtrar valores nulos
          if (!positions) {
            console.warn('⚠️ No se recibieron posiciones de vehículos');
            return;
          }

          const positionsArray = Array.from(positions.values()).filter(v => v && v.vehicleId && v.driverId);

          const driverVehicle = positionsArray.find(
            v => v.driverId === this.selectedDriver!.id || v.vehicleId === this.selectedVehicle!.id
          );

          if (driverVehicle && driverVehicle.status === 'BUSY') {
            Swal.fire({
              title: '¡No Disponible! 🚫',
              html: `
                <div style="text-align: left;">
                  <p><strong>El conductor/vehículo seleccionado ya está en ruta:</strong></p>
                  <p>• Conductor: ${driverVehicle.driverName || 'N/A'}</p>
                  <p>• Estado: <span style="color: #f59e0b;">EN RUTA 🚗</span></p>
                  <p>• Ruta activa: ${driverVehicle.currentRouteId ? 'Sí' : 'No'}</p>
                  <p><strong>Selecciona otro conductor/vehículo disponible.</strong></p>
                </div>
              `,
              icon: 'warning'
            });

            this.selectedDriver = null;
            this.selectedVehicle = null;
            this.formData.driver = '';
            this.formData.vehicle = '';
            this.onFormChange();
          }
        },
        error: (error) => {
          console.error('❌ Error verificando disponibilidad:', error);
        }
      });
    }
  }

  // ===== SUBMIT =====
  async onSubmit() {
    if (!this.isFormValid()) {
      Swal.fire({
        title: '❌ Formulario incompleto',
        text: 'Completa todos los campos obligatorios y agrega al menos 1 parada',
        icon: 'error'
      });
      return;
    }

    this.loading = true;

    try {
      const routeData = this.prepareRouteData();

      if (this.isEditMode && this.routeId) {
        await this.updateRoute(routeData);
      } else {
        await this.createRoute(routeData);
      }
    } catch (error) {
      console.error('❌ Error guardando ruta:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo guardar la ruta',
        icon: 'error'
      });
    } finally {
      this.loading = false;
    }
  }

  private prepareRouteData() {
    const driverId = this.getSelectedDriverId();
    const vehicle = this.getSelectedVehicle();

    return {
      name: this.formData.name,
      driverId: driverId,
      vehicle: vehicle,
      city: this.formData.city,
      distance: this.formData.distance,
      estimatedDuration: this.formData.estimatedDuration || this.calculateDuration(),
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

  private getSelectedDriverId(): string {
    if (!this.formData.driver || this.driverObjects.length === 0) {
      return '';
    }

    // ✅ VALIDACIÓN SEGURA: Filtrar nulos antes de buscar
    const selectedDriver = this.driverObjects
      .filter(driver => driver && driver.id)
      .find(driver =>
        `${driver.nombre} ${driver.apellido} - ${driver.licencia}` === this.formData.driver
      );

    return selectedDriver ? selectedDriver.id : '';
  }

  private getSelectedVehicle(): string {
    if (!this.formData.vehicle || this.vehicleObjects.length === 0) {
      return this.formData.vehicle;
    }

    // ✅ VALIDACIÓN SEGURA: Filtrar nulos antes de buscar
    const selectedVehicle = this.vehicleObjects
      .filter(vehicle => vehicle && vehicle.placa)
      .find(vehicle =>
        `${vehicle.placa} - ${vehicle.marca} ${vehicle.modelo}` === this.formData.vehicle
      );

    return selectedVehicle ? selectedVehicle.placa : this.formData.vehicle;
  }

  private async createRoute(routeData: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.routeService.createRoute(routeData).subscribe({
        next: (result: any) => {
          console.log('✅ Ruta creada:', result);
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
      this.routeService.updateRoute(this.routeId!, routeData).subscribe({
        next: (result: any) => {
          console.log('✅ Ruta actualizada:', result);
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
      Swal.fire('Info', 'Agrega al menos 2 paradas para optimizar', 'info');
      return;
    }

    if (!this.routeId) {
      Swal.fire({
        title: '⚠️ Ruta no guardada',
        text: 'Primero debes guardar la ruta',
        icon: 'warning'
      });
      return;
    }

    Swal.fire({
      title: '🔧 Optimizando ruta...',
      text: 'Calculando la mejor secuencia...',
      icon: 'info',
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.routeService.optimizeRoute(this.routeId).subscribe({
      next: (optimizedRoute: any) => {
        console.log('✅ Ruta optimizada:', optimizedRoute);

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
              <li>Combustible: ${this.formData.fuelCost}</li>
              <li>${this.formData.stops.length} paradas reorganizadas</li>
            </ul>
          `,
          icon: 'success'
        });
      },
      error: (error: any) => {
        console.error('❌ Error optimizando:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo optimizar la ruta',
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
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Seguir editando'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/routes']);
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
    this.routeBorderLayer = null;
    this.mapInitialized = false;

    const container = document.getElementById('route-map');
    if (container) {
      (container as any)._leaflet_id = undefined;
      container.innerHTML = '';
    }

    setTimeout(() => {
      this.initializeMapWithRetry();
    }, 500);

    Swal.fire('🔄', 'Mapa reiniciado', 'info');
  }

  private ensureMapInitialized(): Promise<void> {
    return new Promise((resolve) => {
      if (this.map && this.mapInitialized) {
        resolve();
      } else {
        const checkMap = () => {
          if (this.map && this.mapInitialized) {
            resolve();
          } else {
            setTimeout(checkMap, 100);
          }
        };
        checkMap();
      }
    });
  }
}
