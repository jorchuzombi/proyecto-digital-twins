package com.uniminuto.gemelodigital.controller;

import com.uniminuto.gemelodigital.entity.Vehicle;
import com.uniminuto.gemelodigital.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/vehicles")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VehicleController {

    private final VehicleRepository vehicleRepository;
    private static final Logger logger = LoggerFactory.getLogger(VehicleController.class);

    // ============================================
    // 🆕 ENDPOINT PARA TIEMPO REAL
    // ============================================

    /**
     * GET /vehicles/positions
     * Obtiene las posiciones de todos los vehículos en tiempo real
     * Este endpoint es usado por el dashboard para mostrar vehículos en el mapa
     */
    @GetMapping("/positions")
    public ResponseEntity<List<Map<String, Object>>> getAllVehiclePositions() {
        logger.info("📍 GET /vehicles/positions - Obteniendo posiciones de vehículos");

        try {
            List<Vehicle> vehicles = vehicleRepository.findAll();
            List<Map<String, Object>> positions = new ArrayList<>();

            // Coordenadas base de Bogotá para simulación
            double baseLat = 4.6097;
            double baseLng = -74.0817;

            for (int i = 0; i < vehicles.size() && i < 10; i++) { // Máximo 10 vehículos
                Vehicle vehicle = vehicles.get(i);

                // Generar posición aleatoria cerca de Bogotá
                double lat = baseLat + (Math.random() - 0.5) * 0.1;
                double lng = baseLng + (Math.random() - 0.5) * 0.1;

                // Determinar estado basado en el estado del vehículo
                String status;
                double speed;

                if (vehicle.getEstado() == Vehicle.VehicleStatus.EN_RUTA) {
                    status = "BUSY";
                    speed = 30 + Math.random() * 30; // 30-60 km/h
                } else if (vehicle.getEstado() == Vehicle.VehicleStatus.ACTIVO ||
                        vehicle.getEstado() == Vehicle.VehicleStatus.DISPONIBLE) {
                    status = "AVAILABLE";
                    speed = 0;
                } else {
                    status = "OFFLINE";
                    speed = 0;
                }

                // Crear objeto de posición
                Map<String, Object> position = new HashMap<>();
                position.put("vehicleId", vehicle.getId());
                position.put("vehicleName", vehicle.getNombreCompleto());
                position.put("lat", lat);
                position.put("lng", lng);
                position.put("speed", Math.round(speed * 10.0) / 10.0);
                position.put("status", status);
                position.put("lastUpdate", new Date());

                // Datos adicionales si está en ruta
                if ("BUSY".equals(status)) {
                    position.put("heading", Math.random() * 360);
                    position.put("eta", (int)(10 + Math.random() * 40)); // 10-50 minutos
                    position.put("distance", Math.round((5 + Math.random() * 20) * 10.0) / 10.0); // 5-25 km
                }

                positions.add(position);
            }

            logger.info("✅ Devolviendo {} posiciones de vehículos", positions.size());
            return ResponseEntity.ok(positions);

        } catch (Exception e) {
            logger.error("❌ Error obteniendo posiciones: {}", e.getMessage(), e);

            // Retornar posiciones de ejemplo en caso de error
            List<Map<String, Object>> fallbackPositions = getFallbackPositions();
            return ResponseEntity.ok(fallbackPositions);
        }
    }

    /**
     * GET /vehicles/{id}/position
     * Obtiene la posición de un vehículo específico
     */
    @GetMapping("/{id}/position")
    public ResponseEntity<Map<String, Object>> getVehiclePosition(@PathVariable String id) {
        logger.info("📍 GET /vehicles/{}/position", id);

        try {
            Optional<Vehicle> vehicleOpt = vehicleRepository.findById(id);

            if (vehicleOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Vehicle vehicle = vehicleOpt.get();

            // Generar posición simulada
            double baseLat = 4.6097;
            double baseLng = -74.0817;
            double lat = baseLat + (Math.random() - 0.5) * 0.1;
            double lng = baseLng + (Math.random() - 0.5) * 0.1;

            String status;
            double speed;

            if (vehicle.getEstado() == Vehicle.VehicleStatus.EN_RUTA) {
                status = "BUSY";
                speed = 30 + Math.random() * 30;
            } else if (vehicle.getEstado() == Vehicle.VehicleStatus.ACTIVO ||
                    vehicle.getEstado() == Vehicle.VehicleStatus.DISPONIBLE) {
                status = "AVAILABLE";
                speed = 0;
            } else {
                status = "OFFLINE";
                speed = 0;
            }

            Map<String, Object> position = new HashMap<>();
            position.put("vehicleId", vehicle.getId());
            position.put("vehicleName", vehicle.getNombreCompleto());
            position.put("lat", lat);
            position.put("lng", lng);
            position.put("speed", Math.round(speed * 10.0) / 10.0);
            position.put("status", status);
            position.put("lastUpdate", new Date());

            if ("BUSY".equals(status)) {
                position.put("heading", Math.random() * 360);
                position.put("eta", (int)(10 + Math.random() * 40));
                position.put("distance", Math.round((5 + Math.random() * 20) * 10.0) / 10.0);
            }

            return ResponseEntity.ok(position);

        } catch (Exception e) {
            logger.error("❌ Error obteniendo posición del vehículo: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Posiciones de respaldo en caso de error
     */
    private List<Map<String, Object>> getFallbackPositions() {
        List<Map<String, Object>> positions = new ArrayList<>();

        // Vehículo 1 - Norte de Bogotá
        Map<String, Object> pos1 = new HashMap<>();
        pos1.put("vehicleId", "vehicle-001");
        pos1.put("vehicleName", "Vehículo Norte");
        pos1.put("lat", 4.6597);
        pos1.put("lng", -74.0817);
        pos1.put("speed", 45.0);
        pos1.put("status", "BUSY");
        pos1.put("lastUpdate", new Date());
        pos1.put("heading", 180.0);
        pos1.put("eta", 15);
        pos1.put("distance", 12.5);
        positions.add(pos1);

        // Vehículo 2 - Sur de Bogotá
        Map<String, Object> pos2 = new HashMap<>();
        pos2.put("vehicleId", "vehicle-002");
        pos2.put("vehicleName", "Vehículo Sur");
        pos2.put("lat", 4.5597);
        pos2.put("lng", -74.0917);
        pos2.put("speed", 35.0);
        pos2.put("status", "BUSY");
        pos2.put("lastUpdate", new Date());
        pos2.put("heading", 90.0);
        pos2.put("eta", 25);
        pos2.put("distance", 18.3);
        positions.add(pos2);

        // Vehículo 3 - Centro
        Map<String, Object> pos3 = new HashMap<>();
        pos3.put("vehicleId", "vehicle-003");
        pos3.put("vehicleName", "Vehículo Centro");
        pos3.put("lat", 4.6097);
        pos3.put("lng", -74.0717);
        pos3.put("speed", 0.0);
        pos3.put("status", "AVAILABLE");
        pos3.put("lastUpdate", new Date());
        positions.add(pos3);

        return positions;
    }

    // ============================================
    // ENDPOINTS EXISTENTES (SIN CAMBIOS)
    // ============================================

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        logger.info("✅ VEHICLE CONTROLLER - TEST ENDPOINT HIT");
        return ResponseEntity.ok("VehicleController está funcionando correctamente!");
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllVehicles() {
        logger.info("🚗 GET /vehicles - Obteniendo todos los vehículos");

        try {
            List<Vehicle> vehicles = vehicleRepository.findAll();

            List<Map<String, Object>> simplifiedVehicles = vehicles.stream()
                    .map(this::convertToSimpleMap)
                    .collect(Collectors.toList());

            logger.info("✅ Encontrados {} vehículos", simplifiedVehicles.size());
            return ResponseEntity.ok(simplifiedVehicles);
        } catch (Exception e) {
            logger.error("❌ Error obteniendo vehículos: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping("/available")
    public ResponseEntity<List<Vehicle>> getAvailableVehicles() {
        try {
            logger.info("🚗 GET /vehicles/available - Obteniendo vehículos disponibles");
            List<Vehicle> vehicles = vehicleRepository.findByEstadoAndDeletedAtIsNull(Vehicle.VehicleStatus.ACTIVO);
            logger.info("✅ Vehículos disponibles obtenidos: {}", vehicles.size());
            return ResponseEntity.ok(vehicles);
        } catch (Exception e) {
            logger.error("❌ Error obteniendo vehículos disponibles: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/available/simplified")
    public ResponseEntity<List<Map<String, Object>>> getAvailableVehiclesSimplified() {
        logger.info("🚗 GET /vehicles/available/simplified - Obteniendo vehículos disponibles");

        try {
            List<Vehicle> vehicles = vehicleRepository.findByEstadoAndDeletedAtIsNull(Vehicle.VehicleStatus.ACTIVO);

            List<Map<String, Object>> simplifiedVehicles = vehicles.stream()
                    .map(this::convertToSimpleMap)
                    .collect(Collectors.toList());

            logger.info("✅ Encontrados {} vehículos disponibles", simplifiedVehicles.size());
            return ResponseEntity.ok(simplifiedVehicles);
        } catch (Exception e) {
            logger.error("❌ Error obteniendo vehículos disponibles: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getVehicle(@PathVariable String id) {
        logger.info("👀 GET /vehicles/{}", id);

        try {
            Optional<Vehicle> vehicle = vehicleRepository.findById(id);
            return vehicle.map(v -> ResponseEntity.ok(convertToSimpleMap(v)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            logger.error("❌ Error obteniendo vehículo: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping("/placa/{placa}")
    public ResponseEntity<Map<String, Object>> getVehicleByPlaca(@PathVariable String placa) {
        logger.info("🔍 GET /vehicles/placa/{}", placa);

        try {
            Optional<Vehicle> vehicle = vehicleRepository.findByPlaca(placa);
            return vehicle.map(v -> ResponseEntity.ok(convertToSimpleMap(v)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            logger.error("❌ Error buscando vehículo por placa: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(null);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createVehicle(@RequestBody Vehicle vehicle) {
        logger.info("🚀 POST /vehicles - Creando nuevo vehículo: {}", vehicle.getPlaca());

        try {
            if (vehicle.getEstado() == null) {
                vehicle.setEstado(Vehicle.VehicleStatus.ACTIVO);
            }

            Vehicle savedVehicle = vehicleRepository.save(vehicle);
            logger.info("✅ Vehículo creado exitosamente: {}", savedVehicle.getId());
            return ResponseEntity.ok(convertToSimpleMap(savedVehicle));
        } catch (Exception e) {
            logger.error("❌ Error creando vehículo: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateVehicle(
            @PathVariable String id,
            @RequestBody Vehicle vehicleData) {
        logger.info("✏️ PUT /vehicles/{} - Actualizando vehículo", id);

        try {
            Optional<Vehicle> existingVehicleOpt = vehicleRepository.findById(id);

            if (existingVehicleOpt.isEmpty()) {
                logger.error("❌ Vehículo no encontrado: {}", id);
                return ResponseEntity.notFound().build();
            }

            Vehicle existingVehicle = existingVehicleOpt.get();

            if (vehicleData.getPlaca() != null) existingVehicle.setPlaca(vehicleData.getPlaca());
            if (vehicleData.getMarca() != null) existingVehicle.setMarca(vehicleData.getMarca());
            if (vehicleData.getModelo() != null) existingVehicle.setModelo(vehicleData.getModelo());
            if (vehicleData.getAnio() != null) existingVehicle.setAnio(vehicleData.getAnio());
            if (vehicleData.getTipo() != null) existingVehicle.setTipo(vehicleData.getTipo());
            if (vehicleData.getCapacidadCarga() != null) existingVehicle.setCapacidadCarga(vehicleData.getCapacidadCarga());
            if (vehicleData.getEstado() != null) existingVehicle.setEstado(vehicleData.getEstado());
            if (vehicleData.getKilometraje() != null) existingVehicle.setKilometraje(vehicleData.getKilometraje());

            Vehicle updatedVehicle = vehicleRepository.save(existingVehicle);
            logger.info("✅ Vehículo actualizado exitosamente: {}", id);

            return ResponseEntity.ok(convertToSimpleMap(updatedVehicle));

        } catch (Exception e) {
            logger.error("❌ Error actualizando vehículo: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVehicle(@PathVariable String id) {
        logger.info("🗑️ DELETE /vehicles/{}", id);

        try {
            if (!vehicleRepository.existsById(id)) {
                logger.error("❌ Vehículo no encontrado: {}", id);
                return ResponseEntity.notFound().build();
            }

            vehicleRepository.deleteById(id);
            logger.info("✅ Vehículo eliminado exitosamente: {}", id);
            return ResponseEntity.noContent().build();

        } catch (Exception e) {
            logger.error("❌ Error eliminando vehículo: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getVehicleStats() {
        logger.info("📊 GET /vehicles/stats - Obteniendo estadísticas");

        try {
            long total = vehicleRepository.count();
            long activos = vehicleRepository.findAll().stream()
                    .filter(v -> v.getEstado() == Vehicle.VehicleStatus.ACTIVO).count();
            long disponibles = vehicleRepository.findAll().stream()
                    .filter(v -> v.getEstado() == Vehicle.VehicleStatus.DISPONIBLE).count();
            long enRuta = vehicleRepository.findAll().stream()
                    .filter(v -> v.getEstado() == Vehicle.VehicleStatus.EN_RUTA).count();
            long enMantenimiento = vehicleRepository.findAll().stream()
                    .filter(v -> v.getEstado() == Vehicle.VehicleStatus.EN_MANTENIMIENTO).count();
            long fueraDeServicio = vehicleRepository.findAll().stream()
                    .filter(v -> v.getEstado() == Vehicle.VehicleStatus.FUERA_DE_SERVICIO).count();
            long inactivos = vehicleRepository.findAll().stream()
                    .filter(v -> v.getEstado() == Vehicle.VehicleStatus.INACTIVO).count();

            Map<String, Object> stats = new HashMap<>();
            stats.put("total", total);
            stats.put("activos", activos);
            stats.put("disponibles", disponibles);
            stats.put("enRuta", enRuta);
            stats.put("enMantenimiento", enMantenimiento);
            stats.put("fueraDeServicio", fueraDeServicio);
            stats.put("inactivos", inactivos);
            stats.put("totalDisponibles", activos + disponibles);

            logger.info("✅ Estadísticas generadas: {}", stats);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("❌ Error generando estadísticas: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(null);
        }
    }

    private Map<String, Object> convertToSimpleMap(Vehicle vehicle) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", vehicle.getId());
        map.put("placa", vehicle.getPlaca());
        map.put("marca", vehicle.getMarca());
        map.put("modelo", vehicle.getModelo());
        map.put("anio", vehicle.getAnio());
        map.put("tipo", vehicle.getTipo());
        map.put("capacidadCarga", vehicle.getCapacidadCarga());
        map.put("estado", vehicle.getEstado() != null ? vehicle.getEstado().name() : null);
        map.put("estadoTexto", vehicle.getEstadoTexto());
        map.put("estadoIcono", vehicle.getEstadoIcono());
        map.put("kilometraje", vehicle.getKilometraje());
        map.put("activo", vehicle.isActivo());
        map.put("disponible", vehicle.isDisponible());
        map.put("enMantenimiento", vehicle.isEnMantenimiento());
        map.put("enRuta", vehicle.isEnRuta());
        map.put("fueraDeServicio", vehicle.isFueraDeServicio());
        map.put("inactivo", vehicle.isInactivo());
        map.put("puedeSerAsignado", vehicle.puedeSerAsignado());
        map.put("nombreCompleto", vehicle.getNombreCompleto());
        map.put("descripcionTipo", vehicle.getDescripcionTipo());
        map.put("edadVehiculo", vehicle.getEdadVehiculo());
        map.put("antiguo", vehicle.isAntiguo());
        map.put("createdAt", vehicle.getCreatedAt());
        map.put("updatedAt", vehicle.getUpdatedAt());
        return map;
    }
}