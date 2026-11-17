# ZProject — Especificaciones y guía del proyecto

> Documento generado a partir de la revisión de:
> `C:\Users\kevin\Documents\Proyectos\zproject`
> (código backend/frontend + documentación de análisis y diseño en `docs\Documentacion`).
>
> Repositorio Git: rama `main`, último commit `208e301 fix final con mas pruebas`.
> Estado del árbol de trabajo al revisar: limpio.

---

## 1. Resumen ejecutivo

**ZProject** es un sistema web **de uso interno** para un negocio que ofrece dos servicios:

1. **Impresión 3D** de productos (pedidos con objetos y archivos STL).
2. **Reparación de equipos** (computadoras, celulares, consolas, etc.).

El sistema centraliza lo que hoy se gestiona de forma informal por WhatsApp: pedidos, clientes,
estados, inventario, garantías, pagos/abonos y notificaciones por correo.

- **No tiene portal para clientes.** Los clientes solo reciben correos automáticos.
- El acceso es con **usuario, contraseña, roles y permisos**; el servidor valida el permiso en cada operación.
- El objetivo es tener control del ciclo completo: registro → seguimiento → finalización → entrega → pago → garantía.

### Problema actual (según el SRS)

- No hay registro centralizado; todo queda disperso en chats de WhatsApp.
- No hay seguimiento estructurado del estado de los pedidos.
- No hay historial organizado por cliente.
- La prioridad se decide de memoria.
- No existen reportes ni visibilidad de la carga de trabajo pendiente.

---

## 2. Alcance

### Incluido

- Gestión de **clientes** (crear, consultar, modificar, eliminar lógicamente, buscar por nombre).
- Gestión de **pedidos de impresión 3D**:
  - objetos del pedido (nombre, descripción),
  - archivo **STL opcional** por objeto,
  - estados, monto total, fecha estimada y fecha de entrega,
  - consumo de material en gramos al finalizar.
- Gestión de **reparaciones**:
  - equipo (tipo, marca, modelo, número de serie),
  - falla reportada, diagnóstico con costo, trabajo realizado y monto,
  - repuestos usados (unidades) al finalizar,
  - estados y fechas.
- **Garantías** ligadas a reparaciones (inicio, vencimiento, condiciones).
- **Pagos/abonos** por pedido (efectivo, tarjeta, transferencia o SINPE), con saldo pendiente,
  historial y cancelación lógica.
- **Inventario**:
  - materiales de impresión 3D (tipo, color, diámetro, stock en gramos),
  - repuestos (unidades, original o no, número de parte),
  - herramientas (cantidad y estado).
- **Notificación por correo** al cliente cuando un pedido o reparación queda finalizado.
- **Seguridad**: login, JWT, bcrypt, roles, permisos por módulo/acción, cambio y restablecimiento de contraseña.

### Fuera de alcance

- Portal o app para que el cliente consulte su pedido.
- Integración con WhatsApp.
- Facturación electrónica / pasarela de pagos.
- Automatización de respaldos (el SRS pide respaldos manuales/periódicos).
- Servidor espejo o alta disponibilidad.

---

## 3. Actores y roles

| Actor | Descripción |
|---|---|
| **Administrador** | Crea usuarios, roles y permisos; puede administrar todos los módulos. |
| **Usuario interno / técnico / diseñador** | Accede solo a los módulos y acciones que su rol permita. |

Reglas de seguridad importantes:

- El **seed** crea el rol `Administrador` con **todos** los permisos y el usuario `admin`.
- La contraseña de `admin` se pide de forma interactiva al ejecutar el seed.
- Un administrador **no puede**:
  - desactivarse a sí mismo,
  - cambiarse su propio rol,
  - quitarle a su propio rol los permisos `auth:manageUsers` y `auth:manageRoles`.
- Contraseñas: mínimo 8, máximo 72 caracteres, guardadas con **bcrypt**.
- Sesión: **JWT HS256**, expira a los **30 minutos** (configurable con `accessTokenMinutes`).
- Login con credenciales incorrectas devuelve el mismo mensaje para usuario o contraseña,
  y un usuario inactivo no puede iniciar sesión.

---

## 4. Stack tecnológico

### Backend

| Elemento | Tecnología |
|---|---|
| Lenguaje | Python 3 |
| Framework | FastAPI 0.162 |
| ORM | SQLAlchemy 2.1 |
| Validación | Pydantic 2.14 / pydantic-settings |
| Base de datos | MySQL (PyMySQL); SQLite en pruebas |
| Autenticación | PyJWT + bcrypt |
| Correo | SMTP con STARTTLS (`smtplib`) |
| Servidor | Uvicorn |
| Pruebas | pytest + pytest-cov + httpx |

### Frontend

| Elemento | Tecnología |
|---|---|
| Framework | React 19 |
| Lenguaje | TypeScript 5.9 |
| Build | Vite 8 |
| UI | Mantine 9 (`@mantine/core`, `form`, `hooks`, `notifications`) |
| Router | React Router DOM 7 |
| HTTP | Axios |
| Estilos | PostCSS + `postcss-preset-mantine` |
| Pruebas | Vitest (archivo de prueba existe, pero **no está configurado** en `package.json`) |

