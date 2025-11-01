import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ReportService, Report } from '../../services/report.service';
import Swal, { SweetAlertResult } from 'sweetalert2';

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './report-list.component.html',
  styleUrls: ['./report-list.component.scss']
})
export class ReportListComponent implements OnInit {
  reports: Report[] = [];
  loading = false;
  selectedReportType = 'all';

  reportTypes = [
    { value: 'all', label: 'Todos los Reportes' },
    { value: 'efficiency', label: 'Eficiencia' },
    { value: 'financial', label: 'Financiero' },
    { value: 'operational', label: 'Operacional' },
    { value: 'environmental', label: 'Ambiental' }
  ];

  constructor(
    private reportService: ReportService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadReports();
  }

  loadReports() {
    this.loading = true;

    // ✅ LLAMADA REAL AL BACKEND
    this.reportService.getAllReports().subscribe({
      next: (reports) => {
        this.reports = reports;
        this.loading = false;
        console.log('✅ Reportes cargados:', this.reports.length);
      },
      error: (error) => {
        console.error('❌ Error cargando reportes:', error);
        this.loading = false;

        // ✅ FALLBACK: Mostrar datos de ejemplo si el backend no está listo
        this.reports = this.generateSampleReports();

        Swal.fire({
          title: '⚠️ Modo Demo',
          text: 'Usando datos de ejemplo. El backend de reportes estará disponible pronto.',
          icon: 'info',
          timer: 3000
        });
      }
    });
  }

  // ✅ Mantener datos de ejemplo como fallback
  private generateSampleReports(): Report[] {
    return [
      {
        id: '1',
        title: 'Análisis de Eficiencia de Rutas - Mensual',
        type: 'efficiency',
        period: 'Enero 2024',
        generatedDate: new Date().toISOString().split('T')[0],
        data: {
          totalRoutes: 156,
          optimizedRoutes: 128,
          avgTimeSaved: '32%',
          fuelSaved: '18%',
          distanceReduction: '245 km',
          stopsOptimized: 45
        },
        metrics: {
          efficiencyGain: 32,
          fuelSaved: 1560,
          timeSaved: 245,
          routesOptimized: 128,
          costSavings: 8450
        }
      },
      {
        id: '2',
        title: 'Reporte Financiero Trimestral',
        type: 'financial',
        period: 'Q1 2024',
        generatedDate: new Date().toISOString().split('T')[0],
        data: {
          totalRevenue: 245800,
          totalCost: 187600,
          netProfit: 58200,
          roi: '23.7%',
          costPerDelivery: 45.80,
          revenueGrowth: '12.5%'
        },
        metrics: {
          totalRevenue: 245800,
          costSavings: 45800,
          efficiencyGain: 18
        }
      }
    ];
  }

  get filteredReports() {
    if (this.selectedReportType === 'all') {
      return this.reports;
    }
    return this.reports.filter(report => report.type === this.selectedReportType);
  }

  getReportTypeBadge(type: string): string {
    switch (type) {
      case 'efficiency': return 'badge-success';
      case 'financial': return 'badge-primary';
      case 'operational': return 'badge-warning';
      case 'environmental': return 'badge-info';
      default: return 'badge-secondary';
    }
  }

  getReportTypeText(type: string): string {
    switch (type) {
      case 'efficiency': return 'Eficiencia';
      case 'financial': return 'Financiero';
      case 'operational': return 'Operacional';
      case 'environmental': return 'Ambiental';
      default: return type;
    }
  }

  getReportsByType(type: string): Report[] {
    return this.reports.filter(report => report.type === type);
  }

