// report.service.ts - ✅ CORREGIDO SIN /api/api/

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Report {
  id: string;
  title: string;
  type: string;
  period: string;
  generatedDate: string;
  data: any;
}

export interface ReportRequest {
  type: string;
  period: string;
  title: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  // ✅ URL base SIN /api al final
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  /**
   * ✅ Obtener todos los reportes
   */
  getAllReports(): Observable<Report[]> {
    return this.http.get<Report[]>(`${this.apiUrl}/reports`);
  }

  /**
   * ✅ Generar nuevo reporte
   */
  generateReport(request: ReportRequest): Observable<Report> {
    return this.http.post<Report>(`${this.apiUrl}/reports/generate`, request);
  }

  /**
   * ✅ Descargar reporte como PDF
   */
  downloadReport(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/${id}/download`, {
      responseType: 'blob'
    });
  }

  /**
   * ✅ Compartir reporte por email
   */
  shareReport(id: string, email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/${id}/share`, { email });
  }

  /**
   * ✅ Eliminar reporte
   */
  deleteReport(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reports/${id}`);
  }

  /**
   * ✅ Obtener reporte por ID
   */
  getReportById(id: string): Observable<Report> {
    return this.http.get<Report>(`${this.apiUrl}/reports/${id}`);
  }

  /**
   * ✅ Obtener reportes por tipo
   */
  getReportsByType(type: string): Observable<Report[]> {
    return this.http.get<Report[]>(`${this.apiUrl}/reports/type/${type}`);
  }
}
