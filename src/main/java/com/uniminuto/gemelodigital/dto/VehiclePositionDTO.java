package com.uniminuto.gemelodigital.dto;

/**
 * DTO para transferir posiciones de vehículos
 * Se usa en las respuestas REST del tracking
 */
public class VehiclePositionDTO {

    private Long id;
    private String vehicleId;
    private Double latitude;
    private Double longitude;
    private String driverId;
    private String routeId;
    private String status; // AVAILABLE, BUSY, OFFLINE
    private Double speed;
    private Double heading;
    private String lastUpdate;

    // Constructores
    public VehiclePositionDTO() {}

    public VehiclePositionDTO(String vehicleId, Double latitude, Double longitude) {
        this.vehicleId = vehicleId;
        this.latitude = latitude;
        this.longitude = longitude;
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

    public String getDriverId() {
        return driverId;
    }

    public void setDriverId(String driverId) {
        this.driverId = driverId;
    }

    public String getRouteId() {
        return routeId;
    }

    public void setRouteId(String routeId) {
        this.routeId = routeId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getSpeed() {
        return speed;
    }

    public void setSpeed(Double speed) {
        this.speed = speed;
    }

    public Double getHeading() {
        return heading;
    }

    public void setHeading(Double heading) {
        this.heading = heading;
    }

    public String getLastUpdate() {
        return lastUpdate;
    }

    public void setLastUpdate(String lastUpdate) {
        this.lastUpdate = lastUpdate;
    }

    @Override
    public String toString() {
        return "VehiclePositionDTO{" +
                "id=" + id +
                ", vehicleId='" + vehicleId + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", status='" + status + '\'' +
                ", speed=" + speed +
                '}';
    }
}