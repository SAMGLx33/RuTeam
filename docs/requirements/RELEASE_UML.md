# UML derivado del cierre del 26/11/2026

Este derivado conecta RF-006, RF-008/009, RF-011, RF-012, RF-014, RF-015,
RF-027 y RF-030 con los modelos y flujos del corte. El
[cotejo histórico](UML_CROSSWALK.md) conserva las pestañas del original.

## Clases

```mermaid
classDiagram
  direction LR
  User "1" --> "0..*" Trip : conduce
  User "1" --> "0..*" EmergencyContact : posee
  User "1" --> "0..*" TripIncident : registra
  User "1" --> "0..*" TripNotification : recibe
  Trip "1" *-- "2..*" TripStop : itinerario publicado
  Trip "1" --> "0..1" TripExpenseEstimate : gastos privados
  Trip "1" --> "0..*" Reservation : historial
  Trip "1" --> "0..*" TripGroup : invitación vinculada
  Trip "1" --> "0..*" TripIncident : contexto privado
  Trip "1" --> "0..*" TripNotification : evento
  Trip "1" --> "0..1" TripDriverPosition : última muestra
  TripGroup "1" --> "1..4" TripGroupMember : consentimiento
  TripGroupMember "0..1" --> "0..1" Reservation : plaza individual
  Reservation "1" --> "0..1" ReservationBoardingPass : pase opaco
  Reservation "1" --> "0..1" TripCompensation : registro voluntario
  class Trip {
    suggestedContributionCop
    compensationMethods
  }
  class TripCompensation {
    amountCop
    method
    status
    declaredAt
    resolvedAt
  }
```

(2..*) aplica al itinerario publicado en el flujo vigente. Las filas históricas
pueden provenir del modelo anterior. La cardinalidad de consentimientos activos
se limita por plazas. Los consentimientos retirados se conservan como historial.

## Estados

```mermaid
stateDiagram-v2
  [*] --> PROGRAMADO: Publicar
  PROGRAMADO --> EN_CURSO: Iniciar
  PROGRAMADO --> CANCELADO: Cancelar
  EN_CURSO --> COMPLETADO: Finalizar
  CANCELADO --> [*]
  COMPLETADO --> [*]
```

```mermaid
stateDiagram-v2
  [*] --> DECLARED: Pasajero abordado declara tras completar
  DECLARED --> ACKNOWLEDGED: Conductor reconoce
  DECLARED --> DISPUTED: Conductor registra discrepancia
  DECLARED --> CANCELLED: Titular cancela
  ACKNOWLEDGED --> [*]
  DISPUTED --> [*]
  CANCELLED --> [*]
```

## Secuencia de publicación y aportes

```mermaid
sequenceDiagram
  actor C as Conductor
  participant N as API NestJS
  participant P as PostgreSQL
  actor E as Estudiante
  C->>N: Previsualizar gastos y plazas
  N-->>C: Total privado, aporte y fuente
  C->>N: Publicar viaje
  N->>P: Guardar condiciones, estimación y evento
  E->>N: Consultar y confirmar participación
  N->>P: Validar cupo y confirmar con avisos
  C->>N: Registrar abordaje y completar
  N->>P: Cerrar, registrar ausencias y emitir avisos
  E->>N: Declarar compensación voluntaria
  N->>P: Guardar registro y aviso al conductor
  C->>N: Reconocer recepción
  N->>P: Resolver registro y avisar al estudiante
```

Se renderizaron y revisaron visualmente en Chromium las cuatro figuras. El
material de revisión se conserva en el directorio privado de evidencia.
