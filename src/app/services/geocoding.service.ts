// src/app/services/geocoding.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';

export interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  type?: string;
  importance?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  // ✅ Usar TU backend Spring Boot en puerto 8000
 private readonly GEOCODING_URL = 'http://localhost:8000/api/geocoding';

  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000;

  constructor(private http: HttpClient) {
    console.log('🌍 Geocoding Service inicializado - Backend Spring Boot');
  }

  /**
   * 🔍 Buscar direcciones mientras el usuario escribe
   */
  searchAddress(query: string, city: string = ''): Observable<GeocodingResult[]> {
    if (!query || query.length < 3) {
      return of([]);
    }

    return new Observable(observer => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const delay = Math.max(0, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);

      setTimeout(() => {
        this.lastRequestTime = Date.now();

        const searchQuery = city ? `${query}, ${city}` : query;

        console.log('🔍 Buscando dirección via Backend Spring Boot:', searchQuery);

        this.http.get<GeocodingResult[]>(
          `${this.GEOCODING_URL}/search`,
          {
            params: {
              q: searchQuery
            }
          }
        ).pipe(
          timeout(15000),
          map(results => {
            console.log('✅ Resultados REALES encontrados:', results?.length || 0);
            return results || [];
          }),
          catchError(error => {
            console.error('❌ Error en búsqueda de direcciones:', error);
            return of([]);
          })
        ).subscribe({
          next: (results) => {
            observer.next(results);
            observer.complete();
          },
          error: (error) => {
            console.error('❌ Error en observable:', error);
            observer.next([]);
            observer.complete();
          }
        });
      }, delay);
    });
  }

  /**
   * 📍 Obtener dirección desde coordenadas (Reverse Geocoding)
   */
  reverseGeocode(lat: number, lon: number): Observable<GeocodingResult | null> {
    return new Observable(observer => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const delay = Math.max(0, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);

      setTimeout(() => {
        this.lastRequestTime = Date.now();

        console.log('📍 Geocodificación inversa via Backend Spring Boot:', { lat, lon });

        this.http.get<GeocodingResult>(
          `${this.GEOCODING_URL}/reverse`,
          {
            params: {
              lat: lat.toString(),
              lon: lon.toString()
            }
          }
        ).pipe(
          timeout(15000),
          map(result => {
            console.log('✅ Dirección REAL obtenida:', result?.display_name);
            return result;
          }),
          catchError(error => {
            console.error('❌ Error en geocodificación inversa:', error);
            return of(null);
          })
        ).subscribe({
          next: (result) => {
            observer.next(result);
            observer.complete();
          },
          error: (error) => {
            console.error('❌ Error en observable reverse:', error);
            observer.next(null);
            observer.complete();
          }
        });
      }, delay);
    });
  }

  /**
   * ✅ Validar que una dirección existe en el mapa
   */
  validateAddress(address: string, city: string): Observable<boolean> {
    return this.searchAddress(address, city).pipe(
      map(results => {
        const isValid = results.length > 0;
        console.log(`✅ Validación de dirección "${address}":`, isValid);
        return isValid;
      }),
      catchError(() => of(false))
    );
  }

  /**
   * 📊 Obtener la mejor coincidencia para una dirección
   */
  getBestMatch(address: string, city: string): Observable<GeocodingResult | null> {
    return this.searchAddress(address, city).pipe(
      map(results => {
        if (results.length === 0) return null;

        const sortedResults = results.sort((a, b) =>
          (b.importance || 0) - (a.importance || 0)
        );

        return sortedResults[0];
      }),
      catchError(() => of(null))
    );
  }

  /**
   * 🧪 Probar conexión con la API
   */
  testConnection(): Observable<boolean> {
    console.log('🧪 Probando conexión con Backend Spring Boot...');

    return this.http.get<GeocodingResult[]>(
      `${this.GEOCODING_URL}/search`,
      {
        params: {
          q: 'Bogotá, Colombia'
        }
      }
    ).pipe(
      timeout(10000),
      map(results => {
        const connected = results && results.length > 0;
        console.log('✅ Conexión exitosa con Backend:', connected);
        return connected;
      }),
      catchError(error => {
        console.error('❌ Error de conexión con Backend:', error);
        return of(false);
      })
    );
  }
}
