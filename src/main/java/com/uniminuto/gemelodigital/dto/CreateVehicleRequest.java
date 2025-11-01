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
public class CreateVehicleRequest {

    @NotBlank(message = "La placa es obligatoria")
    @Size(max = 20)
    private String placa;

    @NotBlank(message = "El tipo es obligatorio")
    @Size(max = 50)
    private String tipo;

    @NotBlank(message = "La marca es obligatoria")
    @Size(max = 100)
    private String marca;

    @NotBlank(message = "El modelo es obligatorio")
    @Size(max = 100)
    private String modelo;

    @NotNull(message = "El año es obligatorio")
    @Min(value = 1900)
    @Max(value = 2100)
    private Integer anio;

    @Size(max = 50)
    private String capacidadCarga;  // ✅ Cambiado
}