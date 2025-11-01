package com.uniminuto.gemelodigital.service;

import com.uniminuto.gemelodigital.controller.VehicleStatsResponse;
import com.uniminuto.gemelodigital.dto.*;
import com.uniminuto.gemelodigital.entity.Vehicle;
import com.uniminuto.gemelodigital.entity.Vehicle.VehicleStatus;
import com.uniminuto.gemelodigital.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    /**
     * Crea un nuevo vehículo
     */
    @Transactional
    public VehicleResponse createVehicle(CreateVehicleRequest request) {
        log.info("Creando vehículo con placa: {}", request.getPlaca());

        // Validar placa duplicada
        if (vehicleRepository.existsByPlaca(request.getPlaca())) {
            throw new DuplicatePlateException("Ya existe un vehículo con la placa: " + request.getPlaca());
        }

        Vehicle vehicle = Vehicle.builder()
                .placa(request.getPlaca().toUpperCase())
                .tipo(request.getTipo())
                .marca(request.getMarca())
                .modelo(request.getModelo())
                .anio(request.getAnio())
                .capacidadCarga(request.getCapacidadCarga())
                .kilometraje(0.0)
                .estado(VehicleStatus.DISPONIBLE)
                .build();

        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehículo creado exitosamente con ID: {}", vehicle.getId());

        return VehicleResponse.fromEntity(vehicle);
    }

    /**
     * Lista vehículos con filtros y paginación
     */
    @Transactional(readOnly = true)
    public Page<VehicleListResponse> listVehicles(
            VehicleStatus estado,
            String tipo,
            String search,
            Pageable pageable
    ) {
        log.info("Listando vehículos - Estado: {}, Tipo: {}, Search: {}", estado, tipo, search);

        Page<Vehicle> vehicles = vehicleRepository.findAllWithFilters(estado, tipo, search, pageable);

        return vehicles.map(VehicleListResponse::fromEntity);
    }

    /**
     * Obtiene un vehículo por ID
     */
    @Transactional(readOnly = true)
    public VehicleResponse getVehicleById(String id) {
        log.info("Obteniendo vehículo con ID: {}", id);

        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new VehicleNotFoundException("Vehículo no encontrado con ID: " + id));

        return VehicleResponse.fromEntity(vehicle);
    }

    /**
     * Actualiza un vehículo
     */
    @Transactional
    public VehicleResponse updateVehicle(String id, UpdateVehicleRequest request) {
        log.info("Actualizando vehículo con ID: {}", id);

        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new VehicleNotFoundException("Vehículo no encontrado con ID: " + id));

        // Actualizar solo campos no nulos
        if (request.getTipo() != null) vehicle.setTipo(request.getTipo());
        if (request.getMarca() != null) vehicle.setMarca(request.getMarca());
        if (request.getModelo() != null) vehicle.setModelo(request.getModelo());
        if (request.getAnio() != null) vehicle.setAnio(request.getAnio());
        if (request.getCapacidadCarga() != null) vehicle.setCapacidadCarga(request.getCapacidadCarga());
        if (request.getKilometraje() != null) vehicle.setKilometraje(request.getKilometraje());

        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehículo actualizado exitosamente");

        return VehicleResponse.fromEntity(vehicle);
    }

    /**
     * Actualiza el estado de un vehículo
     */
    @Transactional
    public VehicleResponse updateVehicleStatus(String id, UpdateVehicleStatusRequest request) {
        log.info("Actualizando estado del vehículo {} a: {}", id, request.getEstado());

        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new VehicleNotFoundException("Vehículo no encontrado con ID: " + id));

        vehicle.setEstado(request.getEstado());
        vehicle = vehicleRepository.save(vehicle);

        log.info("Estado del vehículo actualizado exitosamente");
        return VehicleResponse.fromEntity(vehicle);
    }

    /**
     * Elimina un vehículo (soft delete)
     */
    @Transactional
    public void deleteVehicle(String id) {
        log.info("Eliminando vehículo con ID: {}", id);

        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new VehicleNotFoundException("Vehículo no encontrado con ID: " + id));

        vehicleRepository.delete(vehicle); // Ejecuta soft delete gracias a @SQLDelete
        log.info("Vehículo eliminado exitosamente");
    }

    /**
     * Obtiene vehículos disponibles (para optimización de rutas)
     */
    @Transactional(readOnly = true)
    public List<VehicleListResponse> getActiveVehicles() {
        log.info("Obteniendo vehículos disponibles");

        return vehicleRepository.findByEstado(VehicleStatus.DISPONIBLE)
                .stream()
                .map(VehicleListResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene estadísticas de vehículos
     */
    @Transactional(readOnly = true)
    public VehicleStatsResponse getVehicleStats() {
        long total = vehicleRepository.count();
        long disponibles = vehicleRepository.countByEstado(VehicleStatus.DISPONIBLE);
        long enRuta = vehicleRepository.countByEstado(VehicleStatus.EN_RUTA);
        long enMantenimiento = vehicleRepository.countByEstado(VehicleStatus.EN_MANTENIMIENTO);
        long fueraDeServicio = vehicleRepository.countByEstado(VehicleStatus.FUERA_DE_SERVICIO);

        return VehicleStatsResponse.builder()
                .total(total)
                .disponibles(disponibles)
                .enRuta(enRuta)
                .enMantenimiento(enMantenimiento)
                .fueraDeServicio(fueraDeServicio)
                .build();
    }

    /**
     * Actualiza el kilometraje de un vehículo
     */
    @Transactional
    public VehicleResponse updateKilometraje(String id, Double kilometraje) {
        log.info("Actualizando kilometraje del vehículo {} a: {}", id, kilometraje);

        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new VehicleNotFoundException("Vehículo no encontrado con ID: " + id));

        vehicle.actualizarKilometraje(kilometraje);
        vehicle = vehicleRepository.save(vehicle);

        log.info("Kilometraje actualizado exitosamente");
        return VehicleResponse.fromEntity(vehicle);
    }

    // ============= EXCEPCIONES CUSTOM =============

    public static class DuplicatePlateException extends RuntimeException {
        public DuplicatePlateException(String message) {
            super(message);
        }
    }

    public static class VehicleNotFoundException extends RuntimeException {
        public VehicleNotFoundException(String message) {
            super(message);
        }
    }
}