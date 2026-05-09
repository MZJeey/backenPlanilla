const { createClient } = require("@supabase/supabase-js");

// ─── Cliente Supabase ────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// console.log("URL:", process.env.SUPABASE_URL);
// console.log("KEY:", process.env.SUPABASE_ANON_KEY);
// ─── Mapa de llaves primarias por tabla ─────────────────────────────────────
// Equivalente al obtenerLlavePrimaria() de MySQL, pero estático.
// Agrega aquí todas tus tablas con su PK correspondiente.
const LLAVES_PRIMARIAS = {
  aguinaldos: "id_aguinaldo",
  auditoria: "id_auditoria",
  contratos: "id_contrato",
  controlasistencia: "id_control_asistencia",
  controlhorarios: "id_control",
  deducciones: "id_deducciones",
  departamentos: "id_departamento",
  detalleplanilla: "id_detalle_planilla",
  empleados: "id_empleado",
  feriados: "id_feriado",
  historialsalarios: "id_historial_salarios",
  licencias: "id_licencia",
  pagos: "id_pago",
  periodoplanilla: "id_periodo_planilla",
  planillas: "id_planillas",
  prestamos: "id_prestamo",
  puestos: "id_puesto",
  roles: "id_rol",
  tipoingresos: "id_tipo_ingresos",
  usuarios: "id_usuario",
  vacaciones: "id_vacacion",
};

// ─── Registrar auditoría ─────────────────────────────────────────────────────
async function registrarAuditoria(
  tabla,
  accion,
  registroId,
  datosAnteriores,
  datosNuevos,
) {
  try {
    if (!tabla || tabla === "auditoria") return;

    await supabase.from("auditoria").insert({
      tabla_afectada: tabla,
      accion: accion,
      usuario: "sistema",
      registro_id: registroId ? String(registroId) : null,
      datos_anteriores: datosAnteriores
        ? JSON.stringify(datosAnteriores)
        : null,
      datos_nuevos: datosNuevos ? JSON.stringify(datosNuevos) : null,
    });
  } catch (error) {
    console.error("Error auditoría:", error.message);
  }
}

