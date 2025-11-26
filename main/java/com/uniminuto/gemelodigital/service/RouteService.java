// RouteService.java - COMPLETO
package com.uniminuto.gemelodigital.service;

import com.uniminuto.gemelodigital.dto.RouteDTO;
import com.uniminuto.gemelodigital.dto.RouteResponse;
import com.uniminuto.gemelodigital.dto.RouteStopDTO;
import com.uniminuto.gemelodigital.entity.Route;
import com.uniminuto.gemelodigital.entity.RouteStop;
import com.uniminuto.gemelodigital.entity.Driver;
import com.uniminuto.gemelodigital.repository.RouteRepository;
import com.uniminuto.gemelodigital.repository.RouteStopRepository;
import com.uniminuto.gemelodigital.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RouteService {

    private final RouteRepository routeRepository;
    private final RouteStopRepository routeStopRepository;
    private final DriverRepository driverRepository;

    // ✅ OBTENER TODAS LAS RUTAS
    @Transactional(readOnly = true)
    public List<RouteResponse> getAllRoutes() {
        log.info("🔄 Obteniendo todas las rutas...");

        List<Route> routes = routeRepository.findByDeletedAtIsNull();

        log.info("✅ {} rutas encontradas en BD", routes.size());

        return routes.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // ✅ OBTENER RUTA POR ID
    @Transactional(readOnly = true)
    public RouteResponse getRouteById(String id) {
        log.info("🔍 Buscando ruta con ID: {}", id);

        Route route = routeRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada: " + id));

        log.info("✅ Ruta encontrada: {} | driver_id: {}",
                route.getName(),
                route.getDriverId()
        );

        return convertToResponse(route);
    }

    // ✅ CREAR RUTA
    @Transactional
    public RouteResponse createRoute(RouteDTO routeDTO) {
        log.info("➕ Creando nueva ruta: {}", routeDTO.getName());
        log.info("📥 driverId recibido: {}", routeDTO.getDriverId());

        Route route = Route.builder()
                .name(routeDTO.getName())
                .city(routeDTO.getCity())
                .vehicle(routeDTO.getVehicle())
                .distance(routeDTO.getDistance())
                .estimatedDuration(routeDTO.getEstimatedDuration())
                .startTime(routeDTO.getStartTime() != null ? LocalTime.parse(routeDTO.getStartTime()) : null)
                .endTime(routeDTO.getEndTime() != null ? LocalTime.parse(routeDTO.getEndTime()) : null)
                .fuelCost(routeDTO.getFuelCost())
                .revenue(routeDTO.getRevenue())
                .notes(routeDTO.getNotes())
                .status(routeDTO.getStatus() != null ? Route.RouteStatus.valueOf(routeDTO.getStatus()) : Route.RouteStatus.PENDING)
                .build();

        // ✅ ASIGNAR DRIVER_ID (String)
        if (routeDTO.getDriverId() != null && !routeDTO.getDriverId().isEmpty()) {
            route.setDriverId(routeDTO.getDriverId());
            log.info("✅ Driver ID asignado: {}", routeDTO.getDriverId());
        }

        route = routeRepository.save(route);
        log.info("✅ Ruta guardada con ID: {}", route.getId());

        // ✅ GUARDAR PARADAS
        if (routeDTO.getStops() != null && !routeDTO.getStops().isEmpty()) {
            saveRouteStops(route, routeDTO.getStops());
        }

        return convertToResponse(route);
    }

    // ✅ ACTUALIZAR RUTA
    @Transactional
    public RouteResponse updateRoute(String id, RouteDTO routeDTO) {
        log.info("✏️ Actualizando ruta: {}", id);
        log.info("📥 Datos recibidos - name: {}, driverId: {}, vehicle: {}",
                routeDTO.getName(),
                routeDTO.getDriverId(),
                routeDTO.getVehicle()
        );

        Route route = routeRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada: " + id));

        // ✅ ACTUALIZAR CAMPOS
        if (routeDTO.getName() != null) {
            route.setName(routeDTO.getName());
        }

        if (routeDTO.getCity() != null) {
            route.setCity(routeDTO.getCity());
        }

        if (routeDTO.getVehicle() != null) {
            route.setVehicle(routeDTO.getVehicle());
        }

        // ✅ ACTUALIZAR DRIVER_ID (String)
        if (routeDTO.getDriverId() != null && !routeDTO.getDriverId().isEmpty()) {
            route.setDriverId(routeDTO.getDriverId());
            log.info("✅ Driver ID actualizado a: {}", routeDTO.getDriverId());
        }

        if (routeDTO.getDistance() != null) {
            route.setDistance(routeDTO.getDistance());
        }

        if (routeDTO.getEstimatedDuration() != null) {
            route.setEstimatedDuration(routeDTO.getEstimatedDuration());
        }

        if (routeDTO.getStartTime() != null) {
            route.setStartTime(LocalTime.parse(routeDTO.getStartTime()));
        }

        if (routeDTO.getEndTime() != null) {
            route.setEndTime(LocalTime.parse(routeDTO.getEndTime()));
        }

        if (routeDTO.getFuelCost() != null) {
            route.setFuelCost(routeDTO.getFuelCost());
        }

        if (routeDTO.getRevenue() != null) {
            route.setRevenue(routeDTO.getRevenue());
        }

        if (routeDTO.getNotes() != null) {
            route.setNotes(routeDTO.getNotes());
        }

        if (routeDTO.getStatus() != null) {
            route.setStatus(Route.RouteStatus.valueOf(routeDTO.getStatus()));
        }

        route = routeRepository.save(route);
        log.info("✅ Ruta actualizada: id={}, driver_id={}", route.getId(), route.getDriverId());

        // ✅ ACTUALIZAR PARADAS
        if (routeDTO.getStops() != null) {
            routeStopRepository.deleteByRoute_Id(route.getId());
            saveRouteStops(route, routeDTO.getStops());
        }

        return convertToResponse(route);
    }

    // ✅ ELIMINAR RUTA (SOFT DELETE)
    @Transactional
    public void deleteRoute(String id) {
        log.info("🗑️ Eliminando ruta: {}", id);

        Route route = routeRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada: " + id));

        route.setDeletedAt(LocalDateTime.now());
        routeRepository.save(route);

        log.info("✅ Ruta eliminada (soft delete): {}", id);
    }

    // ✅ CONVERTIR ENTITY A RESPONSE - CON DRIVER COMPLETO
    private RouteResponse convertToResponse(Route route) {
        RouteResponse response = new RouteResponse();
        response.setId(route.getId());
        response.setName(route.getName());
        response.setCity(route.getCity());
        response.setVehicle(route.getVehicle());
        response.setDistance(route.getDistance());
        response.setEstimatedDuration(route.getEstimatedDuration());
        response.setStartTime(route.getStartTime() != null ? route.getStartTime().toString() : null);
        response.setEndTime(route.getEndTime() != null ? route.getEndTime().toString() : null);
        response.setFuelCost(route.getFuelCost());
        response.setRevenue(route.getRevenue());
        response.setNotes(route.getNotes());
        response.setStatus(route.getStatus() != null ? route.getStatus().name() : "PENDING");
        response.setCreatedAt(route.getCreatedAt());
        response.setUpdatedAt(route.getUpdatedAt());

        // ✅ ASIGNAR DRIVER_ID Y BUSCAR DRIVER
        if (route.getDriverId() != null && !route.getDriverId().isEmpty()) {
            response.setDriverId(route.getDriverId());

            // ✅ BUSCAR INFORMACIÓN DEL CONDUCTOR (String → UUID para buscar)
            try {
                driverRepository.findById(UUID.fromString(route.getDriverId())).ifPresent(driver -> {
                    RouteResponse.DriverInfo driverInfo = new RouteResponse.DriverInfo();
                    driverInfo.setId(driver.getId()); // Ya es String
                    driverInfo.setNombre(driver.getNombre());
                    driverInfo.setApellido(driver.getApellido());
                    driverInfo.setLicencia(driver.getLicencia());
                    response.setDriver(driverInfo);

                    log.debug("✅ Driver asignado: {} {}", driver.getNombre(), driver.getApellido());
                });
            } catch (Exception e) {
                log.warn("⚠️ Error buscando conductor: {}", e.getMessage());
            }
        }

        // ✅ CARGAR PARADAS
        List<RouteStop> stops = routeStopRepository.findByRoute_IdOrderByStopOrder(route.getId());
        if (stops != null && !stops.isEmpty()) {
            response.setStops(stops.stream()
                    .map(this::convertStopToDTO)
                    .collect(Collectors.toList()));
        }

        return response;
    }

    // ✅ GUARDAR PARADAS
    private void saveRouteStops(Route route, List<RouteStopDTO> stopDTOs) {
        log.info("📍 Guardando {} paradas para ruta {}", stopDTOs.size(), route.getId());

        for (RouteStopDTO stopDTO : stopDTOs) {
            RouteStop stop = new RouteStop();
            stop.setRoute(route);
            stop.setName(stopDTO.getName());
            stop.setAddress(stopDTO.getAddress());
            stop.setLatitude(stopDTO.getLatitude());
            stop.setLongitude(stopDTO.getLongitude());
            stop.setType(stopDTO.getType() != null ? RouteStop.StopType.valueOf(stopDTO.getType()) : null);
            stop.setStopOrder(stopDTO.getStopOrder());

            routeStopRepository.save(stop);
        }

        log.info("✅ Paradas guardadas exitosamente");
    }

    // ✅ CONVERTIR STOP ENTITY A DTO
    private RouteStopDTO convertStopToDTO(RouteStop stop) {
        RouteStopDTO dto = new RouteStopDTO();
        dto.setId(stop.getId());
        dto.setName(stop.getName());
        dto.setAddress(stop.getAddress());
        dto.setLatitude(stop.getLatitude());
        dto.setLongitude(stop.getLongitude());
        dto.setType(stop.getType() != null ? stop.getType().name() : null);
        dto.setStopOrder(stop.getStopOrder());
        return dto;
    }
}