package com.uniminuto.gemelodigital.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "route_stops", indexes = {
        @Index(name = "idx_route_id", columnList = "route_id"),
        @Index(name = "idx_stop_order", columnList = "stop_order")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteStop {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    @JsonBackReference
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Route route;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 300)
    private String address;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    // ✅ ENUM ACTIVO - Con @Enumerated y @Column
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, name = "type")
    @Builder.Default
    private StopType type = StopType.STOP; // ✅ ACTIVA: valor por defecto

    @Column(nullable = false, name = "stop_order")
    private Integer stopOrder;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ✅ ENUM StopType - COMPLETAMENTE ACTIVO
    public enum StopType {
        PICKUP,     // ✅ Usado en: Builder.Default, isPickup(), setAsPickup()
        DELIVERY,   // ✅ Usado en: isDelivery(), setAsDelivery()
        STOP        // ✅ Usado en: isStop(), setAsStop()
    }

    // ✅ MÉTODOS DE VERIFICACIÓN - Activan PICKUP, DELIVERY, STOP
    public boolean isPickup() {
        return this.type == StopType.PICKUP;
    }

    public boolean isDelivery() {
        return this.type == StopType.DELIVERY;
    }

    public boolean isStop() {
        return this.type == StopType.STOP;
    }

    // ✅ MÉTODOS DE CONFIGURACIÓN - Activan todos los valores del enum
    public void setAsPickup() {
        this.type = StopType.PICKUP;
    }

    public void setAsDelivery() {
        this.type = StopType.DELIVERY;
    }

    public void setAsStop() {
        this.type = StopType.STOP;
    }

    // ✅ MÉTODO CON SWITCH - Activa todos los valores
    public String getTypeDescription() {
        return switch (this.type) {
            case PICKUP -> "Punto de Recogida";
            case DELIVERY -> "Punto de Entrega";
            case STOP -> "Parada Intermedia";
        };
    }

    // ✅ MÉTODO CON SWITCH - Retorna icono según tipo
    public String getTypeIcon() {
        return switch (this.type) {
            case PICKUP -> "📦";
            case DELIVERY -> "🚚";
            case STOP -> "🛑";
        };
    }

    // ✅ MÉTODO - Validar tipo de parada
    public boolean isValidType() {
        return this.type == StopType.PICKUP ||
                this.type == StopType.DELIVERY ||
                this.type == StopType.STOP;
    }

    // ✅ MÉTODO - Cambiar tipo de parada
    public void changeType(StopType newType) {
        this.type = newType;
    }

    // ✅ MÉTODO - Obtener nombre completo de la parada
    public String getFullDescription() {
        return String.format("%s %s - %s",
                getTypeIcon(),
                getTypeDescription(),
                this.name
        );
    }

    // ✅ MÉTODO - Verificar si es primera parada
    public boolean isFirstStop() {
        return this.stopOrder != null && this.stopOrder == 1;
    }

    // ✅ MÉTODO - Verificar si es última parada
    public boolean isLastStop(int totalStops) {
        return this.stopOrder != null && this.stopOrder == totalStops;
    }
}