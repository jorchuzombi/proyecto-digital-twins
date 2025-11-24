package com.uniminuto.gemelodigital.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entidad que representa el progreso de una ruta en tiempo real
 */
@Entity
@Table(name = "route_progress", indexes = {
        @Index(name = "idx_route_id", columnList = "route_id"),
        @Index(name = "idx_status", columnList = "status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "route_id", nullable = false, unique = true, length = 50)
    private String routeId;

    @Column(name = "current_stop_index", nullable = false)
    @Builder.Default
    private Integer currentStopIndex = 0;

    @Column(nullable = false)
    @Builder.Default
    private Double progress = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RouteStatus status = RouteStatus.ASSIGNED;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "completion_time")
    private LocalDateTime completionTime;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "last_update", nullable = false)
    private LocalDateTime lastUpdate;

    /**
     * Constructor con parámetros básicos
     */
    public RouteProgress(String routeId) {
        this.routeId = routeId;
        this.currentStopIndex = 0;
        this.progress = 0.0;
        this.status = RouteStatus.ASSIGNED;
        this.startTime = LocalDateTime.now();
    }

    /**
     * Enum para estados de ruta
     */
    public enum RouteStatus {
        ASSIGNED,      // Ruta asignada pero no iniciada
        STARTED,       // Ruta en progreso
        COMPLETED,     // Ruta completada exitosamente
        CANCELLED      // Ruta cancelada
    }

    // ===== MÉTODOS DE NEGOCIO =====

    /**
     * Iniciar ruta
     */
    public void start() {
        this.status = RouteStatus.STARTED;
        this.startTime = LocalDateTime.now();
    }

    /**
     * Marcar ruta como completada
     */
    public void complete() {
        this.status = RouteStatus.COMPLETED;
        this.progress = 100.0;
        this.completionTime = LocalDateTime.now();
    }

    /**
     * Cancelar ruta
     */
    public void cancel() {
        this.status = RouteStatus.CANCELLED;
    }

    /**
     * Verificar si la ruta está en progreso
     */
    public boolean isInProgress() {
        return this.status == RouteStatus.STARTED;
    }

    /**
     * Verificar si la ruta está completada
     */
    public boolean isCompleted() {
        return this.status == RouteStatus.COMPLETED;
    }

    /**
     * Verificar si la ruta está asignada
     */
    public boolean isAssigned() {
        return this.status == RouteStatus.ASSIGNED;
    }

    /**
     * Verificar si la ruta está cancelada
     */
    public boolean isCancelled() {
        return this.status == RouteStatus.CANCELLED;
    }

    /**
     * Avanzar a la siguiente parada
     */
    public void advanceToNextStop() {
        this.currentStopIndex++;
    }

    /**
     * Actualizar progreso
     */
    public void updateProgress(Double progress) {
        this.progress = Math.min(progress, 100.0);
    }

    @Override
    public String toString() {
        return "RouteProgress{" +
                "id=" + id +
                ", routeId='" + routeId + '\'' +
                ", currentStopIndex=" + currentStopIndex +
                ", progress=" + progress +
                ", status=" + status +
                '}';
    }
}