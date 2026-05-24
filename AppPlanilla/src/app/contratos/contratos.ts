import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

interface Contrato {
  IdContrato: number;
  IdEmpleado: number;
  TipoContrato: string;
  FechaInicio: string;
  FechaFin: string | null;
  SalarioPactado: number;
  Estado: number;
  usuarioId: number;

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
  selector: 'app-contratos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contratos.html',
  styleUrl: './contratos.css',
})
export class Contratos implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  private readonly BASE_URL = 'https://backenplanilla-production.up.railway.app/';
  private readonly CONTRATO_URL = `${this.BASE_URL}/ContratoServicio`;
  private readonly EMPLEADO_URL = `${this.BASE_URL}/EmpleadoServicio`;
  private readonly USUARIO_URL = `${this.BASE_URL}/UsuarioServicio`;

  readonly COLORS = ['av-red', 'av-green', 'av-blue', 'av-amber', 'av-violet', 'av-teal'];
  readonly perPage = 8;

  contratos: Contrato[] = [];
  empleados: Empleado[] = [];
  usuarios: Usuario[] = [];

  showFormModal = false;
  showViewModal = false;
  showDeleteModal = false;

  searchQuery = '';
  tipoFiltro = '';
  estadoFiltro = '';
  currentPage = 1;

  editId: number | null = null;
  form: Partial<Contrato> = {};
  viewedContrato!: Contrato;
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
    this.getContratos();
    this.getEmpleados();
    this.getUsuarios();
  }

  getContratos(): void {
    this.http.get<Contrato[]>(`${this.CONTRATO_URL}/listarContratos`, { headers: this.headers }).subscribe({
      next: (data) => {
        this.contratos = (data || []).map((c: any) => ({
          ...c,
          IdContrato: Number(c.IdContrato),
          IdEmpleado: Number(c.IdEmpleado),
          FechaInicio: c.FechaInicio ? String(c.FechaInicio).split('T')[0] : '',
          FechaFin: c.FechaFin ? String(c.FechaFin).split('T')[0] : null,
          SalarioPactado: Number(c.SalarioPactado || 0),
          Estado: Number(c.Estado ?? 1),
          usuarioId: Number(c.usuarioId ?? c.UsuarioId ?? 0),
        }));
        this.currentPage = 1;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al obtener contratos:', err);
        this.contratos = [];
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

  get filteredContratos(): Contrato[] {
    const q = this.searchQuery.toLowerCase().trim();

    return this.contratos.filter((c) => {
      const texto = `
        ${c.IdContrato}
        ${this.getNombreEmpleado(c.IdEmpleado)}
        ${c.TipoContrato}
        ${this.getNombreUsuario(c.usuarioId)}
      `.toLowerCase();

      const tipoOk = !this.tipoFiltro || c.TipoContrato === this.tipoFiltro;
      const estadoOk = this.estadoFiltro === '' || Number(c.Estado) === Number(this.estadoFiltro);

      return (!q || texto.includes(q)) && tipoOk && estadoOk;
    });
  }

  get pageSlice(): Contrato[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredContratos.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const count = Math.ceil(this.filteredContratos.length / this.perPage) || 1;
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
    const emp = this.empleados.find((e) => Number(e.idEmpleado) === Number(id));
    return emp ? `${emp.Nombre} ${emp.Apellidos}`.trim() : `Empleado #${id}`;
  }

  getNombreUsuario(id: number): string {
    const usuario = this.usuarios.find((u) => Number(u.idUsuario) === Number(id));
    return usuario ? `${usuario.Nombre} ${usuario.Apellidos}`.trim() : `Usuario #${id}`;
  }

  inicialesNombre(nombre: string): string {
    const partes = nombre.split(' ').filter(Boolean);
    return ((partes[0]?.[0] || 'E') + (partes[1]?.[0] || '')).toUpperCase();
  }

  fmtFecha(f: string | null): string {
    if (!f) return '—';
    const soloFecha = f.includes('T') ? f.split('T')[0] : f;
    const [y, m, d] = soloFecha.split('-');
    if (!y || !m || !d) return soloFecha;
    return `${d}/${m}/${y}`;
  }

  fmtSalary(n: number): string {
    return '₡' + Number(n || 0).toLocaleString('es-CR');
  }

  estadoTexto(e: number): string {
    return Number(e) === 1 ? 'Activo' : 'Inactivo';
  }

  estadoClass(e: number): string {
    return Number(e) === 1 ? 'status-active' : 'status-inactive';
  }

  tipoClass(t: string): string {
    if (t === 'Indefinido') return 'indefinido';
    if (t === 'Temporal') return 'temporal';
    if (t === 'Por obra') return 'obra';
    return 'prueba';
  }

  fechaFinClass(fecha: string | null): string {
    if (!fecha) return 'fecha-normal';

    const hoy = new Date();
    const fin = new Date(fecha);
    const diff = (fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);

    if (diff < 0) return 'fecha-vencida';
    if (diff < 30) return 'fecha-pronto';
    return 'fecha-normal';
  }

  getDuracion(inicio: string, fin: string | null): string {
    if (!inicio) return '—';

    const d1 = new Date(inicio);
    const d2 = fin ? new Date(fin) : new Date();

    const meses = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());

    if (meses < 1) return 'Menos de 1 mes';
    if (meses < 12) return `${meses} mes${meses > 1 ? 'es' : ''}`;

    const anios = Math.floor(meses / 12);
    const resto = meses % 12;

    return resto > 0
      ? `${anios} año${anios > 1 ? 's' : ''} y ${resto} mes${resto > 1 ? 'es' : ''}`
      : `${anios} año${anios > 1 ? 's' : ''}`;
  }

  countByEstado(estado: number): number {
    return this.contratos.filter((c) => Number(c.Estado) === Number(estado)).length;
  }

  getProximosVencer(): number {
    const hoy = new Date();

    return this.contratos.filter((c) => {
      if (!c.FechaFin || Number(c.Estado) !== 1) return false;

      const fin = new Date(c.FechaFin);
      const diff = (fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);

      return diff >= 0 && diff <= 30;
    }).length;
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

  openModal(mode: 'create' | 'edit', id?: number): void {
    if (mode === 'create') {
      this.editId = null;
      this.form = {
        TipoContrato: 'Indefinido',
        FechaInicio: new Date().toISOString().split('T')[0],
        FechaFin: null,
        SalarioPactado: 0,
        Estado: 1,
        usuarioId: 1,
      };
    } else {
      const contrato = this.contratos.find((c) => Number(c.IdContrato) === Number(id));
      if (!contrato) return;

      this.editId = contrato.IdContrato;
      this.form = {
        ...contrato,
        FechaInicio: contrato.FechaInicio ? contrato.FechaInicio.split('T')[0] : '',
        FechaFin: contrato.FechaFin ? contrato.FechaFin.split('T')[0] : null,
      };
    }

    this.showViewModal = false;
    this.showFormModal = true;
  }

  saveContrato(): void {
    if (!this.form.IdEmpleado || Number(this.form.IdEmpleado) <= 0) {
      alert('Debes seleccionar un empleado.');
      return;
    }

    if (!this.form.TipoContrato?.trim()) {
      alert('Debes seleccionar el tipo de contrato.');
      return;
    }

    if (!this.form.FechaInicio) {
      alert('Debes ingresar la fecha de inicio.');
      return;
    }

    if (!this.form.SalarioPactado || Number(this.form.SalarioPactado) <= 0) {
      alert('Debes ingresar un salario válido.');
      return;
    }

    if (!this.form.usuarioId || Number(this.form.usuarioId) <= 0) {
      alert('Debes seleccionar un usuario responsable.');
      return;
    }

    const payload = {
      IdContrato: this.editId ?? undefined,
      IdEmpleado: Number(this.form.IdEmpleado),
      TipoContrato: this.form.TipoContrato,
      FechaInicio: this.form.FechaInicio,
      FechaFin: this.form.FechaFin || null,
      SalarioPactado: Number(this.form.SalarioPactado),
      Estado: Number(this.form.Estado ?? 1),
      usuarioId: Number(this.form.usuarioId),
    };

    if (this.editId) {
      this.http.put(`${this.CONTRATO_URL}/actualizar`, payload, { headers: this.headers }).subscribe({
        next: () => {
          this.getContratos();
          this.showFormModal = false;
        },
        error: (err) => console.error('Error al actualizar contrato:', err),
      });
    } else {
      this.http.post(`${this.CONTRATO_URL}/insertar`, payload, { headers: this.headers }).subscribe({
        next: () => {
          this.getContratos();
          this.showFormModal = false;
        },
        error: (err) => console.error('Error al crear contrato:', err),
      });
    }
  }

  viewContrato(id: number): void {
    const contrato = this.contratos.find((c) => Number(c.IdContrato) === Number(id));
    if (!contrato) return;

    this.viewedContrato = contrato;
    this.showViewModal = true;
  }

viewInAnotherPage(c: Contrato): void {
  localStorage.setItem('displayData', JSON.stringify({
    titulo: 'Detalle del contrato',
    volver: '/contratos',
    datos: {
      ID: `#${c.IdContrato}`,
      Empleado: this.getNombreEmpleado(c.IdEmpleado),
      'ID Empleado': `#${c.IdEmpleado}`,
      'Tipo de contrato': c.TipoContrato,
      'Fecha de inicio': this.fmtFecha(c.FechaInicio),
      'Fecha de fin': c.FechaFin ? this.fmtFecha(c.FechaFin) : 'Indefinido',
      Duración: this.getDuracion(c.FechaInicio, c.FechaFin),
      'Salario pactado': this.fmtSalary(c.SalarioPactado),
      Estado: this.estadoTexto(c.Estado),
      'Usuario responsable': this.getNombreUsuario(c.usuarioId)
    }
  }));

  this.router.navigate(['/ver-datos']);
}



  editFromView(): void {
    this.showViewModal = false;
    this.openModal('edit', this.viewedContrato.IdContrato);
  }

  askDelete(id: number): void {
    this.deleteTargetId = id;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deleteTargetId) return;

    this.http.delete(`${this.CONTRATO_URL}/eliminar?id=${this.deleteTargetId}`, { headers: this.headers }).subscribe({
      next: () => {
        this.getContratos();
        this.deleteTargetId = null;
        this.showDeleteModal = false;
      },
      error: (err) => console.error('Error al eliminar contrato:', err),
    });
  }

  onOverlayClick(event: MouseEvent, modal: 'form' | 'view' | 'delete'): void {
    if (event.target === event.currentTarget) {
      if (modal === 'form') this.showFormModal = false;
      if (modal === 'view') this.showViewModal = false;
      if (modal === 'delete') this.showDeleteModal = false;
    }
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

}