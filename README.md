# LOOP — Frontend Web

Aplicación web de **LOOP**, plataforma social Full Stack desarrollada con React y Vite como Trabajo Integrador Final de la Diplomatura Full Stack UTN.

---

## 1. Funcionalidades implementadas

- **Autenticación y sesión:** registro, verificación de correo electrónico, reenvío de verificación, inicio de sesión con persistencia JWT, recuperación/restablecimiento de contraseña y manejo de errores temporales de red.
- **Feed (`/`):** publicaciones de cuentas seguidas, comunidades a las que pertenecés y publicaciones propias; creación con texto e imagen (optimizada en el navegador hasta 15 MB originales), menciones `@username` con autocompletado, emojis, «Ver más» en textos extensos, paginación y actualización automática al volver a la pestaña.
- **Visor global de publicaciones:** modal accesible desde cualquier publicación (Feed, Explorar, Perfiles y Comunidades), con zoom interactivo (doble clic/toque, pellizco, arrastre y controles), navegación anterior/siguiente, eliminación de publicaciones propias y sincronización en vivo de likes, comentarios, reposts y guardados.
- **Explorar (`/explore`):** cuatro pestañas (*Para vos*, *Tendencias*, *Personas*, *Comunidades*), búsqueda de personas en backend con paginación, seguimiento, unión/abandono de comunidades con cantidad de integrantes y navegación por swipe horizontal en móvil.
- **Comunidades (`/communities` y `/communities/:community_id`):** listado, creación, unión/abandono, edición de datos e imagen (`owner`), publicaciones fijadas (`owner`), listado de miembros y eliminación con confirmación.
- **Perfiles (`/profile` y `/users/:user_id`):** perfil propio y de otros usuarios, edición de nombre, biografía, `@username` (con cooldown de 7 días) y avatar, seguidores/seguidos, publicaciones, reposts y guardados.
- **Mensajes (`/messages`):** conversaciones 1-a-1 y grupales, solicitudes de conversación, menú contextual estilo WhatsApp/WhatsApp Web (responder con cita y salto al mensaje, reenviar multi-destino, copiar y eliminar), compartir publicaciones, gestión de roles en grupos, eventos de sistema y estados de entrega/lectura.
- **Notificaciones (`/notifications`):** contador en vivo, marcado automático y manual como leídas, eliminación individual/total y navegación directa al contenido exacto (`/posts/:post_id`, perfiles y conversaciones).
- **Configuración (`/settings`):** tema **Automático**, **Claro** y **Oscuro** persistido en `localStorage` con script anti-flash en `index.html`.

---

## 2. Tecnologías utilizadas

- **UI:** React `^19.3.1` (`react`, `react-dom`)
- **Bundler y dev server:** Vite `^8.3.5` (`@vitejs/plugin-react`)
- **Enrutamiento SPA:** React Router DOM `^7.18.5`
- **Íconos:** Lucide React `^1.77.0`
- **Calidad de código:** ESLint `^10.13.0` (`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`)
- **Estilos:** CSS modular por componente/pantalla con variables de tema en `src/styles/tokens.css` y diseño responsive (móvil, tablet y escritorio).

---

## 3. Requisitos previos

- Node.js `>= 18`
- Backend de LOOP ejecutándose en local (`http://localhost:8080`) o desplegado

---

## 4. Instalación y ejecución local

```bash
# 1. Clonar el repositorio
git clone https://github.com/luzmicol/frontend-utn-back.git
cd frontend-utn-back

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Configurar VITE_APP_URL_BACKEND en .env

# 4. Iniciar servidor de desarrollo
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

### Scripts disponibles (`package.json`)

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia Vite en modo desarrollo con HMR. |
| `npm run build` | Genera el build de producción en `dist/`. |
| `npm run lint` | Ejecuta ESLint sobre todo el proyecto. |
| `npm run preview` | Previsualiza localmente el build generado. |

---

## 5. Variables de entorno

Referencia: [`.env.example`](./.env.example).

| Variable | Obligatoria | Descripción | Ejemplo |
| :--- | :---: | :--- | :--- |
| `VITE_APP_URL_BACKEND` | Sí | URL base de la API backend (sin barra final). | `http://localhost:8080` |

