package com.uniminuto.gemelodigital.dto;

import com.uniminuto.gemelodigital.entity.Vehicle;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateVehicleStatusRequest {

    @NotNull(message = "El estado es obligatorio")
    private Vehicle.VehicleStatus estado;
}