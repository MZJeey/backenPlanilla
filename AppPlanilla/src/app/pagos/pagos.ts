import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface PagoVista {
  IdPago: number;
  IdPlanilla: number;
  IdEmpleado: number;
  MontoPagado: number;
  MetodoPago: string;
  ReferenciaPago: string;
  IdUsuarioProcesa: number;
  FechaPago: string;
  Estado: number;
  idFeriados: number | null;
  idDeduccion: number | null;

  NombreEmpleado?: string;
  ApellidosEmpleado?: string;
  CodigoEmpleado?: string;

  EstadoPlanilla?: string;

  NombreUsuarioProcesa?: string;
  ApellidosUsuarioProcesa?: string;

  NombreFeriado?: string;
  NombreDeduccion?: string;
}

interface Empleado {
  idEmpleado: number;
  CodigoEmpleado: string;
  Nombre: string;
  Apellidos: string;
  Identificacion: string;
  Correo: string;
  Telefono: string;
  FechaIngreso: string;
  Estado: number;
  HoraEntrada: string;
  CuentaBancaria: number;
  Salario: number;
  idDepartamento: number;
  HoraSalida: string;
}

interface Planilla {
  idPlanillas: number;
  EstadoPlanilla: string;
  IdUsuario: number;
  FechaCreacion: string;
  idControlHorarios: number;
  idPeriodoPlanilla: number;
  descPeriodo?: string;
}

interface Usuario {
  idUsuario: number;
  Nombre?: string;
  Apellidos?: string;
  NombreCompleto?: string;
  Estado?: number;
  FechaCreacion?: string;
  telefono?: string;
  correo?: string;
  idRol?: number;
  idDepartamento?: number;
}

interface Feriado {
  IdFeriado: number;
  Fecha: string;
  Nombre: string;
  EsObligatorio: number;
}

