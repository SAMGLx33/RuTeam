# Correspondencia UML ↔ código

BLOQUEADO el cotejo: no está el .drawio final de 36 pestañas ni la ERS. No se ha leído
ningún documento original. No asignar páginas/métodos ficticios.

| Concepto del prompt (provisional) | Código                                   | Estado                             |
| --------------------------------- | ---------------------------------------- | ---------------------------------- |
| User/Profile/Membership           | prisma/schema.prisma                     | implementado, cotejo pendiente     |
| AuthSession/VerificationAttempt   | schema y auth.repository                 | implementado                       |
| InstitutionalVerificationProvider | infrastructure/verification              | demo real en BD; oficial bloqueado |
| login/currentUser/logout          | auth/application/auth.service.ts         | implementado                       |
| perfil propio                     | profiles/application/profiles.service.ts | implementado                       |
| CampusDestination                 | schema y campus                          | lectura DEMO                       |
| Resto de entidades/casos de uso   | MODULES.md                               | pendiente                          |

Al recibir referencias: recorrer TODOS los elementos diagram XML, descomprimir
Base64+deflate+URL decode si las pestañas están comprimidas; indexar nombres,
atributos, métodos, relaciones, mensajes y reglas de las 36 páginas. Reconciliar
según precedencia y registrar divergencias antes de cambiar el modelo. No alterar
originales para esconder diferencias. Responsable: PO + integrador POR_ASIGNAR.
