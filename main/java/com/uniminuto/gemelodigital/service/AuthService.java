package com.uniminuto.gemelodigital.service;

import com.uniminuto.gemelodigital.dto.*;

public interface AuthService {

    LoginResponse login(LoginRequest loginRequest);

    LoginResponse authenticate(String username, String password);


    UserDTO register(RegisterRequest registerRequest);

    LoginResponse googleAuth(String googleToken, String email, String name);
    void forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
    boolean validateResetToken(String token);
    void initializeRoles();
}