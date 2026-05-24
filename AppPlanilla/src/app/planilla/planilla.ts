import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface PlanillaData {
  idPlanillas: number;
  EstadoPlanilla: string;
  IdUsuario: number;
  FechaCreacion: string;
  idControlHorarios: number;
  idPeriodoPlanilla: number;
  descPeriodo?: string;
  NombreUsuario?: string;
}

interface UsuarioData {
  idUsuario: number;
  Nombre?: string;
  Apellidos?: string;
  NombreCompleto?: string;
}
interface DetalleEmpleado {
  idDetallePlanilla?: number;
  idEmpleado?: number;
  NombreEmpleado?: string;
  ApellidosEmpleado?: string;
  SalarioBase: number;
  SalarioBruto: number;
  TotalDeducciones: number;
  SalarioNeto: number;
  idPlanilla: number;
  idDeducciones?: number;
  idTipoIngreso?: number;
}

interface PeriodoPlanilla {
  idPeriodoPlanilla: number;
  NombrePeriodo: string;
  FechaInicio: string;
  FechaFin: string;
}

@Component({
  selector: 'app-planilla',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './planilla.html',
  styleUrl: './planilla.css',
})
export class Planilla implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly BASE_URL = 'https://backenplanilla-production.up.railway.app/';

  private readonly PLANILLA_URL = `${this.BASE_URL}/PlanillaServicio`;
  private readonly DETALLE_URL = `${this.BASE_URL}/DetalleplanillaServicio`;
  private readonly PERIODO_URL = `${this.BASE_URL}/PeriodoPlanillaServicio`;
  private readonly USUARIO_URL = `${this.BASE_URL}/UsuarioServicio`;

  protected readonly planillas = signal<PlanillaData[]>([]);
  protected readonly detalle = signal<DetalleEmpleado[]>([]);
  protected readonly periodos = signal<PeriodoPlanilla[]>([]);
  protected readonly usuarios = signal<UsuarioData[]>([]);

  readonly COLORS = ['av-red', 'av-green', 'av-blue', 'av-amber', 'av-violet', 'av-teal'];
  readonly perPage = 8;

  showFormModal = false;
  showViewModal = false;
  showDeleteModal = false;

  searchQuery = '';
  statusFilter = '';
  yearFilter = '';

  currentPage = 1;

  editId: number | null = null;
  form: Partial<PlanillaData> = {};

  viewedPlanilla!: PlanillaData;

  deleteTargetId: number | null = null;
  deleteDesc = '';

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.getUsuarios();

    this.getPeriodos(() => {
      this.getPlanillas();
    });
  }
  nombreUsuario(u: UsuarioData): string {
  if (u.NombreCompleto) return u.NombreCompleto;
  return `${u.Nombre || ''} ${u.Apellidos || ''}`.trim() || `Usuario #${u.idUsuario}`;
}

  getUsuarios(): void {
    this.http.get<UsuarioData[]>(`${this.USUARIO_URL}/listarUsuarios`).subscribe({
      next: (data) => {
        this.usuarios.set(data || []);
      },
      error: (err) => {
        console.error('Error al obtener usuarios:', err);
        this.usuarios.set([]);
      },
    });
  }

  getPlanillas(): void {
    this.http.get<PlanillaData[]>(`${this.PLANILLA_URL}/listarPlanillas`).subscribe({
      next: (data) => {
        const planillasConPeriodo = (data || []).map((p) => ({
          ...p,
          descPeriodo: this.obtenerNombrePeriodo(p.idPeriodoPlanilla),
          NombreUsuario: p.NombreUsuario || this.obtenerNombreUsuario(p.IdUsuario),
        }));

        this.planillas.set(planillasConPeriodo);
      },
      error: (err) => console.error('Error al obtener planillas:', err),
    });
  }

  getPeriodos(callback?: () => void): void {
    this.http.get<PeriodoPlanilla[]>(`${this.PERIODO_URL}/listarPeriodoPlanilla`).subscribe({
      next: (data) => {
        this.periodos.set(data || []);
        if (callback) callback();
      },
      error: (err) => {
        console.error('Error al obtener períodos:', err);
        if (callback) callback();
      },
    });
  }

  getDetalle(idPlanilla: number): void {
    this.http.get<DetalleEmpleado[]>(`${this.DETALLE_URL}/listarDetalleplanilla`).subscribe({
      next: (data) => {
        const filtrado = (data || []).filter((d) => Number(d.idPlanilla) === Number(idPlanilla));
        this.detalle.set(filtrado);
      },
      error: (err) => {
        console.error('Error al obtener detalle:', err);
        this.detalle.set([]);
      },
    });
  }

  obtenerNombrePeriodo(idPeriodo: number): string {
    const periodo = this.periodos().find((p) => Number(p.idPeriodoPlanilla) === Number(idPeriodo));
    return periodo ? periodo.NombrePeriodo : '';
  }

 obtenerNombreUsuario(idUsuario: number): string {
  const usuario = this.usuarios().find((u) => Number(u.idUsuario) === Number(idUsuario));
  return usuario ? this.nombreUsuario(usuario) : '';
}

  get filteredPlanillas(): PlanillaData[] {
    const q = this.searchQuery.toLowerCase().trim();

    return this.planillas().filter((p) => {
      const texto = `
        ${p.idPlanillas}
        ${p.EstadoPlanilla}
        ${p.descPeriodo ?? ''}
        ${p.NombreUsuario ?? ''}
        ${this.obtenerNombreUsuario(p.IdUsuario)}
        ${p.idControlHorarios}
        ${p.idPeriodoPlanilla}
      `.toLowerCase();

      return (
        (!q || texto.includes(q)) &&
        (!this.statusFilter || p.EstadoPlanilla === this.statusFilter) &&
        (!this.yearFilter || p.FechaCreacion?.startsWith(this.yearFilter))
      );
    });
  }

  get pageSlice(): PlanillaData[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredPlanillas.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const total = Math.ceil(this.filteredPlanillas.length / this.perPage) || 1;
    const pages: number[] = [];

    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(total, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  get totalesDetalle(): { salarios: number; deducciones: number; neto: number } {
    return this.detalle().reduce(
      (acc, item) => {
        acc.salarios += Number(item.SalarioBase || 0);
        acc.deducciones += Number(item.TotalDeducciones || 0);
        acc.neto += Number(item.SalarioNeto || 0);
        return acc;
      },
      { salarios: 0, deducciones: 0, neto: 0 }
    );
  }

  filterTable(): void {
    this.currentPage = 1;
  }

  changePage(delta: number): void {
    const max = this.totalCount();
    this.currentPage = Math.max(1, Math.min(max, this.currentPage + delta));
  }

  goPage(page: number): void {
    this.currentPage = page;
  }

  totalCount(): number {
    return Math.ceil(this.filteredPlanillas.length / this.perPage) || 1;
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  fmtDate(d: string): string {
    if (!d) return '—';

    const soloFecha = d.includes('T') ? d.split('T')[0] : d;
    const partes = soloFecha.split('-');

    if (partes.length !== 3) return soloFecha;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  fmtNum(n: number): string {
    return Number(n || 0).toLocaleString('es-CR');
  }

  colorFor(id: number | undefined): string {
    const safeId = Number(id || 1);
    return this.COLORS[(safeId - 1) % this.COLORS.length];
  }

  initialsFromDetalle(d: DetalleEmpleado): string {
    const n = d.NombreEmpleado?.[0] ?? 'E';
    const a = d.ApellidosEmpleado?.[0] ?? '';
    return (n + a).toUpperCase();
  }

  statusClass(estado: string): string {
    if (estado === 'Activa') return 'status-abierta';
    if (estado === 'Pendiente') return 'status-revision';
    if (estado === 'Cerrada') return 'status-cerrada';
    if (estado === 'Procesada') return 'status-pagada';
    return 'status-anulada';
  }

  countByStatus(status: string): number {
    return this.planillas().filter((p) => p.EstadoPlanilla === status).length;
  }

  openModal(mode: 'create' | 'edit', id?: number): void {
    if (mode === 'create') {
      this.editId = null;

      this.form = {
        EstadoPlanilla: 'Activa',
        IdUsuario: 0,
        FechaCreacion: new Date().toISOString().slice(0, 10),
        idControlHorarios: 0,
        idPeriodoPlanilla: 0,
      };
    } else {
      const planilla = this.planillas().find((p) => p.idPlanillas === id);
      if (!planilla) return;

      this.editId = planilla.idPlanillas;

      this.form = {
        idPlanillas: planilla.idPlanillas,
        EstadoPlanilla: planilla.EstadoPlanilla,
        IdUsuario: Number(planilla.IdUsuario),
        FechaCreacion: planilla.FechaCreacion?.includes('T')
          ? planilla.FechaCreacion.split('T')[0]
          : planilla.FechaCreacion,
        idControlHorarios: Number(planilla.idControlHorarios),
        idPeriodoPlanilla: Number(planilla.idPeriodoPlanilla),
      };
    }

    this.showFormModal = true;
  }

  savePlanilla(): void {
    if (!this.form.EstadoPlanilla?.trim()) {
      alert('Debes seleccionar un estado.');
      return;
    }

    if (!this.form.FechaCreacion) {
      alert('Debes ingresar la fecha de creación.');
      return;
    }

    if (!this.form.IdUsuario || Number(this.form.IdUsuario) <= 0) {
      alert('Debes seleccionar un usuario.');
      return;
    }

    if (!this.form.idControlHorarios || Number(this.form.idControlHorarios) <= 0) {
      alert('Debes ingresar un ID de control de horarios válido.');
      return;
    }

    if (!this.form.idPeriodoPlanilla || Number(this.form.idPeriodoPlanilla) <= 0) {
      alert('Debes seleccionar un período de planilla.');
      return;
    }

    const payload = {
      idPlanillas: this.editId ?? undefined,
      EstadoPlanilla: this.form.EstadoPlanilla,
      IdUsuario: Number(this.form.IdUsuario),
      FechaCreacion: this.form.FechaCreacion,
      idControlHorarios: Number(this.form.idControlHorarios),
      idPeriodoPlanilla: Number(this.form.idPeriodoPlanilla),
    };

    if (this.editId) {
      this.http.put(`${this.PLANILLA_URL}/actualizar`, payload).subscribe({
        next: () => {
          this.getPlanillas();
          this.showFormModal = false;
        },
        error: (err) => {
          console.error('Error al editar planilla:', err);
        },
      });
    } else {
      this.http.post(`${this.PLANILLA_URL}/insertar`, payload).subscribe({
        next: () => {
          this.getPlanillas();
          this.showFormModal = false;
        },
        error: (err) => {
          console.error('Error al crear planilla:', err);
        },
      });
    }
  }

  viewPlanilla(id: number): void {
    const planilla = this.planillas().find((p) => p.idPlanillas === id);
    if (!planilla) return;

    this.viewedPlanilla = planilla;
    this.detalle.set([]);
    this.getDetalle(id);
    this.showViewModal = true;
  }

  viewInAnotherPage(p: PlanillaData): void {
    localStorage.setItem(
      'displayData',
      JSON.stringify({
        titulo: 'Detalle de la planilla',
        volver: '/planilla',
        datos: {
          ID: `#${p.idPlanillas}`,
          Período: p.descPeriodo || `Período #${p.idPeriodoPlanilla}`,
          'Fecha de creación': this.fmtDate(p.FechaCreacion),
          Usuario: p.NombreUsuario || this.obtenerNombreUsuario(p.IdUsuario) || `#${p.IdUsuario}`,
          'Control de horarios': `#${p.idControlHorarios}`,
          Estado: p.EstadoPlanilla,
        },
      })
    );

    this.router.navigate(['/ver-datos']);
  }

  askDelete(id: number): void {
    const planilla = this.planillas().find((p) => p.idPlanillas === id);
    if (!planilla) return;

    this.deleteTargetId = id;
    this.deleteDesc = `Estás a punto de eliminar la planilla #${planilla.idPlanillas}. Esta acción no se puede deshacer.`;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deleteTargetId) return;

    this.http.delete(`${this.PLANILLA_URL}/eliminar?id=${this.deleteTargetId}`).subscribe({
      next: () => {
        this.getPlanillas();
        this.deleteTargetId = null;
        this.showDeleteModal = false;
      },
      error: (err) => {
        console.error('Error al eliminar planilla:', err);
      },
    });
  }

  onOverlayClick(event: MouseEvent, modal: 'form' | 'view' | 'delete'): void {
    if (event.target === event.currentTarget) {
      if (modal === 'form') this.showFormModal = false;
      if (modal === 'view') this.showViewModal = false;
      if (modal === 'delete') this.showDeleteModal = false;
    }
  }
}