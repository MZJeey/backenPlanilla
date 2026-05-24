import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

interface Rol {
  IdRol: number;
  Nombre: string;
  Descripcion: string;
  Estado: number;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class Roles implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  private readonly BASE_URL = 'https://backenplanilla-production.up.railway.app/';
  private readonly ROLES_URL = `${this.BASE_URL}/RolesServicio`;

  readonly perPage = 8;

  showFormModal = false;
  showDeleteModal = false;

  searchQuery = '';
  estadoFilter = '';

  currentPage = 1;

  editId: number | null = null;
  form: Partial<Rol> = {};

  deleteTargetId: number | null = null;
  deleteDesc = '';

  roles: Rol[] = [];

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  readonly ICON_MAP: Record<number, { cls: string; svg: string }> = {
    1: {
      cls: 'icon-admin',
      svg: '<path d="M8 2a3 3 0 100 6 3 3 0 000-6zM3 12.5C3 10.015 5.239 9 8 9s5 1.015 5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 6l1 1 2-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
    },
    2: {
      cls: 'icon-rrhh',
      svg: '<rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/>',
    },
    3: {
      cls: 'icon-sup',
      svg: '<circle cx="8" cy="5" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M3 13c0-2.761 2.239-4 5-4s5 1.239 5 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M11 3l1 1 2-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
    },
    4: {
      cls: 'icon-emp',
      svg: '<circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    },
  };

  defaultIconSvg = '<circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.4"/>';

  ngOnInit(): void {
    this.getRoles();
  }

  getRoles(): void {
    this.http.get<Rol[]>(`${this.ROLES_URL}/listarRoles`, { headers: this.headers }).subscribe({
      next: (data) => {
        this.roles = (data || []).map((r: any) => ({
          IdRol: Number(r.IdRol ?? r.idRol),
          Nombre: r.Nombre ?? '',
          Descripcion: r.Descripcion ?? '',
          Estado: Number(r.Estado ?? 1),
        }));

        this.currentPage = 1;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al obtener roles:', err);
        this.roles = [];
      },
    });
  }

  iconFor(id: number): { cls: string; svg: string } {
    return this.ICON_MAP[Number(id)] ?? { cls: 'icon-emp', svg: this.defaultIconSvg };
  }

  get filteredRoles(): Rol[] {
    const q = this.searchQuery.toLowerCase().trim();

    return this.roles.filter((r) => {
      const txt = `${r.IdRol} ${r.Nombre} ${r.Descripcion}`.toLowerCase();
      const estadoOk = this.estadoFilter === '' || Number(r.Estado) === Number(this.estadoFilter);

      return (!q || txt.includes(q)) && estadoOk;
    });
  }

  get pageSlice(): Rol[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredRoles.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const count = Math.ceil(this.filteredRoles.length / this.perPage) || 1;
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

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  estadoClass(e: number): string {
    return Number(e) === 1 ? 'status-activo' : 'status-inactivo';
  }

  estadoTexto(e: number): string {
    return Number(e) === 1 ? 'Activo' : 'Inactivo';
  }

  countByEstado(e: number): number {
    return this.roles.filter((r) => Number(r.Estado) === Number(e)).length;
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
        Nombre: '',
        Descripcion: '',
        Estado: 1,
      };
    } else {
      const rol = this.roles.find((x) => Number(x.IdRol) === Number(id));
      if (!rol) return;

      this.editId = rol.IdRol;
      this.form = { ...rol };
    }

    this.showFormModal = true;
  }

  saveRol(): void {
    if (!this.form.Nombre?.trim()) {
      alert('El nombre del rol es requerido.');
      return;
    }

    const payload = {
      IdRol: this.editId ?? undefined,
      Nombre: this.form.Nombre,
      Descripcion: this.form.Descripcion || '',
      Estado: Number(this.form.Estado ?? 1),
    };

    if (this.editId) {
      this.http.put(`${this.ROLES_URL}/actualizar`, payload, { headers: this.headers }).subscribe({
        next: () => {
          this.getRoles();
          this.showFormModal = false;
        },
        error: (err) => {
          console.error('Error al actualizar rol:', err);
          alert('No se pudo actualizar el rol.');
        },
      });
    } else {
      this.http.post(`${this.ROLES_URL}/insertar`, payload, { headers: this.headers }).subscribe({
        next: () => {
          this.getRoles();
          this.showFormModal = false;
        },
        error: (err) => {
          console.error('Error al crear rol:', err);
          alert('No se pudo crear el rol.');
        },
      });
    }
  }

  toggleEstado(id: number): void {
    const rol = this.roles.find((x) => Number(x.IdRol) === Number(id));
    if (!rol) return;

    const payload = {
      ...rol,
      Estado: Number(rol.Estado) === 1 ? 0 : 1,
    };

    this.http.put(`${this.ROLES_URL}/actualizar`, payload, { headers: this.headers }).subscribe({
      next: () => this.getRoles(),
      error: (err) => {
        console.error('Error al cambiar estado del rol:', err);
        alert('No se pudo cambiar el estado del rol.');
      },
    });
  }

  viewInAnotherPage(r: Rol): void {
    localStorage.setItem('displayData', JSON.stringify({
      titulo: 'Detalle del rol',
      volver: '/roles',
      datos: {
        ID: `#${r.IdRol}`,
        Rol: r.Nombre,
        Descripción: r.Descripcion || '—',
        Estado: this.estadoTexto(r.Estado),
      }
    }));

    this.router.navigate(['/ver-datos']);
  }

  askDelete(id: number): void {
    const rol = this.roles.find((x) => Number(x.IdRol) === Number(id));
    if (!rol) return;

    this.deleteTargetId = id;
    this.deleteDesc = `Estás a punto de eliminar el rol "${rol.Nombre}". Esta acción no se puede deshacer.`;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deleteTargetId) return;

    this.http.delete(`${this.ROLES_URL}/eliminar?id=${this.deleteTargetId}`, { headers: this.headers }).subscribe({
      next: () => {
        this.getRoles();
        this.deleteTargetId = null;
        this.showDeleteModal = false;
      },
      error: (err) => {
        console.error('Error al eliminar rol:', err);
        alert('No se pudo eliminar el rol. Puede estar relacionado con usuarios.');
      },
    });
  }

  onOverlayClick(event: MouseEvent, modal: 'form' | 'delete'): void {
    if (event.target === event.currentTarget) {
      if (modal === 'form') this.showFormModal = false;
      if (modal === 'delete') this.showDeleteModal = false;
    }
  }
}