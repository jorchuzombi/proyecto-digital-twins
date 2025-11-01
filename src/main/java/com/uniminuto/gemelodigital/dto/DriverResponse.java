package com.uniminuto.gemelodigital.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class DriverResponse {
    private String id;
    private String nombre;
    private String apellido;
    private String licencia;
    private String tipoLicencia;
    private LocalDate fechaVencimientoLicencia;
    private String telefono;
    private String email;
    private String estado;
    private String disponibilidad;
    private boolean licenciaVigente;
    private boolean disponibleParaRuta;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}