### Arquitectura

Backend en **capas por módulo**:

```text
router (HTTP + permisos)
  → service (reglas de negocio)
    → repository (acceso a datos)
      → models (SQLAlchemy)
```

Frontend en capas:

```text
pages → services (Axios) → api/client
components (atoms / molecules / organisms / templates)
context (Auth) + hooks (useLoad, useAsyncAction, useItemModal)
utils (formatos, estados, permisos, validadores)
```

- La configuración vive en `.env` (no hardcodeada): base de datos, secreto JWT, SMTP, rutas y límites.
- API REST documentada automáticamente en `/docs`.
- Respuestas y payloads usan **camelCase**.
- No hay migraciones (Alembic); las tablas se crean con `Base.metadata.create_all()` al importar `app.main`.

---

## 5. Estructura del repositorio

```text
zproject/
├── README.md                     # plantilla genérica de GitLab (no describe el proyecto)
├── code/
│   ├── zproject-backend/
│   │   ├── app/
│   │   │   ├── main.py           # FastAPI, CORS, routers, health
│   │   │   ├── models.py         # importa todos los modelos
│   │   │   ├── core/             # config, database, dependencies, security, mailer
│   │   │   └── modules/
│   │   │       ├── auth/         # usuarios, roles, permisos
│   │   │       ├── client/
│   │   │       ├── order/        # clase base + estados + notificaciones (sin router)
│   │   │       ├── printOrder/   # pedidos 3D, objetos, STL, consumo de material
│   │   │       ├── repairs/      # equipos y reparaciones
│   │   │       ├── material/
│   │   │       ├── sparePart/
│   │   │       ├── tool/
│   │   │       ├── warranty/
│   │   │       └── payment/
│   │   ├── scripts/              # createDatabase, seed, resetPassword, testReport
│   │   ├── test/                 # suites pytest
│   │   ├── requirements.txt
│   │   ├── setup.ps1 / run.ps1 / test.ps1
│   │   └── .env.example
│   └── zproject-frontend/
│       ├── src/
│       │   ├── api/              # axios + manejo de errores
│       │   ├── components/       # atoms, molecules, organisms, templates
│       │   ├── context/          # AuthContext / AuthProvider
│       │   ├── hooks/
│       │   ├── pages/            # una página por módulo
│       │   ├── routes/           # navegación y guardas de permiso
│       │   ├── services/         # llamadas a la API
│       │   ├── types/
│       │   └── utils/
│       ├── package.json
│       └── .env.example
├── data/                         # vacío (gitkeep)
└── docs/
    └── Documentacion/
        ├── *.doc                 # SRS: propósito, alcances, RF, RNF, etc.
        ├── Diagramas/*.pdf       # casos de uso, ER, UML
        └── ECUs/*.pdf            # especificaciones de casos de uso
```

---

## 6. Módulos funcionales y API

Prefijo base: `http://127.0.0.1:8000`. Health: `GET /` y `GET /health/db`.

### 6.1 Autenticación, usuarios, roles y permisos

| Método | Ruta | Permiso |
|---|---|---|
| POST | `/auth/login` | público |
| GET | `/auth/me` | autenticado |
| POST | `/auth/changePassword` | autenticado |
| GET | `/auth/permissions` | `auth:manageRoles` |
| GET | `/auth/roles` | `auth:manageRoles` |
| POST | `/auth/roles` | `auth:manageRoles` |
| PUT | `/auth/roles/{roleId}` | `auth:manageRoles` |
| GET | `/auth/users` | `auth:manageUsers` |
| POST | `/auth/users` | `auth:manageUsers` |
| PATCH | `/auth/users/{userId}` | `auth:manageUsers` |
| PUT | `/auth/users/{userId}/password` | `auth:manageUsers` |

- `GET /auth/me` devuelve `id`, `username`, `role` y lista ordenada de `permissions`.
- No existe endpoint de logout en el backend: el frontend elimina el token del `localStorage`.
- No hay endpoint para eliminar roles ni usuarios; usuarios se desactivan (`isActive=false`).

### 6.2 Clientes

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/clients?search=` | `clients:read` |
| GET | `/clients/{clientId}` | `clients:read` |
| POST | `/clients` | `clients:create` |
| PUT | `/clients/{clientId}` | `clients:update` |
| DELETE | `/clients/{clientId}` | `clients:delete` |

- `name` obligatorio (1–100); `phone` (máx. 20) y `email` (máx. 100) opcionales.
- El correo se valida con regex si viene informado.
- Eliminación **lógica** (`isActive=false`), conserva historial.

### 6.3 Pedidos de impresión 3D

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/printOrders` | `print_orders:read` |
| GET | `/printOrders/{printOrderId}` | `print_orders:read` |
| POST | `/printOrders` | `print_orders:create` |
| PUT | `/printOrders/{printOrderId}` | `print_orders:update` |
| PATCH | `/printOrders/{printOrderId}/status` | `print_orders:update` |
| POST | `/printOrders/{printOrderId}/finalize` | `print_orders:finalize` |
| POST | `/printOrders/{printOrderId}/objects` | `print_orders:update` |
| DELETE | `/printOrders/{printOrderId}/objects/{objectId}` | `print_orders:update` |
| POST | `/printOrders/{printOrderId}/objects/{objectId}/stl` | `print_orders:update` |
| GET | `/printOrders/{printOrderId}/objects/{objectId}/stl` | `print_orders:read` |

