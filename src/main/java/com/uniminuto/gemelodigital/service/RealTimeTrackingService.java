package com.uniminuto.gemelodigital.service;

import com.uniminuto.gemelodigital.entity.*;
import com.uniminuto.gemelodigital.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

/**
 * Servicio de Tracking en Tiempo Real
 * Maneja actualización automática de posiciones de vehículos
 */
@Service
public class RealTimeTrackingService {

    private static final Logger logger = LoggerFactory.getLogger(RealTimeTrackingService.class);

    // Inyección por constructor (Mejor Práctica)
    private final VehiclePositionRepository vehiclePositionRepository;
    private final RouteProgressRepository routeProgressRepository;
    private final RouteRepository routeRepository;
    private final RouteStopRepository routeStopRepository;
    private final DriverRepository driverRepository;
    private final Random random = new Random();

    public RealTimeTrackingService(VehiclePositionRepository vehiclePositionRepository,
                                   RouteProgressRepository routeProgressRepository,
                                   RouteRepository routeRepository,
                                   RouteStopRepository routeStopRepository,
                                   DriverRepository driverRepository) {
        this.vehiclePositionRepository = vehiclePositionRepository;
        this.routeProgressRepository = routeProgressRepository;
        this.routeRepository = routeRepository;
        this.routeStopRepository = routeStopRepository;
        this.driverRepository = driverRepository;
    }

    // Constantes de simulación
    private static final double SPEED_MIN_KMH = 30.0;
    private static final double SPEED_MAX_KMH = 70.0;
    private static final double METERS_PER_UPDATE = 150.0; // ~150m cada 5 segundos

    // --- MÉTODOS PÚBLICOS DE CONSULTA ---

    /**
     * Obtener todas las posiciones actuales de vehículos
     */
    public List<VehiclePosition> getAllVehiclePositions() {
        logger.info("Obteniendo todas las posiciones de vehículos");
        return vehiclePositionRepository.findAll();
    }

    /**
     * Obtener posiciones de vehículos activos (en ruta)
     */
    public List<VehiclePosition> getActiveVehiclePositions() {
        // Uso correcto de .name() para el Enum
        return vehiclePositionRepository.findByStatus(VehiclePosition.VehicleStatus.BUSY.name());
    }

    /**
     * Obtener posición de un vehículo específico
     */
    public Optional<VehiclePosition> getVehiclePosition(String vehicleId) {
        return vehiclePositionRepository.findByVehicleId(vehicleId);
    }

    /**
     * OBTENER VEHÍCULOS POR RUTA
     */
    public List<VehiclePosition> getVehiclesByRoute(String routeId) {
        return vehiclePositionRepository.findAllByRouteIdOrderByLastUpdateDesc(routeId);
    }

