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

    // ✅ Obtener una parada por ID
    @GetMapping("/{id}")
    public ResponseEntity<RouteStop> getStop(@PathVariable String id) {
        System.out.println("👀 GET /route-stops/" + id);
        Optional<RouteStop> stop = routeStopRepository.findById(id);
        return stop.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}