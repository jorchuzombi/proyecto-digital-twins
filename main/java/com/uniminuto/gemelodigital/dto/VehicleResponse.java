package com.uniminuto.gemelodigital.dto;

import com.uniminuto.gemelodigital.entity.Vehicle;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleResponse {
    private String id;
    private String placa;
    private String tipo;
    private String marca;
    private String modelo;
    private Integer anio;
    private String capacidadCarga;  // ✅ Cambiado de capacidadKg y capacidadM3
    private Double kilometraje;
    private Vehicle.VehicleStatus estado;
    private String estadoTexto;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static VehicleResponse fromEntity(Vehicle vehicle) {
        return VehicleResponse.builder()
                .id(vehicle.getId())
                .placa(vehicle.getPlaca())
                .tipo(vehicle.getTipo())
                .marca(vehicle.getMarca())
                .modelo(vehicle.getModelo())
                .anio(vehicle.getAnio())
                .capacidadCarga(vehicle.getCapacidadCarga())  // ✅ Corregido
                .kilometraje(vehicle.getKilometraje())
                .estado(vehicle.getEstado())
                .estadoTexto(vehicle.getEstadoTexto())
                .createdAt(vehicle.getCreatedAt())
                .updatedAt(vehicle.getUpdatedAt())
                .build();
    }
}