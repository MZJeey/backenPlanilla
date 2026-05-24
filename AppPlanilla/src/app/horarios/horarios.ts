import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Router } from '@angular/router';

interface ControlHorario {
  IdControl: number;
  IdEmpleado: number;
  Fecha: string;
  HoraEntrada: string;
  HoraSalida: string;
  HorasNormales: number;
  HorasExtra: number;
  Estado: number;
  idUsuarios: number;

  NombreEmpleado?: string;
  ApellidosEmpleado?: string;
  NombreUsuario?: string;
  ApellidosUsuario?: string;
}

interface Empleado {
  idEmpleado: number;
  Nombre: string;
  Apellidos: string;
}

interface Usuario {
  idUsuario: number;
  Nombre: string;
  Apellidos: string;
}

@Component({
  selector: 'app-horarios',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './horarios.html',
  styleUrl: './horarios.css',
})
export class Horarios implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  private readonly BASE_URL = 'https://backenplanilla-production.up.railway.app/';
  private readonly HORARIO_URL = `${this.BASE_URL}/ControlHorarioServicio`;
  private readonly EMPLEADO_URL = `${this.BASE_URL}/EmpleadoServicio`;
  private readonly USUARIO_URL = `${this.BASE_URL}/UsuarioServicio`;

  readonly COLORS = ['av-red', 'av-green', 'av-blue', 'av-amber', 'av-violet', 'av-teal'];
  readonly perPage = 8;

  horarios: ControlHorario[] = [];
  empleados: Empleado[] = [];
  usuarios: Usuario[] = [];

  showFormModal = false;
  showDeleteModal = false;

  searchQuery = '';
  fechaFiltro = '';
  estadoFiltro = '';
  currentPage = 1;

  editId: number | null = null;
  form: Partial<ControlHorario> = {};
  deleteTargetId: number | null = null;

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.getHorarios();
    this.getEmpleados();
    this.getUsuarios();
  }

  getHorarios(): void {
    this.http.get<ControlHorario[]>(`${this.HORARIO_URL}/listarControlHorario`, { headers: this.headers }).subscribe({
      next: (data) => {
        this.horarios = (data || []).map((h: any) => ({
          ...h,
          IdControl: Number(h.IdControl),
          IdEmpleado: Number(h.IdEmpleado),
          Fecha: h.Fecha ? String(h.Fecha).split('T')[0] : '',
          HoraEntrada: this.normalizarHora(h.HoraEntrada),
          HoraSalida: this.normalizarHora(h.HoraSalida),
          HorasNormales: this.horasANumero(h.HorasNormales),
          HorasExtra: this.horasANumero(h.HorasExtra),
          Estado: Number(h.Estado ?? 0),
          idUsuarios: Number(h.idUsuarios),
        }));
          this.currentPage = 1;
          this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al obtener horarios:', err);
        this.horarios = [];
      },
    });
  }

  getEmpleados(): void {
    this.http.get<Empleado[]>(`${this.EMPLEADO_URL}/listarEmpleados`, { headers: this.headers }).subscribe({
      next: (data) => {
        this.empleados = (data || []).map((e: any) => ({
          ...e,
          idEmpleado: Number(e.idEmpleado ?? e.IdEmpleado),
        }));
      },
      error: (err) => {
        console.error('Error al obtener empleados:', err);
        this.empleados = [];
      },
    });
  }

  getUsuarios(): void {
    this.http.get<Usuario[]>(`${this.USUARIO_URL}/listarUsuarios`, { headers: this.headers }).subscribe({
      next: (data) => {
        this.usuarios = (data || []).map((u: any) => ({
          ...u,
          idUsuario: Number(u.idUsuario ?? u.IdUsuario),
        }));
      },
      error: (err) => {
        console.error('Error al obtener usuarios:', err);
        this.usuarios = [];
      },
    });
  }

  get filteredHorarios(): ControlHorario[] {
    const q = this.searchQuery.toLowerCase().trim();

    return this.horarios.filter((h) => {
      const texto = `
        ${h.IdControl}
        ${this.getNombreEmpleado(h.IdEmpleado)}
        ${this.usuarioNombre(h.idUsuarios)}
        ${h.Fecha}
      `.toLowerCase();

      const estadoOk = this.estadoFiltro === '' || Number(h.Estado) === Number(this.estadoFiltro);
      const fechaOk = !this.fechaFiltro || h.Fecha === this.fechaFiltro;

      return (!q || texto.includes(q)) && estadoOk && fechaOk;
    });
  }

  get pageSlice(): ControlHorario[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredHorarios.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const count = Math.ceil(this.filteredHorarios.length / this.perPage) || 1;
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  colorFor(id: number): string {
    const safeId = Number(id || 1);
    return this.COLORS[(safeId - 1) % this.COLORS.length];
  }

  getNombreEmpleado(id: number): string {
    const desdeVista = this.horarios.find((h) => Number(h.IdEmpleado) === Number(id) && h.NombreEmpleado);

    if (desdeVista?.NombreEmpleado) {
      return `${desdeVista.NombreEmpleado} ${desdeVista.ApellidosEmpleado || ''}`.trim();
    }

    const emp = this.empleados.find((e) => Number(e.idEmpleado) === Number(id));
    return emp ? `${emp.Nombre} ${emp.Apellidos}`.trim() : `Empleado #${id}`;
  }

  usuarioNombre(id: number): string {
    const desdeVista = this.horarios.find((h) => Number(h.idUsuarios) === Number(id) && h.NombreUsuario);

    if (desdeVista?.NombreUsuario) {
      return `${desdeVista.NombreUsuario} ${desdeVista.ApellidosUsuario || ''}`.trim();
    }

    const usuario = this.usuarios.find((u) => Number(u.idUsuario) === Number(id));
    return usuario ? `${usuario.Nombre} ${usuario.Apellidos}`.trim() : `Usuario #${id}`;
  }

  inicialesNombre(nombre: string): string {
    const partes = nombre.split(' ').filter(Boolean);
    return ((partes[0]?.[0] || 'E') + (partes[1]?.[0] || '')).toUpperCase();
  }

  fmtFecha(f: string): string {
    if (!f) return '—';
    const soloFecha = f.includes('T') ? f.split('T')[0] : f;
    const [y, m, d] = soloFecha.split('-');
    if (!y || !m || !d) return soloFecha;
    return `${d}/${m}/${y}`;
  }

  estadoTexto(e: number): string {
    if (Number(e) === 1) return 'Aprobado';
    return 'Pendiente';
  }

  estadoClass(e: number): string {
    if (Number(e) === 1) return 'status-active';
    return 'status-tardanza';
  }

  getTotalRegistros(): number {
    return this.horarios.length;
  }

  getTotalHorasNormales(): number {
    return this.horarios.reduce((s, h) => s + Number(h.HorasNormales || 0), 0);
  }

  getTotalHorasExtra(): number {
    return this.horarios.reduce((s, h) => s + Number(h.HorasExtra || 0), 0);
  }

  countByEstado(estado: number): number {
    return this.horarios.filter((h) => Number(h.Estado) === Number(estado)).length;
  }

  filterTable(): void {
    this.currentPage = 1;
  }

  changePage(d: number): void {
    const max = this.totalPages.length;
    this.currentPage = Math.max(1, Math.min(max, this.currentPage + d));
  }

  goPage(n: number): void {
    this.currentPage = n;
  }

  calcularHoras(): void {
    const entrada = this.form.HoraEntrada;
    const salida = this.form.HoraSalida;

    if (!entrada || !salida) return;

    const [eh, em] = entrada.split(':').map(Number);
    const [sh, sm] = salida.split(':').map(Number);

    const minutosEntrada = eh * 60 + em;
    const minutosSalida = sh * 60 + sm;
    const totalMinutos = minutosSalida - minutosEntrada;

    if (totalMinutos <= 0) return;

    const totalHoras = totalMinutos / 60;
    this.form.HorasNormales = Math.min(8, Number(totalHoras.toFixed(2)));
    this.form.HorasExtra = Math.max(0, Number((totalHoras - 8).toFixed(2)));
  }

  openModal(mode: 'create' | 'edit', id?: number): void {
    if (mode === 'create') {
      this.editId = null;
      this.form = {
        Fecha: new Date().toISOString().split('T')[0],
        HoraEntrada: '08:00',
        HoraSalida: '17:00',
        HorasNormales: 8,
        HorasExtra: 0,
        Estado: 0,
        idUsuarios: 1,
      };
    } else {
      const h = this.horarios.find((x) => Number(x.IdControl) === Number(id));
      if (!h) return;

      this.editId = h.IdControl;
      this.form = {
        ...h,
        Fecha: h.Fecha ? h.Fecha.split('T')[0] : '',
        HoraEntrada: this.normalizarHora(h.HoraEntrada).slice(0, 5),
        HoraSalida: this.normalizarHora(h.HoraSalida).slice(0, 5),
      };
    }

    this.showFormModal = true;
  }




viewInAnotherPage(h: ControlHorario): void {
  localStorage.setItem('displayData', JSON.stringify({
    titulo: 'Detalle del horario',
    volver: '/horarios',
    datos: {
      ID: `#${h.IdControl}`,
      Empleado: this.getNombreEmpleado(h.IdEmpleado),
      'ID Empleado': `#${h.IdEmpleado}`,
      Fecha: this.fmtFecha(h.Fecha),
      'Hora entrada': h.HoraEntrada || '—',
      'Hora salida': h.HoraSalida || '—',
      'Horas normales': this.mostrarHoras(h.HorasNormales),
      'Horas extra': this.mostrarHoras(h.HorasExtra),
      Usuario: this.usuarioNombre(h.idUsuarios),
      Estado: this.estadoTexto(h.Estado)
    }
  }));

  this.router.navigate(['/ver-datos']);
}


  saveHorario(): void {
    if (!this.form.IdEmpleado || Number(this.form.IdEmpleado) <= 0) {
      alert('Debes seleccionar un empleado.');
      return;
    }

    if (!this.form.Fecha) {
      alert('Debes ingresar una fecha.');
      return;
    }

    if (!this.form.HoraEntrada || !this.form.HoraSalida) {
      alert('Debes ingresar hora de entrada y salida.');
      return;
    }

    if (!this.form.idUsuarios || Number(this.form.idUsuarios) <= 0) {
      alert('Debes seleccionar un usuario responsable.');
      return;
    }

    const payload = {
      IdControl: this.editId ?? undefined,
      IdEmpleado: Number(this.form.IdEmpleado),
      Fecha: this.form.Fecha,
      HoraEntrada: this.form.HoraEntrada,
      HoraSalida: this.form.HoraSalida,
      HorasNormales: this.horasATime(this.form.HorasNormales),
      HorasExtra: this.horasATime(this.form.HorasExtra),
      Estado: Number(this.form.Estado ?? 0),
      idUsuarios: Number(this.form.idUsuarios),
    };

    if (this.editId) {
      this.http.put(`${this.HORARIO_URL}/actualizar`, payload, { headers: this.headers }).subscribe({
        next: () => {
          this.getHorarios();
          this.showFormModal = false;
        },
        error: (err) => console.error('Error al actualizar horario:', err),
      });
    } else {
      this.http.post(`${this.HORARIO_URL}/insertar`, payload, { headers: this.headers }).subscribe({
        next: () => {
          this.getHorarios();
          this.showFormModal = false;
        },
        error: (err) => console.error('Error al crear horario:', err),
      });
    }
  }

  aprobar(id: number): void {
    const h = this.horarios.find((x) => Number(x.IdControl) === Number(id));
    if (!h) return;

    const payload = {
      ...h,
      Estado: 1,
    };

    this.http.put(`${this.HORARIO_URL}/actualizar`, payload, { headers: this.headers }).subscribe({
       next: () => {
      this.getHorarios();         
      this.currentPage = 1;        
      this.cdr.detectChanges();   
    },
    error: (err) => console.error('Error al aprobar horario:', err),
  });
}

  askDelete(id: number): void {
    this.deleteTargetId = id;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deleteTargetId) return;

    this.http.delete(`${this.HORARIO_URL}/eliminar?id=${this.deleteTargetId}`, { headers: this.headers }).subscribe({
      next: () => {
        this.getHorarios();
        this.deleteTargetId = null;
        this.showDeleteModal = false;
      },
      error: (err) => console.error('Error al eliminar horario:', err),
    });
  }

  onOverlayClick(event: MouseEvent, modal: 'form' | 'delete'): void {
    if (event.target === event.currentTarget) {
      if (modal === 'form') this.showFormModal = false;
      if (modal === 'delete') this.showDeleteModal = false;
    }
  }

  private normalizarHora(value: string): string {
    if (!value) return '';
    return String(value).slice(0, 8);
  }

private horasANumero(value: any): number {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') return value;

  const texto = String(value);

  if (texto.includes(':')) {
    const [h, m, s] = texto.split(':').map(Number);

  
    if (h === 0 && m === 0 && s > 0) return s;

    return Number((h + (m || 0) / 60).toFixed(2));
  }

  return Number(value) || 0;
}


private horasATime(value: any): string {
  const horas = Math.floor(Number(value || 0));
  const minutos = Math.round((Number(value || 0) - horas) * 60);

  const hh = String(horas).padStart(2, '0');
  const mm = String(minutos).padStart(2, '0');

  return `${hh}:${mm}:00`;
}


mostrarHoras(value: any): string {
  if (!value) return '0h';

  const texto = String(value);

  if (texto.includes(':')) {
    const [h, m, s] = texto.split(':').map(Number);

    if (h > 0) return `${h}h`;
    if (m > 0) return `${m} min`;

    // Por si tu BD guarda 00:00:08 y vos querés verlo como 8h
    if (s > 0) return `${s}h`;

    return '0h';
  }

  return `${Number(value || 0)}h`;
}



}