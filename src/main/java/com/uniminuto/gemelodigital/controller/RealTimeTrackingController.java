package com.uniminuto.gemelodigital.controller;

import com.uniminuto.gemelodigital.entity.VehiclePosition;
import com.uniminuto.gemelodigital.service.RealTimeTrackingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/tracking")  // ⚠️ SIN /api
@CrossOrigin(origins = "*")
public class RealTimeTrackingController {

    private static final Logger logger = LoggerFactory.getLogger(RealTimeTrackingController.class);
    private final RealTimeTrackingService trackingService;

    public RealTimeTrackingController(RealTimeTrackingService trackingService) {
        this.trackingService = trackingService;
        logger.info("🚗 RealTimeTrackingController inicializado");
    }

    /**
     * ✅ Obtener TODAS las posiciones en tiempo real
     */
    @GetMapping("/positions")
    public ResponseEntity<List<VehiclePosition>> getAllPositions() {
        logger.info("📍 GET /tracking/positions - Obteniendo posiciones en tiempo real");

        try {
            List<VehiclePosition> positions = trackingService.getAllVehiclePositions();
            logger.info("✅ Retornando {} posiciones", positions.size());

            // Log detallado de cada vehículo
            positions.forEach(p -> {
                logger.info("  🚗 Vehículo: {} | Driver: {} | Estado: {} | Lat: {}, Lng: {}",
                        p.getVehicleId(), p.getDriverName(), p.getStatus(),
                        p.getLatitude(), p.getLongitude());
            });

            return ResponseEntity.ok(positions);
        } catch (Exception e) {
            logger.error("❌ Error obteniendo posiciones: {}", e.getMessage(), e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * ✅ Asignar ruta a vehículo
     */
    @PostMapping("/assign-route")
    public ResponseEntity<Map<String, Object>> assignRoute(@RequestBody Map<String, Object> request) {
        logger.info("📦 POST /tracking/assign-route");
        logger.info("   Request: {}", request);

        try {
            String routeId = (String) request.get("routeId");
            String vehicleId = (String) request.get("vehicleId");
            String driverId = (String) request.get("driverId");

            // Aquí tu lógica de asignación real

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "routeId", routeId,
                    "vehicleId", vehicleId,
                    "message", "Ruta asignada correctamente"
            ));
        } catch (Exception e) {
            logger.error("❌ Error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    /**
     * ✅ Iniciar ruta
     */
    @PostMapping("/start-route/{routeId}")
    public ResponseEntity<Map<String, Object>> startRoute(@PathVariable String routeId) {
        logger.info("🚀 POST /tracking/start-route/{}", routeId);

        try {
            // Aquí tu lógica para iniciar la ruta

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "routeId", routeId,
                    "message", "Ruta iniciada correctamente"
            ));
        } catch (Exception e) {
            logger.error("❌ Error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "OK",
                "timestamp", new Date().toString()
        ));
    }
}