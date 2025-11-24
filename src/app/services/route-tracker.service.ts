// src/app/services/route-tracker.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import * as L from 'leaflet';

export interface RouteTracking {
  routeId: string;
  vehicleId: string;
  driverId: string;
  driverName: string;
  routePath: L.LatLng[];
  stops: any[];
  currentPathIndex: number;
  totalPoints: number;
  progressPercentage: number;
  currentStopIndex: number;
  isActive: boolean;
  startTime: Date;
  speed: number;
}

@Injectable({
  providedIn: 'root'
})
export class RouteTrackerService {
  private activeTracking = new Map<string, RouteTracking>();
  private trackingSubject = new BehaviorSubject<Map<string, RouteTracking>>(new Map());
  private updateSubscription?: Subscription;
  private readonly UPDATE_INTERVAL = 2000; // Actualizar cada 2 segundos

  constructor() {
    console.log('🎯 RouteTrackerService inicializado');
  }

  /**
   * Iniciar seguimiento de una ruta real
   */
  startTrackingRoute(
    routeId: string,
    vehicleId: string,
    driverId: string,
    driverName: string,
    routePath: L.LatLng[],
    stops: any[],
    speed: number = 40
  ): void {
    if (this.activeTracking.has(routeId)) {
      console.warn(`⚠️ La ruta ${routeId} ya está siendo rastreada`);
      return;
    }

    if (routePath.length < 2) {
      console.error('❌ La ruta debe tener al menos 2 puntos');
      return;
    }

    const tracking: RouteTracking = {
      routeId,
      vehicleId,
      driverId,
      driverName,
      routePath,
      stops,
      currentPathIndex: 0,
      totalPoints: routePath.length,
      progressPercentage: 0,
      currentStopIndex: 0,
      isActive: true,
      startTime: new Date(),
      speed
    };

    this.activeTracking.set(routeId, tracking);
    console.log(`✅ Seguimiento iniciado para ruta ${routeId} - Vehículo ${vehicleId}`);

    // Si es el primer tracking, iniciar el loop de actualización
    if (this.activeTracking.size === 1) {
      this.startUpdateLoop();
    }

    // Emitir actualización inmediata
    this.emitUpdate();
  }

  /**
   * Detener seguimiento de una ruta
   */
  stopTrackingRoute(routeId: string): void {
    const tracking = this.activeTracking.get(routeId);
    if (tracking) {
      tracking.isActive = false;
      this.activeTracking.delete(routeId);
      console.log(`🛑 Seguimiento detenido para ruta ${routeId}`);
      this.emitUpdate();

      // Si no hay más trackings activos, detener el loop
      if (this.activeTracking.size === 0) {
        this.stopUpdateLoop();
      }
    }
  }

  /**
   * Detener todos los seguimientos
   */
  stopAllTracking(): void {
    console.log('🛑 Deteniendo todos los seguimientos...');
    this.activeTracking.clear();
    this.stopUpdateLoop();
    this.emitUpdate();
  }

  /**
   * Obtener seguimientos activos como observable
   */
  getActiveTracking() {
    return this.trackingSubject.asObservable();
  }

  /**
   * Obtener un tracking específico
   */
  getTracking(routeId: string): RouteTracking | undefined {
    return this.activeTracking.get(routeId);
  }

  /**
   * Verificar si una ruta está siendo rastreada
   */
  isRouteTracked(routeId: string): boolean {
    return this.activeTracking.has(routeId);
  }

  /**
   * Iniciar loop de actualización
   */
  private startUpdateLoop(): void {
    if (this.updateSubscription) {
      return; // Ya está corriendo
    }

    console.log('🔄 Iniciando loop de actualización de rutas');
    this.updateSubscription = interval(this.UPDATE_INTERVAL).subscribe(() => {
      this.updateAllTracking();
    });
  }

  /**
   * Detener loop de actualización
   */
  private stopUpdateLoop(): void {
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
      this.updateSubscription = undefined;
      console.log('⏸️ Loop de actualización detenido');
    }
  }

  /**
   * Actualizar todos los seguimientos activos
   */
  private updateAllTracking(): void {
    let hasUpdates = false;

    this.activeTracking.forEach((tracking, routeId) => {
      if (!tracking.isActive) {
        return;
      }

      // Avanzar al siguiente punto en la ruta
      if (tracking.currentPathIndex < tracking.totalPoints - 1) {
        tracking.currentPathIndex++;

        // Calcular progreso
        tracking.progressPercentage = (tracking.currentPathIndex / (tracking.totalPoints - 1)) * 100;

        // Actualizar índice de parada actual
        const currentPosition = tracking.routePath[tracking.currentPathIndex];
        tracking.currentStopIndex = this.findCurrentStopIndex(currentPosition, tracking.stops);

        hasUpdates = true;
      } else {
        // La ruta ha sido completada
        console.log(`🏁 Ruta ${routeId} completada`);
        tracking.isActive = false;
        this.activeTracking.delete(routeId);
        hasUpdates = true;
      }
    });

    // Emitir actualización solo si hubo cambios
    if (hasUpdates) {
      this.emitUpdate();
    }
  }

  /**
   * Encontrar el índice de la parada más cercana
   */
  private findCurrentStopIndex(currentPos: L.LatLng, stops: any[]): number {
    let minDistance = Infinity;
    let closestIndex = 0;

    stops.forEach((stop, index) => {
      const stopPos = L.latLng(stop.latitude, stop.longitude);
      const distance = currentPos.distanceTo(stopPos);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  /**
   * Emitir actualización a los suscriptores
   */
  private emitUpdate(): void {
    this.trackingSubject.next(new Map(this.activeTracking));
  }

  /**
   * Obtener posición actual de un vehículo en una ruta
   */
  getCurrentPosition(routeId: string): L.LatLng | null {
    const tracking = this.activeTracking.get(routeId);
    if (!tracking || !tracking.isActive) {
      return null;
    }

    return tracking.routePath[tracking.currentPathIndex];
  }

  /**
   * Obtener información resumida de todas las rutas activas
   */
  getTrackingSummary(): Array<{
    routeId: string;
    vehicleId: string;
    driverName: string;
    progress: number;
    currentStop: number;
    totalStops: number;
    isActive: boolean;
  }> {
    const summary: Array<any> = [];

    this.activeTracking.forEach((tracking) => {
      summary.push({
        routeId: tracking.routeId,
        vehicleId: tracking.vehicleId,
        driverName: tracking.driverName,
        progress: tracking.progressPercentage,
        currentStop: tracking.currentStopIndex + 1,
        totalStops: tracking.stops.length,
        isActive: tracking.isActive
      });
    });

    return summary;
  }
}
