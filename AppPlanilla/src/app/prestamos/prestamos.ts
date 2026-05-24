import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';


interface Prestamo {
  IdPrestamo: number;
  IdEmpleado: number;
  MontoTotal: number;
  Cuotas: number;
  MontoPorCuota: number;
  SaldoPendiente: number;
  FechaInicio: string;
  Estado: number;
  IdUsuario: number;

  NombreEmpleado?: string;
  ApellidosEmpleado?: string;
  CodigoEmpleado?: string;

  NombreUsuario?: string;
  ApellidosUsuario?: string;
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

interface Usuario {
  idUsuario: number;
  Nombre: string;
  Apellidos: string;
  Estado: number;
  FechaCreacion: string;
  telefono: string;
  correo: string;
  idRol: number;
  idDepartamento: number;
}

@Component({
  selector: 'app-prestamos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './prestamos.html',
  styleUrl: './prestamos.css',
})
export class Prestamos implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly BASE_URL = 'https://backenplanilla-production.up.railway.app/';
  private readonly PRESTAMO_URL = `${this.BASE_URL}/PrestamoServicio`;
  private readonly EMPLEADO_URL = `${this.BASE_URL}/EmpleadoServicio`;
  private readonly USUARIO_URL = `${this.BASE_URL}/UsuarioServicio`;

  protected readonly prestamosSignal = signal<Prestamo[]>([]);
  protected readonly empleadosSignal = signal<Empleado[]>([]);
  protected readonly usuariosSignal = signal<Usuario[]>([]);

  readonly perPage = 8;
  readonly COLORS = ['av-red', 'av-green', 'av-blue', 'av-amber', 'av-violet', 'av-teal'];

  showFormModal = false;
  showViewModal = false;
  showDeleteModal = false;

  searchQuery = '';
  estadoFilter = '';
  yearFilter = '';

  currentPage = 1;

  editId: number | null = null;
  form: Partial<Prestamo> = {};

  viewedPrestamo!: Prestamo;

  deleteTargetId: number | null = null;
  deleteDesc = '';

  get prestamos(): Prestamo[] {
    return this.prestamosSignal();
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.getPrestamosVista();
    this.getEmpleados();
    this.getUsuarios();
  }