- Crear pedido exige `clientId` existente, fecha estimada y **al menos un objeto**.
- `totalAmount` es opcional al crear (`>= 0`).
- No se puede modificar un pedido **finalizado** o **cancelado**.
- No se puede eliminar el último objeto del pedido.
- Subida de STL:
  - solo extensión `.stl`,
  - máximo **50 MB** (`maxStlMb`),
  - se guarda en `uploads/stl/{printOrderId}/{objectId}.stl`,
  - descarga con nombre `{nombreObjeto}.stl`.
- Finalizar:
  - recibe `deliveryDate` opcional (si no, hoy) y `materialsUsed[]` (`materialId`, `gramsUsed > 0`),
  - no permite materiales repetidos ni inactivos,
  - valida stock suficiente y lo descuenta,
  - pasa el estado a `finished`,
  - envía correo al cliente; si falla, devuelve `warning` sin deshacer la operación.

### 6.4 Reparaciones

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/repairs?status=&clientId=` | `repairs:read` |
| GET | `/repairs/{repairId}` | `repairs:read` |
| POST | `/repairs` | `repairs:create` |
| PUT | `/repairs/{repairId}` | `repairs:update` |
| POST | `/repairs/{repairId}/diagnosis` | `repairs:update` |
| PATCH | `/repairs/{repairId}/status` | `repairs:update` |
| POST | `/repairs/{repairId}/finalize` | `repairs:finalize` |

- Crear reparación exige cliente existente, equipo y falla reportada.
- La fecha estimada **no puede ser anterior a hoy**.
- Si el equipo tiene número de serie, se impide registrarlo si ya está en otra reparación abierta
  (salvo `allowDuplicate=true`).
- El **diagnóstico** guarda texto y monto.
- No se puede pasar a `inProgress` sin diagnóstico.
- Finalizar exige:
  - diagnóstico registrado,
  - estado `inProgress`,
  - descripción del trabajo no vacía,
  - monto del trabajo definido,
  - repuestos opcionales; valida stock y descuenta unidades.
- Al finalizar guarda `finishedAt`, `deliveryDate` y envía correo (con `warning` si falla).

### 6.5 Garantías

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/warranties?repairOrderId=&fromDate=&toDate=` | `warranties:read` |
| GET | `/warranties/{warrantyId}` | `warranties:read` |
| POST | `/warranties?force=` | `warranties:create` |
| PUT | `/warranties/{warrantyId}?force=` | `warranties:update` |
| DELETE | `/warranties/{warrantyId}` | `warranties:delete` |

- `startDate` no puede ser posterior a `expirationDate`.
- La reparación debe existir.
- Por defecto solo se permite **una garantía vigente** por reparación; `force=true` permite otra.
- Eliminación lógica (`isActive=false`).

### 6.6 Pagos / abonos

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/payments?orderId=&clientId=` | `payments:read` |
| GET | `/payments/orders/{orderId}/balance` | `payments:read` |
| GET | `/payments/{paymentId}` | `payments:read` |
| POST | `/payments` | `payments:create` |
| POST | `/payments/{paymentId}/cancel` | `payments:update` |

- Métodos permitidos: `efectivo`, `tarjeta`, `transferencia`, `sinpe`.
- `amountPaid > 0`, máximo 10 dígitos y 2 decimales.
- No se permiten abonos si:
  - el pedido está cancelado,
  - el total es 0,
  - ya está totalmente pagado,
  - el monto supera el saldo.
- Cancelar un pago **no lo elimina**: marca `isCancelled=true` y `cancelledAt`; deja de contar en el saldo.
- El saldo se calcula:
  - pedidos de impresión: `totalAmount - suma de pagos vigentes`,
  - reparaciones: `(diagnosisAmount + workAmount) - suma de pagos vigentes`.

### 6.7 Materiales

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/materials` | `materials:read` |
| GET | `/materials/{materialId}` | `materials:read` |
| POST | `/materials` | `materials:create` |
| PUT | `/materials/{materialId}` | `materials:update` |
| DELETE | `/materials/{materialId}` | `materials:delete` |
| POST | `/materials/{materialId}/purchase` | `materials:purchase` |

- Campos: `type` (PLA, PETG, ABS…), `color`, `diameter` (> 0), `stockGrams` (>= 0).
- Comprar material suma gramos al stock.
- Finalizar un pedido 3D descuenta gramos.
- Eliminación lógica (`isActive=false`); un material inactivo se trata como inexistente.

