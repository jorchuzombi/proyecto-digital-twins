// src/app/services/routing.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface RouteStep {
  distance: number;
  duration: number;
  instruction: string;
  name: string;
}

export interface RealRoute {
  coordinates: [number, number][]; // [lat, lng] para Leaflet
  distance: number; // en metros
  duration: number; // en segundos
  steps: RouteStep[];
}

@Injectable({
  providedIn: 'root'
})
export class RoutingService {
  // OSRM es gratuito y no requiere API key
  private readonly OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';

  constructor(private http: HttpClient) {
    console.log('🛣️ RoutingService inicializado');
  }

  /**
   * Obtiene una ruta real entre múltiples puntos siguiendo las calles
   * @param waypoints Array de coordenadas [lat, lng]
   * @returns Observable con la ruta real
   */
  getRealRoute(waypoints: [number, number][]): Observable<RealRoute | null> {
    if (waypoints.length < 2) {
      console.warn('⚠️ Se necesitan al menos 2 puntos para calcular una ruta');
      return of(null);
    }

    // OSRM espera coordenadas en formato lng,lat (orden inverso)
    const coordinates = waypoints
      .map(point => `${point[1]},${point[0]}`)
      .join(';');

    // Construir URL con parámetros optimizados
    const url = `${this.OSRM_BASE_URL}/driving/${coordinates}`;
    const params = {
      overview: 'full',
      geometries: 'geojson',
      steps: 'true',
      alternatives: 'false'
    };

    console.log('🛣️ Solicitando ruta real a OSRM:', url);

    return this.http.get<any>(url, { params }).pipe(
      map(response => {
        if (response.code !== 'Ok' || !response.routes || response.routes.length === 0) {
          console.error('❌ OSRM no devolvió rutas válidas');
          return null;
        }

        const route = response.routes[0];

        // Convertir coordenadas GeoJSON [lng, lat] a formato Leaflet [lat, lng]
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]]
        );

        // Extraer pasos de navegación
        const steps: RouteStep[] = route.legs.flatMap((leg: any) =>
          leg.steps.map((step: any) => ({
            distance: step.distance,
            duration: step.duration,
            instruction: step.maneuver.type,
            name: step.name || 'Sin nombre'
          }))
        );

        const realRoute: RealRoute = {
          coordinates,
          distance: route.distance, // metros
          duration: route.duration, // segundos
          steps
        };

        console.log('✅ Ruta real obtenida:', {
          puntos: coordinates.length,
          distancia: `${(realRoute.distance / 1000).toFixed(2)} km`,
          duracion: `${Math.round(realRoute.duration / 60)} min`
        });

        return realRoute;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo ruta de OSRM:', error);
        return of(null);
      })
    );
  }

  /**
   * Calcula la distancia real entre dos puntos siguiendo las calles
   */
  getDistanceBetweenPoints(
    start: [number, number],
    end: [number, number]
  ): Observable<number> {
    return this.getRealRoute([start, end]).pipe(
      map(route => route ? route.distance / 1000 : 0) // convertir a km
    );
  }

  /**
   * Formatea la duración en texto legible
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Formatea la distancia en texto legible
   */
  formatDistance(meters: number): string {
    const km = meters / 1000;
    if (km >= 1) {
      return `${km.toFixed(1)} km`;
    }
    return `${meters.toFixed(0)} m`;
  }

  /**
   * Optimiza el orden de las paradas usando OSRM
   * (Requiere que el backend implemente el algoritmo TSP)
   */
  optimizeWaypoints(
    waypoints: [number, number][]
  ): Observable<{ order: number[]; distance: number }> {
    // Por ahora retornamos el orden original
    // En producción, esto debe conectarse con tu backend
    console.log('⚠️ La optimización debe implementarse en el backend');
    return of({
      order: waypoints.map((_, i) => i),
      distance: 0
    });
  }
}
