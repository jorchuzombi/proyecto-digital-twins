package com.uniminuto.gemelodigital.controller;

import com.uniminuto.gemelodigital.dto.ReportRequest;
import com.uniminuto.gemelodigital.dto.ReportResponse;
import com.uniminuto.gemelodigital.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
@Slf4j
public class ReportController {

    private final ReportService reportService;

    /**
     * ✅ OBTENER TODOS LOS REPORTES DISPONIBLES
     */
    @GetMapping
    public ResponseEntity<List<ReportResponse>> getAllReports() {
        log.info("📊 GET /reports - Obteniendo todos los reportes");
        List<ReportResponse> reports = reportService.getAllReports();
        log.info("✅ {} reportes encontrados", reports.size());
        return ResponseEntity.ok(reports);
    }

    /**
     * ✅ GENERAR UN NUEVO REPORTE
     */
    @PostMapping("/generate")
    public ResponseEntity<ReportResponse> generateReport(@RequestBody ReportRequest request) {
        log.info("📊 POST /reports/generate - Tipo: {}", request.getType());
        ReportResponse report = reportService.generateReport(request);
        log.info("✅ Reporte generado: {}", report.getTitle());
        return ResponseEntity.ok(report);
    }

    /**
     * ✅ DESCARGAR REPORTE EN PDF
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadReport(@PathVariable String id) {
        log.info("📥 GET /reports/{}/download - Descargando reporte", id);

        try {
            Resource resource = reportService.downloadReportAsPdf(id);

            String filename = "reporte-" + id + "-" + System.currentTimeMillis() + ".pdf";

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .body(resource);

        } catch (Exception e) {
            log.error("❌ Error descargando reporte {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * ✅ COMPARTIR REPORTE POR EMAIL
     */
    @PostMapping("/{id}/share")
    public ResponseEntity<Void> shareReport(
            @PathVariable String id,
            @RequestBody ShareReportRequest request) {
        log.info("📤 POST /reports/{}/share - Email: {}", id, request.getEmail());
        reportService.shareReport(id, request.getEmail());
        log.info("✅ Reporte compartido exitosamente");
        return ResponseEntity.ok().build();
    }

    /**
     * ✅ ELIMINAR REPORTE
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReport(@PathVariable String id) {
        log.info("🗑️ DELETE /reports/{} - Eliminando reporte", id);
        reportService.deleteReport(id);
        log.info("✅ Reporte eliminado");
        return ResponseEntity.ok().build();
    }
}

// DTO para compartir reporte
class ShareReportRequest {
    private String email;
    private String message;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}