interface Deduccion {
  idDeducciones: number;
  Nombre: string;
  Monto: number;
  Impuestos: number;
  Estado: number;
  idEmpleado: number;
  usuariosId: number;
  idPrestamo: number | null;
}

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './pagos.html',
  styleUrl: './pagos.css',
})
export class Pagos implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly BASE_URL = 'https://backenplanilla-production.up.railway.app/';
  private readonly PAGO_URL = `${this.BASE_URL}/PagoServicio`;
  private readonly EMPLEADO_URL = `${this.BASE_URL}/EmpleadoServicio`;
  private readonly PLANILLA_URL = `${this.BASE_URL}/PlanillaServicio`;
  private readonly USUARIO_URL = `${this.BASE_URL}/UsuarioServicio`;
  private readonly FERIADO_URL = `${this.BASE_URL}/FeriadoServicio`;
  private readonly DEDUCCION_URL = `${this.BASE_URL}/DeduccionesServicio`;

  protected readonly pagosSignal = signal<PagoVista[]>([]);
  protected readonly empleadosSignal = signal<Empleado[]>([]);
  protected readonly planillasSignal = signal<Planilla[]>([]);
  protected readonly usuariosSignal = signal<Usuario[]>([]);
  protected readonly feriadosSignal = signal<Feriado[]>([]);
  protected readonly deduccionesSignal = signal<Deduccion[]>([]);

  readonly perPage = 8;
  readonly COLORS = ['av-red', 'av-green', 'av-blue', 'av-amber', 'av-violet', 'av-teal'];

  showFormModal = false;
  showViewModal = false;
  showDeleteModal = false;

  searchQuery = '';
  estadoFilter = '';
  metodoFilter = '';

  currentPage = 1;
  editId: number | null = null;

  form: Partial<PagoVista> = {
    IdPlanilla: 0,
    IdEmpleado: 0,
    MontoPagado: 0,
    MetodoPago: '',
    ReferenciaPago: '',
    IdUsuarioProcesa: 0,
    FechaPago: '',
    Estado: 1,
    idFeriados: 0,
    idDeduccion: 0,
  };

  viewedPago!: PagoVista;

  deleteTargetId: number | null = null;
  deleteDesc = '';

  get pagos(): PagoVista[] {
    return this.pagosSignal();
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.getPagosVista();
    this.getEmpleados();
    this.getPlanillas();
    this.getUsuarios();
    this.getFeriados();
    this.getDeducciones();
  }

  getPagosVista(): void {
    this.http.get<PagoVista[]>(`${this.PAGO_URL}/listarPagosVista`).subscribe({
      next: (data) => this.pagosSignal.set(data || []),
      error: (err) => {
        console.error('Error al obtener pagos vista:', err);
        this.pagosSignal.set([]);
      },
    });
  }

  getEmpleados(): void {
    this.http.get<Empleado[]>(`${this.EMPLEADO_URL}/listarEmpleados`).subscribe({
      next: (data) => this.empleadosSignal.set(data || []),
      error: (err) => {
        console.error('Error al obtener empleados:', err);
        this.empleadosSignal.set([]);
      },
    });
  }

  getPlanillas(): void {
    this.http.get<Planilla[]>(`${this.PLANILLA_URL}/listarPlanillas`).subscribe({
      next: (data) => this.planillasSignal.set(data || []),
      error: (err) => {
        console.error('Error al obtener planillas:', err);
        this.planillasSignal.set([]);
      },
    });
  }

  getUsuarios(): void {
    this.http.get<Usuario[]>(`${this.USUARIO_URL}/listarUsuarios`).subscribe({
      next: (data) => this.usuariosSignal.set(data || []),
      error: (err) => {
        console.error('Error al obtener usuarios:', err);
        this.usuariosSignal.set([]);
      },
    });
  }

  getFeriados(): void {
    this.http.get<Feriado[]>(`${this.FERIADO_URL}/listarFeriados`).subscribe({
      next: (data) => this.feriadosSignal.set(data || []),
      error: (err) => {
        console.error('Error al obtener feriados:', err);
        this.feriadosSignal.set([]);
      },
    });
  }

  getDeducciones(): void {
    this.http.get<Deduccion[]>(`${this.DEDUCCION_URL}/listarDeducciones`).subscribe({
      next: (data) => this.deduccionesSignal.set(data || []),
      error: (err) => {
        console.error('Error al obtener deducciones:', err);
        this.deduccionesSignal.set([]);
      },
    });
  }

  get filteredPagos(): PagoVista[] {
    const q = this.searchQuery.toLowerCase().trim();

    return this.pagos.filter((p) => {
      const texto = `
        ${p.IdPago}
        ${p.IdEmpleado}
        ${p.IdPlanilla}
        ${p.ReferenciaPago || ''}
        ${this.empName(p.IdEmpleado)}
        ${this.usuarioNombre(p.IdUsuarioProcesa)}
        ${this.planillaNombre(p.IdPlanilla)}
        ${this.deduccionDetalle(p.idDeduccion).nombre}
        ${this.feriadoDetalle(p.idFeriados).nombre}
        ${p.MetodoPago || ''}
      `.toLowerCase();

      const estadoOk = this.estadoFilter === '' || Number(p.Estado) === Number(this.estadoFilter);
      const metodoOk = !this.metodoFilter || p.MetodoPago === this.metodoFilter;

      return (!q || texto.includes(q)) && estadoOk && metodoOk;
    });
  }

  get pageSlice(): PagoVista[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredPagos.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const total = Math.ceil(this.filteredPagos.length / this.perPage) || 1;
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

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  fmtNum(n: number): string {
    return Number(n || 0).toLocaleString('es-CR');
  }

  fmtNumShort(n: number): string {
    const value = Number(n || 0);
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
    return String(value);
  }

  fmtDate(d: string): string {
    if (!d) return '—';

    const normalizada = d.includes('T') ? d : d.replace(' ', 'T');
    const dt = new Date(normalizada);

    if (isNaN(dt.getTime())) return d;

    return (
      dt.toLocaleDateString('es-CR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      dt.toLocaleTimeString('es-CR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }

  colorFor(id: number): string {
    const safeId = Number(id || 1);
    return this.COLORS[(safeId - 1) % this.COLORS.length];
  }

  estadoClass(e: number): string {
    return Number(e) === 1 ? 'status-completado' : 'status-pendiente';
  }

  metodoClass(m: string): string {
    const map: Record<string, string> = {
      Transferencia: 'metodo-transferencia',
      SINPE: 'metodo-sinpe',
      Cheque: 'metodo-cheque',
      Efectivo: 'metodo-efectivo',
    };

    return map[m] ?? '';
  }

  planillaStatusClass(estado: string): string {
    if (estado === 'Pagada' || estado === 'Procesada') return 'status-pagada';
    if (estado === 'Abierta' || estado === 'Activa') return 'status-abierta';
    if (estado === 'En revisión' || estado === 'Pendiente') return 'status-revision';
    if (estado === 'Cerrada') return 'status-cerrada';
    if (estado === 'Anulada') return 'status-anulada';
    return 'status-cerrada';
  }

  countByEstado(e: number): number {
    return this.pagos.filter((p) => Number(p.Estado) === Number(e)).length;
  }

  totalMonto(): number {
    return this.pagos
      .filter((p) => Number(p.Estado) === 1)
      .reduce((acc, p) => acc + Number(p.MontoPagado || 0), 0);
  }

  filterTable(): void {
    this.currentPage = 1;
  }

  changePage(delta: number): void {
    const max = Math.ceil(this.filteredPagos.length / this.perPage) || 1;
    this.currentPage = Math.max(1, Math.min(max, this.currentPage + delta));
  }

  goPage(n: number): void {
    this.currentPage = n;
  }

  empName(id: number): string {
    const desdeVista = this.pagos.find((p) => Number(p.IdEmpleado) === Number(id) && p.NombreEmpleado);
    if (desdeVista?.NombreEmpleado) {
      return `${desdeVista.NombreEmpleado} ${desdeVista.ApellidosEmpleado || ''}`.trim();
    }

    const emp = this.empleadosSignal().find((e) => Number(e.idEmpleado) === Number(id));
    return emp ? `${emp.Nombre} ${emp.Apellidos}`.trim() : `Empleado #${id}`;
  }

  empInitial(id: number): string {
    const name = this.empName(id);
    const parts = name.split(' ').filter(Boolean);
    return ((parts[0]?.[0] || 'E') + (parts[1]?.[0] || '')).toUpperCase();
  }

  empDetalle(id: number): { puesto: string; departamento: string; codigo: string } {
    const emp = this.empleadosSignal().find((e) => Number(e.idEmpleado) === Number(id));

    let departamento = '—';

    if (emp) {
      const depMap: Record<number, string> = {
        1: 'TI',
        2: 'Finanzas',
        3: 'Ventas',
        4: 'RRHH',
        5: 'Operaciones',
      };

      departamento = depMap[emp.idDepartamento] ?? `Departamento #${emp.idDepartamento}`;
    }

    return {
      puesto: emp?.CodigoEmpleado ?? 'Empleado',
      codigo: emp?.CodigoEmpleado ?? `Empleado #${id}`,
      departamento,
    };
  }

  planillaNombre(id: number): string {
    const planilla = this.planillasSignal().find((p) => Number(p.idPlanillas) === Number(id));
    const desdeVista = this.pagos.find((p) => Number(p.IdPlanilla) === Number(id) && p.EstadoPlanilla);

    const estado = planilla?.EstadoPlanilla || desdeVista?.EstadoPlanilla || '';

    return estado ? `Planilla #${id} - ${estado}` : `Planilla #${id}`;
  }

  planillaDetalle(id: number): { periodo: string; estado: string; montoTotal: number } {
    const planilla = this.planillasSignal().find((p) => Number(p.idPlanillas) === Number(id));
    const desdeVista = this.pagos.find((p) => Number(p.IdPlanilla) === Number(id) && p.EstadoPlanilla);

    const montoTotal = this.pagos
      .filter((p) => Number(p.IdPlanilla) === Number(id))
      .reduce((acc, p) => acc + Number(p.MontoPagado || 0), 0);

    return {
      periodo: planilla?.descPeriodo || (planilla ? `Período #${planilla.idPeriodoPlanilla}` : `Planilla #${id}`),
      estado: planilla?.EstadoPlanilla || desdeVista?.EstadoPlanilla || '—',
      montoTotal,
    };
  }

  deduccionDetalle(id: number | null): { nombre: string; tipo: string; monto: number } {
    if (!id || Number(id) <= 0) {
      return { nombre: 'No aplica', tipo: '—', monto: 0 };
    }

    const desdeVista = this.pagos.find((p) => Number(p.idDeduccion) === Number(id) && p.NombreDeduccion);
    const ded = this.deduccionesSignal().find((d) => Number(d.idDeducciones) === Number(id));

    return {
      nombre: desdeVista?.NombreDeduccion || ded?.Nombre || `Deducción #${id}`,
      tipo: 'Deducción aplicada',
      monto: Number(ded?.Monto || 0),
    };
  }

  nombreCompletoUsuario(u: Usuario): string {
    if (u.NombreCompleto) return u.NombreCompleto;

    const nombre = `${u.Nombre || ''} ${u.Apellidos || ''}`.trim();

    return nombre || `Usuario #${u.idUsuario}`;
  }

  usuarioNombre(id: number): string {
    const desdeVista = this.pagos.find((p) => Number(p.IdUsuarioProcesa) === Number(id) && p.NombreUsuarioProcesa);

    if (desdeVista?.NombreUsuarioProcesa) {
      return `${desdeVista.NombreUsuarioProcesa} ${desdeVista.ApellidosUsuarioProcesa || ''}`.trim();
    }

    const user = this.usuariosSignal().find((u) => Number(u.idUsuario) === Number(id));

    return user ? this.nombreCompletoUsuario(user) : `Usuario #${id}`;
  }

  usuarioRol(id: number): string {
    const user = this.usuariosSignal().find((u) => Number(u.idUsuario) === Number(id));

    if (!user) return '—';

    const rolMap: Record<number, string> = {
      1: 'Administrador',
      2: 'RRHH',
      3: 'Finanzas',
      4: 'Vendedor',
      5: 'Cliente',
    };

    return rolMap[Number(user.idRol)] ?? `Rol #${user.idRol}`;
  }

  usuarioInitial(id: number): string {
    const name = this.usuarioNombre(id);
    const parts = name.split(' ').filter(Boolean);

    return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
  }

  feriadoDetalle(id: number | null): { nombre: string; fecha: string } {
    if (!id || Number(id) <= 0) {
      return { nombre: 'No aplica', fecha: '—' };
    }

    const desdeVista = this.pagos.find((p) => Number(p.idFeriados) === Number(id) && p.NombreFeriado);
    const feriado = this.feriadosSignal().find((f) => Number(f.IdFeriado) === Number(id));

    return {
      nombre: desdeVista?.NombreFeriado || feriado?.Nombre || `Feriado #${id}`,
      fecha: feriado?.Fecha ? this.fmtDate(feriado.Fecha) : '—',
    };
  }

  openModal(mode: 'create' | 'edit', id?: number): void {
    if (mode === 'create') {
      this.editId = null;

      this.form = {
        IdPlanilla: 0,
        IdEmpleado: 0,
        MontoPagado: 0,
        MetodoPago: '',
        ReferenciaPago: '',
        IdUsuarioProcesa: 0,
        FechaPago: new Date().toISOString().slice(0, 16),
        Estado: 1,
        idFeriados: 0,
        idDeduccion: 0,
      };
    } else {
      const p = this.pagos.find((x) => Number(x.IdPago) === Number(id));
      if (!p) return;

      this.editId = p.IdPago;

      this.form = {
        IdPago: p.IdPago,
        IdPlanilla: Number(p.IdPlanilla),
        IdEmpleado: Number(p.IdEmpleado),
        MontoPagado: Number(p.MontoPagado),
        MetodoPago: p.MetodoPago,
        ReferenciaPago: p.ReferenciaPago,
        IdUsuarioProcesa: Number(p.IdUsuarioProcesa),
        FechaPago: this.toDateTimeLocal(p.FechaPago),
        Estado: Number(p.Estado),
        idFeriados: p.idFeriados ? Number(p.idFeriados) : 0,
        idDeduccion: p.idDeduccion ? Number(p.idDeduccion) : 0,
      };
    }

    this.showFormModal = true;
  }

  savePago(): void {
    if (!this.form.IdPlanilla || Number(this.form.IdPlanilla) <= 0) {
      alert('Debes seleccionar una planilla.');
      return;
    }

    if (!this.form.IdEmpleado || Number(this.form.IdEmpleado) <= 0) {
      alert('Debes seleccionar un empleado.');
      return;
    }

    if (!this.form.MontoPagado || Number(this.form.MontoPagado) <= 0) {
      alert('Debes ingresar un monto válido.');
      return;
    }

    if (!this.form.MetodoPago?.trim()) {
      alert('Debes seleccionar un método de pago.');
      return;
    }

    if (!this.form.IdUsuarioProcesa || Number(this.form.IdUsuarioProcesa) <= 0) {
      alert('Debes seleccionar el usuario que procesa.');
      return;
    }

    if (!this.form.FechaPago) {
      alert('Debes ingresar la fecha del pago.');
      return;
    }

    const payload = {
      IdPago: this.editId ?? undefined,
      IdPlanilla: Number(this.form.IdPlanilla),
      IdEmpleado: Number(this.form.IdEmpleado),
      MontoPagado: Number(this.form.MontoPagado),
      MetodoPago: this.form.MetodoPago,
      ReferenciaPago: this.form.ReferenciaPago || '',
      IdUsuarioProcesa: Number(this.form.IdUsuarioProcesa),
      FechaPago: this.toApiDateTime(this.form.FechaPago),
      Estado: Number(this.form.Estado ?? 1),
      idFeriados: this.form.idFeriados && Number(this.form.idFeriados) > 0 ? Number(this.form.idFeriados) : null,
      idDeduccion: this.form.idDeduccion && Number(this.form.idDeduccion) > 0 ? Number(this.form.idDeduccion) : null,
    };

    if (this.editId) {
      this.http.put(`${this.PAGO_URL}/actualizar`, payload).subscribe({
        next: () => {
          this.getPagosVista();
          this.showFormModal = false;
        },
        error: (err) => console.error('Error al editar pago:', err),
      });
    } else {
      this.http.post(`${this.PAGO_URL}/insertar`, payload).subscribe({
        next: () => {
          this.getPagosVista();
          this.showFormModal = false;
        },
        error: (err) => console.error('Error al crear pago:', err),
      });
    }
  }

  viewPago(id: number): void {
    const pago = this.pagos.find((x) => Number(x.IdPago) === Number(id));
    if (!pago) return;

    this.viewedPago = pago;
    this.showViewModal = true;
  }

  viewInAnotherPage(p: PagoVista): void {
    localStorage.setItem(
      'displayData',
      JSON.stringify({
        titulo: 'Detalle del pago',
        volver: '/pagos',
        datos: {
          ID: `#${p.IdPago}`,
          Empleado: this.empName(p.IdEmpleado),
          Planilla: this.planillaNombre(p.IdPlanilla),
          'Monto pagado': `₡${this.fmtNum(p.MontoPagado)}`,
          'Método de pago': p.MetodoPago,
          Referencia: p.ReferenciaPago || '—',
          'Fecha de pago': this.fmtDate(p.FechaPago),
          'Procesado por': this.usuarioNombre(p.IdUsuarioProcesa),
          Deducción: p.idDeduccion && p.idDeduccion > 0 ? this.deduccionDetalle(p.idDeduccion).nombre : 'No aplica',
          Feriado: p.idFeriados && p.idFeriados > 0 ? this.feriadoDetalle(p.idFeriados).nombre : 'No aplica',
          Estado: Number(p.Estado) === 1 ? 'Completado' : 'Pendiente',
        },
      })
    );

    this.router.navigate(['/ver-datos']);
  }

  askDelete(id: number): void {
    const pago = this.pagos.find((x) => Number(x.IdPago) === Number(id));
    if (!pago) return;

    this.deleteTargetId = id;
    this.deleteDesc = `Estás a punto de eliminar el Pago #${pago.IdPago} de ${this.empName(pago.IdEmpleado)} por ₡${this.fmtNum(pago.MontoPagado)}. Esta acción no se puede deshacer.`;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deleteTargetId) return;

    this.http.delete(`${this.PAGO_URL}/eliminar?id=${this.deleteTargetId}`).subscribe({
      next: () => {
        this.getPagosVista();
        this.deleteTargetId = null;
        this.showDeleteModal = false;
      },
      error: (err) => console.error('Error al eliminar pago:', err),
    });
  }

  onOverlayClick(event: MouseEvent, modal: 'form' | 'view' | 'delete'): void {
    if (event.target === event.currentTarget) {
      if (modal === 'form') this.showFormModal = false;
      if (modal === 'view') this.showViewModal = false;
      if (modal === 'delete') this.showDeleteModal = false;
    }
  }

  private toDateTimeLocal(value: string): string {
    if (!value) return '';

    const normalizada = value.includes('T') ? value : value.replace(' ', 'T');
    const dt = new Date(normalizada);

    if (isNaN(dt.getTime())) return value.slice(0, 16);

    return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  private toApiDateTime(value: string): string {
    if (!value) return '';

    return value.includes('T') ? value.replace('T', ' ') + ':00' : value;
  }
}