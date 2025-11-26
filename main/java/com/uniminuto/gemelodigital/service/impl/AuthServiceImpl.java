package com.uniminuto.gemelodigital.service.impl;

import com.uniminuto.gemelodigital.dto.*;
import com.uniminuto.gemelodigital.entity.Role;
import com.uniminuto.gemelodigital.entity.RoleName;
import com.uniminuto.gemelodigital.entity.User;
import com.uniminuto.gemelodigital.repository.RoleRepository;
import com.uniminuto.gemelodigital.repository.UserRepository;
import com.uniminuto.gemelodigital.security.JwtUtil;
import com.uniminuto.gemelodigital.service.AuthService;
import com.uniminuto.gemelodigital.service.EmailService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    // Almacenamiento temporal de tokens (en producción usar Redis o DB)
    private final ConcurrentHashMap<String, PasswordResetToken> resetTokens = new ConcurrentHashMap<>();

    public AuthServiceImpl(UserRepository userRepository,
                           RoleRepository roleRepository,
                           PasswordEncoder passwordEncoder,
                           AuthenticationManager authenticationManager,
                           JwtUtil jwtUtil,
                           EmailService emailService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
        System.out.println("✅ AuthServiceImpl construido con todas las dependencias");
    }

    @PostConstruct
    public void init() {
        initializeRoles();
        System.out.println("✅ AuthServiceImpl inicializado correctamente");
    }

    @Override
    public LoginResponse login(LoginRequest loginRequest) {
        System.out.println("🔐 [LOGIN] Autenticando usuario: " + loginRequest.getUsername());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );

        String username = authentication.getName();
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        String token = jwtUtil.generateToken(username, roles);

        System.out.println("✅ [LOGIN] Autenticación exitosa para: " + username);
        return new LoginResponse(token, username, roles);
    }

    @Override
    public LoginResponse authenticate(String username, String password) {
        return null; // Este método parece no estar en uso
    }

    @Override
    @Transactional
    public UserDTO register(RegisterRequest request) {
        System.out.println("📝 [REGISTER] Iniciando registro para: " + request.getUsername());

        // Validar usuario existente
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya existe");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        // Validar contraseñas
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Las contraseñas no coinciden");
        }

        // Validar longitud mínima de contraseña
        if (request.getPassword().length() < 6) {
            throw new RuntimeException("La contraseña debe tener al menos 6 caracteres");
        }

        // Crear nuevo usuario
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEnabled(true);

        // Asignar rol VIEWER por defecto
        Set<Role> roles = new HashSet<>();
        Role viewerRole = roleRepository.findByName(RoleName.ROLE_VIEWER)
                .orElseThrow(() -> new RuntimeException("Role VIEWER no encontrado"));
        roles.add(viewerRole);
        user.setRoles(roles);

        User savedUser = userRepository.save(user);
        System.out.println("✅ [REGISTER] Usuario guardado con ID: " + savedUser.getId());

        return new UserDTO(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                viewerRole.getName().name()
        );
    }

    @Override
    public LoginResponse googleAuth(String googleToken, String email, String name) {
        try {
            System.out.println("🔵 [GOOGLE_AUTH] Procesando autenticación para: " + email);

            // Buscar usuario por email
            User user = userRepository.findByEmail(email)
                    .orElseGet(() -> {
                        System.out.println("👤 [GOOGLE_AUTH] Creando nuevo usuario para: " + email);
                        // Crear nuevo usuario de Google si no existe
                        User newUser = new User();
                        newUser.setEmail(email);
                        newUser.setUsername(generateUsernameFromEmail(email));
                        newUser.setPassword(passwordEncoder.encode("GOOGLE_OAUTH_" + System.currentTimeMillis()));
                        newUser.setEnabled(true);

                        // Asignar rol por defecto (VIEWER)
                        Set<Role> roles = new HashSet<>();
                        Role viewerRole = roleRepository.findByName(RoleName.ROLE_VIEWER)
                                .orElseThrow(() -> new RuntimeException("Role VIEWER no encontrado"));
                        roles.add(viewerRole);
                        newUser.setRoles(roles);

                        User savedUser = userRepository.save(newUser);
                        System.out.println("✅ [GOOGLE_AUTH] Nuevo usuario creado: " + savedUser.getUsername());
                        return savedUser;
                    });

            // Obtener roles como List<String>
            List<String> roles = user.getRoles().stream()
                    .map(role -> role.getName().name())
                    .collect(Collectors.toList());

            // Generar token JWT
            String token = jwtUtil.generateToken(user.getUsername(), roles);

            System.out.println("✅ [GOOGLE_AUTH] Autenticación exitosa para: " + user.getUsername());
            return new LoginResponse(token, user.getUsername(), user.getEmail(), roles);

        } catch (Exception e) {
            System.err.println("❌ [GOOGLE_AUTH] Error: " + e.getMessage());
            throw new RuntimeException("Error en autenticación con Google: " + e.getMessage());
        }
    }

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        System.out.println("🔐 [FORGOT_PASSWORD] Solicitado para: " + request.getEmail());

        // Buscar usuario por email en la base de datos
        Optional<User> userOptional = userRepository.findByEmail(request.getEmail());

        if (userOptional.isEmpty()) {
            System.out.println("⚠️ [FORGOT_PASSWORD] Email no encontrado: " + request.getEmail());
            // Por seguridad, no revelamos si el email existe o no
            return;
        }

        User user = userOptional.get();

        // Generar token único
        String resetToken = UUID.randomUUID().toString();
        LocalDateTime expirationTime = LocalDateTime.now().plus(1, ChronoUnit.HOURS);

        // Guardar token en memoria
        resetTokens.put(resetToken, new PasswordResetToken(user.getEmail(), expirationTime, user.getUsername()));

        // Enviar email
        emailService.sendPasswordResetEmail(user.getEmail(), resetToken, user.getUsername());

        System.out.println("✅ [FORGOT_PASSWORD] Token generado y email enviado para: " + user.getUsername());
        System.out.println("🔑 Token: " + resetToken);
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        System.out.println("🔄 [RESET_PASSWORD] Intentando restablecer contraseña");

        // Validar que las contraseñas coincidan
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Las contraseñas no coinciden");
        }

        // Validar longitud mínima de contraseña
        if (request.getNewPassword().length() < 6) {
            throw new RuntimeException("La contraseña debe tener al menos 6 caracteres");
        }

        // Validar token
        PasswordResetToken tokenInfo = resetTokens.get(request.getToken());
        if (tokenInfo == null) {
            throw new RuntimeException("Token inválido o expirado");
        }

        if (tokenInfo.getExpirationTime().isBefore(LocalDateTime.now())) {
            resetTokens.remove(request.getToken()); // Limpiar token expirado
            throw new RuntimeException("Token expirado");
        }

        // Buscar usuario por email
        User user = userRepository.findByEmail(tokenInfo.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // Actualizar contraseña en la base de datos
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        System.out.println("✅ [RESET_PASSWORD] Contraseña actualizada para: " + user.getUsername());

        // Eliminar token usado
        resetTokens.remove(request.getToken());

        System.out.println("✅ [RESET_PASSWORD] Contraseña restablecida exitosamente");
    }

    @Override
    public boolean validateResetToken(String token) {
        System.out.println("🔍 [VALIDATE_TOKEN] Validando token: " + (token != null ? token.substring(0, Math.min(10, token.length())) + "..." : "null"));

        PasswordResetToken tokenInfo = resetTokens.get(token);
        if (tokenInfo == null) {
            System.out.println("❌ [VALIDATE_TOKEN] Token no encontrado");
            return false;
        }

        boolean isValid = !tokenInfo.getExpirationTime().isBefore(LocalDateTime.now());
        if (!isValid) {
            resetTokens.remove(token); // Limpiar token expirado
            System.out.println("❌ [VALIDATE_TOKEN] Token expirado");
        } else {
            System.out.println("✅ [VALIDATE_TOKEN] Token válido para: " + tokenInfo.getUsername());
        }

        return isValid;
    }

    private String generateUsernameFromEmail(String email) {
        String baseUsername = email.split("@")[0];
        String username = baseUsername;
        int counter = 1;

        // Si el username ya existe, agregar número
        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }

        return username;
    }

    @Override
    public void initializeRoles() {
        System.out.println("🔧 [INIT_ROLES] Inicializando roles del sistema");
        for (RoleName roleName : RoleName.values()) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                Role role = new Role();
                role.setName(roleName);
                roleRepository.save(role);
                System.out.println("✅ Rol creado: " + roleName);
            } else {
                System.out.println("✅ Rol ya existe: " + roleName);
            }
        }
        System.out.println("✅ [INIT_ROLES] Todos los roles inicializados correctamente");
    }

    /**
     * Método para limpiar tokens expirados (podría llamarse periódicamente)
     */
    public void cleanupExpiredTokens() {
        int initialSize = resetTokens.size();
        resetTokens.entrySet().removeIf(entry ->
                entry.getValue().getExpirationTime().isBefore(LocalDateTime.now())
        );
        int removed = initialSize - resetTokens.size();
        if (removed > 0) {
            System.out.println("🧹 [CLEANUP] Tokens expirados eliminados: " + removed);
        }
    }

    // Clase interna para manejar tokens
    private static class PasswordResetToken {
        private String email;
        private LocalDateTime expirationTime;
        private String username;

        public PasswordResetToken(String email, LocalDateTime expirationTime, String username) {
            this.email = email;
            this.expirationTime = expirationTime;
            this.username = username;
        }

        public String getEmail() { return email; }
        public LocalDateTime getExpirationTime() { return expirationTime; }
        public String getUsername() { return username; }
    }
}