// ─── ejecutarConsulta ────────────────────────────────────────────────────────
// Mantiene la misma firma que antes: ejecutarConsulta(sql, parametros)
// Detecta la operación y la traduce al SDK de Supabase automáticamente.
//
// IMPORTANTE: Esta función cubre SELECT, INSERT, UPDATE y DELETE simples.
// Para consultas complejas (JOINs, funciones, etc.) usá ejecutarSQL() más abajo.
async function ejecutarConsulta(sql, parametros = []) {
  const sqlNorm = sql.replace(/\s+/g, " ").trim();
  const sqlUpper = sqlNorm.toUpperCase();

  try {
    // ── SELECT ───────────────────────────────────────────────────────────────
    if (sqlUpper.startsWith("SELECT")) {
      // Para SELECTs complejos usá ejecutarSQL()
      const { data, error } = await ejecutarSQL(sql, parametros);
      if (error) throw error;
      return data;
    }

    // ── INSERT ───────────────────────────────────────────────────────────────
    if (sqlUpper.startsWith("INSERT")) {
      const matchTabla = sqlNorm.match(/INSERT\s+INTO\s+`?(\w+)`?/i);
      const tabla = matchTabla ? matchTabla[1] : null;

      // Extraer columnas y valores del SQL
      const matchCols = sqlNorm.match(/\(([^)]+)\)\s+VALUES\s*\(([^)]+)\)/i);
      if (!matchCols) throw new Error("INSERT no tiene formato estándar");

      const columnas = matchCols[1]
        .split(",")
        .map((c) => c.trim().replace(/`/g, ""));
      const objeto = {};
      columnas.forEach((col, i) => {
        objeto[col] = parametros[i] !== undefined ? parametros[i] : null;
      });

      const { data, error } = await supabase
        .from(tabla)
        .insert(objeto)
        .select();

      if (error) throw error;

      const pk = LLAVES_PRIMARIAS[tabla];
      const registroId = data?.[0]?.[pk];

      await registrarAuditoria(tabla, "INSERT", registroId, null, data?.[0]);

      return { insertId: registroId, rows: data };
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────
    if (sqlUpper.startsWith("UPDATE")) {
      const matchTabla = sqlNorm.match(/UPDATE\s+`?(\w+)`?/i);
      const tabla = matchTabla ? matchTabla[1] : null;
      const pk = tabla ? LLAVES_PRIMARIAS[tabla] : null;

      // El último parámetro es el ID (WHERE id = ?)
      const registroId = parametros[parametros.length - 1];

      // Obtener datos anteriores
      let datosAnteriores = null;
      if (pk && registroId) {
        const { data: prev } = await supabase
          .from(tabla)
          .select("*")
          .eq(pk, registroId)
          .single();
        datosAnteriores = prev;
      }

      // Extraer columnas SET del SQL
      const matchSet = sqlNorm.match(/SET\s+(.+?)\s+WHERE/i);
      if (!matchSet)
        throw new Error("UPDATE no tiene formato SET ... WHERE estándar");

      const setCols = matchSet[1].split(",").map((s) => s.trim());
      const objeto = {};
      setCols.forEach((asignacion, i) => {
        const col = asignacion.split("=")[0].trim().replace(/`/g, "");
        objeto[col] = parametros[i];
      });

      const { data, error } = await supabase
        .from(tabla)
        .update(objeto)
        .eq(pk, registroId)
        .select();

      if (error) throw error;

      await registrarAuditoria(
        tabla,
        "UPDATE",
        registroId,
        datosAnteriores,
        data?.[0],
      );

      return { affectedRows: data?.length ?? 0, rows: data };
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (sqlUpper.startsWith("DELETE")) {
      const matchTabla = sqlNorm.match(/DELETE\s+FROM\s+`?(\w+)`?/i);
      const tabla = matchTabla ? matchTabla[1] : null;
      const pk = tabla ? LLAVES_PRIMARIAS[tabla] : null;

      const registroId = parametros[0];

      // Obtener datos anteriores
      let datosAnteriores = null;
      if (pk && registroId) {
        const { data: prev } = await supabase
          .from(tabla)
          .select("*")
          .eq(pk, registroId)
          .single();
        datosAnteriores = prev;
      }

      const { data, error } = await supabase
        .from(tabla)
        .delete()
        .eq(pk, registroId)
        .select();

      if (error) throw error;

      await registrarAuditoria(
        tabla,
        "DELETE",
        registroId,
        datosAnteriores,
        null,
      );

      return { affectedRows: data?.length ?? 0 };
    }

    throw new Error(`Operación SQL no soportada: ${sqlUpper.split(" ")[0]}`);
  } catch (error) {
    console.error("Error consulta:", error.message);
    throw error;
  }
}

// ─── ejecutarSQL ─────────────────────────────────────────────────────────────
// Para consultas complejas: JOINs, funciones, procedimientos, etc.
// Usa el endpoint de Supabase que acepta SQL crudo (requiere service_role key
// o una función RPC en Supabase para queries desde anon).
//
// RECOMENDACIÓN: Para JOINs complejos, creá una función (RPC) en Supabase:
//   CREATE OR REPLACE FUNCTION get_planilla_detalle(p_id INT)
//   RETURNS TABLE(...) AS $$ ... $$ LANGUAGE sql;
// Y llamala con: supabase.rpc('get_planilla_detalle', { p_id: 5 })
async function ejecutarSQL(sql, parametros = []) {
  // Reemplaza los ? por $1, $2... para PostgreSQL
  let sqlPg = sql;
  let i = 1;
  sqlPg = sqlPg.replace(/\?/g, () => `$${i++}`);

  const { data, error } = await supabase.rpc("ejecutar_sql_raw", {
    query: sqlPg,
    params: parametros,
  });

  return { data, error };
}

module.exports = { supabase, ejecutarConsulta, ejecutarSQL, LLAVES_PRIMARIAS };
