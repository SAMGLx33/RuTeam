# RuTeam - Carpooling Universitario USC

> *Comparte el camino. Muévete en comunidad.*

![Estado del Proyecto](https://img.shields.io/badge/Estado-En_Desarrollo_Activo-blue)
![Versión](https://img.shields.io/badge/Versión-1.0.0--MVP-green)
![Plataforma](https://img.shields.io/badge/Plataforma-iOS_%7C_Android_%7C_Web-lightgrey)
![Licencia](https://img.shields.io/badge/Licencia-MIT-orange)

**RuTeam** es una plataforma móvil (iOS y Android) y web administrativa diseñada exclusivamente para la comunidad activa de la **Universidad Santiago de Cali (USC)** (estudiantes, docentes y administrativos). Su objetivo principal es mitigar los problemas de congestión vehicular, déficit de parqueaderos, altos costos de transporte e impacto ambiental mediante un sistema seguro y regulado de transporte compartido (*carpooling*) sin fines de lucro.

## Tabla de Contenidos

1. [Vista Previa / Demo](#vista-previa--demo)
2. [¿Qué hace la aplicación?](#qué-hace-la-aplicación)
3. [Características Principales (Features)](#características-principales-features)
4. [Roles de Usuario](#roles-de-usuario)
5. [Tecnologías Utilizadas (Stack)](#tecnologías-utilizadas-stack)
6. [Prerrequisitos e Instalación](#prerrequisitos-e-instalación)
7. [Guía de Uso (Usage)](#guía-de-uso-usage)
8. [Cumplimiento Normativo y Seguridad](#cumplimiento-normativo-y-seguridad)
9. [Estado del Proyecto](#estado-del-proyecto)
10. [Contribución](#contribución)
11. [Licencia](#licencia)
12. [Autores y Contacto](#autores-y-contacto)

## Vista Previa / Demo

A continuación, se presentan los espacios reservados para la demostración visual de la interfaz móvil y el flujo de usuario. *(Reemplazar con las rutas reales una vez subidos los archivos multimedia al repositorio)*.

* **Video Demostrativo del Prototipo:** `[Ver video demo de RuTeam](docs/demo/ruteam_demo.mp4)`
* **Capturas de Pantalla:**

| Inicio de Sesión (@usc.edu.co) | Búsqueda de Rutas (Pasajero) | Publicación y QR (Conductor) |
| :---: | :---: | :---: |
| ![Login](docs/screenshots/login.png) | ![Home Pasajero](docs/screenshots/home_pasajero.png) | ![QR Abordaje](docs/screenshots/qr_abordaje.png) |

## ¿Qué hace la aplicación?

RuTeam conecta en tiempo real a miembros de la comunidad universitaria que viajan hacia o desde el campus (ej. Sede Pampalinda) en vehículo particular (carro o motocicleta) con compañeros que comparten rutas similares.

A diferencia de las aplicaciones comerciales de transporte, RuTeam opera bajo una regla estricta de **economía solidaria y sin fines de lucro**: la plataforma calcula y sugiere una división equitativa de los costos operativos reales del trayecto (combustible y peajes), evitando el transporte informal ("piratería") y fomentando la reducción de la huella de carbono.

## Características Principales (Features)

### 1. Seguridad, Acceso y Confianza
* **Acceso Institucional Exclusivo:** Registro e inicio de sesión restringido únicamente a correos con dominio oficial `@usc.edu.co` mediante autenticación por tokens (JWT).
* **Validación Vehicular y Documental:** Registro obligatorio de placas, modelo, color y carga de constancia de **SOAT vigente** para habilitar perfiles de conductor.
* **Abordaje Verificado por QR:** Generación de códigos QR únicos por reserva que el conductor escanea al iniciar el viaje para confirmar la identidad del pasajero.
* **Botón de Pánico y Emergencia (SOS):** Integración directa para compartir la ubicación en tiempo real vía **WhatsApp**, envío de SMS de emergencia sin conexión y alerta inmediata al panel administrativo.
* **Reputación Bidireccional:** Sistema de calificación de 1 a 5 estrellas post-viaje evaluando puntualidad, amabilidad y conducción segura.

### 2. Gestión de Rutas y Matching
* **Publicación y Rutas Recurrentes:** Creación de trayectos únicos o programados por horarios de clase (ej. Lunes y Miércoles a las 7:00 AM), seleccionando vehículo (Carro o Moto) y cupos disponibles.
* **Paraderos Oficiales USC:** Selección rápida de puntos de recogida y llegada predefinidos en las entradas principales del campus.
* **Búsqueda Geoespacial:** Filtrado de viajes activos mediante algoritmos de proximidad (Fórmula de Haversine) y visualización de rutas en mapa interactivo.
* **Reglas de Viaje Personalizadas:** Configuración de condiciones como *"Sin desvíos"*, *"Tiempo máximo de espera (5 min)"*, *"Exclusivo para mujeres"* o *"Disponibilidad de casco extra"* (para motos).

### 3. División de Costos y Billetera (Wallet)
* **Cálculo Automático de Aportes:** Algoritmo transparente que divide el costo estimado de gasolina y peajes entre los ocupantes del vehículo.
* **Billetera Virtual Integrada:** Gestión de saldo interno con soporte para recargas y registro de transferencias digitales (**Nequi / DaviPlata**) o efectivo.
* **Políticas de Cancelación:** Penalización automática en el saldo ante cancelaciones de última hora (< 30 min), con opción de exención mediante ticket de soporte (PQRS) por fuerza mayor.

### 4. Impacto Ambiental y Comunicación
* **Calculadora de Huella de Carbono:** Métrica personalizada en el perfil que calcula los kilogramos de $CO_2$ ahorrados por cada trayecto compartido.
* **Chat Interno Temporal:** Mensajería en tiempo real (WebSockets) habilitada únicamente durante la vigencia de la reserva para coordinar el encuentro sin exponer números telefónicos personales.

## Roles de Usuario

1. **Estudiante / Miembro Pasajero:** Busca rutas cercanas, solicita cupos, recarga su billetera, presenta su código QR al abordar y califica la experiencia.
2. **Estudiante / Miembro Conductor:** Registra su vehículo y SOAT, publica trayectos, establece reglas de viaje, acepta/rechaza solicitudes en tiempo real y escanea el QR de sus pasajeros. (La app permite alternar dinámicamente entre modo *Pasajero* y *Conductor* desde la pantalla principal).
3. **Administrador de Movilidad:** Supervisa el dashboard de métricas globales (viajes, ahorro de $CO_2$), valida documentos vehiculares, gestiona tickets de PQRS, revisa evidencias de cancelación y aplica sanciones.

## Tecnologías Utilizadas (Stack)

El proyecto está construido siguiendo el patrón arquitectónico **Modelo-Vista-Controlador (MVC)** y el flujo de trabajo **GitFlow**:

* **Frontend Móvil (Mobile-First):** Desarrollo multiplataforma con renderizado nativo para **iOS y Android** (Flutter / React Native), diseñado bajo criterios de accesibilidad **WCAG 2.1** y usabilidad a una sola mano.
* **Backend y APIs:** Arquitectura RESTful sobre **HTTPS** para transacciones estándar y **WebSockets (`wss://`)** para chat en tiempo real y notificaciones push de baja latencia (< 3s).
* **Base de Datos:** Motor relacional con soporte de **índices espaciales** (MariaDB / PostGIS) para consultas geográficas rápidas (< 1.5s) y almacenamiento de logs transaccionales inmutables.
* **Servicios Externos:**
  * APIs de Geolocalización y Cartografía (Google Maps / Mapbox).
  * Servicio de Mensajería en la Nube (Firebase Cloud Messaging - FCM / APNs).
  * Proveedor de Identidad Institucional (OAuth 2.0 / Active Directory USC).
* **Seguridad de Datos:** Cifrado **AES-256** para datos sensibles en reposo, hashing seguro de contraseñas, enmascaramiento de PII (Patrón DTO) y *Rate Limiting* en el API Gateway.

## Prerrequisitos e Instalación

Para ejecutar y probar el entorno de desarrollo local de RuTeam, asegúrate de contar con las siguientes herramientas instaladas:

### Prerrequisitos
* **Git** (v2.30 o superior)
* **SDK Móvil:** Flutter SDK (v3.19+) o Node.js (v18 LTS+) según el módulo activo.
* **Motor de Base de Datos:** MariaDB (v10.6+) o PostgreSQL (v15+) con extensión PostGIS habilitada.
* **Emulador / Dispositivo:** Android Studio (con AVD configurado), Xcode (para macOS) o dispositivo físico con depuración USB activada.
* **Claves de API:** Archivo `.env` con credenciales válidas para Google Maps API, Firebase Cloud Messaging y el servidor SMTP institucional.

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/usc-ing-software/ruteam-carpooling.git
   cd ruteam-carpooling
   ```

2. **Configurar variables de entorno:**
   Duplica el archivo de ejemplo y completa las credenciales necesarias:
   ```bash
   cp .env.example .env
   ```

3. **Configurar e iniciar el Backend:**
   ```bash
   cd backend
   npm install        # o pip install -r requirements.txt
   npm run migrate    # Ejecuta las migraciones de la base de datos
   npm run dev        # Inicia el servidor en http://localhost:3000
   ```

4. **Configurar y ejecutar la Aplicación Móvil:**
   ```bash
   cd ../mobile
   flutter pub get    # o npm install
   flutter run        # Ejecuta la aplicación en el emulador o dispositivo conectado
   ```

## Guía de Uso (Usage)

1. **Inicio de Sesión:** Ingresa tus credenciales institucionales (`usuario@usc.edu.co`) y acepta los términos de uso de transporte sin fines de lucro.
2. **Selección de Rol:** En la pantalla de inicio (*Home*), utiliza el selector superior para alternar entre **Pasajero** o **Conductor** (también puedes cambiar el tema visual entre modo oscuro y claro desde tu perfil).
3. **Como Pasajero:**
   * Ingresa tu destino en la barra *"¿A dónde vas?"* o selecciona un paradero oficial USC.
   * Revisa las rutas disponibles, el aporte sugerido, las reglas del conductor y solicita tu cupo.
   * Una vez aceptado, coordina por el chat interno y muestra tu **Código QR** al abordar.
4. **Como Conductor:**
   * Toca en **Publicar trayecto**, elige tu vehículo (Carro o Moto), traza la ruta, define los cupos, métodos de pago aceptados y preferencias.
   * Recibe notificaciones en tiempo real cuando alguien quiera unirse, acepta la solicitud e inicia el recorrido.
5. **Durante y Después del Viaje:**
   * Monitorea el trayecto en vivo en la pestaña **Mi viaje** (con acceso rápido al botón rojo **SOS** y compartir por WhatsApp).
   * Al finalizar, visualiza el ahorro de $CO_2$ generado y asigna la calificación de estrellas correspondiente.

## Cumplimiento Normativo y Seguridad

* **Decreto de Tránsito Local (Cali):** Cuando un conductor publica un viaje en **motocicleta** dentro, hacia o desde Santiago de Cali, el sistema aplica automáticamente una restricción lógica que permite solicitar cupos **únicamente a perfiles femeninos**, dando cumplimiento a la prohibición municipal de parrillero hombre.
* **Ley de Habeas Data (Ley 1581 de 2012):** Implementación del derecho al olvido mediante la función de eliminación y anonimización de cuenta, siempre que el usuario no tenga viajes activos o saldos pendientes.

## Estado del Proyecto

**En desarrollo activo (Fase MVP - 2026-B).** 
Actualmente se encuentran finalizadas las fases de especificación de requerimientos (IEEE 830), modelado arquitectónico UML y prototipado funcional de interfaz de usuario. El equipo se encuentra trabajando en la integración de servicios en tiempo real (WebSockets y geolocalización) y pruebas unitarias.

## Contribución

Las contribuciones son bienvenidas siguiendo la metodología **GitFlow** del equipo. Para colaborar o reportar incidencias:

1. **Reporte de Errores (Bugs):** Abre un *Issue* en el repositorio detallando los pasos para reproducir el error, el comportamiento esperado, el comportamiento actual y capturas de pantalla si aplica.
2. **Propuesta de Cambios (Pull Requests):**
   * Haz un *Fork* del repositorio.
   * Crea una rama a partir de `develop` siguiendo la convención: `feature/nombre-funcionalidad` o `fix/descripcion-error`.
   * Asegúrate de que tu código cumpla con las reglas de estilo del proyecto y que todas las pruebas pasen.
   * Envía un **Pull Request** hacia la rama `develop` explicando claramente los cambios realizados.

## Licencia

Este proyecto se distribuye bajo la **Licencia MIT**. Consulta el archivo [LICENSE](LICENSE) en la raíz del repositorio para más información sobre los términos legales de uso, modificación y distribución.

## Autores y Contacto

Proyecto desarrollado para la asignatura **Ingeniería de Software I** (2026-B) – Facultad de Ingeniería, **Universidad Santiago de Cali**.

| Integrante | Rol Scrum | Responsabilidades Principales | Contacto / Perfil |
| :--- | :--- | :--- | :--- |
| **Johann Steven Manchabajoy** | Product Owner | Visión del producto, gestión del Product Backlog y validación de requerimientos. | `@johann-manchabajoy` |
| **Nicolas Valdez** | Scrum Master | Facilitación de eventos Scrum, gestión de impedimentos y seguimiento de métricas ágiles. | `@nicolas-valdez` |
| **Sergio Andrés Mora** | Developer | Arquitectura de software, modelado UML, desarrollo MVP y pruebas. | `@sergio-mora` |
| **Darikson Alexis Morales** | Developer | Arquitectura de software, modelado UML, desarrollo MVP y pruebas. | `@darikson-morales` |
| **Esteban Orejuela** | Developer | Arquitectura de software, modelado UML, desarrollo MVP y pruebas. | `@esteban-orejuela` |
| **Juan Esteban Villarreal** | Developer | Arquitectura de software, modelado UML, desarrollo MVP y pruebas. | `@juan-villarreal` |

Para consultas académicas o soporte técnico relacionado con el proyecto, puedes abrir un *Issue* en este repositorio o contactar al equipo a través de los canales institucionales de la Facultad de Ingeniería (USC).
