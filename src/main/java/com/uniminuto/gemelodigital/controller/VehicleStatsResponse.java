package com.uniminuto.gemelodigital.controller;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleStatsResponse {
    private Long total;
    private Long disponibles;  // ✅ Cambiado de "activos"
    private Long enRuta;        // ✅ Agregado
    private Long enMantenimiento;
    private Long fueraDeServicio;  // ✅ Cambiado de "inactivos"
}   
