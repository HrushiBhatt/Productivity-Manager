import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { errorMessage } from '../core/api';
import { Auth } from '../core/auth';
import { PixelMug } from '../shared/pixel-mug';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, PixelMug],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', Validators.maxLength(60)],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  protected switchTo(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.error.set('');
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Enter a valid email and a password of at least 8 characters.');
      return;
    }
    const { name, email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.mode() === 'login') await this.auth.login(email, password);
      else await this.auth.register(email, password, name);
      await this.router.navigate(['/']);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
