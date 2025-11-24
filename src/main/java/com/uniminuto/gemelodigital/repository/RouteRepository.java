package com.uniminuto.gemelodigital.repository;

import com.uniminuto.gemelodigital.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteRepository extends JpaRepository<Route, String> { // <-- ✅ Cambiado de Long a String

    /**
     * ✅ Buscar por ID como String (ahora coincide con la entidad)
     */
    Optional<Route> findById(String id); // <-- ✅ Acepta String

    /**
     * ✅ Buscar rutas no eliminadas (soft delete)
     */
    List<Route> findByDeletedAtIsNull();

    /**
     * ✅ Buscar por ID y no eliminada
     */
    @Query("SELECT r FROM Route r WHERE r.id = :id AND r.deletedAt IS NULL") // <-- HQL usa r.id que es String
    Optional<Route> findByIdAndDeletedAtIsNull(@Param("id") String id); // <-- ✅ Acepta String

    // ... (El resto de los métodos siguen igual, solo cambia el tipo de findById y findByIdAndDeletedAtIsNull si era Long)
    /**
     * ✅ Buscar por vehículo
     */
    List<Route> findByVehicle(String vehicle);

    /**
     * ✅ Buscar por driver_id
     */
    List<Route> findByDriverId(String driverId);

    /**
     * ✅ Buscar por status (String)
     */
    List<Route> findByStatus(String status);

    /**
     * ✅ Buscar por status (Enum)
     */
    @Query("SELECT r FROM Route r WHERE r.status = :status")
    List<Route> findByStatusEnum(@Param("status") Route.RouteStatus status);

    /**
     * ✅ Buscar rutas activas
     */
    @Query("SELECT r FROM Route r WHERE r.status IN ('PENDING', 'IN_PROGRESS')")
    List<Route> findActiveRoutes();

    /**
     * ✅ Buscar por nombre
     */
    List<Route> findByNameContainingIgnoreCase(String name);

    /**
     * ✅ Verificar si existe ruta activa para vehículo
     */
    @Query("SELECT COUNT(r) > 0 FROM Route r WHERE r.vehicle = :vehicle AND r.status IN ('PENDING', 'IN_PROGRESS')")
    boolean existsActiveRouteForVehicle(@Param("vehicle") String vehicle);

    /**
     * ✅ Verificar si existe ruta activa para conductor
     */
    @Query("SELECT COUNT(r) > 0 FROM Route r WHERE r.driverId = :driverId AND r.status IN ('PENDING', 'IN_PROGRESS')")
    boolean existsActiveRouteForDriver(@Param("driverId") String driverId);

    /**
     * ✅ Buscar por ciudad
     */
    List<Route> findByCity(String city);
}