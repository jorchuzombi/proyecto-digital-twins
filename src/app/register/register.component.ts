import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, RegisterRequest, GoogleAuthRequest } from '../services/auth.service';

declare var google: any;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  userData: RegisterRequest = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  };

  loading = false;
  googleLoading = false;
  showSuccessModal = false;  // ✅ AGREGADO
  showErrorNotification = false;
  error = '';
  countdown = 5;  // ✅ AGREGADO
  private countdownInterval: any;  // ✅ AGREGADO

  // Validaciones
  passwordStrength = {
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  };

  private googleClientId = '1048379693983-1hp6krqdr52d3tlsn6vpefhmbk8q8svh.apps.googleusercontent.com';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadGoogleAuthLibrary();
    this.createParticles();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeGoogleAuth();
      this.initializeGoogleButton();
    }, 1000);
  }

  // ✅ AGREGADO: Limpiar el intervalo al destruir el componente
  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  onRegister() {
    console.log('🔍 onRegister llamado - Datos:', this.userData);

    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.showErrorNotification = false;

    const registerData = {
      username: this.userData.username,
      email: this.userData.email,
      password: this.userData.password,
      confirmPassword: this.userData.confirmPassword,
      firstName: this.userData.firstName,
      lastName: this.userData.lastName
    };

    console.log('📤 Enviando registro:', registerData);

    this.authService.register(registerData).subscribe({
      next: (response) => {
        console.log('✅ Registro exitoso:', response);
        this.loading = false;
        this.showSuccessModal = true;  // ✅ MODIFICADO
        this.startCountdown();  // ✅ AGREGADO
      },
      error: (err) => {
        console.error('❌ Error en registro:', err);
        this.loading = false;
        this.error = this.handleError(err);
        this.showErrorNotification = true;

        setTimeout(() => {
          this.showErrorNotification = false;
        }, 4000);
      }
    });
  }

  // ✅ NUEVOS MÉTODOS PARA EL MODAL

  getInitials(): string {
    const first = this.userData.firstName?.charAt(0) || '';
    const last = this.userData.lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  }

  startCountdown() {
    this.countdown = 5;

    this.countdownInterval = setInterval(() => {
      this.countdown--;

      if (this.countdown <= 0) {
        this.goToDashboard();
      }
    }, 1000);
  }

  goToDashboard() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.router.navigate(['/dashboard']);
  }

  // ✅ MÉTODOS DE VALIDACIÓN (sin cambios)

  isFormValid(): boolean {
    const data = this.userData;

    const allFieldsFilled = !!(
      data.username?.trim() &&
      data.email?.trim() &&
      data.password?.trim() &&
      data.confirmPassword?.trim() &&
      data.firstName?.trim() &&
      data.lastName?.trim()
    );

    const passwordsMatch = data.password === data.confirmPassword;

    console.log('🔍 isFormValid - Campos llenos:', allFieldsFilled, 'Passwords coinciden:', passwordsMatch);

    return allFieldsFilled && passwordsMatch;
  }

  isPasswordStrong(): boolean {
    const password = this.userData.password;

    if (!password) {
      console.log('🔍 isPasswordStrong - Sin contraseña');
      return false;
    }

    const isStrong = (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    );

    console.log('🔍 isPasswordStrong:', isStrong, 'Contraseña:', password);
    return isStrong;
  }

  checkPasswordStrength() {
    const password = this.userData.password;

    if (!password) {
      this.passwordStrength = {
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false
      };
      return;
    }

    this.passwordStrength = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    console.log('🔍 checkPasswordStrength:', this.passwordStrength);
  }

  getPasswordStrengthClass(): string {
    const strength = this.getPasswordStrengthPercent();
    let result = '';

    if (strength <= 25) result = 'weak';
    else if (strength <= 50) result = 'medium';
    else if (strength <= 75) result = 'strong';
    else result = 'very-strong';

    console.log('🔍 getPasswordStrengthClass:', result, 'Fuerza:', strength + '%');
    return result;
  }

  getPasswordStrengthPercent(): number {
    const strengths = Object.values(this.passwordStrength);
    const trueCount = strengths.filter(Boolean).length;
    const percent = (trueCount / strengths.length) * 100;

    console.log('🔍 getPasswordStrengthPercent:', percent + '%', 'Requisitos cumplidos:', trueCount + '/5');
    return percent;
  }

  validateForm(): boolean {
    console.log('🔍 validateForm - Iniciando validación...');

    if (!this.userData.username || !this.userData.email || !this.userData.password ||
        !this.userData.confirmPassword || !this.userData.firstName || !this.userData.lastName) {
      this.error = 'Todos los campos obligatorios deben ser completados';
      this.showErrorNotification = true;
      console.log('❌ validateForm - Campos incompletos');
      return false;
    }

    if (this.userData.password !== this.userData.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      this.showErrorNotification = true;
      console.log('❌ validateForm - Contraseñas no coinciden');
      return false;
    }

    if (!this.isEmailValid(this.userData.email)) {
      this.error = 'El formato del email no es válido';
      this.showErrorNotification = true;
      console.log('❌ validateForm - Email inválido');
      return false;
    }

    if (!this.isPasswordStrong()) {
      this.error = 'La contraseña no cumple con los requisitos de seguridad';
      this.showErrorNotification = true;
      console.log('❌ validateForm - Contraseña débil');
      return false;
    }

    console.log('✅ validateForm - Formulario válido');
    return true;
  }

  isEmailValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // 🔵 REGISTRO CON GOOGLE
  handleGoogleAuth() {
    this.googleLoading = true;
    this.error = '';
  }

  private initializeGoogleAuth() {
    if (typeof google !== 'undefined' && google.accounts) {
      this.authService.initializeGoogleAuth(
        this.googleClientId,
        (response: any) => {
          this.handleGoogleResponse(response);
        }
      );
    } else {
      console.warn('Google API no disponible');
      setTimeout(() => this.initializeGoogleAuth(), 500);
    }
  }

  private initializeGoogleButton() {
    if (typeof google !== 'undefined' && google.accounts) {
      try {
        google.accounts.id.initialize({
          client_id: this.googleClientId,
          callback: (response: any) => this.handleGoogleResponse(response),
          context: 'signup'
        });

        google.accounts.id.renderButton(
          document.getElementById('googleButton'),
          {
            theme: 'outline',
            size: 'large',
            width: 400,
            text: 'signup_with',
            shape: 'pill'
          }
        );
      } catch (error) {
        console.error('Error initializing Google button:', error);
      }
    }
  }

  private handleGoogleResponse(response: any) {
    this.googleLoading = true;

    if (response.credential) {
      const payload = this.decodeJWT(response.credential);

      const googleData: GoogleAuthRequest = {
        token: response.credential,
        email: payload.email,
        name: payload.name,
        profileImage: payload.picture
      };

      this.authService.loginWithGoogle(googleData).subscribe({
        next: (authResponse) => {
          this.googleLoading = false;
          this.showSuccessModal = true;  // ✅ MODIFICADO
          this.startCountdown();  // ✅ AGREGADO
        },
        error: (err) => {
          this.googleLoading = false;
          this.error = this.handleError(err);
          this.showErrorNotification = true;
        }
      });
    }
  }

  private decodeJWT(token: string): any {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(decodedPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return {};
    }
  }

  private loadGoogleAuthLibrary() {
    if (typeof google === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Auth library loaded');
      };
      script.onerror = () => {
        console.error('Failed to load Google Auth library');
      };
      document.head.appendChild(script);
    }
  }

  private handleError(err: any): string {
    if (err.status === 400) {
      return err.error?.message || 'Datos de registro inválidos';
    } else if (err.status === 409) {
      return 'El usuario o email ya existen';
    } else if (err.status === 0) {
      return 'Error de conexión. Verifica que el servidor esté activo.';
    } else {
      return err.error?.message || 'Error en el registro. Intenta nuevamente.';
    }
  }

  private createParticles() {
    setTimeout(() => {
      const particlesContainer = document.getElementById('particles');
      if (!particlesContainer) return;

      const particleCount = 50;
      const colors = ['#667eea', '#764ba2', '#64ffda', '#ff4757'];

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const styles = [
          `left: ${Math.random() * 100}%`,
          `animation-delay: ${Math.random() * 6}s`,
          `animation-duration: ${3 + Math.random() * 4}s`,
          `opacity: ${Math.random() * 0.5}`,
          `background: ${colors[Math.floor(Math.random() * colors.length)]}`,
          `width: ${1 + Math.random() * 3}px`,
          `height: ${1 + Math.random() * 3}px`
        ].join('; ');

        particle.setAttribute('style', styles);
        particlesContainer.appendChild(particle);
      }
    }, 100);
  }
}
