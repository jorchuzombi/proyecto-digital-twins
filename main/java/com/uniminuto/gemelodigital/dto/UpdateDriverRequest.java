package com.uniminuto.gemelodigital.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class UpdateDriverRequest {
    private String nombre;
    private String apellido;
    private String tipoLicencia;
    private LocalDate fechaVencimientoLicencia;
    private String telefono;
    private String email;
    private String estado;
    private String disponibilidad;
}