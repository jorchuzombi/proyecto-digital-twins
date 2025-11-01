package com.uniminuto.gemelodigital.dto;

import com.uniminuto.gemelodigital.entity.Vehicle;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleListResponse {

    private String id;
    private String placa;
    private String tipo;
    private String marca;
    private String modelo;
    private String capacidadCarga;  // ✅ Cambiado de capacidadKg
    private Double kilometraje;      // ✅ Agregado
    private Vehicle.VehicleStatus estado;
    private String estadoTexto;      // ✅ Agregado

    public static VehicleListResponse fromEntity(Vehicle vehicle) {
        if (vehicle == null) return null;

        return VehicleListResponse.builder()
                .id(vehicle.getId())
                .placa(vehicle.getPlaca())
                .tipo(vehicle.getTipo())
                .marca(vehicle.getMarca())
                .modelo(vehicle.getModelo())
                .capacidadCarga(vehicle.getCapacidadCarga())  // ✅ Corregido
                .kilometraje(vehicle.getKilometraje())
                .estado(vehicle.getEstado())
                .estadoTexto(vehicle.getEstadoTexto())
                .build();
    }
}