package com.uniminuto.gemelodigital.controller;

import com.uniminuto.gemelodigital.dto.RouteDTO;
import com.uniminuto.gemelodigital.dto.RouteResponse;
import com.uniminuto.gemelodigital.dto.VehicleAssignmentRequest;
import com.uniminuto.gemelodigital.service.RouteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/routes")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    // ✅ TEST ENDPOINT
    @GetMapping("/test")
    public ResponseEntity<String> test() {
        log.info("✅ ROUTE CONTROLLER - TEST ENDPOINT HIT");
        return ResponseEntity.ok("RouteController está funcionando correctamente!");
    }

    // ✅ OBTENER TODAS LAS RUTAS - CON INFORMACIÓN DEL CONDUCTOR
    @GetMapping
    public ResponseEntity<List<RouteResponse>> getAllRoutes() {
        log.info("📋 GET /routes - Obteniendo todas las rutas");

        List<RouteResponse> routes = routeService.getAllRoutes();

        log.info("✅ Retornando {} rutas al frontend", routes.size());

        // ✅ LOG DETALLADO para debug
        routes.forEach(route -> {
            log.debug("🔍 Ruta: {} | driver_id: {} | driver: {}",
                    route.getName(),
                    route.getDriverId(),
                    route.getDriver() != null ? route.getDriver().getNombre() : "null"
            );
        });

        return ResponseEntity.ok(routes);
    }

    // ✅ OBTENER RUTA POR ID - CON INFORMACIÓN DEL CONDUCTOR
    @GetMapping("/{id}")
    public ResponseEntity<RouteResponse> getRouteById(@PathVariable String id) {
        log.info("👀 GET /routes/{} - Obteniendo ruta", id);

        try {
            RouteResponse route = routeService.getRouteById(id);

            log.info("✅ Ruta encontrada: {} | driver_id: {}",
                    route.getName(),
                    route.getDriverId()
            );

            return ResponseEntity.ok(route);
        } catch (RuntimeException e) {
            log.error("❌ Error obteniendo ruta {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // ✅ CREAR RUTA
    @PostMapping
    public ResponseEntity<RouteResponse> createRoute(@RequestBody RouteDTO routeDTO) {
        log.info("➕ POST /routes - Creando nueva ruta");
        log.info("📤 Datos recibidos: name={}, driverId={}, vehicle={}",
                routeDTO.getName(),
                routeDTO.getDriverId(),
                routeDTO.getVehicle()
        );

        try {
            RouteResponse createdRoute = routeService.createRoute(routeDTO);

            log.info("✅ Ruta creada: id={}, driver_id={}",
                    createdRoute.getId(),
                    createdRoute.getDriverId()
            );

            return ResponseEntity.ok(createdRoute);
        } catch (Exception e) {
            log.error("❌ Error creando ruta: {}", e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().build();
        }
    }

    // ✅ ACTUALIZAR RUTA
    @PutMapping("/{id}")
    public ResponseEntity<RouteResponse> updateRoute(
            @PathVariable String id,
            @RequestBody RouteDTO routeDTO) {

        log.info("✏️ PUT /routes/{} - Actualizando ruta", id);
        log.info("📤 Datos recibidos: name={}, driverId={}, vehicle={}",
                routeDTO.getName(),
                routeDTO.getDriverId(),
                routeDTO.getVehicle()
        );

        try {
            RouteResponse updatedRoute = routeService.updateRoute(id, routeDTO);

            log.info("✅ Ruta actualizada: id={}, driver_id={}",
                    updatedRoute.getId(),
                    updatedRoute.getDriverId()
            );

            return ResponseEntity.ok(updatedRoute);
        } catch (RuntimeException e) {
            log.error("❌ Error actualizando ruta {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("❌ Error inesperado actualizando ruta {}: {}", id, e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().build();
        }
    }

    // ✅ ELIMINAR RUTA
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoute(@PathVariable String id) {
        log.info("🗑️ DELETE /routes/{} - Eliminando ruta", id);

        try {
            routeService.deleteRoute(id);

            log.info("✅ Ruta {} eliminada exitosamente", id);

            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            log.error("❌ Error eliminando ruta {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // ✅ OBTENER PARADAS DE UNA RUTA
    @GetMapping("/{id}/stops")
    public ResponseEntity<?> getRouteStops(@PathVariable String id) {
        log.info("📍 GET /routes/{}/stops - Obteniendo paradas", id);

        try {
            RouteResponse route = routeService.getRouteById(id);

            log.info("✅ {} paradas encontradas para ruta {}",
                    route.getStops() != null ? route.getStops().size() : 0,
                    id
            );

            return ResponseEntity.ok(route.getStops());
        } catch (RuntimeException e) {
            log.error("❌ Error obteniendo paradas de ruta {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // 🔗 NUEVO ENDPOINT: ASIGNAR RUTA A VEHÍCULO/CONDUCTOR
    @PostMapping("/{id}/assign")
    public ResponseEntity<RouteResponse> assignRouteToVehicle(
            @PathVariable String id,
            @RequestBody VehicleAssignmentRequest request) {

        log.info("🔗 POST /routes/{}/assign - Asignando vehículo y/o conductor a la ruta", id);
        log.info("📤 Datos recibidos: vehicleId={}, driverId={}",
                request.getVehicleId(),
                request.getDriverId()
        );

        try {
            RouteResponse assignedRoute = routeService.assignRouteToVehicle(id, request);

            log.info("✅ Ruta {} asignada exitosamente a V:{} y D:{}",
                    id,
                    request.getVehicleId(),
                    request.getDriverId()
            );

            return ResponseEntity.ok(assignedRoute);
        } catch (RuntimeException e) {
            log.error("❌ Error asignando vehículo/conductor a ruta {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("❌ Error inesperado asignando ruta {}: {}", id, e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().build();
        }
    }

    // ===== NUEVO ENDPOINT: OPTIMIZAR RUTA =====
    @PostMapping("/{id}/optimize")
    public ResponseEntity<RouteResponse> optimizeRoute(@PathVariable String id) {
        log.info("🔧 POST /routes/{}/optimize - Optimizando ruta", id);

        try {
            RouteResponse optimizedRoute = routeService.optimizeRoute(id);

            log.info("✅ Ruta {} optimizada exitosamente", id);
            log.info("   - Distancia: {}", optimizedRoute.getDistance());
            log.info("   - Duración estimada: {}", optimizedRoute.getEstimatedDuration());
            log.info("   - Número de paradas: {}", optimizedRoute.getStops() != null ? optimizedRoute.getStops().size() : 0);

            return ResponseEntity.ok(optimizedRoute);
        } catch (IllegalArgumentException e) {
            log.error("❌ ID de ruta inválido {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build(); // 400 Bad Request
        } catch (RuntimeException e) {
            log.error("❌ Error optimizando ruta {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build(); // 404 Not Found si la ruta no existe
        } catch (Exception e) {
            log.error("❌ Error inesperado optimizando ruta {}: {}", id, e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build(); // 500 Internal Server Error
        }
    }

    // ===== NUEVO ENDPOINT: INICIAR RUTA =====
    @PostMapping("/{id}/start")
    public ResponseEntity<RouteResponse> startRoute(@PathVariable String id) {
        log.info("🚀 POST /routes/{}/start - Iniciando ruta", id);

        try {
            RouteResponse startedRoute = routeService.startRoute(id);

            log.info("✅ Ruta {} iniciada exitosamente", id);

            return ResponseEntity.ok(startedRoute);
        } catch (IllegalArgumentException e) {
            log.error("❌ ID de ruta inválido {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (IllegalStateException e) {
            log.error("❌ Error de estado iniciando ruta {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.error("❌ Error iniciando ruta {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("❌ Error inesperado iniciando ruta {}: {}", id, e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ===== NUEVO ENDPOINT: COMPLETAR RUTA =====
    @PostMapping("/{id}/complete")
    public ResponseEntity<RouteResponse> completeRoute(@PathVariable String id) {
        log.info("✅ POST /routes/{}/complete - Completando ruta", id);

        try {
            RouteResponse completedRoute = routeService.completeRoute(id);

            log.info("✅ Ruta {} completada exitosamente", id);

            return ResponseEntity.ok(completedRoute);
        } catch (IllegalArgumentException e) {
            log.error("❌ ID de ruta inválido {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (IllegalStateException e) {
            log.error("❌ Error de estado completando ruta {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.error("❌ Error completando ruta {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("❌ Error inesperado completando ruta {}: {}", id, e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}