// RouteController.java - ACTUALIZADO CON SERVICE
package com.uniminuto.gemelodigital.controller;

import com.uniminuto.gemelodigital.dto.RouteDTO;
import com.uniminuto.gemelodigital.dto.RouteResponse;
import com.uniminuto.gemelodigital.service.RouteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    // ✅ ACTUALIZAR RUTA - CORREGIDO
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
}