### 6.8 Repuestos

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/spareParts` | `spare_parts:read` |
| GET | `/spareParts/{sparePartId}` | `spare_parts:read` |
| POST | `/spareParts` | `spare_parts:create` |
| PUT | `/spareParts/{sparePartId}` | `spare_parts:update` |
| DELETE | `/spareParts/{sparePartId}` | `spare_parts:delete` |

- Campos: `name`, `brand`, `isOriginal`, `partNumber`, `stockUnits` (>= 0).
- El consumo se registra al finalizar una reparación.
- `spare_part_usage` tiene restricción única `(repairOrderId, sparePartId)`; el servicio acumula cantidades.
- Eliminación lógica.

### 6.9 Herramientas

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/tools?statusFilter=` | `tools:read` |
| GET | `/tools/{toolId}` | `tools:read` |
| POST | `/tools?force=` | `tools:create` |
| PUT | `/tools/{toolId}` | `tools:update` |
| DELETE | `/tools/{toolId}` | `tools:delete` |

- Estados: `disponible`, `en_uso`, `mantenimiento`, `baja`.
- Si `quantity == 0`, no puede estar `disponible` ni `en_uso`.
- Nombre duplicado devuelve 409 salvo `force=true` al crear.
- Eliminación lógica.

---

## 7. Modelo de datos

### 7.1 Tablas principales

| Tabla | Propósito | Campos clave |
|---|---|---|
| `permission` | Permisos atómicos | `id`, `code` (único), `description` |
| `role` | Roles | `id`, `name` (único) |
| `role_permission` | N:M rol–permiso | `roleId`, `permissionId` |
| `user` | Usuarios | `id`, `username` (único), `passwordHash`, `isActive`, `roleId` |
| `client` | Clientes | `id`, `name`, `phone`, `email`, `isActive` |
| `client_order` | Pedido base (polimórfico) | `id`, `orderType` (`print`/`repair`), `clientId`, `status`, `createdAt`, `estimatedDeliveryDate`, `deliveryDate`, `totalAmount` |
| `print_order` | Pedido 3D (hereda de `client_order`) | `id` (PK/FK), objetos y usos de material |
| `object_3d` | Objeto de un pedido 3D | `id`, `printOrderId`, `name`, `description`, `stlFilePath` |
| `material_usage` | Material usado en pedido 3D | `printOrderId`, `materialId`, `gramsUsed`; único por pedido+material |
| `repair_order` | Reparación (hereda de `client_order`) | `id` (PK/FK), `deviceId`, `problemDescription`, `diagnosis`, `workDescription`, `diagnosisAmount`, `workAmount`, `finishedAt` |
| `device` | Equipo a reparar | `id`, `clientId`, `type`, `brand`, `model`, `serialNumber` |
| `spare_part` | Repuesto | `id`, `name`, `brand`, `isOriginal`, `partNumber`, `stockUnits`, `isActive` |
| `spare_part_usage` | Repuesto usado en reparación | `repairOrderId`, `sparePartId`, `quantityUsed`; único por reparación+repuesto |
| `warranty` | Garantía | `id`, `repairOrderId`, `startDate`, `expirationDate`, `conditions`, `isActive` |
| `payment` | Abono | `id`, `orderId`, `amountPaid`, `paymentMethod`, `paymentDate`, `note`, `isCancelled`, `cancelledAt`, `createdAt` |
| `material` | Filamento | `id`, `type`, `color`, `diameter`, `stockGrams`, `isActive` |
| `tool` | Herramienta | `id`, `name`, `description`, `quantity`, `status`, `isActive` |

### 7.2 Relaciones relevantes

- `Client 1—N Order` (un cliente tiene muchos pedidos).
- `Order` es la base polimórfica:
  - `orderType="print"` → `PrintOrder`,
  - `orderType="repair"` → `RepairOrder`.
- `PrintOrder 1—N Object3D`.
- `PrintOrder 1—N MaterialUsage` y `Material 1—N MaterialUsage`.
- `RepairOrder 1—1 Device` (el equipo se crea junto con la reparación).
- `RepairOrder 1—N SparePartUsage` y `SparePart 1—N SparePartUsage`.
- `RepairOrder 1—N Warranty`.
- `Order 1—N Payment` (los pagos aplican a ambos tipos de pedido).
- `User N—1 Role N—M Permission`.

### 7.3 Estados

Estados únicos compartidos (`OrderStatus`):

| Valor | Significado |
|---|---|
| `pending` | Pendiente |
| `inProgress` | En proceso |
| `finished` | Finalizado |
| `cancelled` | Cancelado |

Reglas:

- Un pedido `finished` o `cancelled` **no se puede modificar**.
- `PATCH /status` no permite pasar directamente a `finished`; para eso existen los endpoints
  `/finalize` (que además descuentan inventario y notifican).

---

## 8. Permisos

Se generan como `recurso:acción`.

### Recursos

`clients`, `orders`, `print_orders`, `repairs`, `warranties`, `payments`, `materials`,
`spare_parts`, `tools`.

### Acciones CRUD

`create`, `read`, `update`, `delete`.

### Permisos especiales

| Código | Uso |
|---|---|
| `print_orders:finalize` | Finalizar pedido 3D |
| `repairs:finalize` | Finalizar reparación |
| `materials:purchase` | Registrar compra de material |
| `auth:manageUsers` | Administrar usuarios |
| `auth:manageRoles` | Administrar roles y permisos |

