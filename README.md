# LOOP — Frontend Web

Aplicación web de **LOOP**, red social Full Stack desarrollada con React y Vite como Trabajo Integrador Final de la diplomatura Full Stack UTN. Permite registrarse con verificación de correo electrónico, publicar texto e imágenes, interactuar con likes, comentarios, reposts y menciones `@username`, crear y gestionar comunidades, seguir usuarios, intercambiar mensajes privados con estados de lectura y recibir notificaciones.

---

## 1. Tecnologías utilizadas

- **Librería UI:** React `^19.3.1` (`react`, `react-dom`)
- **Bundler y servidor de desarrollo:** Vite `^8.3.5` (`@vitejs/plugin-react`)
- **Enrutamiento SPA:** React Router DOM `^7.18.5`
- **Íconos:** Lucide React `^1.77.0`
- **Linting:** ESLint `^10.0.1` (`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`)
- **Estilos:** CSS modular por componente/pantalla con variables globales (`src/styles/tokens.css`) y diseño responsive (320px a escritorio).

---

## 2. Instalación y ejecución local

### Requisitos previos
- Node.js `>= 18`
- Backend de LOOP corriendo localmente (por defecto en `http://localhost:8080`) o desplegado

### Pasos
```bash
# 1. Clonar el repositorio
git clone https://github.com/luzmicol/frontend-utn-back.git
cd frontend-utn-back

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Definir VITE_APP_URL_BACKEND apuntando a tu instancia del backend

# 4. Iniciar en modo desarrollo
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

---

## 3. Variables de entorno

Tomar como referencia [`.env.example`](./.env.example).

| Variable | Obligatoria | Descripción | Ejemplo ficticio |
| :--- | :---: | :--- | :--- |
| `VITE_APP_URL_BACKEND` | Sí | URL base de la API del backend (sin barra final). | `http://localhost:8080` |

---

## 4. Estructura del proyecto

```text
Frontend/
├── public/
│   ├── loop-wordmark.png       # Logo tipográfico transparente (Sidebar y Auth)
│   ├── loop-icon.png           # Isotipo cuadrado transparente (Header móvil y favicon)
│   └── loop-email-logo.png     # Logo horizontal completo
├── src/
│   ├── Components/
│   │   ├── Alert/              # Mensajes visuales de error y éxito
│   │   ├── AuthLayout/         # Layout compartido para pantallas de autenticación
│   │   ├── Community/          # CommunityCard y CommunityForm
│   │   ├── Feed/               # FeedSuggestionsSidebar (columna derecha >= 1200px)
│   │   ├── Form/               # Form, FormField y FormButton
│   │   ├── Layout/             # AppLayout, Sidebar, navItems y LogoutConfirmModal
│   │   ├── Messages/           # ConversationView (chat, paginación, polling y checks)
│   │   ├── Post/               # PostComposer, PostCard, LikeButton, RepostButton, CommentSection
│   │   └── UI/                 # Avatar, MentionTextarea y RichTextWithMentions
│   ├── Middleware/             # AuthMiddleware (protección de rutas privadas)
│   ├── context/                # AuthContext, NotificationContext y UnreadMessagesContext
│   ├── hooks/                  # useForm y useRequest
│   ├── screens/                # Pantallas principales de la aplicación
│   ├── services/               # apiClient y servicios por módulo
│   ├── styles/                 # tokens.css (paleta oscura, violeta, lavanda y reglas globales)
│   ├── utils/                  # imageOptimizer.js (compresión y orientación EXIF)
│   ├── App.jsx                 # Definición de rutas públicas y protegidas
│   └── main.jsx                # Punto de entrada y providers globales
├── .env.example
├── index.html
├── package.json
└── vercel.json                 # Rewrite SPA para despliegue en Vercel
```

---

## 5. Pantallas y funcionalidades

- **Autenticación (`/login`, `/register`, `/verify-email`, `/resend-email-verification`, `/forgot-password`, `/reset-password`):** registro con validación cliente, verificación de correo, reenvío de verificación, login con persistencia de sesión y recuperación de contraseña.
- **Feed (`/`):** creación de publicaciones de texto y/o imagen (con compresión progresiva en el navegador), listado paginado con botón *Cargar más*, likes, comentarios, reposts, menciones con autocompletado `@username`, edición y eliminación de publicaciones propias, y columna derecha fija de sugerencias en escritorio (`>= 1200px`).
- **Detalle de publicación (`/posts/:post_id`):** visualización individual de una publicación con comentarios desplegados, likes, reposts y acciones según permisos.
- **Explorar (`/explore`):** búsqueda y descubrimiento de usuarios y publicaciones.
- **Comunidades (`/communities` y `/communities/:community_id`):** listado, creación, unión/abandono, detalle con publicaciones paginadas y miembros; el `owner` puede editar nombre/descripción, subir/eliminar imagen de comunidad y eliminar la comunidad con confirmación.
- **Perfiles (`/profile` y `/users/:user_id`):** perfil propio y de otros usuarios, edición de nombre, `@username` y avatar, seguidores/seguidos, publicaciones paginadas y reposts.
- **Mensajes (`/messages`):** bandeja de conversaciones 1-a-1 con contador de no leídos por chat y global, búsqueda de usuarios para iniciar chat, historial paginado, polling con guarda anti-solapamiento y estados de mensaje (`Enviado`, `Entregado` y `Visto`).
- **Notificaciones (`/notifications`):** listado paginado de eventos (`follow`, `like`, `comment`, `repost`, `mention`, `message`), marcado automático como leídas al abrir la pantalla, navegación directa al contenido relacionado, eliminación individual y botón *Borrar todo* con confirmación.

---

## 6. Integración con el Backend

Todas las solicitudes pasan por [src/services/apiClient.js](./src/services/apiClient.js):
- **Autenticación Bearer:** adjunta automáticamente `Authorization: Bearer <token>` desde `localStorage` (`auth_token`) en las peticiones protegidas.
- **FormData y JSON:** serializa objetos a JSON con `Content-Type: application/json` y deja intacto `FormData` para que el navegador genere el `boundary` en subida de imágenes.
- **Sesión y errores:** ante respuestas `401`, limpia el token y notifica a `AuthContext` para redirigir al login; los errores del servidor se propagan con `message`, `status` y `code` para mostrarse en `<Alert variant='error'>`.

---

## 7. Scripts disponibles (`package.json`)

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo de Vite con HMR. |
| `npm run build` | Genera el bundle optimizado de producción en `dist/`. |
| `npm run lint` | Ejecuta ESLint sobre todo el proyecto. |
| `npm run preview` | Sirve localmente el build generado en `dist/`. |

---

## 8. Despliegue en Vercel

1. Importar el repositorio en Vercel (Framework Preset: **Vite**).
2. Configurar la variable de entorno `VITE_APP_URL_BACKEND` con la URL pública del backend desplegado (sin barra final).
3. El archivo [`vercel.json`](./vercel.json) ya incluye el rewrite SPA `/(.*) -> /` necesario para que React Router funcione correctamente al recargar cualquier ruta.

---

## 9. Repositorios y despliegues

- **Frontend (GitHub):** `https://github.com/luzmicol/frontend-utn-back.git`
- **Backend (GitHub):** `https://github.com/luzmicol/backend-utn.git`
- **Backend desplegado (Vercel):** `https://backend-utn-seven.vercel.app`
- **Frontend desplegado (Vercel):** *(agregar aquí la URL pública de tu despliegue en Vercel)*
