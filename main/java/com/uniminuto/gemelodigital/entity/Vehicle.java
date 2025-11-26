package com.uniminuto.gemelodigital.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;

@Entity
@Table(name = "vehicles", indexes = {
        @Index(name = "idx_placa", columnList = "placa"),
        @Index(name = "idx_estado", columnList = "estado")
})
@SQLDelete(sql = "UPDATE vehicles SET deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 20)
    private String placa;

    @Column(nullable = false, length = 50)
    private String marca;

    @Column(nullable = false, length = 50)
    private String modelo;

    @Column(nullable = false)
    private Integer anio;

    @Column(nullable = false, length = 50)
    private String tipo;

    @Column(name = "capacidad_carga", length = 50)
    private String capacidadCarga;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private VehicleStatus estado = VehicleStatus.ACTIVO;

    @Column(name = "kilometraje")
    private Double kilometraje;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // ✅ MÉTODO CORREGIDO - Agregar @Transient o eliminar
    @Transient
    public Double getCapacidadKg() {
        if (capacidadCarga != null && !capacidadCarga.isEmpty()) {
            try {
                // Extraer solo números y puntos del string
                String numeroStr = capacidadCarga.replaceAll("[^0-9.]", "");
                if (!numeroStr.isEmpty()) {
                    return Double.parseDouble(numeroStr);
                }
            } catch (NumberFormatException e) {
                // Si no se puede convertir, retornar null
                return null;
            }
        }
        return null;
    }

    // ✅ ENUM VehicleStatus ACTUALIZADO para coincidir con BD
    public enum VehicleStatus {
        ACTIVO,
        DISPONIBLE,
        EN_RUTA,
        EN_MANTENIMIENTO,
        FUERA_DE_SERVICIO,
        INACTIVO
    }

    // ✅ MÉTODOS ACTUALIZADOS - Getters calculados

    /**
     * Verifica si el vehículo está activo
     */
    public boolean isActivo() {
        return this.estado == VehicleStatus.ACTIVO;
    }

    /**
     * Verifica si el vehículo está disponible para ser asignado a una ruta
     */
    public boolean isDisponible() {
        return this.estado == VehicleStatus.DISPONIBLE || this.estado == VehicleStatus.ACTIVO;
    }

    /**
     * Verifica si el vehículo está en mantenimiento
     */
    public boolean isEnMantenimiento() {
        return this.estado == VehicleStatus.EN_MANTENIMIENTO;
    }

    /**
     * Verifica si el vehículo está en ruta
     */
    public boolean isEnRuta() {
        return this.estado == VehicleStatus.EN_RUTA;
    }

    /**
     * Verifica si el vehículo está fuera de servicio
     */
    public boolean isFueraDeServicio() {
        return this.estado == VehicleStatus.FUERA_DE_SERVICIO;
    }

    /**
     * Verifica si el vehículo está inactivo
     */
    public boolean isInactivo() {
        return this.estado == VehicleStatus.INACTIVO;
    }

    // ✅ MÉTODOS DE CAMBIO DE ESTADO ACTUALIZADOS

    public void marcarComoActivo() {
        this.estado = VehicleStatus.ACTIVO;
    }

    public void marcarComoDisponible() {
        this.estado = VehicleStatus.DISPONIBLE;
    }

    public void marcarComoEnRuta() {
        this.estado = VehicleStatus.EN_RUTA;
    }

    public void marcarComoEnMantenimiento() {
        this.estado = VehicleStatus.EN_MANTENIMIENTO;
    }

    public void marcarComoFueraDeServicio() {
        this.estado = VehicleStatus.FUERA_DE_SERVICIO;
    }

    public void marcarComoInactivo() {
        this.estado = VehicleStatus.INACTIVO;
    }

    // ✅ MÉTODOS ADICIONALES ÚTILES

    /**
     * Obtiene el nombre completo del vehículo (marca + modelo + placa)
     */
    public String getNombreCompleto() {
        return String.format("%s %s (%s)", marca, modelo, placa);
    }

    /**
     * Obtiene la descripción del tipo con capacidad
     */
    public String getDescripcionTipo() {
        if (capacidadCarga != null && !capacidadCarga.isEmpty()) {
            return String.format("%s - %s", tipo, capacidadCarga);
        }
        return tipo;
    }

    /**
     * Verifica si el vehículo requiere mantenimiento por kilometraje
     * (ejemplo: cada 10,000 km)
     */
    public boolean requiereMantenimiento() {
        if (kilometraje == null) return false;
        return kilometraje % 10000 < 1000; // Dentro de 1000 km del mantenimiento
    }

    /**
     * Calcula la edad del vehículo en años
     */
    public int getEdadVehiculo() {
        return LocalDateTime.now().getYear() - this.anio;
    }

    /**
     * Verifica si el vehículo es antiguo (más de 10 años)
     */
    public boolean isAntiguo() {
        return getEdadVehiculo() > 10;
    }

    /**
     * Actualiza el kilometraje del vehículo
     */
    public void actualizarKilometraje(Double nuevoKilometraje) {
        if (nuevoKilometraje != null && nuevoKilometraje > 0) {
            this.kilometraje = nuevoKilometraje;
        }
    }

    /**
     * Agrega kilómetros al total actual
     */
    public void agregarKilometros(Double kilometros) {
        if (this.kilometraje == null) {
            this.kilometraje = 0.0;
        }
        if (kilometros != null && kilometros > 0) {
            this.kilometraje += kilometros;
        }
    }

    /**
     * Obtiene el estado como texto en español
     */
    public String getEstadoTexto() {
        return switch (this.estado) {
            case ACTIVO -> "Activo";
            case DISPONIBLE -> "Disponible";
            case EN_RUTA -> "En Ruta";
            case EN_MANTENIMIENTO -> "En Mantenimiento";
            case FUERA_DE_SERVICIO -> "Fuera de Servicio";
            case INACTIVO -> "Inactivo";
        };
    }

    /**
     * Obtiene un icono representativo del estado
     */
    public String getEstadoIcono() {
        return switch (this.estado) {
            case ACTIVO -> "🟢";
            case DISPONIBLE -> "✅";
            case EN_RUTA -> "🚚";
            case EN_MANTENIMIENTO -> "🔧";
            case FUERA_DE_SERVICIO -> "❌";
            case INACTIVO -> "⚫";
        };
    }

    /**
     * Verifica si puede ser asignado a una nueva ruta
     */
    public boolean puedeSerAsignado() {
        return (this.estado == VehicleStatus.ACTIVO || this.estado == VehicleStatus.DISPONIBLE)
                && !requiereMantenimiento();
    }

    /**
     * Obtiene los estados considerados como "disponibles" para asignación
     */
    public static VehicleStatus[] getEstadosDisponibles() {
        return new VehicleStatus[]{VehicleStatus.ACTIVO, VehicleStatus.DISPONIBLE};
    }

    /**
     * Obtiene los estados considerados como "no disponibles" para asignación
     */
    public static VehicleStatus[] getEstadosNoDisponibles() {
        return new VehicleStatus[]{
                VehicleStatus.EN_RUTA,
                VehicleStatus.EN_MANTENIMIENTO,
                VehicleStatus.FUERA_DE_SERVICIO,
                VehicleStatus.INACTIVO
        };
    }
}