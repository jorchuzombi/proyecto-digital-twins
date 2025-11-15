import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Report {
  id: string;
  title: string;
  type: string;
  period: string;
  generatedDate: string;
  data: any;
  metrics?: any;
}

export interface GenerateReportRequest {
  type: string;
  period: string;
  title: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = 'http://localhost:8000/api/reports';

  constructor(private http: HttpClient) {}

  getAllReports(): Observable<Report[]> {
    return this.http.get<Report[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Error fetching reports:', error);
        return of([]); // Retorna array vacío en caso de error
      })
    );
  }

  getReportById(id: string): Observable<Report> {
    return this.http.get<Report>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error('Error fetching report:', error);
        throw error;
      })
    );
  }

  generateReport(request: GenerateReportRequest): Observable<Report> {
    return this.http.post<Report>(this.apiUrl, request).pipe(
      catchError(error => {
        console.error('Error generating report:', error);
        throw error;
      })
    );
  }

  downloadReport(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error downloading report:', error);
        throw error;
      })
    );
  }

  shareReport(id: string, shareData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/share`, shareData).pipe(
      catchError(error => {
        console.error('Error sharing report:', error);
        throw error;
      })
    );
  }

  deleteReport(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting report:', error);
        throw error;
      })
    );
  }
}
