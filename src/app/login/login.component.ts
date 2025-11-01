import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  loading = false;
  error = '';

  // Variables para olvidar contraseña
  showForgotPassword = false;
  forgotPasswordEmail = '';
  forgotPasswordLoading = false;
  forgotPasswordError = '';
  forgotPasswordSuccess = false;

  // Variables para resetear contraseña
  showResetPassword = false;
  resetPasswordForm: FormGroup;
  resetToken = '';
  resetPasswordLoading = false;
  resetPasswordError = '';
  resetPasswordSuccess = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder
  ) {
    // Inicializar formulario de resetear contraseña
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Crear partículas animadas de fondo
    this.createParticles();

    // Verificar si ya hay sesión activa
    this.checkExistingSession();

    // Verificar si hay token de reset en la URL
    this.checkResetTokenInUrl();
  }

  /**
   * Verifica si hay un token de reset en la URL
   */
  private checkResetTokenInUrl(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      console.log('🔑 Token de reset encontrado en URL');
      this.validateResetToken(token);
    }
  }

  /**
   * Valida un token de reset
   */
  private validateResetToken(token: string): void {
    this.authService.validateResetToken(token).subscribe({
      next: (response: any) => {
        if (response.valid) {
          console.log('✅ Token válido');
          this.resetToken = token;
          this.showResetPassword = true;
        } else {
          console.log('❌ Token inválido o expirado');
          this.error = 'El enlace de restablecimiento ha expirado o es inválido. Solicita uno nuevo.';
        }
      },
      error: (err) => {
        console.error('❌ Error validando token:', err);
        this.error = 'Error validando el enlace de restablecimiento. Intenta nuevamente.';
      }
    });
  }

  /**
   * Validador personalizado para contraseñas coincidentes
   */
  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else {
      confirmPassword?.setErrors(null);
    }

    return null;
  }

  /**
   * Verifica si hay una sesión activa y redirige al dashboard
   */
  private checkExistingSession(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      console.log('✅ Sesión activa detectada, redirigiendo...');
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Maneja el proceso de login
   */
  onLogin(): void {
    // Validación de campos vacíos
    if (!this.username || !this.password) {
      this.error = 'Completa todos los campos para continuar';
      this.shakeForm();
      return;
    }

    // Validación de longitud mínima
    if (this.username.length < 3) {
      this.error = 'El nombre de usuario debe tener al menos 3 caracteres';
      this.shakeForm();
      return;
    }

    if (this.password.length < 4) {
      this.error = 'La contraseña debe tener al menos 4 caracteres';
      this.shakeForm();
      return;
    }

    this.loading = true;
    this.error = '';

    console.log('🔐 [1] Iniciando proceso de autenticación...', {
      username: this.username,
      passwordLength: this.password.length,
      timestamp: new Date().toISOString()
    });

    this.authService.login({
      username: this.username.trim(),
      password: this.password
    }).subscribe({
      next: (response: any) => {
        console.log('✅ [2] Autenticación exitosa:', {
          hasToken: !!response.token,
          username: response.username,
          roles: response.roles
        });

        this.handleSuccessfulLogin(response);
      },
      error: (err) => {
        console.error('❌ [3] Error en autenticación:', {
          status: err.status,
          message: err.message,
          error: err.error
        });

        this.handleLoginError(err);
      }
    });
  }

  /**
   * Maneja una autenticación exitosa
   */
  private handleSuccessfulLogin(response: any): void {
    this.loading = false;

    // Validar estructura de respuesta
    if (!response || !response.token) {
      console.error('❌ Respuesta inválida del servidor');
      this.error = 'Respuesta del servidor inválida. Contacta al administrador.';
      return;
    }

    // Guardar datos en localStorage
    try {
      localStorage.setItem('token', response.token);

      const userData = {
        username: response.username,
        email: response.email || null,
        roles: response.roles || []
      };

      localStorage.setItem('user', JSON.stringify(userData));

      console.log('💾 [4] Datos almacenados correctamente:', {
        tokenLength: response.token.length,
        user: userData
      });

      // Navegar al dashboard
      this.navigateToDashboard();

    } catch (storageError) {
      console.error('❌ Error al guardar en localStorage:', storageError);
      this.error = 'Error al guardar la sesión. Verifica el almacenamiento del navegador.';
    }
  }

  /**
   * Navega al dashboard con múltiples métodos de respaldo
   */
  private navigateToDashboard(): void {
    console.log('🚀 [5] Iniciando navegación al dashboard...');

    // Método 1: Router.navigate
    this.router.navigate(['/dashboard']).then(success => {
      console.log('✅ [6] Navegación exitosa:', success);

      if (!success) {
        console.warn('⚠️ [7] Router.navigate falló, intentando método alternativo...');

        // Método 2: Router.navigateByUrl
        this.router.navigateByUrl('/dashboard').then(success2 => {
          console.log('✅ [8] NavigateByUrl resultado:', success2);

          if (!success2) {
            console.warn('⚠️ [9] Todos los métodos de router fallaron, usando window.location...');

            // Método 3: Redirección directa
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 500);
          }
        }).catch(navError => {
          console.error('❌ [10] Error en navigateByUrl:', navError);
          window.location.href = '/dashboard';
        });
      }
    }).catch(navError => {
      console.error('❌ [11] Error en navigate:', navError);
      window.location.href = '/dashboard';
    });
  }

  /**
   * Maneja errores de login con mensajes específicos
   */
  private handleLoginError(err: any): void {
    this.loading = false;
    this.shakeForm();

    switch (err.status) {
      case 401:
        this.error = '❌ Contraseña incorrecta. Has ingresado credenciales inválidas. Por favor verifica tu usuario y contraseña.';
        break;

      case 404:
        this.error = '🔍 Usuario no encontrado. Verifica que el nombre de usuario sea correcto o crea una cuenta nueva.';
        break;

      case 403:
        this.error = '🚫 Acceso prohibido. Tu cuenta puede estar desactivada. Contacta al administrador.';
        break;

      case 429:
        this.error = '⏱️ Demasiados intentos. Espera unos minutos antes de intentar nuevamente.';
        break;

      case 500:
      case 502:
      case 503:
        this.error = '⚙️ Error interno del servidor. Intenta nuevamente en unos momentos.';
        break;

      case 0:
        this.error = '🔌 Sin conexión al servidor. Verifica que el backend esté activo y la URL sea correcta.';
        break;

      default:
        this.error = err.error?.message || '⚠️ Error inesperado. Por favor intenta nuevamente.';
    }

    // Auto-limpiar error después de 8 segundos
    setTimeout(() => {
      this.error = '';
    }, 8000);
  }

  /**
   * Abre el modal de olvidar contraseña
   */
  openForgotPassword(): void {
    this.showForgotPassword = true;
    this.forgotPasswordEmail = '';
    this.forgotPasswordError = '';
    this.forgotPasswordSuccess = false;
  }

  /**
   * Cierra el modal de olvidar contraseña
   */
  closeForgotPassword(): void {
    this.showForgotPassword = false;
    this.forgotPasswordEmail = '';
    this.forgotPasswordError = '';
    this.forgotPasswordSuccess = false;
  }

  /**
   * Maneja el envío de olvidar contraseña
   */
  onForgotPassword(): void {
    if (!this.forgotPasswordEmail) {
      this.forgotPasswordError = 'Por favor ingresa tu email';
      return;
    }

    if (!this.isValidEmail(this.forgotPasswordEmail)) {
      this.forgotPasswordError = 'Por favor ingresa un email válido';
      return;
    }

    this.forgotPasswordLoading = true;
    this.forgotPasswordError = '';

    console.log('📧 Enviando solicitud de restablecimiento para:', this.forgotPasswordEmail);

    this.authService.forgotPassword(this.forgotPasswordEmail).subscribe({
      next: (response: any) => {
        console.log('✅ Solicitud de restablecimiento enviada:', response);
        this.forgotPasswordLoading = false;
        this.forgotPasswordSuccess = true;

        // Cerrar automáticamente después de 3 segundos
        setTimeout(() => {
          this.closeForgotPassword();
        }, 3000);
      },
      error: (err) => {
        console.error('❌ Error en olvidar contraseña:', err);
        this.forgotPasswordLoading = false;

        if (err.status === 400) {
          this.forgotPasswordError = err.error?.message || 'Error al procesar la solicitud';
        } else if (err.status === 0) {
          this.forgotPasswordError = 'Sin conexión al servidor. Verifica tu conexión.';
        } else {
          this.forgotPasswordError = 'Error inesperado. Intenta nuevamente.';
        }
      }
    });
  }

  /**
   * Maneja el reset de contraseña
   */
  onResetPassword(): void {
    if (this.resetPasswordForm.invalid) {
      this.markFormGroupTouched(this.resetPasswordForm);
      return;
    }

    this.resetPasswordLoading = true;
    this.resetPasswordError = '';

    const formValue = this.resetPasswordForm.value;

    this.authService.resetPassword({
      token: this.resetToken,
      newPassword: formValue.newPassword,
      confirmPassword: formValue.confirmPassword
    }).subscribe({
      next: (response: any) => {
        console.log('✅ Contraseña restablecida exitosamente:', response);
        this.resetPasswordLoading = false;
        this.resetPasswordSuccess = true;

        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          this.showResetPassword = false;
          this.resetPasswordSuccess = false;
          this.resetToken = '';
          // Limpiar parámetros de la URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 2000);
      },
      error: (err) => {
        console.error('❌ Error al restablecer contraseña:', err);
        this.resetPasswordLoading = false;

        if (err.status === 400) {
          this.resetPasswordError = err.error?.message || 'Error al restablecer la contraseña';
        } else {
          this.resetPasswordError = 'Error inesperado. Intenta nuevamente.';
        }
      }
    });
  }

  /**
   * Cierra el modal de resetear contraseña
   */
  closeResetPassword(): void {
    this.showResetPassword = false;
    this.resetToken = '';
    this.resetPasswordForm.reset();
    this.resetPasswordError = '';
    this.resetPasswordSuccess = false;
    // Limpiar parámetros de la URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  /**
   * Valida formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Marca todos los campos del formulario como touched
   */
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Efecto de sacudida para el formulario
   */
  private shakeForm(): void {
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
      input.classList.add('error');
      setTimeout(() => input.classList.remove('error'), 500);
    });
  }

  /**
   * Crea partículas animadas en el fondo
   */
  private createParticles(): void {
    setTimeout(() => {
      const particlesContainer = document.getElementById('particles');
      if (!particlesContainer) {
        console.warn('⚠️ Contenedor de partículas no encontrado');
        return;
      }

      const particleCount = 50;
      const colors = ['#667eea', '#764ba2', '#64ffda', '#ff4757'];

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomLeft = Math.random() * 100;
        const randomDelay = Math.random() * 6;
        const randomDuration = 3 + Math.random() * 4;
        const randomOpacity = Math.random() * 0.5;
        const randomSize = 1 + Math.random() * 3;

        const styles = [
          `left: ${randomLeft}%`,
          `animation-delay: ${randomDelay}s`,
          `animation-duration: ${randomDuration}s`,
          `opacity: ${randomOpacity}`,
          `background: ${randomColor}`,
          `width: ${randomSize}px`,
          `height: ${randomSize}px`
        ].join('; ');

        particle.setAttribute('style', styles);
        particlesContainer.appendChild(particle);
      }

      console.log('✨ Partículas creadas correctamente');
    }, 100);
  }

  /**
   * Limpia el formulario
   */
  clearForm(): void {
    this.username = '';
    this.password = '';
    this.error = '';
  }

  /**
   * Maneja el evento de Enter en los inputs
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onLogin();
    }
  }
}