> Nota: `orders:*` existe en el seed, pero el módulo `order` no expone router propio;
> se usa como base compartida por pedidos 3D y reparaciones. Es un permiso “general” sin endpoints actuales.

### Verificación

- Backend: `requirePermission("codigo")` en cada endpoint; sin permiso → **403**.
- Frontend: `RequirePermission` protege rutas y `PermissionGate` oculta botones.
- El menú lateral solo muestra módulos permitidos.

---

## 9. Reglas de negocio que debes conocer

### Pedidos (generales)

1. Solo se modifican pedidos `pending` o `inProgress`.
2. No se puede finalizar por cambio de estado; se usa el endpoint de finalización.
3. Cada pedido tiene número único (`id`) y cliente existente.
4. Los pedidos se listan del más reciente al más antiguo.

### Impresión 3D

5. Todo pedido debe tener al menos un objeto.
6. El STL es opcional; si falla la subida, el pedido puede existir sin archivo.
7. El monto total no puede bajarse por debajo de lo ya abonado.
8. Al finalizar:
   - se descuenta material en gramos,
   - todo ocurre en una sola transacción (si falta stock, no se guarda nada),
   - se envía correo; un fallo de correo **no** revierte la finalización.

### Reparaciones

9. No se puede iniciar la reparación sin diagnóstico.
10. No se puede finalizar sin diagnóstico, sin descripción del trabajo o sin monto del trabajo.
11. El número de serie no puede estar en dos reparaciones abiertas (salvo confirmación explícita).
12. Los repuestos se descuentan en unidades al finalizar.
13. El saldo de una reparación usa `diagnosisAmount + workAmount`.

### Pagos

14. No se acepta un abono mayor al saldo pendiente.
15. Los pagos cancelados permanecen en el historial y no cuentan para el saldo.
16. Un pedido sin monto total definido no admite abonos.

### Inventario

17. Materiales, repuestos, herramientas y garantías usan **eliminación lógica**.
18. Un registro inactivo se comporta como inexistente para consultas y operaciones.
19. No se puede consumir más stock del disponible.

### Notificaciones

20. El correo incluye nombre del cliente, número de pedido/reparación, resumen y fecha de entrega.
21. Si el cliente no tiene correo o falla el SMTP, se devuelve un `warning` y la operación queda guardada.
22. Si no hay `SMTP_HOST`, el correo solo se registra en el log (no se envía).

---

## 10. Requerimientos no funcionales (resumen)

### Usabilidad (`RU`)

| ID | Requisito |
|---|---|
| RU-1 | Usuario principal: diseñador/técnico; usable por una segunda persona sin conocimientos técnicos. |
| RU-2 | Contraste mínimo 4.5:1 y texto base 16 px; estados con color y texto. |
| RU-3 | Interfaz en español, términos del negocio, errores claros y accionables. |
| RU-4 | Prueba informal con 1–2 personas y corrección de problemas graves. |
| RU-5 | Persona nueva completa 3 tareas básicas en ≤ 15 min tras demo de 10 min. |
| RU-6 | 10 módulos con el mismo diseño, botones y textos; menú fijo y filtrado por rol. |
| RU-7 | Tareas frecuentes en ≤ 3 clics; crear pedido completo en ≤ 2 min. |
| RU-8 | Validación al guardar, error junto al campo, confirmación antes de eliminar/cancelar. |
| RU-9 | Prioridad computadora (1280 px); en móvil menú colapsado y tablas con scroll propio. |

### Documentación (`RD`)

- RD-1: documentos en español, con glosario, entendibles sin ayuda del equipo.
- RD-2: matriz de trazabilidad RF → CU → clases.
- RD-3: UML 2 en draw.io, numeración consistente, sin contradicciones.
- RD-4: PDF con plantilla uniforme, índice y títulos numerados.
- RD-5: modelo de dominio, ER, diccionario de datos, instalación, arquitectura, seguridad y pruebas.
- RD-6: guía de usuario de 2–3 páginas con capturas.
- RD-7: nombres en inglés; PascalCase/camelCase/snake_case según capa; comentar lógica no evidente.

### Hardware (`RPH`)

- RPH-1: acceso por navegador; instalación solo en el servidor.
- RPH-2/3/4: Windows, macOS y Android; Chrome, Edge, Firefox, Safari actuales.
- RPH-5: servidor físico o nube, migrable solo con `.env`.
- RPH-6/7/8: PC de doble núcleo, 4 GB RAM, pantalla 1280×720, internet 5 Mbps.
- RPH-9/10: móvil desde 360 px; Android 9+ o iOS 14+.
- RPH-11/12: servidor 4 GB RAM, 2 núcleos, Windows 10+, Python 3, Node.js, MySQL, 10 GB libres.
- RPH-13/14: 5 GB iniciales para BD + STL; respaldos manuales/periódicos fuera del servidor.

### Software (`RPS`)

