import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface Deduccion {
  idDeducciones: number;
  Nombre: string;
  Monto: number;
  Impuestos: number;
  Estado: number;
  idEmpleado: number;
  usuariosId: number;
  idPrestamo: number | null;

  NombreEmpleado?: string;
  ApellidosEmpleado?: string;
  CodigoEmpleado?: string;

  NombreUsuario?: string;
  ApellidosUsuario?: string;

  PrestamoMontoTotal?: number;
  PrestamoCuotas?: number;
  PrestamoMontoPorCuota?: number;
  PrestamoSaldoPendiente?: number;
  PrestamoFechaInicio?: string;
  PrestamoEstado?: number;
}

interface Empleado {
  idEmpleado: number;
  Nombre: string;
  Apellidos: string;
  Estado: number;
}

interface Usuario {
  idUsuario: number;
  Nombre: string;
  Apellidos: string;
  Estado: number;
}

@Component({
  selector: 'app-deducciones',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './deducciones.html',
  styleUrl: './deducciones.css',
})
export class Deducciones implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly BASE_URL = 'https://backenplanilla-production.up.railway.app/';
  private readonly DEDUCCIONES_URL = `${this.BASE_URL}/DeduccionesServicio`;
  private readonly EMPLEADO_URL  = `${this.BASE_URL}/EmpleadoServicio`;
  private readonly USUARIO_URL   = `${this.BASE_URL}/UsuarioServicio`;

  readonly perPage = 8;
  readonly COLORS = ['av-red', 'av-green', 'av-blue', 'av-amber', 'av-violet', 'av-teal'];

  protected readonly deducciones    = signal<Deduccion[]>([]);
  protected readonly empleadosSignal = signal<Empleado[]>([]);
  protected readonly usuariosSignal  = signal<Usuario[]>([]);

  showFormModal  = false;
  showViewModal  = false;
  showDeleteModal = false;

  searchQuery  = '';
  estadoFilter = '';
  tipoFilter   = '';

  currentPage = 1;

  editId: number | null = null;
  form: Partial<Deduccion> = {};

  viewedDeduccion!: Deduccion;

  deleteTargetId: number | null = null;
  deleteDesc = '';

  readonly TIPO_KEYWORDS: { key: string; label: string; color: string }[] = [
    { key: 'ccss',     label: 'CCSS',     color: 'dot-red'    },
    { key: 'renta',    label: 'Renta',    color: 'dot-amber'  },
    { key: 'prést',    label: 'Préstamo', color: 'dot-blue'   },
    { key: 'prestamo', label: 'Préstamo', color: 'dot-blue'   },
    { key: 'embargo',  label: 'Embargo',  color: 'dot-violet' },
    { key: 'ins',      label: 'Otro',     color: 'dot-green'  },
    { key: 'asociac',  label: 'Otro',     color: 'dot-green'  },
  ];

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.getDeducciones();
    this.getEmpleados();
    this.getUsuarios();
  }

  getDeducciones(): void {
    this.http.get<Deduccion[]>(`${this.DEDUCCIONES_URL}/listarDeduccionesVista`).subscribe({
      next: (data) => this.deducciones.set(data || []),
      error: (err) => { console.error('Error al obtener deducciones:', err); this.deducciones.set([]); },
    });
  }

  getEmpleados(): void {
    this.http.get<Empleado[]>(`${this.EMPLEADO_URL}/listarEmpleados`).subscribe({
      next: (data) => this.empleadosSignal.set(data || []),
      error: (err) => { console.error('Error al obtener empleados:', err); this.empleadosSignal.set([]); },
    });
  }

  getUsuarios(): void {
    this.http.get<Usuario[]>(`${this.USUARIO_URL}/listarUsuarios`).subscribe({
      next: (data) => this.usuariosSignal.set(data || []),
      error: (err) => { console.error('Error al obtener usuarios:', err); this.usuariosSignal.set([]); },
    });
  }

  // ─── Helpers de nombre ────────────────────────────────────────────────────

  /** Nombre del empleado — prioriza el signal, fallback a campos de la vista */
  empName(d: Deduccion): string {
    const emp = this.empleadosSignal().find((e) => Number(e.idEmpleado) === Number(d.idEmpleado));
    if (emp) return `${emp.Nombre} ${emp.Apellidos}`.trim();

    const nombre = `${d.NombreEmpleado ?? ''} ${d.ApellidosEmpleado ?? ''}`.trim();
    return nombre || `Empleado #${d.idEmpleado}`;
  }

  /** Iniciales del empleado — acepta solo el ID, busca en signal */
  empInitial(id: number | null | undefined): string {
    const emp = this.empleadosSignal().find((e) => Number(e.idEmpleado) === Number(id));
    if (emp) return ((emp.Nombre[0] ?? 'E') + (emp.Apellidos[0] ?? '')).toUpperCase();

    // fallback a campos embebidos en la vista
    const ded = this.deducciones().find((x) => Number(x.idEmpleado) === Number(id));
    const n = ded?.NombreEmpleado?.[0] ?? 'E';
    const a = ded?.ApellidosEmpleado?.[0] ?? '';
    return (n + a).toUpperCase();
  }

  /** Nombre del usuario — prioriza el signal, fallback a campos de la vista */
  usuarioNombre(d: Deduccion): string {
    const user = this.usuariosSignal().find((u) => Number(u.idUsuario) === Number(d.usuariosId));
    if (user) return `${user.Nombre} ${user.Apellidos}`.trim();

    const nombre = `${d.NombreUsuario ?? ''} ${d.ApellidosUsuario ?? ''}`.trim();
    return nombre || `Usuario #${d.usuariosId}`;
  }

  /** Iniciales del usuario — acepta solo el ID, busca en signal */
  usuarioInitial(id: number | null | undefined): string {
    const user = this.usuariosSignal().find((u) => Number(u.idUsuario) === Number(id));
    if (user) return ((user.Nombre[0] ?? 'U') + (user.Apellidos[0] ?? '')).toUpperCase();

    const ded = this.deducciones().find((x) => Number(x.usuariosId) === Number(id));
    const n = ded?.NombreUsuario?.[0] ?? 'U';
    const a = ded?.ApellidosUsuario?.[0] ?? '';
    return (n + a).toUpperCase();
  }

  usuarioRol(_id: number | null | undefined): string {
    return 'Usuario del sistema';
  }

  // ─── Helpers generales ────────────────────────────────────────────────────

  colorFor(id: number | null | undefined): string {
    return this.COLORS[(Number(id || 1) - 1) % this.COLORS.length];
  }

  fmtNum(n: number | null | undefined): string {
    return Number(n || 0).toLocaleString('es-CR');
  }

  fmtShort(n: number | null | undefined): string {
    const v = Number(n || 0);
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000)     return (v / 1_000).toFixed(0) + 'K';
    return String(v);
  }

  tipoColor(nombre: string): string {
    const n = (nombre || '').toLowerCase();
    return this.TIPO_KEYWORDS.find((t) => n.includes(t.key))?.color ?? 'dot-muted';
  }

  tipoLabel(nombre: string): string {
    const n = (nombre || '').toLowerCase();
    return this.TIPO_KEYWORDS.find((t) => n.includes(t.key))?.label ?? 'Otro';
  }

  estadoClass(e: number): string {
    return e === 1 ? 'status-activa' : 'status-inactiva';
  }

  countByEstado(e: number): number {
    return this.deducciones().filter((d) => d.Estado === e).length;
  }

  totalMontos(): number {
    return this.deducciones()
      .filter((d) => d.Estado === 1)
      .reduce((acc, d) => acc + Number(d.Monto || 0) + Number(d.Impuestos || 0), 0);
  }

  empDetalle(id: number): { puesto: string; departamento: string; cedula: string } {
    const ded = this.deducciones().find((x) => Number(x.idEmpleado) === Number(id));
    return {
      puesto:       ded?.CodigoEmpleado ? `Código ${ded.CodigoEmpleado}` : 'Empleado registrado',
      departamento: 'Departamento no disponible',
      cedula:       'No disponible',
    };
  }

  prestamoDetalle(id: number | null): {
    desc: string; montoTotal: number; saldo: number; cuota: number; pct: number;
  } {
    if (!id) return { desc: '—', montoTotal: 0, saldo: 0, cuota: 0, pct: 0 };

    const d = this.deducciones().find((x) => Number(x.idPrestamo) === Number(id));
    if (!d)  return { desc: 'Préstamo relacionado', montoTotal: 0, saldo: 0, cuota: 0, pct: 0 };

    const montoTotal = Number(d.PrestamoMontoTotal || 0);
    const saldo      = Number(d.PrestamoSaldoPendiente || 0);
    const cuota      = Number(d.PrestamoMontoPorCuota || 0);
    const pagado     = montoTotal - saldo;
    const pct        = montoTotal > 0 ? Math.min(100, Math.round((pagado / montoTotal) * 100)) : 0;

    return {
      desc: d.PrestamoFechaInicio ? `Desde ${d.PrestamoFechaInicio}` : 'Préstamo relacionado',
      montoTotal, saldo, cuota, pct,
    };
  }

  // ─── Filtro y paginación ──────────────────────────────────────────────────

  get filteredDeducciones(): Deduccion[] {
    const q = this.searchQuery.toLowerCase().trim();

    return this.deducciones().filter((d) => {
      const texto = `
        ${d.idDeducciones} ${d.Nombre}
        ${this.empName(d)} ${d.idPrestamo ?? ''}
        ${this.usuarioNombre(d)}
      `.toLowerCase();

      const estadoOk = this.estadoFilter === '' || d.Estado === Number(this.estadoFilter);
      const tipoOk   = !this.tipoFilter  ||
        this.tipoLabel(d.Nombre).toLowerCase() === this.tipoFilter.toLowerCase() ||
        d.Nombre.toLowerCase().includes(this.tipoFilter.toLowerCase());

      return (!q || texto.includes(q)) && estadoOk && tipoOk;
    });
  }

  get pageSlice(): Deduccion[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredDeducciones.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const total = Math.ceil(this.filteredDeducciones.length / this.perPage) || 1;
    const pages: number[] = [];
    let start = Math.max(1, this.currentPage - 2);
    let end   = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  min(a: number, b: number): number { return Math.min(a, b); }

  filterTable(): void { this.currentPage = 1; }

  changePage(d: number): void {
    const max = Math.ceil(this.filteredDeducciones.length / this.perPage) || 1;
    this.currentPage = Math.max(1, Math.min(max, this.currentPage + d));
  }

  goPage(n: number): void { this.currentPage = n; }

  // ─── Modal crear / editar ─────────────────────────────────────────────────

  openModal(mode: 'create' | 'edit', id?: number): void {
    if (mode === 'create') {
      this.editId = null;
      this.form = { Nombre: '', Monto: undefined, Impuestos: 0, Estado: 1,
                    idEmpleado: 0, usuariosId: 0, idPrestamo: null };
    } else {
      const d = this.deducciones().find((x) => x.idDeducciones === id);
      if (!d) return;
      this.editId = d.idDeducciones;
      this.form = { ...d };
    }
    this.showFormModal = true;
  }

  saveDeduccion(): void {
    if (!this.form.Nombre?.trim()) { alert('El nombre es requerido.'); return; }
    if (!this.form.idEmpleado || Number(this.form.idEmpleado) <= 0) { alert('Debes seleccionar un empleado.'); return; }
    if (!this.form.usuariosId || Number(this.form.usuariosId) <= 0) { alert('Debes seleccionar un usuario.'); return; }
    if (this.form.Monto == null || Number(this.form.Monto) <= 0)    { alert('Debes ingresar un monto válido.'); return; }

    const payload = {
      idDeducciones: this.editId ?? undefined,
      Nombre:     this.form.Nombre,
      Monto:      Number(this.form.Monto),
      Impuestos:  Number(this.form.Impuestos || 0),
      Estado:     Number(this.form.Estado ?? 1),
      idEmpleado: Number(this.form.idEmpleado),
      usuariosId: Number(this.form.usuariosId),
      idPrestamo: (!this.form.idPrestamo || Number(this.form.idPrestamo) === 0)
                  ? null : Number(this.form.idPrestamo),
    };

    const url = this.editId
      ? this.http.put(`${this.DEDUCCIONES_URL}/actualizar`, payload)
      : this.http.post(`${this.DEDUCCIONES_URL}/insertar`, payload);

    url.subscribe({
      next: () => { this.getDeducciones(); this.showFormModal = false; },
      error: (err) => console.error('Error al guardar deducción:', err),
    });
  }

  // ─── Modal ver ────────────────────────────────────────────────────────────

  viewDeduccion(id: number): void {
    const d = this.deducciones().find((x) => x.idDeducciones === id);
    if (!d) return;
    this.viewedDeduccion = d;
    this.showViewModal = true;
  }

  viewInAnotherPage(d: Deduccion): void {
    localStorage.setItem('displayData', JSON.stringify({
      titulo: 'Detalle de la deducción',
      volver: '/deducciones',
      datos: {
        ID:              `#${d.idDeducciones}`,
        Nombre:          d.Nombre,
        Tipo:            this.tipoLabel(d.Nombre),
        Empleado:        this.empName(d),
        'ID Empleado':   `#${d.idEmpleado}`,
        Monto:           `₡${this.fmtNum(d.Monto)}`,
        Impuestos:       d.Impuestos > 0 ? `₡${this.fmtNum(d.Impuestos)}` : '₡0',
        'Total afectado':`₡${this.fmtNum(d.Monto + d.Impuestos)}`,
        Préstamo:        d.idPrestamo ? `#${d.idPrestamo}` : 'No aplica',
        Usuario:         this.usuarioNombre(d),
        Estado:          d.Estado === 1 ? 'Activa' : 'Inactiva',
      },
    }));
    this.router.navigate(['/ver-datos']);
  }

  // ─── Modal eliminar ───────────────────────────────────────────────────────

  askDelete(id: number): void {
    const d = this.deducciones().find((x) => x.idDeducciones === id);
    if (!d) return;
    this.deleteTargetId = id;
    this.deleteDesc = `Estás a punto de eliminar la deducción "${d.Nombre}" de ${this.empName(d)} (₡${this.fmtNum(d.Monto)}). Esta acción no se puede deshacer.`;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deleteTargetId) return;
    this.http.delete(`${this.DEDUCCIONES_URL}/eliminar?id=${this.deleteTargetId}`).subscribe({
      next: () => { this.getDeducciones(); this.deleteTargetId = null; this.showDeleteModal = false; },
      error: (err) => console.error('Error al eliminar deducción:', err),
    });
  }

  onOverlayClick(event: MouseEvent, modal: 'form' | 'view' | 'delete'): void {
    if (event.target === event.currentTarget) {
      if (modal === 'form')   this.showFormModal   = false;
      if (modal === 'view')   this.showViewModal   = false;
      if (modal === 'delete') this.showDeleteModal = false;
    }
  }
}