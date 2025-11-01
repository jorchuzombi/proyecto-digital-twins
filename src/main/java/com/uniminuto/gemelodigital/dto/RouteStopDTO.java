// RouteStopDTO.java - DTO para paradas de ruta
package com.uniminuto.gemelodigital.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RouteStopDTO {
    private String id;
    private String name;
    private String address;
    private Double latitude;
    private Double longitude;
    private String type;        // ✅ String: "PICKUP", "DELIVERY", "STOP"
    private Integer stopOrder;  // ✅ Orden de la parada en la ruta
}