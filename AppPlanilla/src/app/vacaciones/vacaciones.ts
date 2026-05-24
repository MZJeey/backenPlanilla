import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

interface Vacacion {
  IdVacacion: number;
  IdEmpleado: number;
  FechaInicio: string;
  FechaFin: string;
  DiasSolicitados: number;
  Estado: number;
  UsuarioAprueba?: number | null;
}

interface Empleado {
  IdEmpleado: number;
  Nombre: string;
  Apellidos: string;
}

interface Usuario {
  IdUsuario: number;
  Nombre: string;
  Apellidos: string;
}

@Component({
  selector: 'app-vacaciones',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './vacaciones.html',
  styleUrl: './vacaciones.css',
})
export class Vacaciones implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  private readonly API_URL = 'https://backenplanilla-production.up.railway.app/';
  private readonly VACACIONES_URL = `${this.API_URL}/VacacionesServicio`;
  private readonly EMPLEADO_URL = `${this.API_URL}/EmpleadoServicio`;
  private readonly USUARIO_URL = `${this.API_URL}/UsuarioServicio`;

  protected readonly vacaciones = signal<Vacacion[]>([]);
  protected readonly empleados = signal<Empleado[]>([]);
  protected readonly usuarios = signal<Usuario[]>([]);

  readonly perPage = 8;
  showFormModal = false;
  showDeleteModal = false;

  searchQuery = '';
  estadoFiltro = '';
  currentPage = 1;

  editId: number | null = null;
  form: Partial<Vacacion> = {};
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
    this.getVacaciones();
    this.getEmpleados();
    this.getUsuarios();
  }

  getVacaciones(): void {
    this.http.get<Vacacion[]>(`${this.VACACIONES_URL}/listarVacaciones`, { headers: this.headers }).subscribe({
      next: (data) => {
        const lista = (data || []).map((v: any) => ({
          IdVacacion: Number(v.IdVacacion),
          IdEmpleado: Number(v.IdEmpleado),
          FechaInicio: v.FechaInicio ? String(v.FechaInicio).split('T')[0] : '',
          FechaFin: v.FechaFin ? String(v.FechaFin).split('T')[0] : '',
          DiasSolicitados: Number(v.DiasSolicitados || 0),
          Estado: Number(v.Estado ?? 1),
          UsuarioAprueba: v.UsuarioAprueba ? Number(v.UsuarioAprueba) : null,
        }));

        this.vacaciones.set(lista);
        this.currentPage = 1;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar vacaciones:', err);
        this.vacaciones.set([]);
      },
    });
  }

  getEmpleados(): void {
    this.http.get<Empleado[]>(`${this.EMPLEADO_URL}/listarEmpleados`, { headers: this.headers }).subscribe({
      next: (data) => {
        this.empleados.set((data || []).map((e: any) => ({
          IdEmpleado: Number(e.IdEmpleado ?? e.idEmpleado),
          Nombre: e.Nombre,
          Apellidos: e.Apellidos,
        })));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar empleados:', err),
    });
  }

  getUsuarios(): void {
    this.http.get<Usuario[]>(`${this.USUARIO_URL}/listarUsuarios`, { headers: this.headers }).subscribe({
      next: (data) => {
        this.usuarios.set((data || []).map((u: any) => ({
          IdUsuario: Number(u.IdUsuario ?? u.idUsuario),
          Nombre: u.Nombre,
          Apellidos: u.Apellidos,
        })));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar usuarios:', err),
    });
  }

  saveVacacion(): void {
    if (!this.form.IdEmpleado || !this.form.FechaInicio || !this.form.FechaFin) {
      alert('Por favor rellena los campos obligatorios.');
      return;
    }

    const body = {
      IdVacacion: this.editId ?? undefined,
      IdEmpleado: Number(this.form.IdEmpleado),
      FechaInicio: this.form.FechaInicio,
      FechaFin: this.form.FechaFin,
      DiasSolicitados: Number(this.form.DiasSolicitados || 1),
      Estado: Number(this.form.Estado ?? 1),
      UsuarioAprueba: this.form.UsuarioAprueba ? Number(this.form.UsuarioAprueba) : null,
    };

    if (this.editId) {
      this.http.put(`${this.VACACIONES_URL}/actualizar`, body, { headers: this.headers }).subscribe({
        next: () => {
          this.getVacaciones();
          this.showFormModal = false;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error al actualizar:', err),
      });
    } else {
      this.http.post(`${this.VACACIONES_URL}/insertar`, body, { headers: this.headers }).subscribe({
        next: () => {
          this.getVacaciones();
          this.showFormModal = false;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error al insertar:', err),
      });
    }
  }

  confirmDelete(): void {
    if (!this.deleteTargetId) return;

    this.http.delete(`${this.VACACIONES_URL}/eliminar?id=${this.deleteTargetId}`, { headers: this.headers }).subscribe({
      next: () => {
        this.getVacaciones();
        this.showDeleteModal = false;
        this.deleteTargetId = null;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al eliminar:', err),
    });
  }

  calcularDias(): void {
    if (this.form.FechaInicio && this.form.FechaFin) {
      const inicio = new Date(this.form.FechaInicio);
      const fin = new Date(this.form.FechaFin);
      const diff = fin.getTime() - inicio.getTime();

      this.form.DiasSolicitados = diff >= 0
        ? Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
        : 1;
    }
  }

  get filteredVacaciones(): Vacacion[] {
    const q = this.searchQuery.toLowerCase().trim();

    return this.vacaciones().filter((v) => {
      const texto = `
        ${v.IdVacacion}
        ${this.getNombreEmpleado(v.IdEmpleado)}
        ${this.estadoLabel(v.Estado)}
      `.toLowerCase();

      const estadoOk = !this.estadoFiltro || this.estadoLabel(v.Estado) === this.estadoFiltro;

      return (!q || texto.includes(q)) && estadoOk;
    });
  }

  get pageSlice(): Vacacion[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredVacaciones.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const count = Math.ceil(this.filteredVacaciones.length / this.perPage) || 1;
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  get visiblePages(): number[] {
    const total = this.totalPages.length;

    if (total <= 5) return this.totalPages;

    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(total, this.currentPage + 2);

    if (this.currentPage <= 3) {
      start = 1;
      end = 5;
    }

    if (this.currentPage >= total - 2) {
      start = total - 4;
      end = total;
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
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

  openModal(mode: 'create' | 'edit', v?: Vacacion): void {
    if (mode === 'create') {
      this.editId = null;
      this.form = {
        Estado: 1,
        DiasSolicitados: 1,
        UsuarioAprueba: null,
        FechaInicio: new Date().toISOString().split('T')[0],
        FechaFin: '',
      };
    } else if (v) {
      this.editId = v.IdVacacion;
      this.form = { ...v };
    }

    this.showFormModal = true;
  }


viewInAnotherPage(v: Vacacion): void {
  localStorage.setItem('displayData', JSON.stringify({
    titulo: 'Detalle de vacaciones',
    volver: '/vacaciones',
    datos: {
      ID: `#${v.IdVacacion}`,
      Empleado: this.getNombreEmpleado(v.IdEmpleado),
      'ID Empleado': `#${v.IdEmpleado}`,
      'Fecha inicio': this.fmtFecha(v.FechaInicio),
      'Fecha fin': this.fmtFecha(v.FechaFin),
      'Días solicitados': `${v.DiasSolicitados} día(s)`,
      Estado: this.estadoLabel(v.Estado),
      'Aprobado por': v.UsuarioAprueba
        ? this.getNombreUsuario(v.UsuarioAprueba)
        : 'Sin asignar'
    }
  }));

  this.router.navigate(['/ver-datos']);
}

  askDelete(id: number): void {
    this.deleteTargetId = id;
    this.showDeleteModal = true;
  }

  countByEstado(estado: string): number {
    return this.vacaciones().filter((v) => this.estadoLabel(v.Estado) === estado).length;
  }

  getTotalDias(): number {
    return this.vacaciones().reduce((sum, v) => sum + Number(v.DiasSolicitados || 0), 0);
  }

  estadoLabel(e: number): string {
    const labels: Record<number, string> = {
      1: 'Pendiente',
      2: 'Aprobado',
      3: 'Rechazado',
      4: 'En curso',
    };

    return labels[Number(e)] || 'Pendiente';
  }

  estadoClass(estado: number): string {
    if (Number(estado) === 2) return 'status-active';
    if (Number(estado) === 3) return 'status-inactive';
    if (Number(estado) === 4) return 'status-vacation';
    return 'status-tardanza';
  }

  getNombreEmpleado(id: number): string {
    const e = this.empleados().find((emp) => Number(emp.IdEmpleado) === Number(id));
    return e ? `${e.Nombre} ${e.Apellidos}`.trim() : `Empleado #${id}`;
  }

  getNombreUsuario(id: number): string {
    const u = this.usuarios().find((user) => Number(user.IdUsuario) === Number(id));
    return u ? `${u.Nombre} ${u.Apellidos}`.trim() : `Usuario #${id}`;
  }

  inicialesNombre(nombreCompleto: string): string {
    if (!nombreCompleto || nombreCompleto === '—') return 'NA';
    const partes = nombreCompleto.split(' ').filter(Boolean);
    return ((partes[0]?.[0] || 'N') + (partes[1]?.[0] || '')).toUpperCase();
  }

  colorFor(id: number): string {
    const colors = ['av-red', 'av-green', 'av-blue', 'av-amber', 'av-violet', 'av-teal'];
    return colors[(Number(id || 1) - 1) % colors.length];
  }

  fmtFecha(f: string): string {
    if (!f) return '—';
    const soloFecha = f.includes('T') ? f.split('T')[0] : f;
    const [y, m, d] = soloFecha.split('-');
    if (!y || !m || !d) return soloFecha;
    return `${d}/${m}/${y}`;
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  onOverlayClick(e: MouseEvent, modal: string): void {
    if (e.target === e.currentTarget) {
      if (modal === 'form') this.showFormModal = false;
      if (modal === 'delete') this.showDeleteModal = false;
    }
  }
}