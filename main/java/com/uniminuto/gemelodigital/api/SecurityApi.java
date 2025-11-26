package com.uniminuto.gemelodigital.Api;

import com.uniminuto.gemelodigital.security.JwtFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityApi {

    private final UserDetailsService userDetailsService;
    private final JwtFilter jwtFilter;

    public SecurityApi(UserDetailsService userDetailsService, JwtFilter jwtFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtFilter = jwtFilter;
        System.out.println("🔒 SecurityApi inicializado");
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        System.out.println("🌐 Configurando CORS...");

        CorsConfiguration configuration = new CorsConfiguration();

        // ✅ Orígenes permitidos (Angular + posibles otros)
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:4200",
                "http://127.0.0.1:4200",
                "http://localhost:3000",
                "http://localhost:8080"
        ));

        // ✅ Métodos HTTP permitidos
        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"
        ));

        // ✅ Headers permitidos
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "Accept",
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers",
                "X-Requested-With",
                "X-Auth-Token",
                "Cache-Control"
        ));

        // ✅ Headers expuestos
        configuration.setExposedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "Content-Disposition",
                "X-Total-Count"
        ));

        // ✅ Permitir credenciales (cookies, auth headers)
        configuration.setAllowCredentials(true);

        // ✅ Tiempo de caché para preflight (1 hora)
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        System.out.println("✅ CORS configurado para múltiples orígenes");
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        System.out.println("🔐 Configurando Security Filter Chain...");

        http
                // ✅ Habilitar CORS con la configuración personalizada
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ✅ Deshabilitar CSRF (API REST stateless)
                .csrf(csrf -> csrf.disable())

                // ✅ Sin estado (stateless) - JWT
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // ✅ Configurar autorizaciones
                .authorizeHttpRequests(auth -> auth
                        // ===== RUTAS PÚBLICAS =====

                        // 🌎 GEOCODIFICACIÓN - AGREGAR AMBAS RUTAS
                        .requestMatchers("/api/geocoding/**").permitAll()
                        .requestMatchers("/geocoding/**").permitAll() // ← RUTA CORREGIDA

                        // 🔐 Autenticación
                        .requestMatchers(
                                "/auth/**",
                                "/auth/register",
                                "/auth/login",
                                "/auth/google",
                                "/auth/test",
                                "/auth/refresh-token",
                                "/auth/forgot-password",
                                "/auth/reset-password"
                        ).permitAll()

                        // 📚 Documentación API
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/api-docs/**",
                                "/swagger-ui.html",
                                "/webjars/**"
                        ).permitAll()

                        // 🏥 Health checks y monitoreo
                        .requestMatchers(
                                "/actuator/**",
                                "/actuator/health",
                                "/actuator/info",
                                "/health",
                                "/info"
                        ).permitAll()

                        // 🚗 VEHÍCULOS - Público para desarrollo
                        .requestMatchers("/vehicles/**").permitAll()

                        // 🚛 CONDUCTORES - Público para desarrollo
                        .requestMatchers("/drivers/**").permitAll()

                        // 🛣️ RUTAS - Público para desarrollo
                        .requestMatchers("/routes/**").permitAll()

                        // 📊 REPORTES - Público para desarrollo
                        .requestMatchers("/reports/**").permitAll()

                        // 🔧 Utilidades y archivos estáticos
                        .requestMatchers(
                                "/error",
                                "/favicon.ico",
                                "/robots.txt",
                                "/.well-known/**"
                        ).permitAll()

                        // ===== RUTAS PROTEGIDAS =====

                        // 👥 Administración (futuro - requerirá rol ADMIN)
                        .requestMatchers("/admin/**").hasRole("ADMIN")

                        // 👤 Perfil de usuario (futuro - requerirá autenticación)
                        .requestMatchers("/profile/**").authenticated()

                        // 📈 Analytics (futuro - requerirá autenticación)
                        .requestMatchers("/analytics/**").authenticated()

                        // Cualquier otra ruta requiere autenticación
                        .anyRequest().authenticated()
                )

                // ✅ Manejo de excepciones
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> {
                            System.out.println("🚫 Acceso no autorizado: " + request.getRequestURI());
                            response.setStatus(401);
                            response.setContentType("application/json");
                            response.getWriter().write(
                                    "{\"error\": \"Unauthorized\", \"message\": \"Token inválido o expirado\"}"
                            );
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            System.out.println("🚫 Acceso denegado: " + request.getRequestURI());
                            response.setStatus(403);
                            response.setContentType("application/json");
                            response.getWriter().write(
                                    "{\"error\": \"Forbidden\", \"message\": \"No tienes permisos para acceder a este recurso\"}"
                            );
                        })
                );

        // ✅ Agregar filtro JWT antes del filtro de autenticación
        http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        System.out.println("✅ Security Filter Chain configurado exitosamente");
        logSecurityConfiguration();

        return http.build();
    }

    private void logSecurityConfiguration() {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("🔐 CONFIGURACIÓN DE SEGURIDAD ACTIVA");
        System.out.println("=".repeat(60));

        System.out.println("📍 RUTAS PÚBLICAS:");
        System.out.println("   🔓 /api/geocoding/** - Geocodificación");
        System.out.println("   🔓 /geocoding/** - Geocodificación (CORREGIDO)"); // ← Actualizado
        System.out.println("   🔓 /auth/** - Autenticación");
        System.out.println("   🔓 /vehicles/** - Gestión de vehículos");
        System.out.println("   🔓 /drivers/** - Gestión de conductores");
        System.out.println("   🔓 /routes/** - Gestión de rutas");
        System.out.println("   🔓 /reports/** - Reportes y análisis");
        System.out.println("   🔓 /swagger-ui/** - Documentación API");
        System.out.println("   🔓 /actuator/** - Monitoreo");

        System.out.println("\n📍 RUTAS PROTEGIDAS:");
        System.out.println("   🔒 /admin/** - Requiere rol ADMIN");
        System.out.println("   🔒 /profile/** - Requiere autenticación");
        System.out.println("   🔒 /analytics/** - Requiere autenticación");
        System.out.println("   🔒 Otras rutas - Requieren JWT válido");

        System.out.println("\n🌐 CORS CONFIGURADO PARA:");
        System.out.println("   ✅ http://localhost:4200 (Angular)");
        System.out.println("   ✅ http://127.0.0.1:4200");
        System.out.println("   ✅ http://localhost:3000");
        System.out.println("   ✅ http://localhost:8080");

        System.out.println("=".repeat(60) + "\n");
    }
}