package com.uniminuto.gemelodigital.repository;

import com.uniminuto.gemelodigital.entity.VehiclePosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehiclePositionRepository extends JpaRepository<VehiclePosition, Long> {

    /**
     * Buscar posición de vehículo por vehicle_id (Asumiendo que es único)
     */
    Optional<VehiclePosition> findByVehicleId(String vehicleId);

    // 🚨 CORRECCIÓN CLAVE 🚨
    // El método findByRouteId(String routeId) original fallaba si existían duplicados.
    // Lo renombramos y modificamos para obtener explícitamente el registro más reciente
    // basado en la columna 'lastUpdate' y limitando a 1 resultado.

    /**
     * ✅ CORREGIDO: Busca la POSICIÓN MÁS RECIENTE del vehículo para una ruta específica.
     * Esto previene la NonUniqueResultException que ocurría en el RealTimeTrackingService.
     */
    Optional<VehiclePosition> findFirstByRouteIdOrderByLastUpdateDesc(String routeId);

    // Nota: El método findByRouteId(String routeId) ha sido ELIMINADO/SUSTITUIDO
    // para evitar que se use la implementación propensa a errores.

    // Si aún necesitas obtener TODAS las posiciones de una ruta (ej. para un historial),
    // usa esta versión que devuelve una lista:
    List<VehiclePosition> findAllByRouteIdOrderByLastUpdateDesc(String routeId);

    /**
     * Buscar posición por current_route_id (Conservado, asumiendo que podría no ser lo mismo que route_id)
     */
    Optional<VehiclePosition> findByCurrentRouteId(String currentRouteId);

    /**
     * Buscar por driver_id (Conservado)
     */
    Optional<VehiclePosition> findByDriverId(String driverId);

    /**
     * Buscar por status (String)
     */
    List<VehiclePosition> findByStatus(String status);

    /**
     * Buscar por status usando enum (si tu entidad usa enum)
     */
    @Query("SELECT v FROM VehiclePosition v WHERE v.status = :status")
    List<VehiclePosition> findByStatusEnum(@Param("status") VehiclePosition.VehicleStatus status);

    // --- Consultas de Status (Conservadas) ---

    /**
     * Buscar vehículos activos (AVAILABLE o BUSY)
     */
    @Query("SELECT v FROM VehiclePosition v WHERE v.status IN ('AVAILABLE', 'BUSY')")
    List<VehiclePosition> findActiveVehicles();

    /**
     * Buscar vehículos BUSY
     */
    @Query("SELECT v FROM VehiclePosition v WHERE v.status = 'BUSY'")
    List<VehiclePosition> findAllBusyVehicles();

    /**
     * Buscar vehículos AVAILABLE
     */
    @Query("SELECT v FROM VehiclePosition v WHERE v.status = 'AVAILABLE'")
    List<VehiclePosition> findAllAvailableVehicles();

    /**
     * Buscar vehículos OFFLINE
     */
    @Query("SELECT v FROM VehiclePosition v WHERE v.status = 'OFFLINE'")
    List<VehiclePosition> findAllOfflineVehicles();

    /**
     * Contar por status (String)
     */
    Long countByStatus(String status);

    /**
     * Verificar si existe un vehículo
     */
    boolean existsByVehicleId(String vehicleId);

    /**
     * Eliminar por vehicle_id
     */
    void deleteByVehicleId(String vehicleId);

    /**
     * Buscar vehículos cerca de una ubicación
     */
    @Query("SELECT v FROM VehiclePosition v WHERE " +
            "v.latitude BETWEEN :minLat AND :maxLat AND " +
            "v.longitude BETWEEN :minLng AND :maxLng")
    List<VehiclePosition> findVehiclesNearLocation(
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLng") double minLng,
            @Param("maxLng") double maxLng
    );
}