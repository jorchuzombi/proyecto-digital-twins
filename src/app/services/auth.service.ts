          import { Injectable } from '@angular/core';
          import { HttpClient, HttpHeaders } from '@angular/common/http';
          import { Observable, BehaviorSubject, tap } from 'rxjs';
          import { Router } from '@angular/router';

          declare var google: any;

          export interface User {
            id?: number;
            username: string;
            email: string;
            firstName?: string;
            lastName?: string;
            role?: string;
            roles?: string[];  // ✅ AGREGADO
            profileImage?: string;
            provider?: 'local' | 'google';
          }

          export interface AuthResponse {
            token: string;
            user?: User;        // ✅ CAMBIADO A OPCIONAL
            username?: string;  // ✅ AGREGADO
            email?: string;     // ✅ AGREGADO
            roles?: string[];   // ✅ AGREGADO
            message?: string;
          }

          export interface RegisterRequest {
            username: string;
            email: string;
            password: string;
            confirmPassword: string;
            firstName: string;
            lastName: string;
          }

          export interface LoginRequest {
            username: string;
            password: string;
          }

          export interface GoogleAuthRequest {
            token: string;
            email: string;
            name: string;
            profileImage?: string;
          }

          // ✅ NUEVAS INTERFACES PARA OLVIDAR CONTRASEÑA
          export interface ForgotPasswordRequest {
            email: string;
          }

          export interface ResetPasswordRequest {
            token: string;
            newPassword: string;
            confirmPassword: string;
          }

          export interface ValidateTokenResponse {
            valid: boolean;
            message: string;
          }

          @Injectable({
            providedIn: 'root'
          })
          export class AuthService {
            private apiUrl = 'http://localhost:8000/api/auth';
            private tokenKey = 'token';
            private userKey = 'user';

            // ✅ CORREGIDO: Usar método seguro para obtener usuario inicial
            private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUserSafe());
            public currentUser$ = this.currentUserSubject.asObservable();

            constructor(
              private http: HttpClient,
              private router: Router
            ) {}

            /**
             * 🔐 REGISTRO TRADICIONAL
             */
            register(userData: RegisterRequest): Observable<AuthResponse> {
              console.log('📤 Enviando registro a:', `${this.apiUrl}/register`);
              console.log('📦 Datos:', userData);

              return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData)
                .pipe(
                  tap({
                    next: (response) => {
                      console.log('✅ Registro exitoso:', response);
                      this.handleAuthResponse(response);
                    },
                    error: (error) => {
                      console.error('❌ Error en registro:', error);
                    }
                  })
                );
            }

            /**
             * 🔑 LOGIN TRADICIONAL - CORREGIDO
             */
            login(credentials: LoginRequest): Observable<any> {  // ✅ CAMBIADO A 'any'
              console.log('📤 Enviando login a:', `${this.apiUrl}/login`);

              return this.http.post<any>(`${this.apiUrl}/login`, credentials)  // ✅ CAMBIADO A 'any'
                .pipe(
                  tap({
                    next: (response) => {
                      console.log('✅ Login exitoso:', response);
                      this.handleAuthResponse(response);
                    },
                    error: (error) => {
                      console.error('❌ Error en login:', error);
                    }
                  })
                );
            }

            /**
             * 🔵 LOGIN CON GOOGLE
             */
            loginWithGoogle(googleData: GoogleAuthRequest): Observable<AuthResponse> {
              console.log('📤 Enviando Google auth a:', `${this.apiUrl}/google`);

              return this.http.post<AuthResponse>(`${this.apiUrl}/google`, googleData)
                .pipe(
                  tap({
                    next: (response) => {
                      console.log('✅ Google auth exitoso:', response);
                      this.handleAuthResponse(response);
                    },
                    error: (error) => {
                      console.error('❌ Error en Google auth:', error);
                    }
                  })
                );
            }

            // ✅ NUEVOS MÉTODOS PARA OLVIDAR CONTRASEÑA

            /**
             * 📧 SOLICITAR RESTABLECIMIENTO DE CONTRASEÑA
             */
            forgotPassword(email: string): Observable<any> {
              console.log('📤 Enviando solicitud de restablecimiento para:', email);

              const request: ForgotPasswordRequest = { email };

              return this.http.post<any>(`${this.apiUrl}/forgot-password`, request)
                .pipe(
                  tap({
                    next: (response) => {
                      console.log('✅ Solicitud de restablecimiento enviada:', response);
                    },
                    error: (error) => {
                      console.error('❌ Error en solicitud de restablecimiento:', error);
                    }
                  })
                );
            }

            /**
             * 🔄 RESTABLECER CONTRASEÑA
             */
            resetPassword(data: ResetPasswordRequest): Observable<any> {
              console.log('📤 Enviando restablecimiento de contraseña');

              return this.http.post<any>(`${this.apiUrl}/reset-password`, data)
                .pipe(
                  tap({
                    next: (response) => {
                      console.log('✅ Contraseña restablecida exitosamente:', response);
                    },
                    error: (error) => {
                      console.error('❌ Error al restablecer contraseña:', error);
                    }
                  })
                );
            }

            /**
             * 🔍 VALIDAR TOKEN DE RESTABLECIMIENTO
             */
            validateResetToken(token: string): Observable<ValidateTokenResponse> {
              console.log('📤 Validando token de restablecimiento');

              return this.http.get<ValidateTokenResponse>(`${this.apiUrl}/validate-token?token=${token}`)
                .pipe(
                  tap({
                    next: (response) => {
                      console.log('✅ Validación de token:', response);
                    },
                    error: (error) => {
                      console.error('❌ Error validando token:', error);
                    }
                  })
                );
            }

            /**
             * 🚪 LOGOUT
             */
            logout(): void {
              // Cerrar sesión de Google si está activa
              if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                google.accounts.id.disableAutoSelect();
              }

              localStorage.removeItem(this.tokenKey);
              localStorage.removeItem(this.userKey);
              this.currentUserSubject.next(null);
              this.router.navigate(['/login']);
            }

            /**
             * 📝 OBTENER TOKEN
             */
            getToken(): string | null {
              return localStorage.getItem(this.tokenKey);
            }

            /**
             * 👤 OBTENER USUARIO ACTUAL - CORREGIDO
             */
            getCurrentUser(): User | null {
              return this.getStoredUserSafe();  // ✅ SIEMPRE leer de localStorage
            }

            /**
             * ✅ VERIFICAR SI ESTÁ AUTENTICADO - CORREGIDO
             */
            isAuthenticated(): boolean {
              const token = this.getToken();
              const user = this.getCurrentUser();

              if (!token || !user) {
                return false;
              }

              // ✅ Verificación simple del token
              try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.exp > Date.now() / 1000;
              } catch (error) {
                console.error('❌ Error al validar token:', error);
                return false;
              }
            }

            /**
             * 👑 VERIFICAR SI ES ADMINISTRADOR
             */
            isAdmin(): boolean {
              const user = this.getCurrentUser();
              if (!user) return false;

              // Verificar si tiene rol de admin
              return user.roles?.includes('ADMIN') ||
                     user.roles?.includes('admin') ||
                     user.role === 'ADMIN' ||
                     user.role === 'admin';
            }

            /**
             * 🛡️ HEADERS CON TOKEN
             */
            getAuthHeaders(): HttpHeaders {
              const token = this.getToken();
              return new HttpHeaders({
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              });
            }

            /**
             * 🔄 INICIALIZAR GOOGLE AUTH
             */
            initializeGoogleAuth(clientId: string, callback: (response: any) => void): void {
              if (typeof google === 'undefined') {
                console.error('❌ Google API no cargada. Asegúrate de incluir el script en index.html');
                return;
              }

              google.accounts.id.initialize({
                client_id: clientId,
                callback: callback,
                auto_select: false,
                cancel_on_tap_outside: true
              });

              // Renderizar botón Google
              const googleButton = document.getElementById('googleButton');
              if (googleButton) {
                google.accounts.id.renderButton(
                  googleButton,
                  {
                    theme: 'outline',
                    size: 'large',
                    width: 400,
                    text: 'continue_with',
                    locale: 'es'
                  }
                );
              } else {
                console.warn('⚠️ Elemento #googleButton no encontrado en el DOM');
              }
            }

            /**
             * 🔄 MANEJAR RESPUESTA DE AUTENTICACIÓN - CORREGIDO
             */
            private handleAuthResponse(response: any): void {  // ✅ CAMBIADO A 'any'
              console.log('🔄 Procesando respuesta de autenticación:', response);

              if (!response || !response.token) {
                console.error('❌ Respuesta de autenticación inválida:', response);
                return;
              }

              // ✅ CREAR OBJETO USER MANUALMENTE con la estructura real del backend
              const userData: User = {
                username: response.username || response.user?.username,
                email: response.email || response.user?.email,
                roles: response.roles || response.user?.roles,
                firstName: response.firstName || response.user?.firstName,
                lastName: response.lastName || response.user?.lastName
              };

              console.log('👤 User data procesado:', userData);

              // ✅ ALMACENAR DATOS
              this.storeAuthData(response.token, userData);
              this.currentUserSubject.next(userData);

              console.log('✅ Datos de autenticación almacenados correctamente');
            }

            /**
             * 💾 ALMACENAR DATOS DE AUTENTICACIÓN
             */
            private storeAuthData(token: string, user: User): void {
              localStorage.setItem(this.tokenKey, token);
              localStorage.setItem(this.userKey, JSON.stringify(user));
            }

            /**
             * 📖 OBTENER USUARIO ALMACENADO - CORREGIDO Y MÁS SEGURO
             */
            private getStoredUserSafe(): User | null {
              try {
                const userStr = localStorage.getItem(this.userKey);

                if (!userStr || userStr === 'undefined' || userStr === 'null') {
                  return null;
                }

                const user = JSON.parse(userStr);
                console.log('📖 Usuario leído de localStorage:', user);
                return user;
              } catch (error) {
                console.error('❌ Error al leer usuario almacenado:', error);
                // ✅ LIMPIAR DATOS CORRUPTOS
                this.clearCorruptedData();
                return null;
              }
            }

            /**
             * 🧹 LIMPIAR DATOS CORRUPTOS
             */
            private clearCorruptedData(): void {
              console.log('🧹 Limpiando datos corruptos de localStorage...');
              localStorage.removeItem(this.tokenKey);
              localStorage.removeItem(this.userKey);
            }
          }
