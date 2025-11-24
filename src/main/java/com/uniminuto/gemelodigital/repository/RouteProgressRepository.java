package com.uniminuto.gemelodigital.repository;

import com.uniminuto.gemelodigital.entity.RouteProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteProgressRepository extends JpaRepository<RouteProgress, Long> {

    /**
     * ✅ Buscar progreso por route_id (String)
     */
    Optional<RouteProgress> findByRouteId(String routeId);

    /**
     * ✅ Buscar por status (Enum) - CORREGIDO
     */
    List<RouteProgress> findByStatus(RouteProgress.RouteStatus status);

    /**
     * ✅ Buscar rutas STARTED
     */
    @Query("SELECT rp FROM RouteProgress rp WHERE rp.status = 'STARTED'")
    List<RouteProgress> findAllActiveRoutes();

    /**
     * ✅ Buscar rutas ASSIGNED
     */
    @Query("SELECT rp FROM RouteProgress rp WHERE rp.status = 'ASSIGNED'")
    List<RouteProgress> findAllAssignedRoutes();

    /**
     * ✅ Buscar rutas COMPLETED
     */
    @Query("SELECT rp FROM RouteProgress rp WHERE rp.status = 'COMPLETED'")
    List<RouteProgress> findAllCompletedRoutes();

    /**
     * ✅ Contar por status
     */
    Long countByStatus(RouteProgress.RouteStatus status);

    /**
     * ✅ Verificar si existe por route_id
     */
    boolean existsByRouteId(String routeId);

    /**
     * ✅ Eliminar por route_id
     */
    void deleteByRouteId(String routeId);

    /**
     * ✅ Buscar rutas activas y asignadas
     */
    @Query("SELECT rp FROM RouteProgress rp WHERE rp.status IN ('STARTED', 'ASSIGNED')")
    List<RouteProgress> findActiveAndAssignedRoutes();
}