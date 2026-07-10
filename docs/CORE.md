# Core RR. HH.

## Responsabilidad

El Core es la fuente unica de empresas, usuarios, roles, colaboradores, clientes,
areas, sedes, cargos y tipos de vinculo. Los demas modulos solo referencian estas entidades.

## Multiempresa

- Toda entidad de negocio contiene `companyId`.
- El usuario pertenece a una empresa y el login no solicita su codigo.
- `companyId` viaja en el token y nunca se acepta desde formularios.
- Todas las consultas se filtran con la empresa del usuario autenticado.

## Orden de implementacion

1. Empresas, autenticacion, usuarios y roles configurables.
2. Areas, sedes, cargos, tipos de vinculo y clientes.
3. Colaboradores y su vinculacion opcional con un usuario.
4. Asignaciones operativas a cliente, area, sede y turno.

## Roles

Cada empresa recibe los roles base del sistema y puede incorporar roles adicionales.
Un usuario solo puede recibir un rol activo de su propia empresa.
