import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})

export class Login {
  loginForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: [''],
      password: ['']
    });
  }

  onSubmit() {
    const { email, password } = this.loginForm.value;

    this.http.post<any>('http://127.0.0.1:800/api/login/', { email, password }).subscribe({
      next: (response) => {
        localStorage.setItem('access_token', response.access)
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error(err);
        alert('Credenciais inválidas');
      }
    })
  }
}
