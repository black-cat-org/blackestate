# Modulo de Analiticas y Reporteria - Design Doc

**Fecha:** 2026-02-25
**Estado:** Aprobado

## Resumen

Modulo de analiticas completo para el agente inmobiliario. Nueva seccion en el sidebar (`/dashboard/analytics`) con 5 tabs: Resumen, Leads & Conversiones, Propiedades & Mercado, Financiero, Bot & Engagement. Incluye exportacion a PDF/Excel. Disenado para agente independiente o en equipo.

## Estructura General

- **Ruta:** `/dashboard/analytics`
- **Sidebar:** Icono `BarChart3`, entre "Mi Bot" y "Configuracion"
- **Filtro global:** Rango de fechas (7d, 30d, 90d, Este mes, Este año, Personalizado)
- **Exportar:** Dropdown PDF / Excel por tab activo
- **Navegacion:** 5 tabs con componente `Tabs` de shadcn

## Tab 1: Resumen

Vista ejecutiva con indicadores principales.

### KPIs (4 stat cards con variacion vs periodo anterior)
- Leads nuevos (count + % cambio)
- Tasa de conversion (% + cambio)
- Valor del pipeline ($, + % cambio)
- Comisiones estimadas ($, + % cambio)

### Charts
- **Tendencia de leads:** Line chart, leads nuevos vs periodo anterior
- **Conversiones por mes:** Bar chart, cerrados vs descartados por mes
- **Top fuentes de leads:** Donut chart con % por fuente
- **Alertas y highlights:** Panel con items accionables (leads sin contactar >48hs, citas sin confirmar, propiedades sin leads)

## Tab 2: Leads & Conversiones

Analisis del ciclo de vida de leads.

### KPIs
- Total leads
- Tiempo promedio de cierre (dias)
- Tasa de cierre (%)
- Costo por lead estimado ($)

### Charts
- **Embudo de conversion:** Funnel horizontal (Nuevo -> Contactado -> Interesado -> Cerrado | Descartado) con % entre etapas
- **Leads por fuente:** Stacked bar chart por mes, apilado por fuente
- **Conversion por fuente:** Bar chart comparativo (% cierre por canal)
- **Tiempo de respuesta:** Gauge/indicador con promedio vs meta + distribucion (<5min, 5-30min, >30min)
- **Leads por tipo de propiedad buscada:** Horizontal bar chart

## Tab 3: Propiedades & Mercado

Inventario y comparativas de mercado.

### KPIs
- Propiedades activas (+ nuevas)
- Dias promedio en mercado
- Precio promedio (USD/venta)
- Tasa de ocupacion (%)

### Charts
- **Estado del inventario:** Stacked horizontal bar 100% (activas, pausadas, vendidas, alquiladas, borrador)
- **Precio promedio por zona:** Bar chart horizontal
- **Distribucion por tipo:** Donut chart (casa, depto, terreno, comercial, oficina)
- **Precio/m2 por zona:** Bar chart comparativo (venta y alquiler)
- **Propiedades con mas interaccion:** Tabla ranking (leads, visitas)
- **Tendencia de precios por zona:** Multi-line chart (ultimos 6 meses)

## Tab 4: Financiero

Comisiones, ingresos y proyecciones.

### KPIs
- Comisiones cobradas ($ + % cambio)
- Ingreso proyectado ($ este mes)
- Valor del pipeline ($ + cantidad de ops)
- Comision promedio por operacion ($)

### Charts
- **Ingresos por mes:** Bar chart + linea de meta mensual
- **Pipeline por etapa:** Funnel con valores $ y % probabilidad de cierre
- **Comisiones por fuente:** Bar chart ($ por canal)
- **Comisiones por tipo de operacion:** Donut chart (venta, alquiler, temporal)
- **Top operaciones:** Tabla ranking (propiedad, tipo op, valor, comision)

## Tab 5: Bot & Engagement

Rendimiento del bot y engagement.

### KPIs
- Mensajes enviados (este mes)
- Tasa de respuesta (%)
- Citas agendadas por bot
- Propiedades enviadas por bot

### Charts
- **Actividad del bot por dia:** Area chart (mensajes + props enviadas)
- **Funnel del bot:** Funnel vertical (enviadas -> vistas -> interes -> cita agendada) con %
- **Efectividad de props enviadas:** Stacked bar 100% por propiedad
- **Horarios de mayor engagement:** Heatmap semanal (dia x hora)
- **Citas por resultado:** Donut chart (completadas, confirmadas, canceladas, pendientes) + tasa completadas/agendadas

## Stack Tecnico

- **Charts:** Recharts (ya instalado) con ChartContainer wrapper existente
- **Componentes:** shadcn Tabs, Card, Badge, Table
- **Exportacion PDF:** jspdf (ya instalado)
- **Exportacion Excel:** A definir (xlsx o similar)
- **Datos:** Mock data extendiendo funciones existentes en `lib/data/dashboard.ts`
- **Colores:** HSL format, siguiendo paleta existente del proyecto

## Datos Mock Necesarios

Extender los datos existentes con:
- Timestamps historicos para tendencias (6 meses)
- Datos de precios por zona
- Metricas financieras (comisiones, % por tipo de operacion)
- Metricas de tiempo de respuesta
- Datos de engagement por hora/dia
- Pipeline con etapas y probabilidades