- RPS-1/2: servidor Windows sin librerías exclusivas; acceso por navegador.
- RPS-3/4: datos separados por repositorios; configuración en `.env`.
- RPS-5/6: MySQL + FastAPI + SQLAlchemy + Pydantic + JWT + Swagger en `/docs`.
- RPS-7/8: React + TypeScript + Vite + Mantine, responsive; navegadores actuales.
- RPS-9: Git en GitLab UCR.
- RPS-10: SMTP con STARTTLS configurable.
- RPS-11: STL en servidor, `.stl`, máximo 50 MB.
- RPS-12: draw.io y PDF; pytest y Vitest.
- RPS-13: sin sistemas legados.

### Desempeño (`RDE`)

- RDE-1: funciona con 4 GB RAM y ≤ 5 GB de disco el primer año.
- RDE-2: consultas/listados ≤ 3 s con hasta 1000 registros.
- RDE-3: registrar/finalizar ≤ 5 s (sin correo); correo ≤ 5 s; STL de 50 MB ≤ 2 min con 5 Mbps.
- RDE-4: cero defectos críticos al entregar; ≤ 1 defecto menor por mes.
- RDE-5: recuperación desde respaldo; sin servidor espejo.
- RDE-6: si falla el correo, se guarda y se avisa; errores claros y formulario conserva datos.
- RDE-7: al menos 5 sesiones simultáneas sin degradar más de 20 %.

### Robustez (`RR`)

- RR-1: máximo 1 caída mensual en horario de uso.
- RR-2: ninguna falla pierde datos ya guardados; falla grave corregida en ≤ 1 día.
- RR-3: fallo de correo no bloquea; fallo de STL no bloquea (archivo opcional).
- RR-4: restauración ≤ 2 h desde la última copia.
- RR-5: respaldos diarios recomendados; pérdida máxima de 1 día; probar restauración.
- RR-6: reinicio simple tras corte; finalización e inventario en una sola transacción.
- RR-7: no se cae ante entradas inválidas; valida frontend y servidor.

### Calidad (`RC`)

- RC-1: pytest para lógica principal, un solo comando, reporte de evidencia y cobertura.
- RC-2: pruebas de integración de flujos completos + prueba manual de pedido y abono.
- RC-3: aceptación de cada CU de prioridad alta con el diseñador.
- RC-4: lista de defectos con estado y gravedad; sin críticos abiertos.
- RC-5: revisión por otro integrante antes de integrar.
- RC-6: bcrypt, token de 30 min, permiso verificado en cada operación.
- RC-7: montos con 2 decimales; saldo = total − pagos vigentes.
- RC-8: llaves foráneas; eliminación lógica de registros principales.
- RC-9: fechas de creación, finalización y cancelación registradas.

### Modificabilidad y reutilización (`RMR`)

- Capas separadas backend/frontend.
- Módulos por funcionalidad.
- Tipo/color/diámetro como datos; estados centralizados en `OrderStatus`.
- Configuración en `.env`; lógica compartida (correo, seguridad, estados).
- Componentes reutilizables: `DataTable`, modales, `ConfirmModal`, notificaciones, hooks.

### Seguridad (`RS`)

- RS-1: login obligatorio; mensaje genérico; usuario inactivo bloqueado.
- RS-2: bcrypt, 8–72 caracteres.
- RS-3: token de 30 min; logout manual.
- RS-4: cambiar contraseña exige la actual y que la nueva sea distinta.
- RS-5: roles y permisos dinámicos; todo rol debe tener al menos un permiso.
- RS-6: validación en servidor y frontend; SQLAlchemy parametrizado; solo STL ≤ 50 MB.
- RS-7: secretos en `.env`; HTTPS si sale de la red local.
- RS-8: permiso verificado en el servidor, no solo en la UI.
- RS-9: salvaguardas para no quedarse sin administrador.

---

## 11. Casos de uso (39)

Prioridades según el SRS: **A** alta, **S**, **M** media, **B** baja. Puntos entre paréntesis.

| Prioridad | Casos de uso |
|---|---|
| **A** | CU-08 Crear pedido de impresión 3D (14); CU-16 Registrar equipo a reparar (13); CU-20 Finalizar reparación (13); CU-26 Registrar abono (14); CU-33 Registrar compra de material (14); CU-35 Registrar material usado en un pedido (13) |
| **S** | CU-11 Finalizar pedido (13) |
| **M** | CU-01 Iniciar sesión (9); CU-04 Registrar cliente (12); CU-09 Modificar pedido (8); CU-10 Cambiar estado del pedido (10); CU-12 Subir archivo STL (9); CU-13 Consultar y filtrar pedidos (11); CU-14 Visualizar pedidos pendientes y en proceso (8); CU-17 Registrar diagnóstico (11); CU-19 Cambiar estado de la reparación (10); CU-22 Registrar garantía (10); CU-27 Cancelar pago (11); CU-28 Ver historial de pagos (8); CU-29 Registrar ítem de inventario (12); CU-31 Consultar inventario (8); CU-36 Registrar repuestos usados en una reparación (12); CU-38 Gestionar usuarios (12); CU-39 Gestionar roles y permisos (12) |
| **B** | CU-02 Cerrar sesión (3); CU-03 Cambiar contraseña (4); CU-05 Modificar cliente (6); CU-06 Consultar cliente (7); CU-07 Eliminar cliente (4); CU-15 Consultar historial de pedidos (7); CU-18 Modificar equipo/reparación (7); CU-21 Consultar equipos a reparar (7); CU-23 Modificar garantía (5); CU-24 Consultar garantía (7); CU-25 Eliminar garantía (4); CU-30 Modificar ítem de inventario (6); CU-32 Eliminar ítem de inventario (4); CU-37 Notificar al cliente por correo (10); CU-40 Restablecer contraseña de un usuario (5) |

