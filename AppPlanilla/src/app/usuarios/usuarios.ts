import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

interface Usuario {
  idUsuario: number;
  Nombre: string;
  Apellidos: string;
  Estado: number;
  FechaCreacion: string;
  Clave?: string;
  telefono: string;
  correo: string;
  idRol: number;
  IdDepartamento: number;
  Token?: string;
}

interface RolSummary {
  idRol: number;
  nombre: string;
  total: number;
  activos: number;
  iconClass: string;
  iconSvg: string;
}

const ROLES: Record<number, string> = {
  1: 'Administrador',
  2: 'RRHH',
  3: 'Supervisor',
  4: 'Empleado',
};

const DEPARTAMENTOS: Record<number, string> = {
  1: 'TI',
  2: 'Finanzas',
  3: 'Ventas',
  4: 'RRHH',
  5: 'Operaciones',
};

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule, CommonModule],  // ✅ CommonModule necesario para @if/@for en algunos casos
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  private readonly BASE_URL = 'https://backenplanilla-production.up.railway.app/';
  private readonly USUARIO_URL = `${this.BASE_URL}/UsuarioServicio`;

  readonly perPage = 8;
  readonly COLORS = ['av-red', 'av-green', 'av-blue', 'av-amber', 'av-violet', 'av-teal'];

  usuarios: Usuario[] = [];

  // ── Modales ──
  showFormModal   = false;
  showDeleteModal = false;
  showViewModal   = false;   // ✅ modal ver perfil
  showPass        = false;

  // ✅ Usuario que se muestra en el modal de perfil
  viewedUsuario: Usuario = {
    idUsuario: 0,
    Nombre: '',
    Apellidos: '',
    Estado: 1,
    FechaCreacion: '',
    telefono: '',
    correo: '',
    idRol: 4,
    IdDepartamento: 1,
    Token: '',
  };

  // ── Filtros ──
  searchQuery  = '';
  estadoFilter = '';
  rolFilter    = '';
  deptFilter   = '';
  rolActivo    = 0;

  // ── Paginación ──
  currentPage = 1;

  // ── Form ──
  editId: number | null = null;
  form: Partial<Usuario> = {};

  // ── Eliminar ──
  deleteTargetId: number | null = null;
  deleteDesc = '';

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  ngOnInit(): void {
    this.getUsuarios();
  }

  getUsuarios(): void {
    this.http.get<Usuario[]>(`${this.USUARIO_URL}/listarUsuarios`, { headers: this.headers }).subscribe({
      next: (data) => {
        this.usuarios = (data || []).map((u: any) => ({
          ...u,
          idUsuario:      Number(u.idUsuario ?? u.IdUsuario),
          Nombre:         u.Nombre ?? '',
          Apellidos:      u.Apellidos ?? '',
          Estado:         Number(u.Estado ?? 1),
          FechaCreacion:  this.limpiarFecha(u.FechaCreacion),
          telefono:       u.telefono ?? u.Telefono ?? '',
          correo:         u.correo ?? u.Correo ?? '',
          idRol:          Number(u.idRol ?? u.IdRol ?? 4),
          IdDepartamento: Number(u.IdDepartamento ?? u.idDepartamento ?? 1),
          Token:          u.Token ?? '',
        }));

        this.currentPage = 1;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al obtener usuarios:', err);
        this.usuarios = [];
      },
    });
  }

  private limpiarFecha(fecha: any): string {
    if (!fecha) return '';
    return String(fecha).split('T')[0].split(' ')[0];
  }

  // ── Computed ──
  get filteredUsuarios(): Usuario[] {
    const q = this.searchQuery.toLowerCase().trim();

    return this.usuarios.filter((u) => {
      const texto = `
        ${u.idUsuario}
        ${u.Nombre}
        ${u.Apellidos}
        ${u.correo}
        ${u.telefono}
        ${this.rolNombre(u.idRol)}
        ${this.deptNombre(u.IdDepartamento)}
      `.toLowerCase();

      const estadoOk = this.estadoFilter === '' || Number(u.Estado) === Number(this.estadoFilter);
      const rolOk    = this.rolFilter    === '' || Number(u.idRol) === Number(this.rolFilter);
      const deptOk   = this.deptFilter   === '' || Number(u.IdDepartamento) === Number(this.deptFilter);

      return (!q || texto.includes(q)) && estadoOk && rolOk && deptOk;
    });
  }

  get pageSlice(): Usuario[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredUsuarios.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const count = Math.ceil(this.filteredUsuarios.length / this.perPage) || 1;
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  get visiblePages(): number[] {
    const total = this.totalPages.length;
    if (total <= 5) return this.totalPages;

    let start = Math.max(1, this.currentPage - 2);
    let end   = Math.min(total, this.currentPage + 2);

    if (this.currentPage <= 3)        { start = 1;         end = 5; }
    if (this.currentPage >= total - 2) { start = total - 4; end = total; }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ── Helpers ──
  min(a: number, b: number): number { return Math.min(a, b); }

  initials(u: Usuario): string {
    return ((u.Nombre?.[0] ?? '') + (u.Apellidos?.[0] ?? '')).toUpperCase();
  }

  colorFor(id: number): string {
    const safeId = Number(id || 1);
    return this.COLORS[(safeId - 1) % this.COLORS.length];
  }

  fmtDate(d: string): string {
    if (!d) return '—';
    const fecha = this.limpiarFecha(d);
    const [y, m, day] = fecha.split('-');
    if (!y || !m || !day) return fecha;
    return `${day}/${m}/${y}`;
  }

  rolNombre(id: number): string  { return ROLES[Number(id)] ?? `Rol #${id}`; }
  deptNombre(id: number): string { return DEPARTAMENTOS[Number(id)] ?? `Depto. #${id}`; }

  rolClass(id: number): string {
    const map: Record<number, string> = { 1: 'rol-admin', 2: 'rol-rrhh', 3: 'rol-sup', 4: 'rol-emp' };
    return map[Number(id)] ?? 'rol-emp';
  }

  estadoClass(e: number): string  { return Number(e) === 1 ? 'status-activo' : 'status-inactivo'; }
  estadoTexto(e: number): string  { return Number(e) === 1 ? 'Activo' : 'Inactivo'; }

  countByEstado(e: number): number { return this.usuarios.filter(u => Number(u.Estado) === Number(e)).length; }
  countAdmins(): number            { return this.usuarios.filter(u => Number(u.idRol) === 1).length; }

  rolesSummary(): RolSummary[] {
    const iconMap: Record<number, { cls: string; svg: string }> = {
      1: { cls: 'icon-admin', svg: '<path d="M8 2a3 3 0 100 6 3 3 0 000-6zM3 12.5C3 10.015 5.239 9 8 9s5 1.015 5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 6l1 1 2-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' },
      2: { cls: 'icon-rrhh', svg: '<rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/>' },
      3: { cls: 'icon-sup',  svg: '<circle cx="8" cy="5" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M3 13c0-2.761 2.239-4 5-4s5 1.239 5 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M11 3l1 1 2-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>' },
      4: { cls: 'icon-emp',  svg: '<circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' },
    };

    return [1, 2, 3, 4].map(idRol => {
      const users = this.usuarios.filter(u => Number(u.idRol) === idRol);
      return {
        idRol,
        nombre:    ROLES[idRol],
        total:     users.length,
        activos:   users.filter(u => Number(u.Estado) === 1).length,
        iconClass: iconMap[idRol].cls,
        iconSvg:   iconMap[idRol].svg,
      };
    });
  }

  // ── Filtro / paginación ──
  setRol(idRol: number): void {
    if (this.rolActivo === idRol) {
      this.rolActivo = 0;
      this.rolFilter = '';
    } else {
      this.rolActivo = idRol;
      this.rolFilter = String(idRol);
    }
    this.filterTable();
  }

  filterTable(): void { this.currentPage = 1; }

  changePage(d: number): void {
    const max = this.totalPages.length;
    this.currentPage = Math.max(1, Math.min(max, this.currentPage + d));
  }

  goPage(n: number): void { this.currentPage = n; }

  // ── CRUD ──
  openModal(mode: 'create' | 'edit', id?: number): void {
    this.showPass = false;

    if (mode === 'create') {
      this.editId = null;
      this.form = {
        Nombre: '', Apellidos: '', correo: '', telefono: '', Clave: '',
        Estado: 1, FechaCreacion: new Date().toISOString().slice(0, 10),
        idRol: 4, IdDepartamento: 1, Token: '',
      };
    } else {
      const usuario = this.usuarios.find(x => Number(x.idUsuario) === Number(id));
      if (!usuario) return;
      this.editId = usuario.idUsuario;
      this.form = {
        ...usuario,
        Clave:          '',
        FechaCreacion:  this.limpiarFecha(usuario.FechaCreacion),
        idRol:          Number(usuario.idRol),
        IdDepartamento: Number(usuario.IdDepartamento),
      };
    }

    this.showFormModal = true;
  }

  // ✅ Abre el modal de ver perfil con el usuario seleccionado
  viewInAnotherPage(u: Usuario): void {
    this.viewedUsuario = { ...u };
    this.showViewModal = true;
  }

  saveUsuario(): void {
    if (!this.form.Nombre?.trim())    { alert('El nombre es requerido.');    return; }
    if (!this.form.Apellidos?.trim()) { alert('Los apellidos son requeridos.'); return; }
    if (!this.form.correo?.trim())    { alert('El correo es requerido.');    return; }

    if (!this.editId && !this.form.Clave?.trim()) {
      alert('La contraseña es requerida para crear el usuario.');
      return;
    }

    if (this.editId && !this.form.Clave?.trim()) {
      alert('Para actualizar este usuario, ingresa una contraseña. El backend actual requiere Clave.');
      return;
    }

    const payload = {
      idUsuario:       this.editId ?? undefined,
      Nombre:          this.form.Nombre,
      Apellidos:       this.form.Apellidos,
      Estado:          Number(this.form.Estado ?? 1),
      FechaCreacion:   this.form.FechaCreacion || new Date().toISOString().slice(0, 10),
      Clave:           this.form.Clave,
      telefono:        this.form.telefono || '',
      correo:          this.form.correo,
      idRol:           Number(this.form.idRol ?? 4),
      idDepartamento:  Number(this.form.IdDepartamento ?? 1),
    };

    if (this.editId) {
      this.http.put(`${this.USUARIO_URL}/actualizar`, payload, { headers: this.headers }).subscribe({
        next: () => { this.getUsuarios(); this.showFormModal = false; },
        error: (err) => { console.error('Error al actualizar usuario:', err); alert('No se pudo actualizar el usuario.'); },
      });
    } else {
      this.http.post(`${this.USUARIO_URL}/insertar`, payload, { headers: this.headers }).subscribe({
        next: () => { this.getUsuarios(); this.showFormModal = false; },
        error: (err) => { console.error('Error al crear usuario:', err); alert('No se pudo crear el usuario.'); },
      });
    }
  }

  askDelete(id: number): void {
    const usuario = this.usuarios.find(x => Number(x.idUsuario) === Number(id));
    if (!usuario) return;
    this.deleteTargetId = id;
    this.deleteDesc = `Estás a punto de eliminar al usuario ${usuario.Nombre} ${usuario.Apellidos} (${usuario.correo}). Esta acción no se puede deshacer.`;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deleteTargetId) return;
    this.http.delete(`${this.USUARIO_URL}/eliminar?id=${this.deleteTargetId}`, { headers: this.headers }).subscribe({
      next: () => { this.getUsuarios(); this.deleteTargetId = null; this.showDeleteModal = false; },
      error: (err) => { console.error('Error al eliminar usuario:', err); alert('No se pudo eliminar el usuario. Puede tener datos relacionados.'); },
    });
  }

  // ✅ Ahora acepta 'view' además de 'form' y 'delete'
  onOverlayClick(event: MouseEvent, modal: 'form' | 'delete' | 'view'): void {
    if (event.target === event.currentTarget) {
      if (modal === 'form')   this.showFormModal   = false;
      if (modal === 'delete') this.showDeleteModal = false;
      if (modal === 'view')   this.showViewModal   = false;
    }
  }
}