---

## 6. Estructura del proyecto

```text
Frontend/
├── public/                     # Íconos y wordmarks (modo claro y oscuro)
├── src/
│   ├── Components/
│   │   ├── Alert/              # Alertas de error y confirmación
│   │   ├── AuthLayout/         # Layout compartido de login/registro/recuperación
│   │   ├── Community/          # CommunityCard y CommunityForm
│   │   ├── Feed/               # FeedSuggestionsSidebar (escritorio >= 1200px)
│   │   ├── Form/               # Form, FormField y FormButton
│   │   ├── Layout/             # AppLayout, Sidebar, navItems y LogoutConfirmModal
│   │   ├── Messages/           # ConversationView, ForwardMessageModal, CreateGroupModal, GroupInfoModal
│   │   ├── Post/               # PostComposer, PostCard, PostViewerModal, ZoomableImage, Like/Repost/Bookmark/CommentSection
│   │   └── UI/                 # Avatar, EmojiPicker, MentionTextarea y RichTextWithMentions
│   ├── Middleware/             # AuthMiddleware (protección de rutas privadas)
│   ├── context/                # AuthContext, ThemeContext, NotificationContext, UnreadMessagesContext, PostViewerContext
│   ├── hooks/                  # useForm y useRequest
│   ├── screens/                # Pantallas de la aplicación
│   ├── services/               # apiClient y servicios HTTP por módulo
│   ├── styles/                 # tokens.css y estilos globales
│   ├── utils/                  # memoryCache, imageOptimizer y emojiUtils
│   ├── App.jsx                 # Definición de rutas públicas y privadas
│   └── main.jsx                # Punto de entrada y providers globales
├── .env.example
├── index.html                  # Incluye script anti-flash de tema
├── package.json
└── vercel.json                 # Rewrite SPA para despliegue en Vercel
```

---

## 7. Integración con el Backend y manejo de sesión

- **Cliente HTTP (`src/services/apiClient.js`):** adjunta `Authorization: Bearer <token>` desde `localStorage` (`auth_token`), maneja tanto JSON como `FormData` y normaliza errores del servidor (`message`, `status`, `code`).
- **Sesión (`AuthContext` + `AuthMiddleware`):** al iniciar o recargar valida la sesión contra `GET /api/users/me` con reintento ante fallos temporales de red. Ante un `401` o al cerrar sesión, limpia el token y vacía la caché en memoria (`clearAllCache()`) para aislar completamente las cuentas.
- **Caché en memoria (`src/utils/memoryCache.js`):** almacena respuestas recientes (TTL 30 s) con deduplicación de solicitudes en vuelo e invalidación selectiva tras mutaciones (publicar, seguir, unirse/abandonar comunidades, editar perfil).

---

## 8. Rutas principales de navegación

### Públicas
- `/login`, `/register`, `/verify-email`, `/resend-email-verification`, `/forgot-password`, `/reset-password`

### Protegidas (`AuthMiddleware` + `AppLayout`)
- `/` — Feed principal
- `/explore` — Explorar (*Para vos*, *Tendencias*, *Personas*, *Comunidades*)
- `/communities` y `/communities/:community_id` — Comunidades y detalle
- `/messages` — Mensajes directos y grupales
- `/notifications` — Notificaciones
- `/profile` y `/users/:user_id` — Perfil propio y de otros usuarios
- `/posts/:post_id` — Detalle directo de una publicación
- `/settings` — Configuración de apariencia
- `*` — Página de ruta no encontrada (`NotFoundScreen`)

---

## 9. Repositorios y despliegues

- **Repositorio Frontend (GitHub):** `https://github.com/luzmicol/frontend-utn-back.git`
- **Repositorio Backend (GitHub):** `https://github.com/luzmicol/backend-utn.git`
- **Backend desplegado (Vercel):** `https://backend-utn-seven.vercel.app`
- **Frontend desplegado (Vercel):** [https://frontend-utn-back-ruli.vercel.app/](https://frontend-utn-back-ruli.vercel.app/)
