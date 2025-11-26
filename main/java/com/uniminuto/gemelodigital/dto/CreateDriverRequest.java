package com.uniminuto.gemelodigital.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateDriverRequest {
    private String nombre;
    private String apellido;
    private String licencia;
    private String tipoLicencia;
    private LocalDate fechaVencimientoLicencia;
    private String telefono;
    private String email;
}