  getPrestamosVista(): void {
    this.http.get<Prestamo[]>(`${this.PRESTAMO_URL}/listarPrestamosVista`).subscribe({
      next: (data) => this.prestamosSignal.set(data || []),
      error: (err) => {
        console.error('Error al obtener préstamos vista:', err);
        this.prestamosSignal.set([]);
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

  getUsuarios(): void {
    this.http.get<Usuario[]>(`${this.USUARIO_URL}/listarUsuarios`).subscribe({
      next: (data) => this.usuariosSignal.set(data || []),
      error: (err) => {
        console.error('Error al obtener usuarios:', err);
        this.usuariosSignal.set([]);
      },
    });
  }

  get filteredPrestamos(): Prestamo[] {
    const q = this.searchQuery.toLowerCase().trim();

    return this.prestamos.filter((p) => {
      const texto = `
        ${p.IdPrestamo}
        ${this.empName(p.IdEmpleado)}
        ${p.MontoTotal}
        ${p.SaldoPendiente}
      `.toLowerCase();

      const estadoOk = this.estadoFilter === '' || Number(p.Estado) === Number(this.estadoFilter);
      const yearOk = !this.yearFilter || (p.FechaInicio || '').startsWith(this.yearFilter);

      return (!q || texto.includes(q)) && estadoOk && yearOk;
    });
  }

  get pageSlice(): Prestamo[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredPrestamos.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const total = Math.ceil(this.filteredPrestamos.length / this.perPage) || 1;
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

  empName(id: number): string {
    const desdeVista = this.prestamos.find((p) => Number(p.IdEmpleado) === Number(id) && p.NombreEmpleado);
    if (desdeVista?.NombreEmpleado) {
      return `${desdeVista.NombreEmpleado} ${desdeVista.ApellidosEmpleado || ''}`.trim();
    }

    const emp = this.empleadosSignal().find((e) => Number(e.idEmpleado) === Number(id));
    return emp ? `${emp.Nombre} ${emp.Apellidos}` : `Empleado #${id}`;
  }

  empInitial(id: number): string {
    const name = this.empName(id);
    const p = name.split(' ').filter(Boolean);
    return ((p[0]?.[0] || 'E') + (p[1]?.[0] || '')).toUpperCase();
  }

  colorFor(id: number): string {
    const safeId = Number(id || 1);
    return this.COLORS[(safeId - 1) % this.COLORS.length];
  }

  fmtNum(n: number): string {
    return Number(n || 0).toLocaleString('es-CR');
  }

  fmtShort(n: number): string {
    const value = Number(n || 0);
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
    return String(value);
  }

  fmtDateShort(d: string): string {
    if (!d) return '—';
    const soloFecha = d.includes('T') ? d.split('T')[0] : d;
    const [y, m, day] = soloFecha.split('-');
    if (!y || !m || !day) return soloFecha;

    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${Number(day)} ${meses[Number(m) - 1]} ${y}`;
  }

  estadoClass(e: number): string {
    return Number(e) === 0 ? 'status-encurso' : 'status-cancelado';
  }

  countByEstado(e: number): number {
    return this.prestamos.filter((p) => Number(p.Estado) === Number(e)).length;
  }

  totalSaldoPendiente(): number {
    return this.prestamos
      .filter((p) => Number(p.Estado) === 0)
      .reduce((acc, p) => acc + Number(p.SaldoPendiente || 0), 0);
  }

  porcentajePagado(p: Prestamo): number {
    if (!p.MontoTotal) return 0;
    const pagado = Number(p.MontoTotal) - Number(p.SaldoPendiente);
    return Math.min(100, Math.max(0, Math.round((pagado / Number(p.MontoTotal)) * 100)));
  }

  cuotasPagadas(p: Prestamo): number {
    if (!p.MontoPorCuota || Number(p.MontoPorCuota) <= 0) return 0;
    const pagado = Number(p.MontoTotal) - Number(p.SaldoPendiente);
    return Math.max(0, Math.round(pagado / Number(p.MontoPorCuota)));
  }

  cuotasArray(p: Prestamo): { num: number; pagada: boolean }[] {
    const pagadas = this.cuotasPagadas(p);
    return Array.from({ length: Number(p.Cuotas || 0) }, (_, i) => ({
      num: i + 1,
      pagada: i < pagadas,
    }));
  }

  topPrestamos(): Prestamo[] {
    return this.prestamos
      .filter((p) => Number(p.Estado) === 0)
      .sort((a, b) => Number(b.SaldoPendiente) - Number(a.SaldoPendiente))
      .slice(0, 3);
  }

  calcMontoCuota(): number {
    if (!this.form.MontoTotal || !this.form.Cuotas || Number(this.form.Cuotas) <= 0) return 0;
    return Math.round(Number(this.form.MontoTotal) / Number(this.form.Cuotas));
  }

  calcularCuota(): void {
    const cuota = this.calcMontoCuota();
    if (cuota > 0) {
      this.form.MontoPorCuota = cuota;
      this.form.SaldoPendiente = Number(this.form.MontoTotal);
    }
  }

  usuarioName(id: number): string {
    const desdeVista = this.prestamos.find((p) => Number(p.IdUsuario) === Number(id) && p.NombreUsuario);
    if (desdeVista?.NombreUsuario) {
      return `${desdeVista.NombreUsuario} ${desdeVista.ApellidosUsuario || ''}`.trim();
    }

    const user = this.usuariosSignal().find((u) => Number(u.idUsuario) === Number(id));
    return user ? `${user.Nombre} ${user.Apellidos}` : `Usuario #${id}`;
  }

  filterTable(): void {
    this.currentPage = 1;
  }

  changePage(d: number): void {
    const max = Math.ceil(this.filteredPrestamos.length / this.perPage) || 1;
    this.currentPage = Math.max(1, Math.min(max, this.currentPage + d));
  }

  goPage(n: number): void {
    this.currentPage = n;
  }

  openModal(mode: 'create' | 'edit', id?: number): void {
    if (mode === 'create') {
      this.editId = null;
      this.form = {
        IdEmpleado: 0,
        MontoTotal: 0,
        Cuotas: 0,
        MontoPorCuota: 0,
        SaldoPendiente: 0,
        FechaInicio: new Date().toISOString().slice(0, 10),
        Estado: 0,
        IdUsuario: 1,
      };
    } else {
      const p = this.prestamos.find((x) => x.IdPrestamo === id);
      if (!p) return;

      this.editId = p.IdPrestamo;
      this.form = {
        IdPrestamo: p.IdPrestamo,
        IdEmpleado: p.IdEmpleado,
        MontoTotal: p.MontoTotal,
        Cuotas: p.Cuotas,
        MontoPorCuota: p.MontoPorCuota,
        SaldoPendiente: p.SaldoPendiente,
        FechaInicio: p.FechaInicio?.includes('T') ? p.FechaInicio.split('T')[0] : p.FechaInicio,
        Estado: p.Estado,
        IdUsuario: p.IdUsuario,
      };
    }

    this.showFormModal = true;
  }

  savePrestamo(): void {
    if (!this.form.IdEmpleado || Number(this.form.IdEmpleado) <= 0) {
      alert('Debes ingresar un ID de empleado válido.');
      return;
    }

    if (!this.form.IdUsuario || Number(this.form.IdUsuario) <= 0) {
      alert('Debes ingresar un ID de usuario válido.');
      return;
    }

    if (!this.form.MontoTotal || Number(this.form.MontoTotal) <= 0) {
      alert('Debes ingresar un monto total válido.');
      return;
    }

    if (!this.form.Cuotas || Number(this.form.Cuotas) <= 0) {
      alert('Debes ingresar un número de cuotas válido.');
      return;
    }

    if (!this.form.FechaInicio) {
      alert('Debes ingresar la fecha de inicio.');
      return;
    }

    const montoPorCuota = Number(this.form.MontoPorCuota) > 0 ? Number(this.form.MontoPorCuota) : this.calcMontoCuota();
    const saldoPendiente =
      this.form.SaldoPendiente !== undefined && this.form.SaldoPendiente !== null
        ? Number(this.form.SaldoPendiente)
        : Number(this.form.MontoTotal);

    const payload = {
      IdPrestamo: this.editId ?? undefined,
      IdEmpleado: Number(this.form.IdEmpleado),
      MontoTotal: Number(this.form.MontoTotal),
      Cuotas: Number(this.form.Cuotas),
      MontoPorCuota: Number(montoPorCuota),
      SaldoPendiente: Number(saldoPendiente),
      FechaInicio: this.form.FechaInicio,
      Estado: Number(this.form.Estado ?? 0),
      IdUsuario: Number(this.form.IdUsuario),
    };

    if (this.editId) {
      this.http.put(`${this.PRESTAMO_URL}/actualizar`, payload).subscribe({
        next: () => {
          this.getPrestamosVista();
          this.showFormModal = false;
        },
        error: (err) => console.error('Error al editar préstamo:', err),
      });
    } else {
      this.http.post(`${this.PRESTAMO_URL}/insertar`, payload).subscribe({
        next: () => {
          this.getPrestamosVista();
          this.showFormModal = false;
        },
        error: (err) => console.error('Error al crear préstamo:', err),
      });
    }
  }

  viewPrestamo(id: number): void {
    const prestamo = this.prestamos.find((x) => x.IdPrestamo === id);
    if (!prestamo) return;

    this.viewedPrestamo = prestamo;
    this.showViewModal = true;
  }

viewInAnotherPage(p: Prestamo): void {
  localStorage.setItem('displayData', JSON.stringify({
    titulo: 'Detalle del préstamo',
    volver: '/prestamos',
    datos: {
      ID: `#${p.IdPrestamo}`,
      Empleado: this.empName(p.IdEmpleado),
      'ID Empleado': `#${p.IdEmpleado}`,
      'Monto total': `₡${this.fmtNum(p.MontoTotal)}`,
      Cuotas: `${this.cuotasPagadas(p)} de ${p.Cuotas}`,
      'Monto por cuota': `₡${this.fmtNum(p.MontoPorCuota)}`,
      'Saldo pendiente': `₡${this.fmtNum(p.SaldoPendiente)}`,
      'Fecha de inicio': this.fmtDateShort(p.FechaInicio),
      Progreso: `${this.porcentajePagado(p)}%`,
      'Usuario responsable': this.usuarioName(p.IdUsuario),
      Estado: Number(p.Estado) === 0 ? 'En curso' : 'Cancelado'
    }
  }));

  this.router.navigate(['/ver-datos']);
}





  askDelete(id: number): void {
    const p = this.prestamos.find((x) => x.IdPrestamo === id);
    if (!p) return;

    this.deleteTargetId = id;
    this.deleteDesc = `Estás a punto de eliminar el Préstamo #${p.IdPrestamo} de ${this.empName(p.IdEmpleado)} por ₡${this.fmtNum(p.MontoTotal)}. Esta acción no se puede deshacer.`;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deleteTargetId) return;

    this.http.delete(`${this.PRESTAMO_URL}/eliminar?id=${this.deleteTargetId}`).subscribe({
      next: () => {
        this.getPrestamosVista();
        this.deleteTargetId = null;
        this.showDeleteModal = false;
      },
      error: (err) => console.error('Error al eliminar préstamo:', err),
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