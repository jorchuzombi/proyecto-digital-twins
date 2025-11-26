// Route.java - CORREGIDO CON UUID driverId
package com.uniminuto.gemelodigital.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "routes")
@SQLDelete(sql = "UPDATE routes SET deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 200)
    private String name;

    // ✅ USAR STRING PARA driver_id (compatible con VARCHAR en BD)
    @Column(name = "driver_id", length = 36, columnDefinition = "VARCHAR(36)")
    private String driverId;

    @Column(nullable = false, length = 100)
    private String vehicle;

    @Column(nullable = false, length = 100)
    private String city;

    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonManagedReference
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<RouteStop> stops = new ArrayList<>();

    @Column(nullable = false)
    private Double distance;

    @Column(name = "estimated_duration")
    private String estimatedDuration;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "fuel_cost")
    private Double fuelCost;

    @Column(nullable = false)
    private Double revenue;

    @Column(length = 500)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RouteStatus status = RouteStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // ✅ ENUM RouteStatus
    public enum RouteStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        OPTIMIZED
    }

    // ✅ MÉTODOS DE NEGOCIO
    public Double calculateProfit() {
        return revenue - (fuelCost != null ? fuelCost : 0);
    }

    public void updateStatus(RouteStatus newStatus) {
        this.status = newStatus;
    }

    public void startRoute() {
        this.status = RouteStatus.IN_PROGRESS;
    }

    public void completeRoute() {
        this.status = RouteStatus.COMPLETED;
    }

    public void cancelRoute() {
        this.status = RouteStatus.CANCELLED;
    }

    public void optimizeRoute() {
        this.status = RouteStatus.OPTIMIZED;
    }

    public boolean isPending() {
        return this.status == RouteStatus.PENDING;
    }

    public boolean isInProgress() {
        return this.status == RouteStatus.IN_PROGRESS;
    }

    public boolean isCompleted() {
        return this.status == RouteStatus.COMPLETED;
    }

    public boolean isCancelled() {
        return this.status == RouteStatus.CANCELLED;
    }

    public boolean isOptimized() {
        return this.status == RouteStatus.OPTIMIZED;
    }
}