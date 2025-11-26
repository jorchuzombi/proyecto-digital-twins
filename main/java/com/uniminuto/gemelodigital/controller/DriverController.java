package com.uniminuto.gemelodigital.controller;

import com.uniminuto.gemelodigital.dto.*;
import com.uniminuto.gemelodigital.service.DriverService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/drivers") // ✅ IMPORTANTE: Sin /api
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // ✅ CORS directo en el controller
public class DriverController {

    private final DriverService driverService;

    // ✅ Agrega este método para debugging
    @GetMapping("/test")
    public ResponseEntity<String> test() {
        System.out.println("✅ TEST ENDPOINT HIT - /api/drivers/test");
        return ResponseEntity.ok("DriverController está funcionando correctamente!");
    }

    @PostMapping
    public ResponseEntity<DriverResponse> createDriver(@RequestBody CreateDriverRequest request) {
        System.out.println("🚀 POST /drivers - Creando conductor: " + request.getNombre());
        System.out.println("📧 Email: " + request.getEmail());
        System.out.println("📄 Licencia: " + request.getLicencia());

        try {
            DriverResponse driver = driverService.createDriver(request);
            System.out.println("✅ Conductor creado exitosamente: " + driver.getId());
            return ResponseEntity.ok(driver);
        } catch (Exception e) {
            System.err.println("❌ Error creando conductor: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping
    public ResponseEntity<DriverListResponse> getAllDrivers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String disponibilidad) {

        System.out.println("📋 GET /drivers - Listando conductores");
        System.out.println("🔍 Filtros - search: " + search + ", estado: " + estado + ", disponibilidad: " + disponibilidad);

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        DriverListResponse drivers = driverService.getAllDrivers(pageable, search, estado, disponibilidad);
        return ResponseEntity.ok(drivers);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DriverResponse> getDriver(@PathVariable String id) {
        System.out.println("👤 GET /drivers/" + id);
        DriverResponse driver = driverService.getDriver(id);
        return ResponseEntity.ok(driver);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DriverResponse> updateDriver(
            @PathVariable String id,
            @RequestBody UpdateDriverRequest request) {
        System.out.println("✏️ PUT /drivers/" + id);
        DriverResponse driver = driverService.updateDriver(id, request);
        return ResponseEntity.ok(driver);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDriver(@PathVariable String id) {
        System.out.println("🗑️ DELETE /drivers/" + id);
        driverService.deleteDriver(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/available")
    public ResponseEntity<List<DriverResponse>> getAvailableDrivers() {
        System.out.println("🟢 GET /drivers/available");
        List<DriverResponse> drivers = driverService.getAvailableDrivers();
        return ResponseEntity.ok(drivers);
    }
}