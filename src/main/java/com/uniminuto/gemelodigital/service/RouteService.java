package com.uniminuto.gemelodigital.service;

import com.uniminuto.gemelodigital.dto.RouteDTO;
import com.uniminuto.gemelodigital.dto.RouteResponse;
import com.uniminuto.gemelodigital.dto.RouteStopDTO;
import com.uniminuto.gemelodigital.dto.VehicleAssignmentRequest;
import com.uniminuto.gemelodigital.entity.Route;
import com.uniminuto.gemelodigital.entity.RouteStop;
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
import java.util.ArrayList;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RouteService {

    private final RouteRepository routeRepository;
    private final RouteStopRepository routeStopRepository;
    private final DriverRepository driverRepository;

    // ===== MÉTODO DE SERVICIO: OPTIMIZAR RUTA =====
    @Transactional
    public RouteResponse optimizeRoute(String id) {
        log.info("🔧 Optimizando ruta con ID: {}", id);

        // 1. Buscar la ruta original
        Route route = routeRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada: " + id));

        if (route.getStops() == null || route.getStops().size() < 2) {
            log.warn("⚠️ La ruta {} no tiene suficientes paradas para optimizar (menos de 2).", id);
            // Opcional: Puedes lanzar una excepción o devolver la ruta tal cual
            return convertToResponse(route);
        }

        // 2. Lógica de optimización (EJEMPLO BÁSICO - DEBES IMPLEMENTAR LA TUYA)
        // Este es un ejemplo muy simple que solo invierte el orden de las paradas.
        // En la práctica, usarías un algoritmo como el del Vendedor Viajero (TSP) o una heurística.
        List<RouteStop> originalStops = route.getStops();
        List<RouteStop> optimizedStops = new ArrayList<>(originalStops);

        // --- IMPLEMENTACIÓN REAL NECESARIA AQUÍ ---
        // Collections.reverse(optimizedStops); // Ejemplo simple, NO es una optimización real

        // 3. Calcular nueva distancia y duración (esto también lo haría tu algoritmo de optimización)
        // double newDistance = calculateOptimizedDistance(optimizedStops); // Implementar
        // String newDuration = calculateOptimizedDuration(optimizedStops); // Implementar

        // 4. Actualizar la ruta con los nuevos valores (distancia, duración, paradas)
        // route.setDistance(newDistance);
        // route.setEstimatedDuration(newDuration);
        route.setStatus(Route.RouteStatus.OPTIMIZED); // O el estado que corresponda

        // 5. Guardar la ruta actualizada
        Route updatedRoute = routeRepository.save(route);

        log.info("✅ Ruta {} optimizada en base de datos.", id);
        return convertToResponse(updatedRoute);
    }

    // ===== NUEVO MÉTODO DE SERVICIO: INICIAR RUTA =====
    @Transactional
    public RouteResponse startRoute(String id) {
        log.info("🚀 Iniciando ruta con ID: {}", id);

        Route route = routeRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada: " + id));

        if (route.getStatus() != Route.RouteStatus.PENDING) {
            throw new IllegalStateException("La ruta no está pendiente. Estado actual: " + route.getStatus());
        }

        route.setStatus(Route.RouteStatus.IN_PROGRESS);
        route.setUpdatedAt(LocalDateTime.now());

        Route updatedRoute = routeRepository.save(route);
        log.info("✅ Ruta {} iniciada.", id);
        return convertToResponse(updatedRoute);
    }

    // ===== NUEVO MÉTODO DE SERVICIO: COMPLETAR RUTA =====
    @Transactional
    public RouteResponse completeRoute(String id) {
        log.info("✅ Completando ruta con ID: {}", id);

        Route route = routeRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada: " + id));

        if (route.getStatus() != Route.RouteStatus.IN_PROGRESS) {
            throw new IllegalStateException("La ruta no está en progreso. Estado actual: " + route.getStatus());
        }

        route.setStatus(Route.RouteStatus.COMPLETED);
        route.setUpdatedAt(LocalDateTime.now());

        Route updatedRoute = routeRepository.save(route);
        log.info("✅ Ruta {} marcada como COMPLETADA.", id);
        return convertToResponse(updatedRoute);
    }

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

    // 🔗 NUEVO MÉTODO: ASIGNAR RUTA A VEHÍCULO Y/O CONDUCTOR
    @Transactional
    public RouteResponse assignRouteToVehicle(String routeId, VehicleAssignmentRequest request) {
        log.info("🔗 Asignando vehículo/conductor a ruta ID: {}", routeId);
        log.info("📤 Vehicle ID: {} | Driver ID: {}", request.getVehicleId(), request.getDriverId());

        Route route = routeRepository.findByIdAndDeletedAtIsNull(routeId)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada: " + routeId));

        // 🚗 ACTUALIZAR VEHÍCULO
        if (request.getVehicleId() != null && !request.getVehicleId().isEmpty()) {
            route.setVehicle(request.getVehicleId());
            log.info("✅ Vehículo actualizado a: {}", request.getVehicleId());
        }

        // 🚛 ACTUALIZAR CONDUCTOR (DRIVER)
        if (request.getDriverId() != null && !request.getDriverId().isEmpty()) {
            route.setDriverId(request.getDriverId());
            log.info("✅ Driver ID actualizado a: {}", request.getDriverId());
        }

        // 🔄 Guardar los cambios
        Route updatedRoute = routeRepository.save(route);
        log.info("✅ Asignación de ruta {} completada.", updatedRoute.getId());

        return convertToResponse(updatedRoute);
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

            try {
                driverRepository.findById(UUID.fromString(route.getDriverId())).ifPresent(driver -> {
                    RouteResponse.DriverInfo driverInfo = new RouteResponse.DriverInfo();
                    driverInfo.setId(driver.getId().toString());
                    driverInfo.setNombre(driver.getNombre());
                    driverInfo.setApellido(driver.getApellido());
                    driverInfo.setLicencia(driver.getLicencia());
                    response.setDriver(driverInfo);

                    log.debug("✅ Driver asignado: {} {}", driver.getNombre(), driver.getApellido());
                });
            } catch (IllegalArgumentException e) {
                log.warn("⚠️ Error: El Driver ID no es un UUID válido: {}", route.getDriverId());
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

        for (int i = 0; i < stopDTOs.size(); i++) {
            RouteStopDTO stopDTO = stopDTOs.get(i);
            RouteStop stop = new RouteStop();

            stop.setRoute(route);
            stop.setName(stopDTO.getName());
            stop.setAddress(stopDTO.getAddress());
            stop.setLatitude(stopDTO.getLatitude());
            stop.setLongitude(stopDTO.getLongitude());

            if (stopDTO.getType() != null) {
                try {
                    stop.setType(RouteStop.StopType.valueOf(stopDTO.getType()));
                } catch (IllegalArgumentException e) {
                    log.warn("⚠️ Tipo de parada no válido: {}, asignando null", stopDTO.getType());
                    stop.setType(null);
                }
            } else {
                stop.setType(null);
            }

            stop.setStopOrder(i + 1); // Asegura un orden consecutivo

            routeStopRepository.save(stop);
        }

        log.info("✅ Paradas guardadas exitosamente");
    }

    // ✅ CONVERTIR STOP ENTITY A DTO
    private RouteStopDTO convertStopToDTO(RouteStop stop) {
        RouteStopDTO dto = new RouteStopDTO();
        dto.setId(stop.getId() != null ? stop.getId().toString() : null);

        dto.setName(stop.getName());
        dto.setAddress(stop.getAddress());
        dto.setLatitude(stop.getLatitude());
        dto.setLongitude(stop.getLongitude());

        dto.setType(stop.getType() != null ? stop.getType().name() : null);
        dto.setStopOrder(stop.getStopOrder());
        return dto;
    }
}