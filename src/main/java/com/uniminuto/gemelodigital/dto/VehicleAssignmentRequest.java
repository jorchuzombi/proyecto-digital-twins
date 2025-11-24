// VehicleAssignmentRequest.java
package com.uniminuto.gemelodigital.dto;

import lombok.Data; // O usa getters/setters manuales si no usas Lombok

@Data
public class VehicleAssignmentRequest {
    private String vehicleId;
    private String driverId;
}