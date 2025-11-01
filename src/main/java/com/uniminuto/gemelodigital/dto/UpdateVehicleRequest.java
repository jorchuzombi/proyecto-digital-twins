package com.uniminuto.gemelodigital.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateVehicleRequest {

    @Size(max = 50)
    private String tipo;

    @Size(max = 100)
    private String marca;

    @Size(max = 100)
    private String modelo;

    @Min(value = 1900)
    @Max(value = 2100)
    private Integer anio;

    @Size(max = 50)
    private String capacidadCarga;  // ✅ Cambiado de capacidadKg y capacidadM3

    @DecimalMin(value = "0.0")
    private Double kilometraje;  // ✅ Agregado
}