package com.uniminuto.gemelodigital.service;

import com.uniminuto.gemelodigital.dto.ResetPasswordRequest;
import com.uniminuto.gemelodigital.entity.User;
import com.uniminuto.gemelodigital.entity.PasswordResetToken; // ← Cambiado a entity
import com.uniminuto.gemelodigital.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Map para almacenar tokens temporalmente
    private final Map<String, PasswordResetToken> resetTokens = new ConcurrentHashMap<>();

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        System.out.println("🔄 [RESET_PASSWORD] Iniciando proceso de reset...");
        System.out.println("📦 Datos recibidos:");
        System.out.println("   - Token: " + (request.getToken() != null ? request.getToken().substring(0, Math.min(10, request.getToken().length())) + "..." : "null"));
        System.out.println("   - Nueva contraseña length: " + (request.getNewPassword() != null ? request.getNewPassword().length() : "null"));
        System.out.println("   - Confirmar contraseña length: " + (request.getConfirmPassword() != null ? request.getConfirmPassword().length() : "null"));

        // 1. Validar que las contraseñas coincidan
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            System.err.println("❌ [RESET_PASSWORD] Las contraseñas no coinciden");
            throw new IllegalArgumentException("Las contraseñas no coinciden");
        }

        // 2. Validar longitud mínima
        if (request.getNewPassword().length() < 6) {
            System.err.println("❌ [RESET_PASSWORD] Contraseña muy corta");
            throw new IllegalArgumentException("La contraseña debe tener al menos 6 caracteres");
        }

        // 3. Validar token
        PasswordResetToken tokenInfo = resetTokens.get(request.getToken());
        if (tokenInfo == null) {
            System.err.println("❌ [RESET_PASSWORD] Token no encontrado: " + request.getToken());
            throw new IllegalArgumentException("Token inválido o expirado");
        }

        if (tokenInfo.getExpirationTime().isBefore(LocalDateTime.now())) {
            resetTokens.remove(request.getToken());
            System.err.println("❌ [RESET_PASSWORD] Token expirado");
            throw new IllegalArgumentException("Token expirado");
        }

        System.out.println("✅ [RESET_PASSWORD] Token válido para: " + tokenInfo.getEmail());

        // 4. Buscar usuario
        Optional<User> userOptional = userRepository.findByEmail(tokenInfo.getEmail());
        if (userOptional.isEmpty()) {
            System.err.println("❌ [RESET_PASSWORD] Usuario no encontrado: " + tokenInfo.getEmail());
            throw new IllegalArgumentException("Usuario no encontrado");
        }

        User user = userOptional.get();
        System.out.println("👤 [RESET_PASSWORD] Usuario encontrado:");
        System.out.println("   - ID: " + user.getId());
        System.out.println("   - Username: " + user.getUsername());
        System.out.println("   - Email: " + user.getEmail());
        System.out.println("   - Contraseña actual (hash): " + (user.getPassword() != null ? user.getPassword().substring(0, Math.min(20, user.getPassword().length())) + "..." : "null"));

        // 5. Encriptar nueva contraseña
        String newEncryptedPassword = passwordEncoder.encode(request.getNewPassword());
        System.out.println("🔐 [RESET_PASSWORD] Nueva contraseña encriptada:");
        System.out.println("   - Hash: " + newEncryptedPassword.substring(0, Math.min(20, newEncryptedPassword.length())) + "...");

        // 6. Verificar que el encoding funciona
        boolean matchesTest = passwordEncoder.matches(request.getNewPassword(), newEncryptedPassword);
        System.out.println("🧪 [RESET_PASSWORD] Test de encoding: " + matchesTest);

        // 7. ACTUALIZAR CONTRASEÑA
        try {
            System.out.println("💾 [RESET_PASSWORD] Intentando guardar usuario...");
            user.setPassword(newEncryptedPassword);
            User savedUser = userRepository.save(user);

            // Forzar flush inmediato
            userRepository.flush();

            System.out.println("✅ [RESET_PASSWORD] Usuario guardado con ID: " + savedUser.getId());

            // 8. VERIFICACIÓN INMEDIATA
            System.out.println("🔍 [RESET_PASSWORD] Verificando actualización en BD...");
            Optional<User> verifiedUser = userRepository.findById(user.getId());

            if (verifiedUser.isPresent()) {
                User freshUser = verifiedUser.get();
                System.out.println("🔍 [RESET_PASSWORD] Usuario verificado desde BD:");
                System.out.println("   - Contraseña en BD: " + (freshUser.getPassword() != null ? freshUser.getPassword().substring(0, Math.min(20, freshUser.getPassword().length())) + "..." : "null"));

                // Verificar si la contraseña coincide
                boolean passwordMatches = passwordEncoder.matches(request.getNewPassword(), freshUser.getPassword());
                System.out.println("🔍 [RESET_PASSWORD] ¿Contraseña correcta en BD?: " + passwordMatches);

                if (!passwordMatches) {
                    System.err.println("❌ [RESET_PASSWORD] ERROR: La contraseña no se actualizó correctamente en la BD");
                    // Intentar método alternativo
                    tryAlternativeUpdate(user.getId(), newEncryptedPassword);
                } else {
                    System.out.println("✅ [RESET_PASSWORD] Contraseña actualizada y verificada correctamente");
                }
            } else {
                System.err.println("❌ [RESET_PASSWORD] ERROR: No se pudo verificar el usuario después de guardar");
            }

        } catch (Exception e) {
            System.err.println("❌ [RESET_PASSWORD] Error al guardar: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error al actualizar la contraseña: " + e.getMessage());
        }

        // 9. Limpiar token usado
        resetTokens.remove(request.getToken());
        System.out.println("🎉 [RESET_PASSWORD] Proceso completado para: " + user.getUsername());
    }

    // Método alternativo para actualizar contraseña
    private void tryAlternativeUpdate(Long userId, String newPassword) {
        try {
            System.out.println("🔄 [ALTERNATIVE_UPDATE] Intentando método alternativo...");

            // Método simple: buscar y guardar nuevamente
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                user.setPassword(newPassword);
                userRepository.saveAndFlush(user);
                System.out.println("✅ [ALTERNATIVE_UPDATE] Usuario actualizado con método alternativo");
            }
        } catch (Exception e) {
            System.err.println("❌ [ALTERNATIVE_UPDATE] Error en método alternativo: " + e.getMessage());
        }
    }

    // Método para generar token de reset
    public String generatePasswordResetToken(String email) {
        String token = UUID.randomUUID().toString();
        PasswordResetToken tokenInfo = new PasswordResetToken(email, LocalDateTime.now().plusHours(24));
        resetTokens.put(token, tokenInfo);

        System.out.println("🔐 [GENERATE_TOKEN] Token generado para: " + email);
        System.out.println("   - Token: " + token.substring(0, 10) + "...");
        System.out.println("   - Expira: " + tokenInfo.getExpirationTime());

        return token;
    }

    // Método para verificar si un token existe
    public boolean isValidToken(String token) {
        PasswordResetToken tokenInfo = resetTokens.get(token);
        boolean isValid = tokenInfo != null && tokenInfo.getExpirationTime().isAfter(LocalDateTime.now());

        System.out.println("🔍 [VALIDATE_TOKEN] Validando token: " + (token != null ? token.substring(0, Math.min(10, token.length())) + "..." : "null"));
        System.out.println("   - Resultado: " + (isValid ? "VÁLIDO" : "INVÁLIDO"));

        return isValid;
    }

    // Método para limpiar tokens expirados (opcional)
    public void cleanupExpiredTokens() {
        int initialSize = resetTokens.size();
        resetTokens.entrySet().removeIf(entry ->
                entry.getValue().getExpirationTime().isBefore(LocalDateTime.now())
        );
        int finalSize = resetTokens.size();
        System.out.println("🧹 [CLEANUP] Tokens limpiados: " + (initialSize - finalSize) + " expirados removidos");
    }

    // Método adicional: verificar si el email existe
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    // Método adicional: obtener usuario por email
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);

    }
}