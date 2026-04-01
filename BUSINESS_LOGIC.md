# BUSINESS_LOGIC.md - Analizador de Facturación Médica

> Generado por SaaS Factory | Fecha: 2026-03-31

## 1. Problema de Negocio
**Dolor:** La gerente de la unidad médica realiza el cruce manual de datos de tratamientos y pacientes usando dos archivos Excel diferentes (tratamientos y facturación). El proceso es tedioso, lento y propenso a errores humanos (omisión de tratamientos, cobros duplicados).
**Costo actual:** Demoras a la hora de facturar a las diferentes entidades, lo que retrasa los pagos. Adicionalmente, existen pérdidas de dinero por errores en el cálculo o tratamientos pasados por alto en el cruce manual.

## 2. Solución
**Propuesta de valor:** Un analizador de Excel web que automatice el cruce de datos, elimine duplicados utilizando el "Número de Factura" y genere reportes automáticos de facturación, además de mostrar estadísticas detalladas de gestión.

**Flujo principal (Happy Path):**
1. La Gerente sube los dos archivos Excel descargados de la base de datos de la unidad médica.
2. El sistema lee, limpia y cruza los tratamientos por entidad y médico, verificando que no se repitan los números de facturación para el mismo paciente.
3. El usuario filtra y selecciona mes, día y/o la entidad a facturar y elige el tipo de informe.
4. El sistema presenta Dashboards que muestran visualmente métricas clave y exporta un consolidado final perfecto (Cuentas de Cobro) y la relación detallada entre: Médico -> Paciente -> Tratamientos.

## 3. Usuario Objetivo
**Rol:** Gerente / Dueña de la Unidad Médica.
**Contexto:** Un rol de nivel gerencial (C-Level) que necesita rapidez y total precisión en el área de facturación. Requiere una aplicación con una apariencia y experiencia extremadamente profesional ("Premium").

## 4. Arquitectura de Datos
**Input:**
- Dos archivos Excel (bases de datos provenientes del software actual).
  - Excel 1 (Referencia): Detalla tratamientos, pacientes, entidades.
  - Excel 2 (Referencia): Detalla consultas previas o datos afines repetidos.
- Filtros seleccionados en la UI (Fechas y Entidades).

**Output:**
- Dashboards interactivos: Listado y totales de pacientes atendidos por entidad (mes, día, etc).
- Reportes precisos: Cuántos tratamientos hizo cada médico a partir de las consultas.
- Consolidado final de cuentas de cobro para facturación.

**Storage (Supabase tables sugeridas):**
- `medical_records`: Tabla unificada (id, patient_id, doctor_id, entity_id, treatment_code, invoice_number, date, created_at).
- `doctors`: (id, name).
- `entities`: (id, name).
- `patients`: (id, name, document_id).

## 5. KPI de Exito
**Metrica principal:** Reducción drástica del tiempo para generar facturación y exactitud matemática en las deduplicaciones (0% de tratamientos duplicados cobrados doble en los consolidados y 0 tratamientos pasados por alto).

## 6. Especificacion Tecnica (Para el Agente)

### Features a Implementar (Feature-First)
```
src/features/
├── auth/           # Login exclusivo de gerencia (Supabase)
├── data-parser/    # Lógica central: Subida y parseo de Excel, cruce y limpieza (Deduplicación por Número de Factura)
├── reports/        # Dashboards, estadísticas, relaciones paciente/médico y exportación
```

### Stack Confirmado
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind 3.4 + shadcn/ui
- **Backend:** Supabase (Auth + Database + Storage)
- **Validacion:** Zod + PapaParse / XLSX
- **State:** Zustand 
- **MCPs:** Next.js DevTools + Playwright + Supabase

### Proximos Pasos
1. [ ] Setup proyecto base (Next.js + Tailwind)
2. [ ] Configurar proyecto Supabase
3. [ ] Implementar Auth
4. [ ] Implementar Feature `data-parser` (Lógica de los dos Excels y deduplicación)
5. [ ] Implementar Feature `reports` (Dashboards visuales Premium)
6. [ ] Validaciones y Testing E2E
7. [ ] Deploy en Vercel
