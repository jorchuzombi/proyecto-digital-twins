package com.uniminuto.gemelodigital.service;

import com.uniminuto.gemelodigital.dto.*;
import com.uniminuto.gemelodigital.entity.Driver;
import com.uniminuto.gemelodigital.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
            
@Service
@RequiredArgsConstructor
public class DriverService {

    private final DriverRepository driverRepository;

    public DriverResponse createDriver(CreateDriverRequest request) {
        // Validar que la licencia sea única
        if (driverRepository.existsByLicencia(request.getLicencia())) {
            throw new RuntimeException("Ya existe un conductor con la licencia: " + request.getLicencia());
        }

        // Validar fecha de vencimiento
        if (request.getFechaVencimientoLicencia().isBefore(LocalDate.now())) {
            throw new RuntimeException("La fecha de vencimiento de la licencia no puede ser en el pasado");
        }

        Driver driver = Driver.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .licencia(request.getLicencia())
                .tipoLicencia(request.getTipoLicencia())
                .fechaVencimientoLicencia(request.getFechaVencimientoLicencia())
                .telefono(request.getTelefono())
                .email(request.getEmail())
                .estado(Driver.DriverStatus.ACTIVO)
                .disponibilidad(Driver.DriverAvailability.DISPONIBLE)
                .build();

        Driver savedDriver = driverRepository.save(driver);
        return mapToResponse(savedDriver);
    }

    public DriverResponse updateDriver(String id, UpdateDriverRequest request) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conductor no encontrado con ID: " + id));

        // Actualizar campos
        driver.setNombre(request.getNombre());
        driver.setApellido(request.getApellido());
        driver.setTipoLicencia(request.getTipoLicencia());
        driver.setFechaVencimientoLicencia(request.getFechaVencimientoLicencia());
        driver.setTelefono(request.getTelefono());
        driver.setEmail(request.getEmail());

        // Actualizar estado y disponibilidad si se proporcionan
        if (request.getEstado() != null) {
            driver.setEstado(Driver.DriverStatus.valueOf(request.getEstado()));
        }
        if (request.getDisponibilidad() != null) {
            driver.setDisponibilidad(Driver.DriverAvailability.valueOf(request.getDisponibilidad()));
        }

        Driver updatedDriver = driverRepository.save(driver);
        return mapToResponse(updatedDriver);
    }

    public DriverResponse getDriver(String id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conductor no encontrado con ID: " + id));
        return mapToResponse(driver);
    }

    public DriverListResponse getAllDrivers(Pageable pageable, String search,
                                            String estado, String disponibilidad) {
        // Convertir strings a enums si se proporcionan
        Driver.DriverStatus estadoEnum = null;
        Driver.DriverAvailability disponibilidadEnum = null;

        if (estado != null && !estado.isEmpty()) {
            estadoEnum = Driver.DriverStatus.valueOf(estado.toUpperCase());
        }
        if (disponibilidad != null && !disponibilidad.isEmpty()) {
            disponibilidadEnum = Driver.DriverAvailability.valueOf(disponibilidad.toUpperCase());
        }

        Page<Driver> driversPage = driverRepository.findAllWithFilters(
                estadoEnum, disponibilidadEnum, search, pageable);

        List<DriverResponse> drivers = driversPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new DriverListResponse(
                drivers,
                driversPage.getTotalPages(),
                driversPage.getTotalElements(),
                driversPage.getNumber(),
                driversPage.getSize()
        );
    }

    public void deleteDriver(String id) {
        if (!driverRepository.existsById(id)) {
            throw new RuntimeException("Conductor no encontrado con ID: " + id);
        }
        driverRepository.deleteById(id);
    }

    public List<DriverResponse> getAvailableDrivers() {
        List<Driver> drivers = driverRepository.findAvailableDrivers(LocalDate.now());
        return drivers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<DriverResponse> getDriversByEstado(String estado) {
        Driver.DriverStatus estadoEnum = Driver.DriverStatus.valueOf(estado.toUpperCase());
        List<Driver> drivers = driverRepository.findByEstado(estadoEnum);
        return drivers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public long countByEstado(String estado) {
        Driver.DriverStatus estadoEnum = Driver.DriverStatus.valueOf(estado.toUpperCase());
        return driverRepository.countByEstado(estadoEnum);
    }

    public long countByDisponibilidad(String disponibilidad) {
        Driver.DriverAvailability disponibilidadEnum = Driver.DriverAvailability.valueOf(disponibilidad.toUpperCase());
        return driverRepository.countByDisponibilidad(disponibilidadEnum);
    }

    private DriverResponse mapToResponse(Driver driver) {
        DriverResponse response = new DriverResponse();
        response.setId(driver.getId());
        response.setNombre(driver.getNombre());
        response.setApellido(driver.getApellido());
        response.setLicencia(driver.getLicencia());
        response.setTipoLicencia(driver.getTipoLicencia());
        response.setFechaVencimientoLicencia(driver.getFechaVencimientoLicencia());
        response.setTelefono(driver.getTelefono());
        response.setEmail(driver.getEmail());
        response.setEstado(driver.getEstado().name());
        response.setDisponibilidad(driver.getDisponibilidad().name());
        response.setLicenciaVigente(driver.isLicenciaVigente());
        response.setDisponibleParaRuta(driver.isDisponibleParaRuta());
        response.setCreatedAt(driver.getCreatedAt());
        response.setUpdatedAt(driver.getUpdatedAt());
        return response;
    }
}