> En `docs\Documentacion\ECUs` solo hay un subconjunto de PDFs (CU-01, 02, 03, 04, 05, 06, 07, 08,
> 10, 11, 12, 13, 16, 20, 26, 33, 34, 35, 36, 37). El resto está cubierto por el SRS y el código.
> Ojo: aparece una ECU “CU-34 Crear color de material nuevo” que no figura en la tabla de priorización.

### Diagramas disponibles

- `Diagrama_de_casos_de_uso_actualizado.drawio.pdf`
- `entidad_relacion_Zproject_actualizado.drawio.pdf`
- `UMLZproject_actualizado.drawio.pdf`

---

## 12. Instalación y ejecución

### Requisitos

- Python 3 (con `venv`).
- MySQL en ejecución.
- Node.js + npm (para el frontend).
- PowerShell en Windows (los scripts son `.ps1`).

### Backend

```powershell
cd C:\Users\kevin\Documents\Proyectos\zproject\code\zproject-backend
.\setup.ps1      # crea .venv, instala deps, copia .env, crea BD y ejecuta seed
.\run.ps1        # uvicorn app.main:app --reload
```

`setup.ps1` hace:

1. Crea/reutiliza `.venv`.
2. Instala `requirements.txt`.
3. Crea `.env` desde `.env.example` si no existe (y se detiene para que edites la contraseña).
4. Ejecuta `python -m scripts.createDatabase` (crea la BD si no existe, utf8mb4).
5. Ejecuta `python -m scripts.seed` (tablas, permisos, rol Administrador y usuario admin).

API: `http://127.0.0.1:8000` — Swagger: `http://127.0.0.1:8000/docs`.

### Frontend

```powershell
cd C:\Users\kevin\Documents\Proyectos\zproject\code\zproject-frontend
npm install
npm run dev
```

Por defecto Vite sirve en `http://localhost:5173`, que ya está permitido por CORS.

### Variables de entorno

Backend (`code\zproject-backend\.env`):

```env
DATABASE_URL=mysql+pymysql://root:TU_PASSWORD@localhost:3306/zproject
SECRET_KEY=clave-de-desarrollo
```

Opcionales (con valores por defecto en `app/core/config.py`):

| Variable | Default | Uso |
|---|---|---|
| `SMTP_HOST` | `""` | Si está vacío, no se envían correos (solo log). |
| `SMTP_PORT` | `587` | Puerto SMTP con STARTTLS. |
| `SMTP_USER` | `""` | Usuario SMTP. |
| `SMTP_PASSWORD` | `""` | Contraseña SMTP. |
| `SMTP_FROM` | `""` | Remitente (si falta, usa `SMTP_USER`). |

También en `Settings`: `algorithm=HS256`, `accessTokenMinutes=30`, `uploadDir="uploads"`, `maxStlMb=50`,
`corsOrigins=["http://localhost:5173", "http://127.0.0.1:5173"]`.

Frontend (`code\zproject-frontend\.env`):

```env
VITE_API_URL=http://127.0.0.1:8000
```

---

## 13. Pruebas

### Backend

```powershell
cd code\zproject-backend
.\test.ps1            # pytest + cobertura + evidencia HTML
.\test.ps1 -Front     # además intenta npm test en el frontend
```

- Las pruebas usan **SQLite en memoria** y fijan `SMTP_HOST=""`; no tocan MySQL ni envían correos reales.
- Suites: `test_auth`, `test_client`, `test_material`, `test_payment`, `test_printOrder`,
  `test_repairs`, `test_sparePart`, `test_tool`, `test_warranty`.
- Genera `results.xml`, `htmlcov\index.html` y `evidencia.html` (tabla de evidencia).
- `pytest.ini` define `pythonpath=.`, `testpaths=test` y silencia warnings de SQLAlchemy/Deprecation.

### Frontend

- Existe `src\utils\utils.test.ts` con Vitest (FRONT-01, FRONT-02, etc.).
- **Pero** `package.json` no declara `vitest` ni un script `test`, y `package-lock.json` no lo incluye.
  Por eso `.\test.ps1 -Front` (que ejecuta `npm test`) fallará hasta agregar Vitest y el script.

---

## 14. Observaciones, riesgos y cosas que conviene arreglar

1. **README raíz**: es la plantilla genérica de GitLab; no describe ZProject. Conviene reemplazarlo.
2. **Sin migraciones**: `Base.metadata.create_all()` al iniciar. Cualquier cambio de esquema en una BD
   existente requiere migración manual o Alembic.
