package com.uniminuto.gemelodigital.service;

import com.uniminuto.gemelodigital.entity.VehiclePosition;
import com.uniminuto.gemelodigital.repository.VehiclePositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 🚗 SIMULADOR DE VEHÍCULOS CON RUTAS REALES
 *
 * Los vehículos siguen rutas predefinidas punto por punto
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VehicleSimulatorService {

    private final VehiclePositionRepository vehiclePositionRepository;
    private final Random random = new Random();

    // Rutas predefinidas en Bogotá (puntos de calles reales)
    private static final Map<String, List<double[]>> PREDEFINED_ROUTES = new HashMap<>();

    // Índice actual de cada vehículo en su ruta
    private final Map<String, Integer> vehicleRouteIndex = new HashMap<>();

    static {
        // Ruta 1: Centro → Norte (Carrera 7)
        PREDEFINED_ROUTES.put("ROUTE_1", Arrays.asList(
                new double[]{4.5981, -74.0758},  // Inicio (Centro)
                new double[]{4.6097, -74.0817},  // Intermedio
                new double[]{4.6423, -74.0619},  // Intermedio
                new double[]{4.6597, -74.0540},  // Intermedio
                new double[]{4.6810, -74.0470},  // Fin (Norte)
                new double[]{4.6950, -74.0380}   // Extra
        ));

        // Ruta 2: Oeste → Este (Calle 26)
        PREDEFINED_ROUTES.put("ROUTE_2", Arrays.asList(
                new double[]{4.6341, -74.1419},  // Inicio (Aeropuerto)
                new double[]{4.6300, -74.1200},
                new double[]{4.6250, -74.1000},
                new double[]{4.6200, -74.0800},
                new double[]{4.6150, -74.0600},
                new double[]{4.6100, -74.0400}   // Fin (Este)
        ));

        // Ruta 3: Sur → Centro
        PREDEFINED_ROUTES.put("ROUTE_3", Arrays.asList(
                new double[]{4.5500, -74.1100},  // Inicio (Sur)
                new double[]{4.5650, -74.0950},
                new double[]{4.5800, -74.0800},
                new double[]{4.5950, -74.0650},
                new double[]{4.6097, -74.0817}   // Fin (Centro)
        ));
    }

    @PostConstruct
    public void init() {
        log.info("🚀 VehicleSimulatorService inicializado");
        log.info("⏰ Scheduler configurado para ejecutarse cada 5 segundos");
        log.info("🗺️ {} rutas predefinidas cargadas", PREDEFINED_ROUTES.size());
    }

    /**
     * ⏰ SCHEDULER: Se ejecuta cada 5 segundos
     */
    //@Scheduled(fixedRate = 5000)
    @Transactional
    public void updateVehiclePositions() {
        try {
            List<VehiclePosition> activeVehicles = vehiclePositionRepository.findByStatus("BUSY");

            if (activeVehicles.isEmpty()) {
                log.debug("⚠️ No hay vehículos en ruta para actualizar");
                return;
            }

            log.info("🔄 Actualizando {} vehículos en ruta...", activeVehicles.size());

            for (VehiclePosition vehicle : activeVehicles) {
                simulateRouteMovement(vehicle);
                vehiclePositionRepository.save(vehicle);

                log.info("✅ Vehículo {} actualizado - Lat: {}, Lng: {}, Speed: {} km/h",
                        vehicle.getVehicleId(),
                        vehicle.getLatitude(),
                        vehicle.getLongitude(),
                        vehicle.getSpeed()
                );
            }

            log.info("🎯 Actualización completada: {} vehículos", activeVehicles.size());

        } catch (Exception e) {
            log.error("❌ Error actualizando posiciones de vehículos", e);
        }
    }

    /**
     * 🚗 Simula el movimiento siguiendo una ruta predefinida
     */
    private void simulateRouteMovement(VehiclePosition vehicle) {
        String vehicleId = vehicle.getVehicleId();

        // Determinar qué ruta sigue este vehículo
        String routeKey = determineRouteForVehicle(vehicleId);
        List<double[]> route = PREDEFINED_ROUTES.get(routeKey);

        if (route == null || route.isEmpty()) {
            // Fallback: movimiento aleatorio
            simulateRandomMovement(vehicle);
            return;
        }

        // Obtener índice actual en la ruta
        int currentIndex = vehicleRouteIndex.getOrDefault(vehicleId, 0);

        // Si llegó al final, reiniciar la ruta
        if (currentIndex >= route.size()) {
            currentIndex = 0;
            log.info("🔄 Vehículo {} completó la ruta, reiniciando", vehicleId);
        }

        // Obtener siguiente punto en la ruta
        double[] nextPoint = route.get(currentIndex);
        double targetLat = nextPoint[0];
        double targetLng = nextPoint[1];

        // Mover hacia el siguiente punto (interpolación suave)
        double currentLat = vehicle.getLatitude();
        double currentLng = vehicle.getLongitude();

        // Calcular distancia al siguiente punto
        double distance = calculateDistance(currentLat, currentLng, targetLat, targetLng);

        // Si está muy cerca del punto, avanzar al siguiente
        if (distance < 0.001) { // ~100 metros
            currentIndex++;
            vehicleRouteIndex.put(vehicleId, currentIndex);

            // Obtener el nuevo punto objetivo
            if (currentIndex < route.size()) {
                nextPoint = route.get(currentIndex);
                targetLat = nextPoint[0];
                targetLng = nextPoint[1];
            }
        }

        // Mover gradualmente hacia el objetivo
        double step = 0.0003; // Paso pequeño para movimiento suave
        double newLat = currentLat + (targetLat - currentLat) * step;
        double newLng = currentLng + (targetLng - currentLng) * step;

        // Calcular heading (dirección)
        double heading = calculateHeading(currentLat, currentLng, newLat, newLng);

        // Velocidad aleatoria entre 30 y 70 km/h
        double speed = 30 + random.nextDouble() * 40;

        // Actualizar vehículo
        vehicle.setLatitude(newLat);
        vehicle.setLongitude(newLng);
        vehicle.setSpeed(speed);
        vehicle.setHeading(heading);
        vehicle.setLastUpdate(LocalDateTime.now());

        // Simular niveles de tráfico
        String[] trafficLevels = {"LOW", "MEDIUM", "HIGH"};
        vehicle.setTrafficLevel(trafficLevels[random.nextInt(trafficLevels.length)]);

        // Calcular distancia restante
        if (vehicle.getCurrentRouteId() != null) {
            double remainingDistance = calculateRemainingDistance(vehicle, route, currentIndex);
            vehicle.setDistanceToDestination(remainingDistance);

            // Calcular ETA
            if (remainingDistance > 0 && speed > 0) {
                int etaMinutes = (int) ((remainingDistance / speed) * 60);
                vehicle.setEta(etaMinutes + " min");
            }
        }
    }

    /**
     * Determinar qué ruta sigue cada vehículo
     */
    private String determineRouteForVehicle(String vehicleId) {
        // Asignar rutas según el ID del vehículo
        int hash = Math.abs(vehicleId.hashCode());
        int routeIndex = hash % PREDEFINED_ROUTES.size();

        List<String> routeKeys = new ArrayList<>(PREDEFINED_ROUTES.keySet());
        return routeKeys.get(routeIndex);
    }

    /**
     * Calcular distancia restante en la ruta
     */
    private double calculateRemainingDistance(VehiclePosition vehicle, List<double[]> route, int currentIndex) {
        double totalDistance = 0;
        double currentLat = vehicle.getLatitude();
        double currentLng = vehicle.getLongitude();

        // Distancia al siguiente punto
        if (currentIndex < route.size()) {
            double[] nextPoint = route.get(currentIndex);
            totalDistance += calculateDistance(currentLat, currentLng, nextPoint[0], nextPoint[1]);
        }

        // Distancia entre puntos restantes
        for (int i = currentIndex; i < route.size() - 1; i++) {
            double[] point1 = route.get(i);
            double[] point2 = route.get(i + 1);
            totalDistance += calculateDistance(point1[0], point1[1], point2[0], point2[1]);
        }

        return totalDistance;
    }

    /**
     * Movimiento aleatorio (fallback)
     */
    private void simulateRandomMovement(VehiclePosition vehicle) {
        double speed = 20 + random.nextDouble() * 60;
        vehicle.setSpeed(speed);

        double displacement = (speed / 3600.0) * 5 * 0.00001;

        double newLat = vehicle.getLatitude() + (random.nextDouble() - 0.5) * displacement;
        double newLng = vehicle.getLongitude() + (random.nextDouble() - 0.5) * displacement;

        vehicle.setLatitude(newLat);
        vehicle.setLongitude(newLng);
        vehicle.setHeading(random.nextDouble() * 360);
        vehicle.setLastUpdate(LocalDateTime.now());

        String[] trafficLevels = {"LOW", "MEDIUM", "HIGH"};
        vehicle.setTrafficLevel(trafficLevels[random.nextInt(trafficLevels.length)]);
    }

    /**
     * Calcular distancia entre dos puntos (Haversine)
     */
    private double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371; // Radio de la Tierra en km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);

        double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLng/2) * Math.sin(dLng/2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Calcular heading (dirección) entre dos puntos
     */
    private double calculateHeading(double lat1, double lng1, double lat2, double lng2) {
        double dLng = Math.toRadians(lng2 - lng1);
        double y = Math.sin(dLng) * Math.cos(Math.toRadians(lat2));
        double x = Math.cos(Math.toRadians(lat1)) * Math.sin(Math.toRadians(lat2)) -
                Math.sin(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.cos(dLng);

        double heading = Math.toDegrees(Math.atan2(y, x));
        return (heading + 360) % 360;
    }

    /**
     * 🚀 Iniciar simulación para un vehículo específico
     */
    public void startSimulation(String vehicleId) {
        log.info("🚀 Iniciando simulación para vehículo: {}", vehicleId);

        vehiclePositionRepository.findByVehicleId(vehicleId).ifPresent(vehicle -> {
            vehicle.setStatus("BUSY");
            vehicle.setSpeed(40.0);

            // Establecer posición inicial en el primer punto de la ruta
            String routeKey = determineRouteForVehicle(vehicleId);
            List<double[]> route = PREDEFINED_ROUTES.get(routeKey);

            if (route != null && !route.isEmpty()) {
                double[] startPoint = route.get(0);
                vehicle.setLatitude(startPoint[0]);
                vehicle.setLongitude(startPoint[1]);
                vehicleRouteIndex.put(vehicleId, 0);
                log.info("✅ Vehículo {} posicionado en inicio de {}", vehicleId, routeKey);
            }

            vehicle.setLastUpdate(LocalDateTime.now());
            vehiclePositionRepository.save(vehicle);

            log.info("✅ Simulación iniciada para: {}", vehicleId);
        });
    }

    /**
     * ⏸️ Detener simulación
     */
    public void stopSimulation(String vehicleId) {
        log.info("⏸️ Deteniendo simulación para vehículo: {}", vehicleId);

        vehiclePositionRepository.findByVehicleId(vehicleId).ifPresent(vehicle -> {
            vehicle.setStatus("AVAILABLE");
            vehicle.setSpeed(0.0);
            vehicle.setCurrentRouteId(null);
            vehicle.setDistanceToDestination(null);
            vehicle.setEta(null);
            vehicle.setLastUpdate(LocalDateTime.now());
            vehiclePositionRepository.save(vehicle);

            vehicleRouteIndex.remove(vehicleId);

            log.info("✅ Simulación detenida para: {}", vehicleId);
        });
    }
}