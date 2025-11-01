// RouteDTO.java - DTO para recibir datos del frontend
package com.uniminuto.gemelodigital.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RouteDTO {
    private String name;
    private String driverId;           // ✅ UUID del conductor
    private String vehicle;
    private String city;
    private Double distance;
    private String estimatedDuration;
    private String startTime;          // ✅ String en formato "HH:mm"
    private String endTime;            // ✅ String en formato "HH:mm"
    private Double fuelCost;
    private Double revenue;
    private String notes;
    private String status;             // ✅ String: "PENDING", "IN_PROGRESS", etc.
    private List<RouteStopDTO> stops;  // ✅ Lista de paradas
}