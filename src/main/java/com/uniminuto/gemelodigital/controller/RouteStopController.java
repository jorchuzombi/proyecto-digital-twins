package com.uniminuto.gemelodigital.controller;

import com.uniminuto.gemelodigital.entity.RouteStop;
import com.uniminuto.gemelodigital.repository.RouteStopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/route-stops")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RouteStopController {

    private final RouteStopRepository routeStopRepository;

    // ✅ Endpoint de prueba
    @GetMapping("/test")
    public ResponseEntity<String> test() {
        System.out.println("✅ ROUTE STOP CONTROLLER - TEST ENDPOINT HIT");
        return ResponseEntity.ok("RouteStopController está funcionando correctamente!");
    }

    // ✅ Obtener todas las paradas
    @GetMapping
    public ResponseEntity<List<RouteStop>> getAllStops() {
        System.out.println("📍 GET /route-stops - Obteniendo todas las paradas");
        List<RouteStop> stops = routeStopRepository.findAll();
        System.out.println("✅ Encontradas " + stops.size() + " paradas");
        return ResponseEntity.ok(stops);
    }

    // ✅ Crear una nueva parada
    @PostMapping
    public ResponseEntity<RouteStop> createStop(@RequestBody RouteStop stop) {
        System.out.println("➕ POST /route-stops - Creando nueva parada: " + stop.getName());
        try {
            RouteStop savedStop = routeStopRepository.save(stop);
            System.out.println("✅ Parada creada exitosamente: " + savedStop.getId());
            return ResponseEntity.ok(savedStop);
        } catch (Exception e) {
            System.err.println("❌ Error creando parada: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    // ✅ Obtener una parada por ID - CORREGIDO: Usar String en lugar de Long
    @GetMapping("/{id}")
    public ResponseEntity<RouteStop> getStop(@PathVariable String id) {
        System.out.println("👀 GET /route-stops/" + id);
        Optional<RouteStop> stop = routeStopRepository.findById(id);
        return stop.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ✅ Actualizar una parada
    @PutMapping("/{id}")
    public ResponseEntity<RouteStop> updateStop(@PathVariable String id, @RequestBody RouteStop stopDetails) {
        System.out.println("✏️ PUT /route-stops/" + id);
        try {
            Optional<RouteStop> optionalStop = routeStopRepository.findById(id);
            if (optionalStop.isPresent()) {
                RouteStop stop = optionalStop.get();

                // Actualizar campos
                if (stopDetails.getName() != null) stop.setName(stopDetails.getName());
                if (stopDetails.getAddress() != null) stop.setAddress(stopDetails.getAddress());
                if (stopDetails.getLatitude() != null) stop.setLatitude(stopDetails.getLatitude());
                if (stopDetails.getLongitude() != null) stop.setLongitude(stopDetails.getLongitude());
                if (stopDetails.getStopOrder() != null) stop.setStopOrder(stopDetails.getStopOrder());
                if (stopDetails.getType() != null) stop.setType(stopDetails.getType());
                if (stopDetails.getEstimatedArrivalTime() != null) stop.setEstimatedArrivalTime(stopDetails.getEstimatedArrivalTime());
                if (stopDetails.getWaitTimeMinutes() != null) stop.setWaitTimeMinutes(stopDetails.getWaitTimeMinutes());

                RouteStop updatedStop = routeStopRepository.save(stop);
                System.out.println("✅ Parada actualizada: " + id);
                return ResponseEntity.ok(updatedStop);
            } else {
                System.out.println("❌ Parada no encontrada: " + id);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("❌ Error actualizando parada: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    // ✅ Eliminar una parada
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStop(@PathVariable String id) {
        System.out.println("🗑️ DELETE /route-stops/" + id);
        try {
            if (routeStopRepository.existsById(id)) {
                routeStopRepository.deleteById(id);
                System.out.println("✅ Parada eliminada: " + id);
                return ResponseEntity.ok().build();
            } else {
                System.out.println("❌ Parada no encontrada: " + id);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("❌ Error eliminando parada: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    // ✅ Obtener paradas por ruta
    @GetMapping("/route/{routeId}")
    public ResponseEntity<List<RouteStop>> getStopsByRoute(@PathVariable String routeId) {
        System.out.println("📍 GET /route-stops/route/" + routeId);
        List<RouteStop> stops = routeStopRepository.findByRoute_IdOrderByStopOrder(routeId);
        System.out.println("✅ Encontradas " + stops.size() + " paradas para la ruta: " + routeId);
        return ResponseEntity.ok(stops);
    }
}