3. **`repairStatus.ts` obsoleto**: define estados `recibido`, `diagnosticado`, `enReparacion`,
   `finalizado`, `cancelado`, pero el backend y la UI real usan `pending`, `inProgress`, `finished`,
   `cancelled`. El archivo no se usa; conviene eliminarlo para evitar confusión.
4. **Vitest no configurado**: hay una prueba de frontend y el SRS exige Vitest, pero faltan
   dependencia y script `npm test`.
5. **Filtros de pedidos 3D**: el backend `GET /printOrders` no acepta `status` ni `clientId`;
   el frontend filtra en memoria. Reparaciones sí filtra en el backend. Si crece el volumen,
   conviene mover los filtros a la API.
6. **Permiso `orders:*`**: se crea en el seed, pero no hay router `/orders`. Es un permiso general
   sin efecto práctico actual.
7. **CORS fijo a localhost**: para producción hay que configurar los orígenes reales.
8. **Sin refresh token**: a los 30 minutos el usuario debe volver a iniciar sesión.
9. **Sin rate limiting** en login ni bloqueo por intentos fallidos (no exigido por el SRS, pero relevante).
10. **Correo síncrono**: se envía dentro de la petición (timeout 5 s); en producción conviene una cola.
11. **Almacenamiento local de STL**: `uploads/` relativo al directorio de ejecución; respaldar junto con la BD.
12. **Sin endpoint de logout**: el cierre de sesión es solo del lado del cliente.
13. **Documentación dispersa**: el SRS está en `.doc` y las ECU en PDF; no hay versión Markdown consolidada
    (este archivo ayuda, pero no sustituye la trazabilidad oficial).
14. **Copias del proyecto**: además de `Documents\Proyectos\zproject`, existen copias en
    `Desktop\proyecto_z\zproject` y `dev\vscode\zproject`. La revisada aquí es la que tiene Git y rama `main`.
15. **Seed interactivo**: `python -m scripts.seed` pide la contraseña de `admin`; no es apto para CI sin ajustes.

---

## 15. Checklist rápido “lo que debo saber”

- [ ] Es un sistema **interno**, no un portal de clientes.
- [ ] Dos líneas de negocio: **impresión 3D** y **reparación de equipos**.
- [ ] Todo pedido vive en `client_order`; `print_order` y `repair_order` lo heredan.
- [ ] Los pagos se asocian al pedido base, así que sirven para ambos tipos.
- [ ] Estados únicos: `pending`, `inProgress`, `finished`, `cancelled`.
- [ ] Finalizar no es solo cambiar estado: descuenta inventario y envía correo.
- [ ] Un pedido finalizado/cancelado es inmutable.
- [ ] Una reparación no inicia sin diagnóstico ni finaliza sin trabajo y monto.
- [ ] El saldo de reparación = diagnóstico + trabajo − pagos vigentes.
- [ ] Todo permiso se valida en el servidor; el frontend solo oculta la UI.
- [ ] Contraseñas con bcrypt; sesión JWT de 30 minutos.
- [ ] STL: solo `.stl`, máximo 50 MB, almacenamiento local.
- [ ] SMTP es opcional; si falla, la operación principal no se revierte.
- [ ] Eliminaciones lógicas en clientes, materiales, repuestos, herramientas y garantías.
- [ ] MySQL en producción; SQLite solo en pruebas.
- [ ] No hay Alembic: cuidado con cambios de esquema.
- [ ] El README raíz y Vitest están pendientes de completar.

---

## 16. Documentos fuente

| Documento | Contenido |
|---|---|
| `docs/Documentacion/Proposito.doc` | Propósito del sistema |
| `docs/Documentacion/SistemaActual.doc` | Descripción del manejo actual por WhatsApp |
| `docs/Documentacion/Alcances.doc` | Alcance funcional detallado |
| `docs/Documentacion/Objetivos.doc` | Objetivo general, específicos y criterios de éxito |
| `docs/Documentacion/RequerimientosFuncionales.doc` | RF-1 a RF-7 con prioridad |
| `docs/Documentacion/PriorizacionCasosUso.doc` | 39 CU con prioridad y puntos |
| `docs/Documentacion/Definiciones.doc` | Glosario |
| `docs/Documentacion/Usabilidad.doc` | RU-1 a RU-9 |
| `docs/Documentacion/Documentacion.doc` | RD-1 a RD-7 |
| `docs/Documentacion/Hardware.doc` | RPH-1 a RPH-14 |
| `docs/Documentacion/Software.doc` | RPS-1 a RPS-13 |
| `docs/Documentacion/Desempeño.doc` | RDE-1 a RDE-7 |
| `docs/Documentacion/Robustez.doc` | RR-1 a RR-7 |
| `docs/Documentacion/Calidad.doc` | RC-1 a RC-9 |
| `docs/Documentacion/ModificabilidadReusabilidad.doc` | RMR-1 a RMR-11 |
| `docs/Documentacion/Seguridad.doc` | RS-1 a RS-9 |
| `docs/Documentacion/Referencias.doc` | Referencia sobre STL |
| `docs/Documentacion/Diagramas/*.pdf` | Casos de uso, entidad-relación y UML |
| `docs/Documentacion/ECUs/*.pdf` | Especificaciones de casos de uso |
