package com.uniminuto.gemelodigital.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.uniminuto.gemelodigital.dto.ReportRequest;
import com.uniminuto.gemelodigital.dto.ReportResponse;
import com.uniminuto.gemelodigital.entity.Route;
import com.uniminuto.gemelodigital.entity.VehiclePosition;
import com.uniminuto.gemelodigital.repository.DriverRepository;
import com.uniminuto.gemelodigital.repository.RouteRepository;
import com.uniminuto.gemelodigital.repository.VehiclePositionRepository;
import com.uniminuto.gemelodigital.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final RouteRepository routeRepository;
    private final DriverRepository driverRepository;
    private final VehicleRepository vehicleRepository;
    private final VehiclePositionRepository vehiclePositionRepository;

    private final Map<String, ReportResponse> reportsCache = new HashMap<>();

    /**
     * ✅ OBTENER TODOS LOS REPORTES
     */
    public List<ReportResponse> getAllReports() {
        log.info("📊 Generando reportes con datos reales...");

        List<ReportResponse> reports = new ArrayList<>();
        String period = getCurrentPeriod();
        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);

        reports.add(generateOperationalReport(period, today));
        reports.add(generateDriversReport(period, today));
        reports.add(generateVehiclesReport(period, today));
        reports.add(generateRoutesReport(period, today));

        reports.forEach(report -> reportsCache.put(report.getId(), report));
        return reports;
    }

    /**
     * ✅ GENERAR REPORTE ESPECÍFICO
     */
    public ReportResponse generateReport(ReportRequest request) {
        log.info("📊 Generando reporte: {}", request.getType());

        String period = getCurrentPeriod();
        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);

        ReportResponse report = switch (request.getType()) {
            case "operational" -> generateOperationalReport(period, today);
            case "drivers" -> generateDriversReport(period, today);
            case "vehicles" -> generateVehiclesReport(period, today);
            case "routes" -> generateRoutesReport(period, today);
            default -> throw new IllegalArgumentException("Tipo no válido: " + request.getType());
        };

        reportsCache.put(report.getId(), report);
        return report;
    }

    /**
     * ✅ REPORTE OPERACIONAL
     */
    private ReportResponse generateOperationalReport(String period, String today) {
        var routes = routeRepository.findAll();
        var drivers = driverRepository.findAll();
        var vehicles = vehicleRepository.findAll();

        // ✅ Contar por status de Route
        long completedRoutes = routes.stream()
                .filter(r -> "COMPLETED".equals(r.getStatus()))
                .count();

        long activeRoutes = routes.stream()
                .filter(r -> "IN_PROGRESS".equals(r.getStatus()))
                .count();

        long pendingRoutes = routes.stream()
                .filter(r -> "PENDING".equals(r.getStatus()))
                .count();

        // ✅ Contar stops
        int totalStops = routes.stream()
                .mapToInt(r -> r.getStops() != null ? r.getStops().size() : 0)
                .sum();

        double completionRate = routes.isEmpty() ? 0 : (completedRoutes * 100.0 / routes.size());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalRoutes", routes.size());
        data.put("completedRoutes", completedRoutes);
        data.put("activeRoutes", activeRoutes);
        data.put("pendingRoutes", pendingRoutes);
        data.put("totalDrivers", drivers.size());
        data.put("totalVehicles", vehicles.size());
        data.put("totalStops", totalStops);
        data.put("avgStopsPerRoute", routes.isEmpty() ? 0 : totalStops / routes.size());
        data.put("completionRate", String.format("%.1f%%", completionRate));

        return ReportResponse.builder()
                .id(UUID.randomUUID().toString())
                .title("Reporte Operacional General")
                .type("operational")
                .period(period)
                .generatedDate(today)
                .data(data)
                .build();
    }

    /**
     * ✅ REPORTE DE CONDUCTORES
     */
    private ReportResponse generateDriversReport(String period, String today) {
        var drivers = driverRepository.findAll();
        var positions = vehiclePositionRepository.findAll();

        long activeDrivers = positions.stream()
                .filter(p -> "BUSY".equals(p.getStatus()))
                .count();

        long availableDrivers = positions.stream()
                .filter(p -> "AVAILABLE".equals(p.getStatus()))
                .count();

        long offlineDrivers = drivers.size() - activeDrivers - availableDrivers;

        double avgSpeed = positions.stream()
                .filter(p -> "BUSY".equals(p.getStatus()))
                .filter(p -> p.getSpeed() != null)
                .mapToDouble(VehiclePosition::getSpeed)
                .average()
                .orElse(0);

        double utilizationRate = drivers.isEmpty() ? 0 : (activeDrivers * 100.0 / drivers.size());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalDrivers", drivers.size());
        data.put("activeDrivers", activeDrivers);
        data.put("availableDrivers", availableDrivers);
        data.put("offlineDrivers", offlineDrivers);
        data.put("utilizationRate", String.format("%.1f%%", utilizationRate));
        data.put("avgSpeed", String.format("%.1f km/h", avgSpeed));
        data.put("driversInTransit", activeDrivers);

        return ReportResponse.builder()
                .id(UUID.randomUUID().toString())
                .title("Reporte de Conductores")
                .type("drivers")
                .period(period)
                .generatedDate(today)
                .data(data)
                .build();
    }

    /**
     * ✅ REPORTE DE VEHÍCULOS
     */
    private ReportResponse generateVehiclesReport(String period, String today) {
        var vehicles = vehicleRepository.findAll();
        var positions = vehiclePositionRepository.findAll();

        long activeVehicles = positions.stream()
                .filter(p -> "BUSY".equals(p.getStatus()))
                .count();

        long availableVehicles = positions.stream()
                .filter(p -> "AVAILABLE".equals(p.getStatus()))
                .count();

        double utilizationRate = vehicles.isEmpty() ? 0 : (activeVehicles * 100.0 / vehicles.size());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalVehicles", vehicles.size());
        data.put("activeVehicles", activeVehicles);
        data.put("availableVehicles", availableVehicles);
        data.put("utilizationRate", String.format("%.1f%%", utilizationRate));
        data.put("readyForUse", availableVehicles);

        return ReportResponse.builder()
                .id(UUID.randomUUID().toString())
                .title("Reporte de Flota de Vehículos")
                .type("vehicles")
                .period(period)
                .generatedDate(today)
                .data(data)
                .build();
    }

    /**
     * ✅ REPORTE DE RUTAS
     */
    private ReportResponse generateRoutesReport(String period, String today) {
        var routes = routeRepository.findAll();

        long completedRoutes = routes.stream()
                .filter(r -> "COMPLETED".equals(r.getStatus()))
                .count();

        long activeRoutes = routes.stream()
                .filter(r -> "IN_PROGRESS".equals(r.getStatus()))
                .count();

        long pendingRoutes = routes.stream()
                .filter(r -> "PENDING".equals(r.getStatus()))
                .count();

        int totalStops = routes.stream()
                .mapToInt(r -> r.getStops() != null ? r.getStops().size() : 0)
                .sum();

        double successRate = routes.isEmpty() ? 0 : (completedRoutes * 100.0 / routes.size());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalRoutes", routes.size());
        data.put("completedRoutes", completedRoutes);
        data.put("activeRoutes", activeRoutes);
        data.put("pendingRoutes", pendingRoutes);
        data.put("totalStops", totalStops);
        data.put("avgStopsPerRoute", routes.isEmpty() ? 0 : totalStops / routes.size());
        data.put("successRate", String.format("%.1f%%", successRate));

        return ReportResponse.builder()
                .id(UUID.randomUUID().toString())
                .title("Análisis de Rutas")
                .type("routes")
                .period(period)
                .generatedDate(today)
                .data(data)
                .build();
    }

    /**
     * ✅ DESCARGAR REPORTE COMO PDF (iText7)
     */
    public Resource downloadReportAsPdf(String id) {
        log.info("📥 Generando PDF para: {}", id);

        ReportResponse report = reportsCache.get(id);
        if (report == null) {
            throw new RuntimeException("Reporte no encontrado: " + id);
        }

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            // TÍTULO
            Paragraph title = new Paragraph(report.getTitle())
                    .setFontSize(20)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(title);

            // INFO GENERAL
            document.add(new Paragraph("Período: " + report.getPeriod()).setFontSize(12));
            document.add(new Paragraph("Fecha: " + report.getGeneratedDate()).setFontSize(12));
            document.add(new Paragraph("\n"));

            // TABLA DE DATOS
            Table table = new Table(UnitValue.createPercentArray(new float[]{3, 2}))
                    .useAllAvailableWidth();

            // Header
            table.addHeaderCell(new Paragraph("Métrica").setBold().setBackgroundColor(ColorConstants.LIGHT_GRAY));
            table.addHeaderCell(new Paragraph("Valor").setBold().setBackgroundColor(ColorConstants.LIGHT_GRAY));

            // Datos
            report.getData().forEach((key, value) -> {
                table.addCell(new Paragraph(formatKey(key)));
                table.addCell(new Paragraph(String.valueOf(value)));
            });

            document.add(table);

            // Footer
            document.add(new Paragraph("\n\nGenerado por: Gemelo Digital - Sistema de Tracking")
                    .setFontSize(10)
                    .setItalic()
                    .setTextAlignment(TextAlignment.CENTER));

            document.close();

            log.info("✅ PDF generado: {} bytes", baos.size());
            return new ByteArrayResource(baos.toByteArray());

        } catch (Exception e) {
            log.error("❌ Error generando PDF: {}", e.getMessage());
            throw new RuntimeException("Error generando PDF", e);
        }
    }

    /**
     * ✅ COMPARTIR REPORTE
     */
    public void shareReport(String id, String email) {
        log.info("📤 Compartiendo {} a {}", id, email);
        // Implementar con EmailService
    }

    /**
     * ✅ ELIMINAR REPORTE
     */
    public void deleteReport(String id) {
        log.info("🗑️ Eliminando: {}", id);
        reportsCache.remove(id);
    }

    private String formatKey(String key) {
        return switch (key) {
            case "totalRoutes" -> "Rutas Totales";
            case "completedRoutes" -> "Rutas Completadas";
            case "activeRoutes" -> "Rutas Activas";
            case "pendingRoutes" -> "Rutas Pendientes";
            case "totalDrivers" -> "Total Conductores";
            case "totalVehicles" -> "Total Vehículos";
            case "totalStops" -> "Paradas Totales";
            case "avgStopsPerRoute" -> "Paradas por Ruta";
            case "completionRate" -> "Tasa de Completación";
            case "activeDrivers" -> "Conductores Activos";
            case "availableDrivers" -> "Conductores Disponibles";
            case "offlineDrivers" -> "Conductores Offline";
            case "utilizationRate" -> "Tasa de Utilización";
            case "avgSpeed" -> "Velocidad Promedio";
            case "driversInTransit" -> "En Tránsito";
            case "activeVehicles" -> "Vehículos Activos";
            case "availableVehicles" -> "Vehículos Disponibles";
            case "readyForUse" -> "Listos para Usar";
            case "successRate" -> "Tasa de Éxito";
            default -> key;
        };
    }

    private String getCurrentPeriod() {
        LocalDate now = LocalDate.now();
        String[] months = {"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"};
        return months[now.getMonthValue() - 1] + " " + now.getYear();
    }
}