package com.uniminuto.gemelodigital.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "drivers", indexes = {
        @Index(name = "idx_licencia", columnList = "licencia"),
        @Index(name = "idx_estado", columnList = "estado"),
        @Index(name = "idx_disponibilidad", columnList = "disponibilidad")
})
@SQLDelete(sql = "UPDATE drivers SET deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, length = 100)
    private String apellido;

    @Column(unique = true, nullable = false, length = 50)
    private String licencia;

    @Column(name = "tipo_licencia", nullable = false, length = 10)
    private String tipoLicencia; // A1, A2, B1, B2, C1, C2, C3

    @Column(name = "fecha_vencimiento_licencia", nullable = false)
    private LocalDate fechaVencimientoLicencia;

    @Column(length = 20)
    private String telefono;

    @Column(length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DriverStatus estado = DriverStatus.ACTIVO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DriverAvailability disponibilidad = DriverAvailability.DISPONIBLE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum DriverStatus {
        ACTIVO,
        INACTIVO,
        SUSPENDIDO
    }

    public enum DriverAvailability {
        DISPONIBLE,
        EN_RUTA,
        DESCANSO
    }

    /**
     * Verifica si la licencia está vigente
     */
    public boolean isLicenciaVigente() {
        return fechaVencimientoLicencia.isAfter(LocalDate.now());
    }

    /**
     * Verifica si el conductor está disponible para asignar a una ruta
     */
    public boolean isDisponibleParaRuta() {
        return estado == DriverStatus.ACTIVO &&
                disponibilidad == DriverAvailability.DISPONIBLE &&
                isLicenciaVigente();
    }
}