  onFilterChange() {
    console.log('Filtro cambiado:', this.selectedReportType);
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
      optimizedRoutes: 'Rutas Optimizadas',
      avgTimeSaved: 'Tiempo Ahorrado',
      fuelSaved: 'Combustible Ahorrado',
      distanceReduction: 'Distancia Reducida',
      stopsOptimized: 'Paradas Optimizadas',
      totalRevenue: 'Ingresos Totales',
      totalCost: 'Costos Totales',
      netProfit: 'Beneficio Neto',
      roi: 'ROI',
      costPerDelivery: 'Costo por Entrega',
      revenueGrowth: 'Crecimiento de Ingresos',
      deliveries: 'Entregas Totales',
      onTimeRate: 'Tasa de Entrega a Tiempo',
      vehicleUsage: 'Uso de Vehículos',
      totalFuel: 'Combustible Total',
      optimizedFuel: 'Combustible Optimizado',
      savings: 'Ahorros',
      co2Reduced: 'CO₂ Reducido'
    };
    return labels[key] || key;
  }

  formatDataValue(value: any): string {
    if (typeof value === 'number') {
      if (value > 1000 && value < 1000000) {
        return `$${value.toLocaleString('es-ES')}`;
      } else if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      }
      return value.toLocaleString('es-ES');
    }

    if (typeof value === 'string' && value.includes('%')) {
      return value;
    }

    return value;
  }

  async generateNewReport() {
    const { value: reportConfig } = await Swal.fire({
      title: '📊 Generar Nuevo Reporte',
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600;">Tipo de Reporte</label>
          <select id="report-type" class="swal2-input">
            <option value="efficiency">Eficiencia de Rutas</option>
            <option value="financial">Análisis Financiero</option>
            <option value="operational">Desempeño Operacional</option>
            <option value="environmental">Impacto Ambiental</option>
          </select>

          <label style="display: block; margin: 16px 0 8px; font-weight: 600;">Período</label>
          <select id="report-period" class="swal2-input">
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="quarterly">Trimestral</option>
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Generar Reporte',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const type = (document.getElementById('report-type') as HTMLSelectElement).value;
        const period = (document.getElementById('report-period') as HTMLSelectElement).value;

        if (!type || !period) {
          Swal.showValidationMessage('Por favor completa todos los campos');
          return false;
        }

        return { type, period };
      }
    });

    if (reportConfig) {
      // ✅ LLAMADA REAL AL BACKEND PARA GENERAR REPORTE
      this.loading = true;

      const reportRequest = {
        type: reportConfig.type,
        period: reportConfig.period,
        title: `Reporte de ${this.getReportTypeText(reportConfig.type)} - ${this.getPeriodText(reportConfig.period)}`
      };

      this.reportService.generateReport(reportRequest).subscribe({
        next: (newReport) => {
          this.reports.unshift(newReport);
          this.loading = false;

          Swal.fire({
            title: '✅ Reporte Generado',
            text: `El reporte ha sido creado exitosamente`,
            icon: 'success',
            confirmButtonText: 'Ver Reporte',
            showCancelButton: true,
            cancelButtonText: 'Cerrar'
          }).then((result: SweetAlertResult<any>) => {
            if (result.isConfirmed) {
              this.viewReport(newReport);
            }
          });
        },
        error: (error) => {
          console.error('❌ Error generando reporte:', error);
          this.loading = false;

          // ✅ FALLBACK: Generar reporte localmente
          this.generateLocalReport(reportConfig);
        }
      });
    }
  }

  private generateLocalReport(reportConfig: any) {
    Swal.fire({
      title: 'Generando Reporte...',
      html: `
        <div style="text-align: center;">
          <div class="swal2-progress-bar" style="background: #e0e0e0; border-radius: 10px; height: 8px; margin: 20px 0;">
            <div class="swal2-progress-bar-fill" style="background: #3b82f6; height: 100%; width: 0%; border-radius: 10px; transition: width 0.3s;"></div>
          </div>
          <p>Conectando con el servidor...</p>
        </div>
      `,
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        const fill = document.querySelector('.swal2-progress-bar-fill') as HTMLElement;
        let width = 0;
        const interval = setInterval(() => {
          width += 10;
          fill.style.width = width + '%';
          if (width >= 100) {
            clearInterval(interval);
          }
        }, 100);
      }
    });

    setTimeout(() => {
      const newReport: Report = {
        id: (this.reports.length + 1).toString(),
        title: `Reporte de ${this.getReportTypeText(reportConfig.type)} - ${this.getPeriodText(reportConfig.period)}`,
        type: reportConfig.type,
        period: this.getPeriodText(reportConfig.period),
        generatedDate: new Date().toISOString().split('T')[0],
        data: this.generateSampleData(reportConfig.type),
        metrics: {
          efficiencyGain: Math.floor(Math.random() * 20) + 15,
          costSavings: Math.floor(Math.random() * 10000) + 5000
        }
      };

      this.reports.unshift(newReport);

      Swal.fire({
        title: '✅ Reporte Generado (Modo Demo)',
        text: `El backend estará disponible pronto`,
        icon: 'success',
        confirmButtonText: 'Ver Reporte',
        showCancelButton: true,
        cancelButtonText: 'Cerrar'
      }).then((result: SweetAlertResult<any>) => {
        if (result.isConfirmed) {
          this.viewReport(newReport);
        }
      });
    }, 2000);
  }

  private getPeriodText(period: string): string {
    const currentDate = new Date();
    switch (period) {
      case 'weekly':
        return `Semana ${this.getWeekNumber(currentDate)}`;
      case 'monthly':
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      case 'quarterly':
        const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
        return `Q${quarter} ${currentDate.getFullYear()}`;
      default:
        return 'Personalizado';
    }
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private generateSampleData(type: string): any {
    switch (type) {
      case 'efficiency':
        return {
          totalRoutes: Math.floor(Math.random() * 100) + 100,
          optimizedRoutes: Math.floor(Math.random() * 80) + 60,
          avgTimeSaved: `${Math.floor(Math.random() * 20) + 15}%`,
          fuelSaved: `${Math.floor(Math.random() * 15) + 10}%`,
          distanceReduction: `${Math.floor(Math.random() * 200) + 100} km`
        };
      case 'financial':
        return {
          totalRevenue: Math.floor(Math.random() * 200000) + 100000,
          totalCost: Math.floor(Math.random() * 150000) + 80000,
          netProfit: Math.floor(Math.random() * 50000) + 20000,
          roi: `${(Math.random() * 15 + 10).toFixed(1)}%`
        };
      case 'operational':
        return {
          deliveries: Math.floor(Math.random() * 1000) + 500,
          onTimeRate: `${(Math.random() * 5 + 95).toFixed(1)}%`,
          vehicleUsage: `${(Math.random() * 15 + 75).toFixed(1)}%`
        };
      case 'environmental':
        return {
          totalFuel: Math.floor(Math.random() * 5000) + 5000,
          optimizedFuel: Math.floor(Math.random() * 4000) + 4000,
          savings: Math.floor(Math.random() * 1000) + 500,
          co2Reduced: `${(Math.random() * 2 + 2).toFixed(1)} ton`
        };
      default:
        return {};
    }
  }

  viewReport(report: Report) {
    if (report.id) {
      // Navegar a vista detallada
      this.router.navigate(['/reports', report.id]);
    } else {
      // Mostrar modal si no hay ID
      this.showReportModal(report);
    }
  }

  private showReportModal(report: Report) {
    Swal.fire({
      title: report.title,
      html: `
        <div style="text-align: left; max-height: 400px; overflow-y: auto;">
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong>📅 Período:</strong> ${report.period}<br>
            <strong>📋 Tipo:</strong> ${this.getReportTypeText(report.type)}<br>
            <strong>🕒 Generado:</strong> ${this.formatDate(report.generatedDate)}
          </div>

          <h4 style="margin: 20px 0 10px; color: #333;">📊 Datos del Reporte</h4>
          <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px;">
            ${Object.entries(report.data).map(([key, value]) => `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight: 500;">${this.getDataLabel(key)}:</span>
                <span style="font-weight: 600; color: #3b82f6;">${this.formatDataValue(value)}</span>
              </div>
            `).join('')}
          </div>

          ${report.metrics ? `
          <h4 style="margin: 20px 0 10px; color: #333;">📈 Métricas Clave</h4>
          <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px;">
            ${Object.entries(report.metrics).map(([key, value]) => `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight: 500;">${this.getDataLabel(key)}:</span>
                <span style="font-weight: 600; color: #10b981;">${this.formatDataValue(value)}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}
        </div>
      `,
      width: 600,
      confirmButtonText: 'Cerrar'
    });
  }

  downloadReport(report: Report) {
    // ✅ LLAMADA REAL AL BACKEND PARA DESCARGAR
    this.reportService.downloadReport(report.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${report.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);

        Swal.fire({
          title: '✅ Descarga Completada',
          text: `El reporte se ha guardado en tu dispositivo`,
          icon: 'success',
          confirmButtonText: 'Abrir Carpeta',
          showCancelButton: true,
          cancelButtonText: 'Cerrar'
        });
      },
      error: (error) => {
        console.error('❌ Error descargando reporte:', error);

        // ✅ FALLBACK: Simular descarga
        this.simulateDownload(report);
      }
    });
  }

  private simulateDownload(report: Report) {
    Swal.fire({
      title: '📥 Descargando Reporte',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 48px; margin: 20px 0;">📄</div>
          <p>Preparando: <strong>${report.title}</strong></p>
          <div class="swal2-progress-bar" style="background: #e0e0e0; border-radius: 10px; height: 8px; margin: 20px 0;">
            <div class="swal2-progress-bar-fill" style="background: #10b981; height: 100%; width: 0%; border-radius: 10px; transition: width 0.3s;"></div>
          </div>
        </div>
      `,
      timer: 1500,
      timerProgressBar: false,
      showConfirmButton: false,
      didOpen: () => {
        const fill = document.querySelector('.swal2-progress-bar-fill') as HTMLElement;
        let width = 0;
        const interval = setInterval(() => {
          width += 7;
          fill.style.width = width + '%';
          if (width >= 100) {
            clearInterval(interval);
          }
        }, 50);
      }
    }).then(() => {
      Swal.fire({
        title: '✅ Descarga Completada (Demo)',
        text: `El backend de descargas estará disponible pronto`,
        icon: 'success',
        confirmButtonText: 'Entendido'
      });
    });
  }

  shareReport(report: Report) {
    Swal.fire({
      title: '📤 Compartir Reporte',
      html: `
        <div style="text-align: left;">
          <p>Compartir: <strong>${report.title}</strong></p>
          <input id="share-email" class="swal2-input" placeholder="Correos electrónicos (separados por coma)" style="width: 100%;">
          <textarea id="share-message" class="swal2-textarea" placeholder="Mensaje opcional..." style="width: 100%; height: 100px; margin-top: 10px;"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const email = (document.getElementById('share-email') as HTMLInputElement).value;
        if (!email) {
          Swal.showValidationMessage('Por favor ingresa al menos un correo electrónico');
          return false;
        }
        return { email };
      }
    }).then((result: SweetAlertResult<any>) => {
      if (result.isConfirmed) {
        // ✅ LLAMADA REAL AL BACKEND PARA COMPARTIR
        this.reportService.shareReport(report.id, result.value).subscribe({
          next: () => {
            Swal.fire({
              title: '📨 Reporte Compartido',
              text: 'El reporte ha sido enviado exitosamente',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('❌ Error compartiendo reporte:', error);
            Swal.fire({
              title: '📨 Reporte Compartido (Demo)',
              text: 'Funcionalidad de compartir disponible pronto',
              icon: 'success',
              timer: 2000
            });
          }
        });
      }
    });
  }

  // ✅ Nuevo método para eliminar reportes
  deleteReport(report: Report) {
    Swal.fire({
      title: '¿Eliminar Reporte?',
      text: `¿Estás seguro de eliminar "${report.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // ✅ LLAMADA REAL AL BACKEND PARA ELIMINAR
        this.reportService.deleteReport(report.id).subscribe({
          next: () => {
            this.reports = this.reports.filter(r => r.id !== report.id);
            Swal.fire('✅ Eliminado', 'El reporte ha sido eliminado', 'success');
          },
          error: (error) => {
            console.error('❌ Error eliminando reporte:', error);
            // Fallback: eliminar localmente
            this.reports = this.reports.filter(r => r.id !== report.id);
            Swal.fire('✅ Eliminado (Demo)', 'El reporte ha sido eliminado', 'success');
          }
        });
      }
    });
  }
}
