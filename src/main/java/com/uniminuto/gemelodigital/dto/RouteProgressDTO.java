package com.uniminuto.gemelodigital.dto;

/**
 * DTO para transferir progreso de rutas
 */
public class RouteProgressDTO {

    private Long id;
    private String routeId;
    private Integer currentStopIndex;
    private Double progress;
    private String status; // ASSIGNED, STARTED, COMPLETED, CANCELLED
    private String startTime;
    private String completionTime;
    private String lastUpdate;

    // Información adicional de la ruta
    private String routeName;
    private String vehicleId;
    private String driverId;
    private Integer totalStops;

    // Constructores
    public RouteProgressDTO() {}

    public RouteProgressDTO(String routeId, Double progress, String status) {
        this.routeId = routeId;
        this.progress = progress;
        this.status = status;
    }

    // Getters y Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRouteId() {
        return routeId;
    }

    public void setRouteId(String routeId) {
        this.routeId = routeId;
    }

    public Integer getCurrentStopIndex() {
        return currentStopIndex;
    }

    public void setCurrentStopIndex(Integer currentStopIndex) {
        this.currentStopIndex = currentStopIndex;
    }

    public Double getProgress() {
        return progress;
    }

    public void setProgress(Double progress) {
        this.progress = progress;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getCompletionTime() {
        return completionTime;
    }

    public void setCompletionTime(String completionTime) {
        this.completionTime = completionTime;
    }

    public String getLastUpdate() {
        return lastUpdate;
    }

    public void setLastUpdate(String lastUpdate) {
        this.lastUpdate = lastUpdate;
    }

    public String getRouteName() {
        return routeName;
    }

    public void setRouteName(String routeName) {
        this.routeName = routeName;
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

    public Integer getTotalStops() {
        return totalStops;
    }

    public void setTotalStops(Integer totalStops) {
        this.totalStops = totalStops;
    }

    @Override
    public String toString() {
        return "RouteProgressDTO{" +
                "id=" + id +
                ", routeId='" + routeId + '\'' +
                ", progress=" + progress +
                ", status='" + status + '\'' +
                ", currentStopIndex=" + currentStopIndex +
                ", totalStops=" + totalStops +
                '}';
    }
}