    /**
     * ACTUALIZAR POSICIÓN DE VEHÍCULO
     */
    @Transactional
    public VehiclePosition updateVehiclePosition(String vehicleId, VehiclePosition newPosition) {
        VehiclePosition existingPosition = vehiclePositionRepository.findByVehicleId(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehículo no encontrado: " + vehicleId));

        if (newPosition.getLatitude() != null) existingPosition.setLatitude(newPosition.getLatitude());
        if (newPosition.getLongitude() != null) existingPosition.setLongitude(newPosition.getLongitude());
        if (newPosition.getSpeed() != null) existingPosition.setSpeed(newPosition.getSpeed());
        if (newPosition.getHeading() != null) existingPosition.setHeading(newPosition.getHeading());

        existingPosition.setLastUpdate(LocalDateTime.now());
        return vehiclePositionRepository.save(existingPosition);
    }

    /**
     * Obtener progreso de una ruta
     */
    public Optional<RouteProgress> getRouteProgressOptional(String routeId) {
        return routeProgressRepository.findByRouteId(routeId);
    }


    /**
     * Asignar ruta a un vehículo
     */
    @Transactional
    public VehiclePosition assignRoute(String routeId, String vehicleId, String driverId) {
        logger.info("Asignando ruta {} a vehículo {} con conductor {}", routeId, vehicleId, driverId);

        // --- Lógica de Asignación (CORREGIDA) ---
        // ✅ Eliminado el parseo a Long. routeId se usa directamente como String.
        Route route = routeRepository.findById(routeId) // <-- ✅ Ahora recibe String
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada: " + routeId));
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Conductor no encontrado con ID: " + driverId));
        String driverName = driver.getNombre() + " " + driver.getApellido();

        List<RouteStop> stops = routeStopRepository.findByRoute_IdOrderByStopOrder(routeId);
        if (stops.isEmpty()) {
            throw new RuntimeException("La ruta no tiene paradas definidas");
        }

        VehiclePosition position = vehiclePositionRepository.findByVehicleId(vehicleId)
                .orElse(new VehiclePosition(vehicleId));

        // 5. Configurar posición inicial
        RouteStop firstStop = stops.get(0);
        position.setLatitude(firstStop.getLatitude());
        position.setLongitude(firstStop.getLongitude());
        position.setDriverId(driverId);
        position.setDriverName(driverName);
        position.setRouteId(routeId);
        position.setStatus(VehiclePosition.VehicleStatus.BUSY);
        position.setSpeed(0.0);
        position.setHeading(0.0);
        position.setLastUpdate(LocalDateTime.now());

        vehiclePositionRepository.save(position);

        // 6. Crear progreso de ruta
        RouteProgress progress = routeProgressRepository.findByRouteId(routeId)
                .orElse(new RouteProgress(routeId));

        progress.setCurrentStopIndex(0);
        progress.setProgress(0.0);
        progress.setStatus(RouteProgress.RouteStatus.ASSIGNED);
        routeProgressRepository.save(progress);

        logger.info("Ruta asignada exitosamente. Posición inicial: ({}, {}). Conductor: {}",
                position.getLatitude(), position.getLongitude(), driverName);

        return position;
    }

    /**
     * Iniciar una ruta (cambiar estado a STARTED)
     */
    @Transactional
    public RouteProgress startRoute(String routeId) {
        logger.info("Iniciando ruta: {}", routeId);

        RouteProgress progress = routeProgressRepository.findByRouteId(routeId)
                .orElseThrow(() -> new RuntimeException("Progreso de ruta no encontrado: " + routeId));

        progress.setStatus(RouteProgress.RouteStatus.STARTED);
        return routeProgressRepository.save(progress);
    }

    // --- MÉTODOS DE SIMULACIÓN Y SCHEDULING ---

    /**
     * Actualización automática cada 5 segundos
     */
    @Scheduled(fixedRate = 5000) // Cada 5 segundos
    @Transactional
    public void updateAllActiveRoutes() {
        // Uso correcto de .name() para el Enum
        List<RouteProgress> activeRoutes = routeProgressRepository.findByStatus(RouteProgress.RouteStatus.valueOf(RouteProgress.RouteStatus.STARTED.name()));

        if (activeRoutes.isEmpty()) {
            return;
        }

        logger.info("Actualizando {} rutas activas", activeRoutes.size());

        for (RouteProgress progress : activeRoutes) {
            try {
                updateSingleRoute(progress);
            } catch (Exception e) {
                logger.error("Error actualizando ruta {}: {}", progress.getRouteId(), e.getMessage());
            }
        }
    }

    /**
     * Actualizar una ruta individual y simular movimiento
     */
    private void updateSingleRoute(RouteProgress progress) {
        String routeId = progress.getRouteId();

        // 🚨 CORRECCIÓN: Usar findFirstByRouteIdOrderByLastUpdateDesc que acepta String
        vehiclePositionRepository.findFirstByRouteIdOrderByLastUpdateDesc(routeId).ifPresent(position -> {
            try {
                List<RouteStop> stops = routeStopRepository.findByRoute_IdOrderByStopOrder(routeId);

                if (stops.isEmpty()) {
                    logger.warn("Ruta {} no tiene paradas definidas. Finalizando tracking.", routeId);
                    completeRoute(progress, position);
                    return;
                }

                RouteStop nextStop = getNextStop(progress, stops);

                if (nextStop == null) {
                    // Completar ruta si llegó al destino final
                    completeRoute(progress, position);
                    return;
                }

                // 1. Calcular movimiento
                double currentLat = position.getLatitude();
                double currentLon = position.getLongitude();

                double bearing = calculateBearing(currentLat, currentLon, nextStop.getLatitude(), nextStop.getLongitude());
                double speedKmh = random.nextDouble(SPEED_MIN_KMH, SPEED_MAX_KMH);

                // Distancia a moverse en este intervalo (5 segundos)
                // Distancia (metros) = Velocidad (m/s) * Tiempo (s)
                double speedMs = speedKmh * 1000.0 / 3600.0;
                double distanceToMove = speedMs * 5.0;
                distanceToMove = Math.min(distanceToMove, METERS_PER_UPDATE); // Limitar el paso

                // 2. Aplicar movimiento (simple proyección lineal)
                double movedLat = currentLat + (distanceToMove / 111111.0) * Math.cos(Math.toRadians(bearing));
                double movedLon = currentLon + (distanceToMove / (111111.0 * Math.cos(Math.toRadians(currentLat)))) * Math.sin(Math.toRadians(bearing));

                // 3. Actualizar posición
                position.setLatitude(movedLat);
                position.setLongitude(movedLon);
                position.setSpeed(speedKmh);
                position.setHeading(bearing);
                position.setNextStop(nextStop.getName());
                position.setLastUpdate(LocalDateTime.now());

                // 4. Verificar llegada a la parada
                if (calculateDistance(movedLat, movedLon, nextStop.getLatitude(), nextStop.getLongitude()) < 50.0) { // Menos de 50 metros
                    logger.info("✅ Vehículo {} llegó a la parada: {}", position.getVehicleId(), nextStop.getName());
                    progress.setCurrentStopIndex(progress.getCurrentStopIndex() + 1);
                    routeProgressRepository.save(progress);

                    // Si la siguiente parada excede el total, la ruta se completa en la próxima iteración.
                    if (progress.getCurrentStopIndex() >= stops.size()) {
                        completeRoute(progress, position);
                    }
                }

                vehiclePositionRepository.save(position);

            } catch (Exception e) {
                logger.error("Error interno en simulación de ruta {}: {}", routeId, e.getMessage());
                // No lanzar la excepción para no detener las demás rutas
            }
        });
    }

    /**
     * Obtener la siguiente parada de la ruta
     */
    private RouteStop getNextStop(RouteProgress progress, List<RouteStop> stops) {
        int nextIndex = progress.getCurrentStopIndex();

        if (nextIndex >= stops.size()) {
            // Llegó al final de la ruta
            return null;
        }

        return stops.get(nextIndex);
    }

    /**
     * Completar una ruta
     */
    private void completeRoute(RouteProgress progress, VehiclePosition position) {
        logger.info("Completando ruta: {}", progress.getRouteId());

        progress.setStatus(RouteProgress.RouteStatus.COMPLETED);
        position.setStatus(VehiclePosition.VehicleStatus.AVAILABLE);
        position.setSpeed(0.0);
        position.setRouteId(null);
        position.setNextStop(null); // Limpiar la próxima parada

        routeProgressRepository.save(progress);
        vehiclePositionRepository.save(position);
    }

    // --- MÉTODOS DE CÁLCULO GEOGRÁFICO (Sin Cambios) ---

    /**
     * Calcular distancia entre dos puntos (en metros)
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Calcular dirección (bearing) entre dos puntos
     */
    private double calculateBearing(double lat1, double lon1, double lat2, double lon2) {
        double dLon = Math.toRadians(lon2 - lon1);
        double lat1Rad = Math.toRadians(lat1);
        double lat2Rad = Math.toRadians(lat2);
        double y = Math.sin(dLon) * Math.cos(lat2Rad);
        double x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        double bearing = Math.toDegrees(Math.atan2(y, x));
        return (bearing + 360) % 360;
    }

    /**
     * Calcular distancia total de la ruta
     */
    private double calculateTotalRouteDistance(List<RouteStop> stops) {
        double total = 0;
        for (int i = 0; i < stops.size() - 1; i++) {
            RouteStop current = stops.get(i);
            RouteStop next = stops.get(i + 1);
            total += calculateDistance(
                    current.getLatitude(), current.getLongitude(),
                    next.getLatitude(), next.getLongitude()
            );
        }
        return total;
    }

    /**
     * Calcular distancia completada de la ruta
     */
    private double calculateCompletedDistance(List<RouteStop> stops, int currentStopIndex,
                                              double currentLat, double currentLon,
                                              double targetLat, double targetLon) {
        double completed = 0;

        for (int i = 0; i < currentStopIndex; i++) {
            RouteStop current = stops.get(i);
            RouteStop next = stops.get(i + 1);
            completed += calculateDistance(
                    current.getLatitude(), current.getLongitude(),
                    next.getLatitude(), next.getLongitude()
            );
        }

        if (currentStopIndex < stops.size()) {
            RouteStop currentStop = stops.get(currentStopIndex);
            double segmentStart = calculateDistance(
                    currentStop.getLatitude(), currentStop.getLongitude(),
                    currentLat, currentLon
            );
            completed += segmentStart;
        }

        return completed;
    }

    /**
     * Obtener progreso de una ruta
     */
    public RouteProgress getRouteProgress(String routeId) {
        return routeProgressRepository.findByRouteId(routeId)
                .orElseThrow(() -> new RuntimeException("Progreso de ruta no encontrado: " + routeId));
    }
}