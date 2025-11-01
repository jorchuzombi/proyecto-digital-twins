package com.uniminuto.gemelodigital.controller;

import com.uniminuto.gemelodigital.dto.*;
import com.uniminuto.gemelodigital.service.AuthService;
import com.uniminuto.gemelodigital.service.UserService;
import com.uniminuto.gemelodigital.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.annotation.PostConstruct;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthService authService, UserService userService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        System.out.println("✅ AuthController constructor ejecutado");
        System.out.println("📦 Servicios inyectados:");
        System.out.println("   - AuthService: " + (authService != null ? "✅" : "❌"));
        System.out.println("   - UserService: " + (userService != null ? "✅" : "❌"));
        System.out.println("   - JwtUtil: " + (jwtUtil != null ? "✅" : "❌"));
    }

    @PostConstruct
    public void init() {
        System.out.println("🚀 AuthController inicializado correctamente");
        System.out.println("📍 Base path: /auth");
        System.out.println("📝 Endpoints disponibles:");
        System.out.println("   POST /auth/register");
        System.out.println("   POST /auth/login");
        System.out.println("   POST /auth/google");
        System.out.println("   POST /auth/forgot-password");
        System.out.println("   POST /auth/reset-password");
        System.out.println("   GET  /auth/validate-token");
        System.out.println("   GET  /auth/validate");
        System.out.println("   GET  /auth/test");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest registerRequest) {
        System.out.println("📝 [REGISTER] Petición recibida para: " + registerRequest.getUsername());
        try {
            // 1️⃣ Registrar usuario
            UserDTO userDTO = authService.register(registerRequest);
            System.out.println("✅ [REGISTER] Usuario registrado: " + userDTO.getUsername());

            // 2️⃣ Generar token JWT
            String token = jwtUtil.generateToken(userDTO.getUsername());
            System.out.println("🔑 [REGISTER] Token generado: " + token.substring(0, 20) + "...");

            // 3️⃣ Crear respuesta completa
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("username", userDTO.getUsername());
            response.put("email", userDTO.getEmail());
            response.put("firstName", userDTO.getFirstName());
            response.put("lastName", userDTO.getLastName());
            response.put("role", userDTO.getRole());
            response.put("message", "Usuario registrado exitosamente");

            System.out.println("📤 [REGISTER] Enviando respuesta con token");
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            System.err.println("❌ [REGISTER] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Error en el registro: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        System.out.println("🔑 [LOGIN] Petición recibida para: " + loginRequest.getUsername());
        try {
            LoginResponse response = authService.login(loginRequest);
            System.out.println("✅ [LOGIN] Usuario autenticado exitosamente");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("❌ [LOGIN] Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Credenciales inválidas: " + e.getMessage()));
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleAuth(@RequestBody GoogleAuthRequest request) {
        System.out.println("🔵 [GOOGLE] Petición recibida");
        try {
            LoginResponse response = authService.googleAuth(
                    request.getToken(),
                    request.getEmail(),
                    request.getName()
            );
            System.out.println("✅ [GOOGLE] Autenticación exitosa");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("❌ [GOOGLE] Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error en autenticación con Google: " + e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        System.out.println("📧 [FORGOT_PASSWORD] Solicitud recibida para: " + request.getEmail());
        try {
            // Verificar si el email existe usando UserService
            if (!userService.existsByEmail(request.getEmail())) {
                System.out.println("⚠️ [FORGOT_PASSWORD] Email no encontrado: " + request.getEmail());
                // Por seguridad, no revelamos si el email existe o no
                return ResponseEntity.ok().body(Map.of("message",
                        "Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña"));
            }

            // Generar token usando UserService
            String token = userService.generatePasswordResetToken(request.getEmail());

            System.out.println("🔐 [FORGOT_PASSWORD] Token generado para: " + request.getEmail());
            System.out.println("   - Token: " + token.substring(0, 10) + "...");

            // Aquí deberías enviar el token por email (simulado)
            System.out.println("📤 [FORGOT_PASSWORD] Simulando envío de email...");
            System.out.println("   - Para: " + request.getEmail());
            System.out.println("   - Token: " + token);
            System.out.println("   - Enlace: http://localhost:8080/auth/reset-password?token=" + token);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña");
            response.put("token", token); // Solo para desarrollo - quitar en producción

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ [FORGOT_PASSWORD] Error: " + e.getMessage());
            e.printStackTrace();
            // Por seguridad, siempre devolvemos el mismo mensaje
            return ResponseEntity.ok().body(Map.of("message",
                    "Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña"));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        System.out.println("🔄 [RESET_PASSWORD] Solicitud recibida");
        System.out.println("   - Token: " + (request.getToken() != null ?
                request.getToken().substring(0, Math.min(10, request.getToken().length())) + "..." : "null"));
        System.out.println("   - Nueva contraseña length: " +
                (request.getNewPassword() != null ? request.getNewPassword().length() : "null"));
        System.out.println("   - Confirmar contraseña length: " +
                (request.getConfirmPassword() != null ? request.getConfirmPassword().length() : "null"));

        try {
            // Usar UserService para resetear la contraseña
            userService.resetPassword(request);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Contraseña restablecida exitosamente");

            System.out.println("✅ [RESET_PASSWORD] Contraseña actualizada correctamente");
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            System.err.println("❌ [RESET_PASSWORD] Error de validación: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            System.err.println("❌ [RESET_PASSWORD] Error interno: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error interno del servidor al restablecer contraseña: " + e.getMessage()));
        }
    }

    @GetMapping("/validate-token")
    public ResponseEntity<?> validateResetToken(@RequestParam String token) {
        System.out.println("🔍 [VALIDATE_TOKEN] Validando token: " +
                (token != null ? token.substring(0, Math.min(10, token.length())) + "..." : "null"));
        try {
            // Usar UserService para validar el token
            boolean isValid = userService.isValidToken(token);

            Map<String, Object> response = new HashMap<>();
            response.put("valid", isValid);
            response.put("message", isValid ? "Token válido" : "Token inválido o expirado");

            System.out.println("✅ [VALIDATE_TOKEN] Resultado: " + (isValid ? "VÁLIDO" : "INVÁLIDO"));
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ [VALIDATE_TOKEN] Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("valid", false, "message", "Error validando token: " + e.getMessage()));
        }
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validateToken() {
        System.out.println("✅ [VALIDATE] Token JWT validado");
        return ResponseEntity.ok(Map.of("message", "Token válido", "status", "success"));
    }

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        System.out.println("🧪 [TEST] Endpoint de prueba ejecutado");
        return ResponseEntity.ok("AuthController funcionando correctamente!");
    }

    // Endpoint adicional para verificar estado del servicio
    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        System.out.println("❤️ [HEALTH] Verificación de salud del servicio");
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "AuthController");
        health.put("timestamp", java.time.LocalDateTime.now());
        health.put("endpoints", java.util.Arrays.asList(
                "POST /auth/register",
                "POST /auth/login",
                "POST /auth/google",
                "POST /auth/forgot-password",
                "POST /auth/reset-password",
                "GET /auth/validate-token"
        ));

        return ResponseEntity.ok(health);
    }
}