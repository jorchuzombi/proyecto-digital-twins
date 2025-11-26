// RouteResponse.java - DTO para enviar datos al frontend
package com.uniminuto.gemelodigital.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RouteResponse {
    private String id;
    private String name;
    private String driverId;        // ✅ UUID del conductor
    private DriverInfo driver;      // ✅ Información completa del conductor
    private String vehicle;
    private String city;
    private Double distance;
    private String estimatedDuration;
    private String startTime;       // ✅ String en formato "HH:mm"
    private String endTime;         // ✅ String en formato "HH:mm"
    private Double fuelCost;
    private Double revenue;
    private String notes;
    private String status;          // ✅ String: "PENDING", "IN_PROGRESS", etc.
    private List<RouteStopDTO> stops;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ✅ CLASE INTERNA PARA INFORMACIÓN DEL CONDUCTOR
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DriverInfo {
        private String id;
        private String nombre;
        private String apellido;
        private String licencia;
    }
}