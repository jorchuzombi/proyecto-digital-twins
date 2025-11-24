package com.uniminuto.gemelodigital.entity;

import jakarta.persistence.*;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "route_stops")
public class RouteStop {

    public enum StopType {
        PICKUP, DELIVERY, STOP // Usar los mismos valores que en la BD
    }

    @Id
    private String id; // Cambiar de Long a String

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @Column(name = "stop_order", nullable = false)
    private Integer stopOrder;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "address", nullable = false, length = 300) // NOT NULL en BD
    private String address;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private StopType type;

    @Column(name = "estimated_arrival_time")
    private LocalTime estimatedArrivalTime;

    @Column(name = "wait_time_minutes")
    private Integer waitTimeMinutes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // Constructores
    public RouteStop() {}

    public RouteStop(String id, Route route, Integer stopOrder, String name, String address,
                     Double latitude, Double longitude, StopType type) {
        this.id = id;
        this.route = route;
        this.stopOrder = stopOrder;
        this.name = name;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.type = type;
        this.createdAt = LocalDateTime.now();
    }

    // PrePersist para generar ID automáticamente si es necesario
    @PrePersist
    public void generateId() {
        if (this.id == null) {
            this.id = java.util.UUID.randomUUID().toString();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    // Getters y Setters (ACTUALIZADOS)
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Route getRoute() {
        return route;
    }

    public void setRoute(Route route) {
        this.route = route;
    }

    public Integer getStopOrder() {
        return stopOrder;
    }

    public void setStopOrder(Integer stopOrder) {
        this.stopOrder = stopOrder;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public StopType getType() {
        return type;
    }

    public void setType(StopType type) {
        this.type = type;
    }

    public LocalTime getEstimatedArrivalTime() {
        return estimatedArrivalTime;
    }

    public void setEstimatedArrivalTime(LocalTime estimatedArrivalTime) {
        this.estimatedArrivalTime = estimatedArrivalTime;
    }

    public Integer getWaitTimeMinutes() {
        return waitTimeMinutes;
    }

    public void setWaitTimeMinutes(Integer waitTimeMinutes) {
        this.waitTimeMinutes = waitTimeMinutes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return "RouteStop{" +
                "id='" + id + '\'' +
                ", stopOrder=" + stopOrder +
                ", name='" + name + '\'' +
                ", address='" + address + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", type=" + type +
                '}';
    }
}