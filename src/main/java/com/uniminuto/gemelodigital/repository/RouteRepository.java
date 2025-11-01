// RouteRepository.java - ACTUALIZADO para String driverId
package com.uniminuto.gemelodigital.repository;

import com.uniminuto.gemelodigital.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteRepository extends JpaRepository<Route, String> {

    // ✅ Encontrar rutas no eliminadas
    List<Route> findByDeletedAtIsNull();

    // ✅ Encontrar ruta por ID no eliminada
    Optional<Route> findByIdAndDeletedAtIsNull(String id);

    // ✅ Encontrar rutas por conductor (String en lugar de UUID)
    List<Route> findByDriverIdAndDeletedAtIsNull(String driverId);

    // ✅ Contar rutas activas
    @Query("SELECT COUNT(r) FROM Route r WHERE r.deletedAt IS NULL")
    long countActiveRoutes();

    // ✅ Encontrar rutas por ciudad
    List<Route> findByCityAndDeletedAtIsNull(String city);

    // ✅ Encontrar rutas por estado
    List<Route> findByStatusAndDeletedAtIsNull(Route.RouteStatus status);
}