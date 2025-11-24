package com.uniminuto.gemelodigital.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vehicle_positions")
public class VehiclePosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vehicle_id", unique = true, nullable = false, length = 100)
    private String vehicleId;

    @Column(name = "driver_id", nullable = false, length = 100)
    private String driverId;

    @Column(name = "driver_name", nullable = false, length = 200)
    private String driverName;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "heading")
    private Double heading = 0.0;

    @Column(name = "speed")
    private Double speed = 0.0;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "AVAILABLE"; // AVAILABLE, BUSY, OFFLINE

    @Column(name = "current_route_id", length = 100)
    private String currentRouteId;

    @Column(name = "route_id", length = 50)
    private String routeId;

    @Column(name = "next_stop", length = 500)
    private String nextStop;

    @Column(name = "eta", length = 50)
    private String eta;

    @Column(name = "distance_to_destination")
    private Double distanceToDestination;

    @Column(name = "traffic_level", length = 20)
    private String trafficLevel; // LOW, MEDIUM, HIGH, HEAVY

    @Column(name = "last_update", nullable = false)
    private LocalDateTime lastUpdate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Enum para uso interno (opcional)
    public enum VehicleStatus {
        AVAILABLE, BUSY, OFFLINE
    }

    // Constructores
    public VehiclePosition() {
        this.lastUpdate = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
        this.status = "AVAILABLE";
        this.heading = 0.0;
        this.speed = 0.0;
    }

    public VehiclePosition(String vehicleId) {
        this();
        this.vehicleId = vehicleId;
    }

    // Getters y Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(String vehicleId) {
        this.vehicleId = vehicleId;
    }

    public String getDriverId() {
        return driverId;
    }

    public void setDriverId(String driverId) {
        this.driverId = driverId;
    }

    public String getDriverName() {
        return driverName;
    }

    public void setDriverName(String driverName) {
        this.driverName = driverName;
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

    public Double getHeading() {
        return heading;
    }

    public void setHeading(Double heading) {
        this.heading = heading;
    }

    public Double getSpeed() {
        return speed;
    }

    public void setSpeed(Double speed) {
        this.speed = speed;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    // ✅ Método para compatibilidad con Enum
    public void setStatus(VehicleStatus status) {
        this.status = status.name();
    }

    public String getCurrentRouteId() {
        return currentRouteId;
    }

    public void setCurrentRouteId(String currentRouteId) {
        this.currentRouteId = currentRouteId;
    }

    public String getRouteId() {
        return routeId;
    }

    public void setRouteId(String routeId) {
        this.routeId = routeId;
    }

    public String getNextStop() {
        return nextStop;
    }

    public void setNextStop(String nextStop) {
        this.nextStop = nextStop;
    }

    public String getEta() {
        return eta;
    }

    public void setEta(String eta) {
        this.eta = eta;
    }

    public Double getDistanceToDestination() {
        return distanceToDestination;
    }

    public void setDistanceToDestination(Double distanceToDestination) {
        this.distanceToDestination = distanceToDestination;
    }

    public String getTrafficLevel() {
        return trafficLevel;
    }

    public void setTrafficLevel(String trafficLevel) {
        this.trafficLevel = trafficLevel;
    }

    public LocalDateTime getLastUpdate() {
        return lastUpdate;
    }

    public void setLastUpdate(LocalDateTime lastUpdate) {
        this.lastUpdate = lastUpdate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @PreUpdate
    @PrePersist
    public void updateTimestamp() {
        this.lastUpdate = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    @Override
    public String toString() {
        return "VehiclePosition{" +
                "id=" + id +
                ", vehicleId='" + vehicleId + '\'' +
                ", driverName='" + driverName + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", status='" + status + '\'' +
                ", speed=" + speed +
                ", routeId='" + routeId + '\'' +
                '}';
    }
}