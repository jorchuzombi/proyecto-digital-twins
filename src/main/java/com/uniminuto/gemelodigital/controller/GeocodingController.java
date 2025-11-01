package com.uniminuto.gemelodigital.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/geocoding")
@CrossOrigin(origins = "*")
public class GeocodingController {

    private final RestTemplate restTemplate;

    @Autowired
    public GeocodingController() {
        this.restTemplate = new RestTemplate();
        System.out.println("🎯 GEOCODING CONTROLLER INICIALIZADO");
    }

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        System.out.println("✅ GEOCODING TEST ENDPOINT CALLED!");
        return ResponseEntity.ok("🎯 Geocoding controller is WORKING!");
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchAddress(@RequestParam String q) {
        try {
            System.out.println("🌎 GEOCODING SEARCH: " + q);

            // ✅ NO encodear manualmente - Spring UriComponentsBuilder lo hace
            String url = String.format(
                    "https://nominatim.openstreetmap.org/search?q=%s&format=json&addressdetails=1&limit=5&countrycodes=co",
                    q.replace(" ", "+")  // Solo reemplazar espacios
            );

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "GemeloDigital/1.0");
            headers.set("Accept-Language", "es");

            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Object[]> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    Object[].class  // ← Cambiar a Object[] en lugar de Object
            );

            Object[] results = response.getBody();
            System.out.println("✅ GEOCODING: " + (results != null ? results.length : 0) + " resultados");

            return ResponseEntity.ok(results != null ? results : new Object[0]);

        } catch (Exception e) {
            System.out.println("❌ GEOCODING ERROR: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(
                    new ErrorResponse("Error en geocoding: " + e.getMessage())
            );
        }
    }

    @GetMapping("/reverse")
    public ResponseEntity<?> reverseGeocode(
            @RequestParam String lat,
            @RequestParam String lon
    ) {
        try {
            System.out.println("🌎 REVERSE GEOCODING: " + lat + ", " + lon);

            String url = String.format(
                    "https://nominatim.openstreetmap.org/reverse?lat=%s&lon=%s&format=json&addressdetails=1&zoom=18",
                    lat, lon
            );

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "GemeloDigital/1.0");
            headers.set("Accept-Language", "es");

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Object> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    Object.class
            );

            System.out.println("✅ REVERSE GEOCODING SUCCESS");
            return ResponseEntity.ok(response.getBody());

        } catch (Exception e) {
            System.out.println("❌ REVERSE GEOCODING ERROR: " + e.getMessage());
            return ResponseEntity.status(500).body(
                    new ErrorResponse("Error en reverse geocoding: " + e.getMessage())
            );
        }
    }

    // Clase auxiliar para errores
    private static class ErrorResponse {
        public String error;
        public ErrorResponse(String error) {
            this.error = error;
        }
    }
}       