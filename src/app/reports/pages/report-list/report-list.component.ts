// report-list.component.ts - ✅ CON DESCARGA REAL

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, Report } from '../../services/report.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-list.component.html',
  styleUrls: ['./report-list.component.scss']
})
export class ReportListComponent implements OnInit {
  reports: Report[] = [];
  loading = false;
  selectedReportType = 'all';

  // ✅ SIN REPORTE FINANCIERO
  reportTypes = [
    { value: 'all', label: 'Todos los Reportes' },
    { value: 'operational', label: 'Operacional' },
    { value: 'drivers', label: 'Conductores' },
    { value: 'vehicles', label: 'Vehículos' },
    { value: 'routes', label: 'Rutas' }
  ];

  constructor(private reportService: ReportService) {}

  ngOnInit() {
    this.loadReports();
  }

  loadReports() {
    this.loading = true;
    console.log('📊 Cargando reportes del backend...');

    this.reportService.getAllReports().subscribe({
      next: (reports) => {
        this.reports = reports;
        this.loading = false;
        console.log('✅ Reportes cargados:', reports);

        Swal.fire({
          title: '✅ Reportes Cargados',
          text: `${reports.length} reportes disponibles`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      },
      error: (error) => {
        console.error('❌ Error:', error);
        this.loading = false;

        Swal.fire({
          title: '❌ Error',
          text: 'No se pudieron cargar los reportes del backend',
          icon: 'error'
        });
      }
    });
  }

  get filteredReports() {
    if (this.selectedReportType === 'all') {
      return this.reports;
    }
    return this.reports.filter(report => report.type === this.selectedReportType);
  }

  getReportTypeBadge(type: string): string {
    const badges: any = {
      operational: 'badge-primary',
      drivers: 'badge-success',
      vehicles: 'badge-warning',
      routes: 'badge-info'
    };
    return badges[type] || 'badge-secondary';
  }

  getReportTypeText(type: string): string {
    const texts: any = {
      operational: 'Operacional',
      drivers: 'Conductores',
      vehicles: 'Vehículos',
      routes: 'Rutas'
    };
    return texts[type] || type;
  }

  getReportsByType(type: string): Report[] {
    return this.reports.filter(report => report.type === type);
  }

  onFilterChange() {
    console.log('Filtro:', this.selectedReportType);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getDataKeys(data: any): string[] {
    return data ? Object.keys(data) : [];
  }

  getDataLabel(key: string): string {
    const labels: { [key: string]: string } = {
      totalRoutes: 'Rutas Totales',
      completedRoutes: 'Completadas',
      activeRoutes: 'Activas',
      pendingRoutes: 'Pendientes',
      totalDrivers: 'Total Conductores',
      totalVehicles: 'Total Vehículos',
      totalStops: 'Paradas Totales',
      avgStopsPerRoute: 'Paradas/Ruta',
      completionRate: 'Tasa Completación',
      activeDrivers: 'Activos',
      availableDrivers: 'Disponibles',
      offlineDrivers: 'Offline',
      utilizationRate: 'Utilización',
      avgSpeed: 'Velocidad Promedio',
      driversInTransit: 'En Tránsito',
      activeVehicles: 'Vehículos Activos',
      availableVehicles: 'Disponibles',
      inMaintenance: 'Mantenimiento',
      vehiclesByType: 'Por Tipo',
      readyForUse: 'Listos',
      totalDistance: 'Distancia Total',
      avgDistancePerRoute: 'Distancia Promedio',
      successRate: 'Tasa de Éxito'
    };
    return labels[key] || key;
  }

  formatDataValue(value: any): string {
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }
    if (typeof value === 'number') {
      return value.toLocaleString('es-ES');
    }
    return value?.toString() || 'N/A';
  }

  async generateNewReport() {
    const { value: reportConfig } = await Swal.fire({
      title: '📊 Generar Reporte',
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600;">Tipo de Reporte</label>
          <select id="report-type" class="swal2-input">
            <option value="operational">Operacional</option>
            <option value="drivers">Conductores</option>
            <option value="vehicles">Vehículos</option>
            <option value="routes">Rutas</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Generar',
      preConfirm: () => {
        const type = (document.getElementById('report-type') as HTMLSelectElement).value;
        return { type, period: 'current' };
      }
    });

    if (reportConfig) {
      this.loading = true;

      const request = {
        type: reportConfig.type,
        period: reportConfig.period,
        title: `Reporte de ${this.getReportTypeText(reportConfig.type)}`
      };

      this.reportService.generateReport(request).subscribe({
        next: (newReport) => {
          this.reports.unshift(newReport);
          this.loading = false;

          Swal.fire({
            title: '✅ Generado',
            text: newReport.title,
            icon: 'success',
            confirmButtonText: 'Ver',
            showCancelButton: true
          }).then((result) => {
            if (result.isConfirmed) {
              this.viewReport(newReport);
            }
          });
        },
        error: (error) => {
          console.error('❌ Error:', error);
          this.loading = false;
          Swal.fire('❌ Error', 'No se pudo generar el reporte', 'error');
        }
      });
    }
  }

  viewReport(report: Report) {
    Swal.fire({
      title: report.title,
      html: `
        <div style="text-align: left; max-height: 500px; overflow-y: auto;">
          <div style="background: #3b82f6; color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 0;"><strong>📅 ${report.period}</strong></p>
            <p style="margin: 5px 0 0 0;">🕒 ${this.formatDate(report.generatedDate)}</p>
          </div>
          <div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 15px;">
            ${Object.entries(report.data).map(([key, value]) => `
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight: 500;">${this.getDataLabel(key)}:</span>
                <span style="font-weight: 700; color: #3b82f6;">${this.formatDataValue(value)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `,
      width: 700,
      confirmButtonText: 'Cerrar'
    });
  }

  /**
   * ✅ DESCARGA REAL DE PDF
   */
  downloadReport(report: Report) {
    console.log('📥 Descargando reporte:', report.id);

    Swal.fire({
      title: '📥 Descargando...',
      text: report.title,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.reportService.downloadReport(report.id).subscribe({
      next: (blob: Blob) => {
        console.log('✅ PDF recibido, tamaño:', blob.size);

        // Crear URL del blob
        const url = window.URL.createObjectURL(blob);

        // Crear elemento <a> temporal para descargar
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${report.type}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();

        // Limpiar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        Swal.fire({
          title: '✅ Descargado',
          text: 'El PDF se ha guardado en tu dispositivo',
          icon: 'success',
          timer: 2000
        });
      },
      error: (error) => {
        console.error('❌ Error descargando:', error);

        Swal.fire({
          title: '❌ Error',
          text: 'No se pudo descargar el PDF',
          icon: 'error'
        });
      }
    });
  }

  shareReport(report: Report) {
    Swal.fire({
      title: '📤 Compartir',
      html: '<input id="share-email" class="swal2-input" placeholder="Email">',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      preConfirm: () => {
        const email = (document.getElementById('share-email') as HTMLInputElement).value;
        if (!email) {
          Swal.showValidationMessage('Ingresa un email');
          return false;
        }
        return email;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.reportService.shareReport(report.id, result.value).subscribe({
          next: () => {
            Swal.fire('✅ Enviado', 'Reporte compartido', 'success');
          },
          error: () => {
            Swal.fire('❌ Error', 'No se pudo compartir', 'error');
          }
        });
      }
    });
  }

  deleteReport(report: Report) {
    Swal.fire({
      title: '¿Eliminar?',
      text: report.title,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.reportService.deleteReport(report.id).subscribe({
          next: () => {
            this.reports = this.reports.filter(r => r.id !== report.id);
            Swal.fire('✅ Eliminado', '', 'success');
          },
          error: () => {
            Swal.fire('❌ Error', 'No se pudo eliminar', 'error');
          }
        });
      }
    });
  }
}
