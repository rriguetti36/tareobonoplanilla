/*
  Fuente unica de cambios de base de datos del proyecto Core RR. HH.
  Base de datos: BD_RRHH_IA
  Motor: SQL Server
*/

IF DB_ID(N'BD_RRHH_IA') IS NULL
BEGIN
    CREATE DATABASE BD_RRHH_IA;
END;
GO

USE BD_RRHH_IA;
GO

IF OBJECT_ID(N'dbo.Companies', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Companies (
        id INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Companies PRIMARY KEY,
        code NVARCHAR(20) NOT NULL,
        businessName NVARCHAR(200) NOT NULL,
        tradeName NVARCHAR(150) NULL,
        taxId VARCHAR(11) NULL,
        estado BIT NOT NULL
            CONSTRAINT DF_Companies_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL
            CONSTRAINT DF_Companies_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL
            CONSTRAINT DF_Companies_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Companies_code UNIQUE (code)
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_Companies_taxId'
      AND object_id = OBJECT_ID(N'dbo.Companies')
)
BEGIN
    CREATE UNIQUE INDEX UX_Companies_taxId
        ON dbo.Companies (taxId)
        WHERE taxId IS NOT NULL;
END;
GO

IF OBJECT_ID(N'dbo.Areas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Areas (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Areas PRIMARY KEY,
        companyId INT NOT NULL,
        code NVARCHAR(30) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(250) NULL,
        isSystem BIT NOT NULL CONSTRAINT DF_Areas_isSystem DEFAULT (0),
        estado BIT NOT NULL CONSTRAINT DF_Areas_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_Areas_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_Areas_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Areas_company_code UNIQUE (companyId, code),
        CONSTRAINT FK_Areas_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id)
    );
END;
GO

IF OBJECT_ID(N'dbo.Sites', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sites (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sites PRIMARY KEY,
        companyId INT NOT NULL,
        clientId INT NULL,
        code NVARCHAR(30) NOT NULL,
        name NVARCHAR(120) NOT NULL,
        address NVARCHAR(250) NULL,
        department NVARCHAR(100) NULL,
        province NVARCHAR(100) NULL,
        district NVARCHAR(100) NULL,
        estado BIT NOT NULL CONSTRAINT DF_Sites_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_Sites_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_Sites_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_Sites_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id)
    );
END;
GO

IF OBJECT_ID(N'dbo.Clients', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Clients (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Clients PRIMARY KEY,
        companyId INT NOT NULL,
        documentType NVARCHAR(10) NOT NULL CONSTRAINT DF_Clients_documentType DEFAULT (N'RUC'),
        documentNumber NVARCHAR(20) NOT NULL,
        businessName NVARCHAR(200) NOT NULL,
        tradeName NVARCHAR(150) NULL,
        contactName NVARCHAR(150) NULL,
        contactEmail NVARCHAR(150) NULL,
        contactPhone NVARCHAR(30) NULL,
        estado BIT NOT NULL CONSTRAINT DF_Clients_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_Clients_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_Clients_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Clients_company_document UNIQUE (companyId, documentType, documentNumber),
        CONSTRAINT FK_Clients_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id)
    );
END;
GO

-- Alias calculado de compatibilidad para consultas operativas reutilizables.
IF COL_LENGTH(N'dbo.Clients', N'name') IS NULL
BEGIN
    ALTER TABLE dbo.Clients ADD name AS (COALESCE(tradeName, businessName));
END;
GO

IF COL_LENGTH(N'dbo.Sites', N'clientId') IS NULL
BEGIN
    ALTER TABLE dbo.Sites ADD clientId INT NULL;
END;
GO

IF OBJECT_ID(N'dbo.UQ_Sites_company_code', N'UQ') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Sites DROP CONSTRAINT UQ_Sites_company_code;
END;
GO

IF OBJECT_ID(N'dbo.UQ_Clients_company_id', N'UQ') IS NULL
BEGIN
    ALTER TABLE dbo.Clients ADD CONSTRAINT UQ_Clients_company_id UNIQUE (companyId, id);
END;
GO

IF OBJECT_ID(N'dbo.FK_Sites_Clients', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.Sites WITH CHECK
        ADD CONSTRAINT FK_Sites_Clients FOREIGN KEY (companyId, clientId)
        REFERENCES dbo.Clients (companyId, id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Sites WHERE clientId IS NULL)
BEGIN
    ALTER TABLE dbo.Sites ALTER COLUMN clientId INT NOT NULL;
END;
GO

IF OBJECT_ID(N'dbo.UQ_Sites_client_code', N'UQ') IS NULL
BEGIN
    ALTER TABLE dbo.Sites ADD CONSTRAINT UQ_Sites_client_code UNIQUE (companyId, clientId, code);
END;
GO

-- Empresa inicial. El codigo es interno y nunca se solicita durante el login.
IF NOT EXISTS (SELECT 1 FROM dbo.Companies WHERE code = N'CORE')
BEGIN
    INSERT INTO dbo.Companies (code, businessName, tradeName)
    VALUES (N'CORE', N'Core RR. HH.', N'Core RR. HH.');
END;
GO

IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Roles PRIMARY KEY,
        companyId INT NOT NULL,
        code NVARCHAR(20) NOT NULL,
        name NVARCHAR(80) NOT NULL,
        description NVARCHAR(250) NULL,
        isSystem BIT NOT NULL CONSTRAINT DF_Roles_isSystem DEFAULT (0),
        estado BIT NOT NULL CONSTRAINT DF_Roles_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_Roles_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_Roles_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Roles_company_code UNIQUE (companyId, code),
        CONSTRAINT FK_Roles_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id)
    );
END;
GO

-- Cada empresa recibe los roles base y puede incorporar roles adicionales.
INSERT INTO dbo.Roles (companyId, code, name, description, isSystem)
SELECT c.id, r.code, r.name, r.description, 1
FROM dbo.Companies c
CROSS JOIN (VALUES
    (N'admin', N'Admin', N'Administracion completa de la empresa'),
    (N'rrhh', N'RRHH', N'Gestion de personas y Recursos Humanos'),
    (N'operaciones', N'Operaciones', N'Gestion de la operacion diaria'),
    (N'supervisor', N'Supervisor', N'Supervision de equipos y asistencia'),
    (N'contabilidad', N'Contabilidad', N'Gestion contable y remuneraciones'),
    (N'gerencia', N'Gerencia', N'Consulta y gestion ejecutiva'),
    (N'colaborador', N'Colaborador', N'Portal personal del trabajador')
) r(code, name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Roles existing
    WHERE existing.companyId = c.id AND existing.code = r.code
);
GO

IF OBJECT_ID(N'dbo.Positions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Positions (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Positions PRIMARY KEY,
        companyId INT NOT NULL,
        code NVARCHAR(30) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(250) NULL,
        isSystem BIT NOT NULL CONSTRAINT DF_Positions_isSystem DEFAULT (0),
        estado BIT NOT NULL CONSTRAINT DF_Positions_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_Positions_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_Positions_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Positions_company_code UNIQUE (companyId, code),
        CONSTRAINT FK_Positions_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id)
    );
END;
GO

INSERT INTO dbo.Positions (companyId, code, name, isSystem)
SELECT c.id, item.code, item.name, 1
FROM dbo.Companies c
CROSS JOIN (VALUES
    (N'operario', N'Operario'),
    (N'supervisor', N'Supervisor'),
    (N'analista', N'Analista')
) item(code, name)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Positions existing
    WHERE existing.companyId = c.id AND existing.code = item.code
);
GO

IF OBJECT_ID(N'dbo.EmploymentTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmploymentTypes (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EmploymentTypes PRIMARY KEY,
        companyId INT NOT NULL,
        code NVARCHAR(30) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(250) NULL,
        isSystem BIT NOT NULL CONSTRAINT DF_EmploymentTypes_isSystem DEFAULT (0),
        estado BIT NOT NULL CONSTRAINT DF_EmploymentTypes_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_EmploymentTypes_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_EmploymentTypes_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_EmploymentTypes_company_code UNIQUE (companyId, code),
        CONSTRAINT FK_EmploymentTypes_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id)
    );
END;
GO

INSERT INTO dbo.EmploymentTypes (companyId, code, name, isSystem)
SELECT c.id, item.code, item.name, 1
FROM dbo.Companies c
CROSS JOIN (VALUES
    (N'planilla', N'Planilla'),
    (N'recibo_honorarios', N'Recibo por honorarios'),
    (N'temporal', N'Temporal')
) item(code, name)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.EmploymentTypes existing
    WHERE existing.companyId = c.id AND existing.code = item.code
);
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        id INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Users PRIMARY KEY,
        companyId INT NOT NULL,
        name NVARCHAR(100) NOT NULL,
        username NVARCHAR(50) NULL,
        email NVARCHAR(150) NOT NULL,
        password NVARCHAR(255) NOT NULL,
        estado BIT NOT NULL
            CONSTRAINT DF_Users_estado DEFAULT (1),
        role NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Users_role DEFAULT (N'colaborador'),
        createdAt DATETIME2 NOT NULL
            CONSTRAINT DF_Users_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL
            CONSTRAINT DF_Users_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Users_email UNIQUE (email),
        CONSTRAINT FK_Users_Companies FOREIGN KEY (companyId)
            REFERENCES dbo.Companies (id),
        CONSTRAINT FK_Users_Roles FOREIGN KEY (companyId, role)
            REFERENCES dbo.Roles (companyId, code)
    );
END;
GO

-- Compatibilidad para instalaciones creadas con una version anterior del esquema.
IF COL_LENGTH(N'dbo.Users', N'companyId') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD companyId INT NULL;
END;
GO

UPDATE dbo.Users
SET companyId = (SELECT id FROM dbo.Companies WHERE code = N'CORE')
WHERE companyId IS NULL;
GO

ALTER TABLE dbo.Users ALTER COLUMN companyId INT NOT NULL;
GO

IF OBJECT_ID(N'dbo.FK_Users_Companies', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.Users WITH CHECK
        ADD CONSTRAINT FK_Users_Companies FOREIGN KEY (companyId)
        REFERENCES dbo.Companies (id);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Users_companyId'
      AND object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    CREATE INDEX IX_Users_companyId ON dbo.Users (companyId);
END;
GO

IF COL_LENGTH(N'dbo.Users', N'role') IS NULL
BEGIN
    ALTER TABLE dbo.Users
        ADD role NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Users_role DEFAULT (N'colaborador');
END;
GO

-- Mantiene el catalogo de roles y migra el valor generico usado anteriormente.
IF OBJECT_ID(N'dbo.CK_Users_role', N'C') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Users DROP CONSTRAINT CK_Users_role;
END;
GO

UPDATE dbo.Users SET role = N'colaborador' WHERE role = N'user';
GO

IF OBJECT_ID(N'dbo.DF_Users_role', N'D') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Users DROP CONSTRAINT DF_Users_role;
END;
GO

ALTER TABLE dbo.Users
    ADD CONSTRAINT DF_Users_role DEFAULT (N'colaborador') FOR role;
GO

IF OBJECT_ID(N'dbo.FK_Users_Roles', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.Users WITH CHECK
        ADD CONSTRAINT FK_Users_Roles FOREIGN KEY (companyId, role)
        REFERENCES dbo.Roles (companyId, code);
END;
GO

IF COL_LENGTH(N'dbo.Users', N'username') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD username NVARCHAR(50) NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_Users_username'
      AND object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    CREATE UNIQUE INDEX UX_Users_username
        ON dbo.Users (username)
        WHERE username IS NOT NULL;
END;
GO

-- Usuario administrador predeterminado. El script es idempotente y puede ejecutarse nuevamente.
IF EXISTS (SELECT 1 FROM dbo.Users WHERE username = N'ADMIN')
BEGIN
    UPDATE dbo.Users
    SET companyId = (SELECT id FROM dbo.Companies WHERE code = N'CORE'),
        name = N'Administrador',
        email = N'admin@rrhh.local',
        password = N'$2a$10$c8UKJap0JPgbJ21tvCPquOHYJRyKqwYlhV83Snan2gCmDpgVLMUNa',
        estado = 1,
        role = N'admin',
        updatedAt = SYSUTCDATETIME()
    WHERE username = N'ADMIN';
END
ELSE
BEGIN
    INSERT INTO dbo.Users (companyId, name, username, email, password, estado, role)
    SELECT
        id,
        N'Administrador',
        N'ADMIN',
        N'admin@rrhh.local',
        N'$2a$10$c8UKJap0JPgbJ21tvCPquOHYJRyKqwYlhV83Snan2gCmDpgVLMUNa',
        1,
        N'admin'
    FROM dbo.Companies
    WHERE code = N'CORE';
END;
GO

IF OBJECT_ID(N'dbo.Collaborators', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Collaborators (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Collaborators PRIMARY KEY,
        companyId INT NOT NULL,
        userId INT NULL,
        employeeCode NVARCHAR(30) NOT NULL,
        documentType NVARCHAR(10) NOT NULL CONSTRAINT DF_Collaborators_documentType DEFAULT (N'DNI'),
        documentNumber NVARCHAR(20) NOT NULL,
        firstName NVARCHAR(100) NOT NULL,
        lastName NVARCHAR(100) NOT NULL,
        email NVARCHAR(150) NULL,
        phone NVARCHAR(30) NULL,
        photoPath NVARCHAR(500) NULL,
        positionId INT NOT NULL,
        employmentTypeId INT NOT NULL,
        clientId INT NULL,
        siteId INT NULL,
        startDate DATE NULL,
        endDate DATE NULL,
        laborStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_Collaborators_laborStatus DEFAULT (N'active'),
        estado BIT NOT NULL CONSTRAINT DF_Collaborators_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_Collaborators_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_Collaborators_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Collaborators_company_employeeCode UNIQUE (companyId, employeeCode),
        CONSTRAINT UQ_Collaborators_company_document UNIQUE (companyId, documentType, documentNumber),
        CONSTRAINT UQ_Collaborators_user UNIQUE (userId),
        CONSTRAINT FK_Collaborators_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id),
        CONSTRAINT FK_Collaborators_Users FOREIGN KEY (userId) REFERENCES dbo.Users (id),
        CONSTRAINT FK_Collaborators_Positions FOREIGN KEY (positionId) REFERENCES dbo.Positions (id),
        CONSTRAINT FK_Collaborators_EmploymentTypes FOREIGN KEY (employmentTypeId) REFERENCES dbo.EmploymentTypes (id),
        CONSTRAINT FK_Collaborators_Clients FOREIGN KEY (clientId) REFERENCES dbo.Clients (id),
        CONSTRAINT FK_Collaborators_Sites FOREIGN KEY (siteId) REFERENCES dbo.Sites (id),
        CONSTRAINT CK_Collaborators_dates CHECK (endDate IS NULL OR endDate >= startDate),
        CONSTRAINT CK_Collaborators_laborStatus CHECK (laborStatus IN (N'pending_hire',N'active',N'vacation',N'leave',N'suspended',N'terminated'))
    );
END;
GO

IF COL_LENGTH(N'dbo.Collaborators', N'laborStatus') IS NULL
BEGIN
    ALTER TABLE dbo.Collaborators ADD laborStatus NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Collaborators_laborStatus DEFAULT (N'active');
END;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Collaborators') AND name = N'startDate' AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.Collaborators ALTER COLUMN startDate DATE NULL;
END;
GO

IF OBJECT_ID(N'dbo.CK_Collaborators_laborStatus', N'C') IS NULL
BEGIN
    ALTER TABLE dbo.Collaborators ADD CONSTRAINT CK_Collaborators_laborStatus
        CHECK (laborStatus IN (N'pending_hire',N'active',N'vacation',N'leave',N'suspended',N'terminated'));
END;
GO

UPDATE dbo.Collaborators
SET laborStatus = CASE WHEN estado = 1 THEN N'active' ELSE N'terminated' END
WHERE laborStatus IS NULL OR laborStatus NOT IN (N'pending_hire',N'active',N'vacation',N'leave',N'suspended',N'terminated');
GO

IF COL_LENGTH(N'dbo.Collaborators', N'photoPath') IS NULL
BEGIN
    ALTER TABLE dbo.Collaborators ADD photoPath NVARCHAR(500) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Collaborators', N'clientId') IS NULL
BEGIN
    ALTER TABLE dbo.Collaborators ADD clientId INT NULL;
END;
GO

IF COL_LENGTH(N'dbo.Collaborators', N'siteId') IS NULL
BEGIN
    ALTER TABLE dbo.Collaborators ADD siteId INT NULL;
END;
GO

IF OBJECT_ID(N'dbo.FK_Collaborators_Clients', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.Collaborators ADD CONSTRAINT FK_Collaborators_Clients FOREIGN KEY (clientId) REFERENCES dbo.Clients (id);
END;
GO

IF OBJECT_ID(N'dbo.FK_Collaborators_Sites', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.Collaborators ADD CONSTRAINT FK_Collaborators_Sites FOREIGN KEY (siteId) REFERENCES dbo.Sites (id);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Collaborators_companyId'
      AND object_id = OBJECT_ID(N'dbo.Collaborators')
)
BEGIN
    CREATE INDEX IX_Collaborators_companyId ON dbo.Collaborators (companyId, estado);
END;
GO

IF OBJECT_ID(N'dbo.Shifts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Shifts (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Shifts PRIMARY KEY,
        companyId INT NOT NULL,
        code NVARCHAR(30) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        startTime TIME(0) NOT NULL,
        endTime TIME(0) NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_Shifts_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_Shifts_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_Shifts_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Shifts_company_code UNIQUE (companyId, code),
        CONSTRAINT FK_Shifts_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id),
        CONSTRAINT CK_Shifts_duration CHECK (startTime <> endTime)
    );
END;
GO

IF OBJECT_ID(N'dbo.CollaboratorAssignments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CollaboratorAssignments (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CollaboratorAssignments PRIMARY KEY,
        companyId INT NOT NULL,
        collaboratorId INT NOT NULL,
        clientId INT NOT NULL,
        siteId INT NOT NULL,
        areaId INT NOT NULL,
        shiftId INT NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE NULL,
        notes NVARCHAR(500) NULL,
        assignedBy INT NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_CollaboratorAssignments_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_CollaboratorAssignments_createdAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_Assignments_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id),
        CONSTRAINT FK_Assignments_Collaborators FOREIGN KEY (collaboratorId) REFERENCES dbo.Collaborators (id),
        CONSTRAINT FK_Assignments_Clients FOREIGN KEY (clientId) REFERENCES dbo.Clients (id),
        CONSTRAINT FK_Assignments_Sites FOREIGN KEY (siteId) REFERENCES dbo.Sites (id),
        CONSTRAINT FK_Assignments_Areas FOREIGN KEY (areaId) REFERENCES dbo.Areas (id),
        CONSTRAINT FK_Assignments_Shifts FOREIGN KEY (shiftId) REFERENCES dbo.Shifts (id),
        CONSTRAINT FK_Assignments_Users FOREIGN KEY (assignedBy) REFERENCES dbo.Users (id),
        CONSTRAINT CK_Assignments_dates CHECK (endDate IS NULL OR endDate >= startDate)
    );
END;
GO

IF OBJECT_ID(N'dbo.WorkTables', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WorkTables (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WorkTables PRIMARY KEY,
        companyId INT NOT NULL,
        clientId INT NOT NULL,
        siteId INT NOT NULL,
        areaId INT NULL,
        code NVARCHAR(30) NOT NULL,
        name NVARCHAR(120) NOT NULL,
        description NVARCHAR(250) NULL,
        estado BIT NOT NULL CONSTRAINT DF_WorkTables_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_WorkTables_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_WorkTables_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_WorkTables_scope_code UNIQUE(companyId,siteId,areaId,code),
        CONSTRAINT FK_WorkTables_Companies FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),
        CONSTRAINT FK_WorkTables_Clients FOREIGN KEY(clientId) REFERENCES dbo.Clients(id),
        CONSTRAINT FK_WorkTables_Sites FOREIGN KEY(siteId) REFERENCES dbo.Sites(id),
        CONSTRAINT FK_WorkTables_Areas FOREIGN KEY(areaId) REFERENCES dbo.Areas(id)
    );
END;
GO

IF OBJECT_ID(N'dbo.WorkTableMovements', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WorkTableMovements (
        id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WorkTableMovements PRIMARY KEY,
        companyId INT NOT NULL,
        collaboratorId INT NOT NULL,
        assignmentId INT NOT NULL,
        previousWorkTableId INT NULL,
        newWorkTableId INT NULL,
        movedBy INT NOT NULL,
        reason NVARCHAR(500) NULL,
        movedAt DATETIME2 NOT NULL CONSTRAINT DF_WorkTableMovements_movedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_WorkTableMovements_Company FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),
        CONSTRAINT FK_WorkTableMovements_Collaborator FOREIGN KEY(collaboratorId) REFERENCES dbo.Collaborators(id),
        CONSTRAINT FK_WorkTableMovements_Assignment FOREIGN KEY(assignmentId) REFERENCES dbo.CollaboratorAssignments(id),
        CONSTRAINT FK_WorkTableMovements_Previous FOREIGN KEY(previousWorkTableId) REFERENCES dbo.WorkTables(id),
        CONSTRAINT FK_WorkTableMovements_New FOREIGN KEY(newWorkTableId) REFERENCES dbo.WorkTables(id),
        CONSTRAINT FK_WorkTableMovements_User FOREIGN KEY(movedBy) REFERENCES dbo.Users(id)
    );
END;
GO

IF COL_LENGTH(N'dbo.CollaboratorAssignments', N'workTableId') IS NULL
BEGIN
    ALTER TABLE dbo.CollaboratorAssignments ADD workTableId INT NULL;
END;
GO

IF OBJECT_ID(N'dbo.FK_Assignments_WorkTables', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.CollaboratorAssignments ADD CONSTRAINT FK_Assignments_WorkTables
        FOREIGN KEY(workTableId) REFERENCES dbo.WorkTables(id);
END;
GO

IF COL_LENGTH(N'dbo.CollaboratorAssignments', N'areaId') IS NULL
BEGIN
    ALTER TABLE dbo.CollaboratorAssignments ADD areaId INT NULL;
END;
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.CollaboratorAssignments')
      AND name = N'areaId'
      AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.CollaboratorAssignments ALTER COLUMN areaId INT NULL;
END;
GO

IF OBJECT_ID(N'dbo.FK_Assignments_Areas', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.CollaboratorAssignments
        ADD CONSTRAINT FK_Assignments_Areas FOREIGN KEY (areaId) REFERENCES dbo.Areas (id);
END;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Assignments_current_collaborator' AND object_id=OBJECT_ID(N'dbo.CollaboratorAssignments'))
BEGIN
    DROP INDEX UX_Assignments_current_collaborator ON dbo.CollaboratorAssignments;
END;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Assignments_current_scope' AND object_id=OBJECT_ID(N'dbo.CollaboratorAssignments'))
BEGIN
    DROP INDEX UX_Assignments_current_scope ON dbo.CollaboratorAssignments;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Assignments_current_area_scope' AND object_id=OBJECT_ID(N'dbo.CollaboratorAssignments'))
BEGIN
    CREATE UNIQUE INDEX UX_Assignments_current_area_scope
        ON dbo.CollaboratorAssignments (collaboratorId,siteId,areaId,shiftId)
        WHERE endDate IS NULL AND estado=1;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Assignments_site_shift' AND object_id=OBJECT_ID(N'dbo.CollaboratorAssignments'))
BEGIN
    CREATE INDEX IX_Assignments_site_shift ON dbo.CollaboratorAssignments (companyId,siteId,shiftId,startDate);
END;
GO

IF OBJECT_ID(N'dbo.HolidayPolicies', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.HolidayPolicies (
        companyId INT NOT NULL CONSTRAINT PK_HolidayPolicies PRIMARY KEY,
        surchargePercent DECIMAL(5,2) NOT NULL CONSTRAINT DF_HolidayPolicies_surcharge DEFAULT (100),
        allowSubstituteRest BIT NOT NULL CONSTRAINT DF_HolidayPolicies_substitute DEFAULT (1),
        useShiftStartDate BIT NOT NULL CONSTRAINT DF_HolidayPolicies_shiftStart DEFAULT (1),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_HolidayPolicies_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_HolidayPolicies_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id),
        CONSTRAINT CK_HolidayPolicies_surcharge CHECK (surchargePercent >= 0 AND surchargePercent <= 999.99)
    );
END;
GO

INSERT INTO dbo.HolidayPolicies (companyId)
SELECT company.id FROM dbo.Companies company
WHERE NOT EXISTS (SELECT 1 FROM dbo.HolidayPolicies policy WHERE policy.companyId = company.id);
GO

IF OBJECT_ID(N'dbo.Holidays', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Holidays (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Holidays PRIMARY KEY,
        companyId INT NOT NULL,
        holidayDate DATE NOT NULL,
        name NVARCHAR(150) NOT NULL,
        dayType NVARCHAR(20) NOT NULL CONSTRAINT DF_Holidays_dayType DEFAULT (N'holiday'),
        scope NVARCHAR(20) NOT NULL CONSTRAINT DF_Holidays_scope DEFAULT (N'national'),
        isPaid BIT NOT NULL CONSTRAINT DF_Holidays_isPaid DEFAULT (1),
        surchargePercent DECIMAL(5,2) NULL,
        allowSubstituteRest BIT NULL,
        notes NVARCHAR(500) NULL,
        estado BIT NOT NULL CONSTRAINT DF_Holidays_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_Holidays_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_Holidays_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Holidays_company_date UNIQUE (companyId, holidayDate),
        CONSTRAINT FK_Holidays_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id),
        CONSTRAINT CK_Holidays_dayType CHECK (dayType IN (N'holiday', N'non_working_day')),
        CONSTRAINT CK_Holidays_scope CHECK (scope IN (N'national', N'regional', N'company')),
        CONSTRAINT CK_Holidays_surcharge CHECK (surchargePercent IS NULL OR (surchargePercent >= 0 AND surchargePercent <= 999.99))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Holidays_company_year' AND object_id=OBJECT_ID(N'dbo.Holidays'))
BEGIN
    CREATE INDEX IX_Holidays_company_year ON dbo.Holidays (companyId, holidayDate, estado);
END;
GO

IF OBJECT_ID(N'dbo.AttendanceStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceStatuses (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AttendanceStatuses PRIMARY KEY,
        companyId INT NOT NULL, code NVARCHAR(30) NOT NULL, name NVARCHAR(100) NOT NULL,
        description NVARCHAR(250) NULL, isSystem BIT NOT NULL CONSTRAINT DF_AttendanceStatuses_isSystem DEFAULT(0),
        estado BIT NOT NULL CONSTRAINT DF_AttendanceStatuses_estado DEFAULT(1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_AttendanceStatuses_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_AttendanceStatuses_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_AttendanceStatuses_company_code UNIQUE(companyId,code),
        CONSTRAINT FK_AttendanceStatuses_Companies FOREIGN KEY(companyId) REFERENCES dbo.Companies(id)
    );
END;
GO

IF OBJECT_ID(N'dbo.IncidentTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.IncidentTypes (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_IncidentTypes PRIMARY KEY,
        companyId INT NOT NULL, code NVARCHAR(30) NOT NULL, name NVARCHAR(100) NOT NULL,
        description NVARCHAR(250) NULL, isSystem BIT NOT NULL CONSTRAINT DF_IncidentTypes_isSystem DEFAULT(0),
        estado BIT NOT NULL CONSTRAINT DF_IncidentTypes_estado DEFAULT(1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_IncidentTypes_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_IncidentTypes_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_IncidentTypes_company_code UNIQUE(companyId,code),
        CONSTRAINT FK_IncidentTypes_Companies FOREIGN KEY(companyId) REFERENCES dbo.Companies(id)
    );
END;
GO

IF OBJECT_ID(N'dbo.ToleranceRules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ToleranceRules (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ToleranceRules PRIMARY KEY,
        companyId INT NOT NULL, code NVARCHAR(30) NOT NULL, name NVARCHAR(100) NOT NULL,
        entryToleranceMinutes INT NOT NULL CONSTRAINT DF_ToleranceRules_entry DEFAULT(0),
        lateAfterMinutes INT NOT NULL CONSTRAINT DF_ToleranceRules_late DEFAULT(1),
        absenceAfterMinutes INT NOT NULL CONSTRAINT DF_ToleranceRules_absence DEFAULT(60),
        exitToleranceMinutes INT NOT NULL CONSTRAINT DF_ToleranceRules_exit DEFAULT(0),
        description NVARCHAR(250) NULL, estado BIT NOT NULL CONSTRAINT DF_ToleranceRules_estado DEFAULT(1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_ToleranceRules_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_ToleranceRules_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_ToleranceRules_company_code UNIQUE(companyId,code),
        CONSTRAINT FK_ToleranceRules_Companies FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),
        CONSTRAINT CK_ToleranceRules_minutes CHECK(entryToleranceMinutes>=0 AND lateAfterMinutes>=0 AND absenceAfterMinutes>=lateAfterMinutes AND exitToleranceMinutes>=0)
    );
END;
GO

INSERT dbo.AttendanceStatuses(companyId,code,name,description,isSystem)
SELECT c.id,v.code,v.name,v.description,1 FROM dbo.Companies c CROSS JOIN (VALUES
 (N'PRESENT',N'Presente',N'Asistencia dentro del horario'),(N'LATE',N'Tardanza',N'Ingreso posterior a la tolerancia'),
 (N'ABSENT',N'Falta',N'Inasistencia del colaborador'),(N'JUSTIFIED',N'Justificado',N'Inasistencia o tardanza justificada'),
 (N'VACATION',N'Vacaciones',N'Período vacacional'),(N'LEAVE',N'Licencia',N'Licencia autorizada'),
 (N'HOLIDAY',N'Feriado',N'Día feriado configurado'),(N'PERMISSION',N'Permiso',N'Permiso autorizado por la empresa'),
 (N'MEDICAL_LEAVE',N'Descanso médico',N'Descanso sustentado por indicación médica'),
 (N'SUSPENDED',N'Suspendido',N'Colaborador con suspensión vigente'),
 (N'MANUAL_ENTRY',N'Marcación manual',N'Marcación registrada o corregida manualmente'),
 (N'OBSERVED',N'Observado',N'Registro pendiente de revisión'),
 (N'REJECTED',N'Rechazado',N'Registro revisado y rechazado'))v(code,name,description)
WHERE NOT EXISTS(SELECT 1 FROM dbo.AttendanceStatuses x WHERE x.companyId=c.id AND x.code=v.code);
GO

INSERT dbo.IncidentTypes(companyId,code,name,description,isSystem)
SELECT c.id,v.code,v.name,v.description,1 FROM dbo.Companies c CROSS JOIN (VALUES
 (N'LATE',N'Tardanza',N'Ingreso posterior al horario'),(N'ABSENCE',N'Inasistencia',N'Falta total o parcial'),
 (N'EARLY_EXIT',N'Salida anticipada',N'Salida antes del horario'),(N'OVERTIME',N'Horas extras',N'Tiempo adicional laborado'),
 (N'OTHER',N'Otro',N'Otra incidencia de asistencia'))v(code,name,description)
WHERE NOT EXISTS(SELECT 1 FROM dbo.IncidentTypes x WHERE x.companyId=c.id AND x.code=v.code);
GO

IF OBJECT_ID(N'dbo.ContractTemplates', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ContractTemplates (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ContractTemplates PRIMARY KEY,
        companyId INT NOT NULL, code NVARCHAR(30) NOT NULL, name NVARCHAR(120) NOT NULL,
        title NVARCHAR(200) NOT NULL, bodyText NVARCHAR(MAX) NOT NULL,
        footerText NVARCHAR(500) NULL, isDefault BIT NOT NULL CONSTRAINT DF_ContractTemplates_default DEFAULT(0),
        estado BIT NOT NULL CONSTRAINT DF_ContractTemplates_estado DEFAULT(1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_ContractTemplates_created DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_ContractTemplates_updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_ContractTemplates_company_code UNIQUE(companyId,code),
        CONSTRAINT FK_ContractTemplates_Companies FOREIGN KEY(companyId) REFERENCES dbo.Companies(id)
    );
END;
GO

INSERT dbo.ContractTemplates(companyId,code,name,title,bodyText,footerText,isDefault)
SELECT c.id,N'GENERAL',N'Contrato laboral general',N'CONTRATO DE TRABAJO',
N'Conste por el presente documento el contrato de trabajo celebrado entre {{empresa_razon_social}}, identificada con RUC {{empresa_ruc}}, y {{colaborador_nombre}}, identificado(a) con {{documento_tipo}} N.° {{documento_numero}}.\n\nEl colaborador prestará servicios en el cargo de {{cargo}}, bajo el tipo de vínculo {{tipo_vinculo}}, desde {{fecha_inicio}} hasta {{fecha_fin}}.\n\nEl número asignado al presente contrato es {{numero_contrato}}. Las partes declaran conocer y aceptar las condiciones descritas en este documento.',
N'Firmado en señal de conformidad por ambas partes.',1
FROM dbo.Companies c WHERE NOT EXISTS(SELECT 1 FROM dbo.ContractTemplates t WHERE t.companyId=c.id AND t.code=N'GENERAL');
GO

IF OBJECT_ID(N'dbo.PersonnelProcesses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PersonnelProcesses (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PersonnelProcesses PRIMARY KEY,
        companyId INT NOT NULL,
        collaboratorId INT NOT NULL,
        processType NVARCHAR(30) NOT NULL,
        incidentTypeId INT NULL,
        contractTemplateId INT NULL,
        relatedProcessId INT NULL,
        employmentTypeId INT NULL,
        contractNumber NVARCHAR(50) NULL,
        eventDate DATE NULL,
        startDate DATE NULL,
        endDate DATE NULL,
        days DECIMAL(6,2) NULL,
        isPaid BIT NULL,
        reason NVARCHAR(200) NULL,
        description NVARCHAR(1000) NULL,
        decisionNotes NVARCHAR(500) NULL,
        generatedPdfPath NVARCHAR(500) NULL,
        signedPdfPath NVARCHAR(500) NULL,
        documentStatus NVARCHAR(20) NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_PersonnelProcesses_status DEFAULT (N'draft'),
        createdBy INT NOT NULL,
        approvedBy INT NULL,
        approvedAt DATETIME2 NULL,
        estado BIT NOT NULL CONSTRAINT DF_PersonnelProcesses_estado DEFAULT (1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_PersonnelProcesses_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_PersonnelProcesses_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_PersonnelProcesses_Companies FOREIGN KEY (companyId) REFERENCES dbo.Companies (id),
        CONSTRAINT FK_PersonnelProcesses_Collaborators FOREIGN KEY (collaboratorId) REFERENCES dbo.Collaborators (id),
        CONSTRAINT FK_PersonnelProcesses_IncidentTypes FOREIGN KEY (incidentTypeId) REFERENCES dbo.IncidentTypes (id),
        CONSTRAINT FK_PersonnelProcesses_ContractTemplates FOREIGN KEY (contractTemplateId) REFERENCES dbo.ContractTemplates (id),
        CONSTRAINT FK_PersonnelProcesses_Related FOREIGN KEY (relatedProcessId) REFERENCES dbo.PersonnelProcesses (id),
        CONSTRAINT FK_PersonnelProcesses_EmploymentTypes FOREIGN KEY (employmentTypeId) REFERENCES dbo.EmploymentTypes (id),
        CONSTRAINT FK_PersonnelProcesses_CreatedBy FOREIGN KEY (createdBy) REFERENCES dbo.Users (id),
        CONSTRAINT FK_PersonnelProcesses_ApprovedBy FOREIGN KEY (approvedBy) REFERENCES dbo.Users (id),
        CONSTRAINT CK_PersonnelProcesses_type CHECK (processType IN (N'hire',N'termination',N'contract',N'vacation',N'leave',N'incident',N'justification')),
        CONSTRAINT CK_PersonnelProcesses_status CHECK (status IN (N'draft',N'pending',N'approved',N'rejected',N'cancelled',N'issued')),
        CONSTRAINT CK_PersonnelProcesses_documentStatus CHECK (documentStatus IS NULL OR documentStatus IN(N'pending_signature',N'signed')),
        CONSTRAINT CK_PersonnelProcesses_dates CHECK (endDate IS NULL OR startDate IS NULL OR endDate >= startDate),
        CONSTRAINT CK_PersonnelProcesses_days CHECK (days IS NULL OR days >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.CK_PersonnelProcesses_status', N'C') IS NOT NULL
BEGIN
    ALTER TABLE dbo.PersonnelProcesses DROP CONSTRAINT CK_PersonnelProcesses_status;
END;
ALTER TABLE dbo.PersonnelProcesses ADD CONSTRAINT CK_PersonnelProcesses_status
    CHECK (status IN (N'draft',N'pending',N'approved',N'rejected',N'cancelled',N'issued'));
GO

UPDATE c SET status=N'issued',updatedAt=SYSUTCDATETIME()
FROM dbo.PersonnelProcesses c
WHERE c.processType=N'contract' AND c.status<>N'issued'
  AND EXISTS(SELECT 1 FROM dbo.PersonnelProcesses h WHERE h.companyId=c.companyId AND h.collaboratorId=c.collaboratorId AND h.processType=N'hire' AND h.status=N'approved');
GO

-- Regulariza colaboradores activos creados antes del flujo formal de Altas.
-- Conserva como fecha efectiva la fecha histórica de ingreso de su ficha.
UPDATE p
SET p.status=N'approved', p.eventDate=c.startDate,
    p.approvedBy=adminUser.id, p.approvedAt=COALESCE(p.approvedAt,SYSUTCDATETIME()),
    p.decisionNotes=COALESCE(p.decisionNotes,N'Alta histórica regularizada durante la migración del flujo.'),
    p.updatedAt=SYSUTCDATETIME()
FROM dbo.PersonnelProcesses p
INNER JOIN dbo.Collaborators c ON c.id=p.collaboratorId AND c.companyId=p.companyId
CROSS APPLY (
    SELECT TOP 1 u.id FROM dbo.Users u
    WHERE u.companyId=p.companyId AND u.role=N'admin' AND u.estado=1
    ORDER BY u.id
) adminUser
WHERE p.processType=N'hire' AND p.status=N'pending' AND c.estado=1
  AND NOT EXISTS (
      SELECT 1 FROM dbo.PersonnelProcesses approved
      WHERE approved.companyId=p.companyId AND approved.collaboratorId=p.collaboratorId
        AND approved.processType=N'hire' AND approved.status=N'approved'
  );
GO

IF COL_LENGTH(N'dbo.PersonnelProcesses', N'contractTemplateId') IS NULL ALTER TABLE dbo.PersonnelProcesses ADD contractTemplateId INT NULL;
IF COL_LENGTH(N'dbo.PersonnelProcesses', N'generatedPdfPath') IS NULL ALTER TABLE dbo.PersonnelProcesses ADD generatedPdfPath NVARCHAR(500) NULL;
IF COL_LENGTH(N'dbo.PersonnelProcesses', N'signedPdfPath') IS NULL ALTER TABLE dbo.PersonnelProcesses ADD signedPdfPath NVARCHAR(500) NULL;
IF COL_LENGTH(N'dbo.PersonnelProcesses', N'documentStatus') IS NULL ALTER TABLE dbo.PersonnelProcesses ADD documentStatus NVARCHAR(20) NULL;
GO

IF OBJECT_ID(N'dbo.FK_PersonnelProcesses_ContractTemplates', N'F') IS NULL
    ALTER TABLE dbo.PersonnelProcesses ADD CONSTRAINT FK_PersonnelProcesses_ContractTemplates FOREIGN KEY(contractTemplateId) REFERENCES dbo.ContractTemplates(id);
IF OBJECT_ID(N'dbo.CK_PersonnelProcesses_documentStatus', N'C') IS NULL
    ALTER TABLE dbo.PersonnelProcesses ADD CONSTRAINT CK_PersonnelProcesses_documentStatus CHECK(documentStatus IS NULL OR documentStatus IN(N'pending_signature',N'signed'));
GO

IF OBJECT_ID(N'dbo.CK_PersonnelProcesses_documentStatus', N'C') IS NOT NULL
    ALTER TABLE dbo.PersonnelProcesses DROP CONSTRAINT CK_PersonnelProcesses_documentStatus;
UPDATE dbo.PersonnelProcesses SET documentStatus=N'pending_signature'
WHERE processType=N'contract' AND (documentStatus IS NULL OR documentStatus IN(N'pending',N'generated'));
ALTER TABLE dbo.PersonnelProcesses ADD CONSTRAINT CK_PersonnelProcesses_documentStatus
    CHECK(documentStatus IS NULL OR documentStatus IN(N'pending_signature',N'signed'));
GO

IF COL_LENGTH(N'dbo.PersonnelProcesses', N'incidentTypeId') IS NULL
BEGIN
    ALTER TABLE dbo.PersonnelProcesses ADD incidentTypeId INT NULL;
END;
GO

IF OBJECT_ID(N'dbo.FK_PersonnelProcesses_IncidentTypes', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.PersonnelProcesses ADD CONSTRAINT FK_PersonnelProcesses_IncidentTypes
        FOREIGN KEY(incidentTypeId) REFERENCES dbo.IncidentTypes(id);
END;
GO

IF COL_LENGTH(N'dbo.PersonnelProcesses', N'decisionNotes') IS NULL
BEGIN
    ALTER TABLE dbo.PersonnelProcesses ADD decisionNotes NVARCHAR(500) NULL;
END;
GO

-- Altas y bajas forman parte de un flujo obligatorio de aprobación por Admin.
-- Los borradores históricos se incorporan a la bandeja de solicitudes pendientes.
UPDATE dbo.PersonnelProcesses
SET status = N'pending', updatedAt = SYSUTCDATETIME()
WHERE processType IN (N'hire', N'termination') AND status = N'draft';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_PersonnelProcesses_company_type' AND object_id=OBJECT_ID(N'dbo.PersonnelProcesses'))
BEGIN
    CREATE INDEX IX_PersonnelProcesses_company_type
        ON dbo.PersonnelProcesses (companyId, processType, status, eventDate, startDate);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_PersonnelProcesses_contract' AND object_id=OBJECT_ID(N'dbo.PersonnelProcesses'))
BEGIN
    CREATE UNIQUE INDEX UX_PersonnelProcesses_contract
        ON dbo.PersonnelProcesses (companyId, contractNumber)
        WHERE contractNumber IS NOT NULL AND processType = N'contract';
END;
GO

-- Motivos controlados por tipo de proceso; el detalle libre permanece en description.
UPDATE dbo.PersonnelProcesses SET reason=CASE processType
    WHEN N'hire' THEN N'Alta de colaborador'
    WHEN N'termination' THEN N'Baja de colaborador'
    WHEN N'contract' THEN N'Emisión de contrato'
    WHEN N'vacation' THEN N'Goce vacacional'
    WHEN N'leave' THEN N'Licencia laboral'
    WHEN N'justification' THEN N'Justificación de incidencia'
    ELSE reason END
WHERE processType<>N'incident';

UPDATE p SET p.reason=it.name
FROM dbo.PersonnelProcesses p INNER JOIN dbo.IncidentTypes it ON it.id=p.incidentTypeId
WHERE p.processType=N'incident';
GO

IF OBJECT_ID(N'dbo.AttendanceSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceSettings (
        companyId INT NOT NULL CONSTRAINT PK_AttendanceSettings PRIMARY KEY,
        qrValidityMinutes INT NOT NULL CONSTRAINT DF_AttendanceSettings_qr DEFAULT(3),
        requireGps BIT NOT NULL CONSTRAINT DF_AttendanceSettings_gps DEFAULT(0),
        validateDevice BIT NOT NULL CONSTRAINT DF_AttendanceSettings_device DEFAULT(0),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_AttendanceSettings_updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_AttendanceSettings_Companies FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),
        CONSTRAINT CK_AttendanceSettings_qr CHECK(qrValidityMinutes BETWEEN 1 AND 30)
    );
END;
GO

INSERT dbo.AttendanceSettings(companyId)
SELECT id FROM dbo.Companies c WHERE NOT EXISTS(SELECT 1 FROM dbo.AttendanceSettings s WHERE s.companyId=c.id);
GO

IF OBJECT_ID(N'dbo.AttendanceSheets', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceSheets (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AttendanceSheets PRIMARY KEY,
        companyId INT NOT NULL, clientId INT NOT NULL, siteId INT NOT NULL, areaId INT NOT NULL, shiftId INT NOT NULL,
        attendanceDate DATE NOT NULL, supervisorId INT NOT NULL, status NVARCHAR(30) NOT NULL CONSTRAINT DF_AttendanceSheets_status DEFAULT(N'in_progress'),
        notes NVARCHAR(500) NULL, closedAt DATETIME2 NULL, reviewedBy INT NULL, reviewedAt DATETIME2 NULL,
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_AttendanceSheets_created DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_AttendanceSheets_updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_AttendanceSheets_scope UNIQUE(companyId,siteId,areaId,shiftId,attendanceDate),
        CONSTRAINT FK_AttendanceSheets_Companies FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),
        CONSTRAINT FK_AttendanceSheets_Clients FOREIGN KEY(clientId) REFERENCES dbo.Clients(id),
        CONSTRAINT FK_AttendanceSheets_Sites FOREIGN KEY(siteId) REFERENCES dbo.Sites(id),
        CONSTRAINT FK_AttendanceSheets_Areas FOREIGN KEY(areaId) REFERENCES dbo.Areas(id),
        CONSTRAINT FK_AttendanceSheets_Shifts FOREIGN KEY(shiftId) REFERENCES dbo.Shifts(id),
        CONSTRAINT FK_AttendanceSheets_Supervisor FOREIGN KEY(supervisorId) REFERENCES dbo.Users(id),
        CONSTRAINT FK_AttendanceSheets_Reviewer FOREIGN KEY(reviewedBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_AttendanceSheets_status CHECK(status IN(N'pending',N'in_progress',N'supervisor_closed',N'rrhh_observed',N'rrhh_approved',N'reopened',N'cancelled'))
    );
END;
GO

IF OBJECT_ID(N'dbo.AttendanceExpected', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceExpected (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AttendanceExpected PRIMARY KEY,
        sheetId INT NOT NULL, collaboratorId INT NOT NULL, attendanceStatusId INT NULL,
        supervisorValidation NVARCHAR(20) NULL, observation NVARCHAR(500) NULL,
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_AttendanceExpected_created DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_AttendanceExpected UNIQUE(sheetId,collaboratorId),
        CONSTRAINT FK_AttendanceExpected_Sheet FOREIGN KEY(sheetId) REFERENCES dbo.AttendanceSheets(id),
        CONSTRAINT FK_AttendanceExpected_Collaborator FOREIGN KEY(collaboratorId) REFERENCES dbo.Collaborators(id),
        CONSTRAINT FK_AttendanceExpected_Status FOREIGN KEY(attendanceStatusId) REFERENCES dbo.AttendanceStatuses(id),
        CONSTRAINT CK_AttendanceExpected_validation CHECK(supervisorValidation IS NULL OR supervisorValidation IN(N'confirmed',N'observed',N'annulled',N'impersonation'))
    );
END;
GO

IF COL_LENGTH(N'dbo.AttendanceExpected', N'workTableId') IS NULL
BEGIN
    ALTER TABLE dbo.AttendanceExpected ADD workTableId INT NULL;
END;
GO

IF OBJECT_ID(N'dbo.FK_AttendanceExpected_WorkTable', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.AttendanceExpected ADD CONSTRAINT FK_AttendanceExpected_WorkTable
        FOREIGN KEY(workTableId) REFERENCES dbo.WorkTables(id);
END;
GO

IF OBJECT_ID(N'dbo.AttendanceQrEvents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceQrEvents (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AttendanceQrEvents PRIMARY KEY,
        sheetId INT NOT NULL, markingType NVARCHAR(20) NOT NULL, tokenHash CHAR(64) NOT NULL,
        expiresAt DATETIME2 NOT NULL, active BIT NOT NULL CONSTRAINT DF_AttendanceQrEvents_active DEFAULT(1),
        createdBy INT NOT NULL, createdAt DATETIME2 NOT NULL CONSTRAINT DF_AttendanceQrEvents_created DEFAULT SYSUTCDATETIME(),
        closedAt DATETIME2 NULL,
        CONSTRAINT UQ_AttendanceQrEvents_token UNIQUE(tokenHash),
        CONSTRAINT FK_AttendanceQrEvents_Sheet FOREIGN KEY(sheetId) REFERENCES dbo.AttendanceSheets(id),
        CONSTRAINT FK_AttendanceQrEvents_User FOREIGN KEY(createdBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_AttendanceQrEvents_type CHECK(markingType IN(N'entry',N'exit',N'presence'))
    );
END;
GO

IF OBJECT_ID(N'dbo.AttendanceMarks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceMarks (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AttendanceMarks PRIMARY KEY,
        sheetId INT NOT NULL, qrEventId INT NULL, collaboratorId INT NOT NULL, markingType NVARCHAR(20) NOT NULL,
        markedAt DATETIME2 NOT NULL CONSTRAINT DF_AttendanceMarks_marked DEFAULT SYSUTCDATETIME(),
        source NVARCHAR(20) NOT NULL, attendanceStatusId INT NULL, minutesLate INT NULL,
        reason NVARCHAR(250) NULL, observation NVARCHAR(500) NULL, deviceInfo NVARCHAR(250) NULL,
        latitude DECIMAL(9,6) NULL, longitude DECIMAL(9,6) NULL, registeredBy INT NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_AttendanceMarks_estado DEFAULT(1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_AttendanceMarks_created DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_AttendanceMarks_Sheet FOREIGN KEY(sheetId) REFERENCES dbo.AttendanceSheets(id),
        CONSTRAINT FK_AttendanceMarks_Event FOREIGN KEY(qrEventId) REFERENCES dbo.AttendanceQrEvents(id),
        CONSTRAINT FK_AttendanceMarks_Collaborator FOREIGN KEY(collaboratorId) REFERENCES dbo.Collaborators(id),
        CONSTRAINT FK_AttendanceMarks_Status FOREIGN KEY(attendanceStatusId) REFERENCES dbo.AttendanceStatuses(id),
        CONSTRAINT FK_AttendanceMarks_User FOREIGN KEY(registeredBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_AttendanceMarks_type CHECK(markingType IN(N'entry',N'exit',N'presence')),
        CONSTRAINT CK_AttendanceMarks_source CHECK(source IN(N'qr',N'manual'))
    );
END;
GO

IF COL_LENGTH(N'dbo.AttendanceMarks', N'workTableId') IS NULL
BEGIN
    ALTER TABLE dbo.AttendanceMarks ADD workTableId INT NULL;
END;
GO

IF OBJECT_ID(N'dbo.FK_AttendanceMarks_WorkTable', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.AttendanceMarks ADD CONSTRAINT FK_AttendanceMarks_WorkTable
        FOREIGN KEY(workTableId) REFERENCES dbo.WorkTables(id);
END;
GO

IF OBJECT_ID(N'dbo.CK_AttendanceMarks_source', N'C') IS NOT NULL
BEGIN
    ALTER TABLE dbo.AttendanceMarks DROP CONSTRAINT CK_AttendanceMarks_source;
END;
GO

ALTER TABLE dbo.AttendanceMarks ADD CONSTRAINT CK_AttendanceMarks_source
    CHECK(source IN(N'qr',N'manual',N'scanner'));
GO

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_AttendanceMarks_sheet_person_type' AND object_id=OBJECT_ID(N'dbo.AttendanceMarks'))
BEGIN
    CREATE UNIQUE INDEX UX_AttendanceMarks_sheet_person_type
        ON dbo.AttendanceMarks(sheetId,collaboratorId,markingType)
        WHERE estado=1;
END;
GO

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_AttendanceMarks_event_person' AND object_id=OBJECT_ID(N'dbo.AttendanceMarks'))
BEGIN
    CREATE UNIQUE INDEX UX_AttendanceMarks_event_person ON dbo.AttendanceMarks(qrEventId,collaboratorId,markingType) WHERE qrEventId IS NOT NULL AND estado=1;
END;
GO

IF OBJECT_ID(N'dbo.AttendanceAudit', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AttendanceAudit (
        id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AttendanceAudit PRIMARY KEY,
        companyId INT NOT NULL, sheetId INT NULL, action NVARCHAR(60) NOT NULL, userId INT NOT NULL,
        collaboratorId INT NULL, detail NVARCHAR(1000) NULL, deviceInfo NVARCHAR(250) NULL, ipAddress NVARCHAR(64) NULL,
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_AttendanceAudit_created DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_AttendanceAudit_Company FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),
        CONSTRAINT FK_AttendanceAudit_Sheet FOREIGN KEY(sheetId) REFERENCES dbo.AttendanceSheets(id),
        CONSTRAINT FK_AttendanceAudit_User FOREIGN KEY(userId) REFERENCES dbo.Users(id),
        CONSTRAINT FK_AttendanceAudit_Collaborator FOREIGN KEY(collaboratorId) REFERENCES dbo.Collaborators(id)
    );
END;
GO

IF COL_LENGTH(N'dbo.Collaborators',N'baseSalary') IS NULL
    ALTER TABLE dbo.Collaborators ADD baseSalary DECIMAL(12,2) NULL;
GO

IF OBJECT_ID(N'dbo.BonusTypes',N'U') IS NULL CREATE TABLE dbo.BonusTypes(id INT IDENTITY PRIMARY KEY,companyId INT NOT NULL,code NVARCHAR(30) NOT NULL,name NVARCHAR(100) NOT NULL,description NVARCHAR(250),estado BIT NOT NULL DEFAULT(1),createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),CONSTRAINT UQ_BonusTypes UNIQUE(companyId,code),CONSTRAINT FK_BonusTypes_Company FOREIGN KEY(companyId) REFERENCES dbo.Companies(id));
GO
INSERT dbo.BonusTypes(companyId,code,name,description) SELECT c.id,v.code,v.name,v.description FROM dbo.Companies c CROSS JOIN(VALUES(N'ENTRY',N'Bono de ingreso',N'Para colaboradores dentro de la ventana posterior al Alta'),(N'PERMANENCE',N'Bono de permanencia',N'Por antigüedad y asistencia'),(N'PRODUCTIVITY',N'Bono de alta productividad',N'Calculado por factor manual de productividad'))v(code,name,description) WHERE NOT EXISTS(SELECT 1 FROM dbo.BonusTypes b WHERE b.companyId=c.id AND b.code=v.code);
GO
IF OBJECT_ID(N'dbo.BonusRules',N'U') IS NULL CREATE TABLE dbo.BonusRules(id INT IDENTITY PRIMARY KEY,companyId INT NOT NULL,areaId INT NOT NULL,bonusTypeId INT NOT NULL,name NVARCHAR(120) NOT NULL,calculationMode NVARCHAR(20) NOT NULL,baseSource NVARCHAR(30) NOT NULL DEFAULT N'salary',fixedAmount DECIMAL(12,2),percentage DECIMAL(7,4),monthlyBonusBase DECIMAL(12,2),minAttendanceDays INT NOT NULL DEFAULT(0),maxAbsences INT NOT NULL DEFAULT(0),maxLateArrivals INT NOT NULL DEFAULT(0),minSeniorityDays INT NOT NULL DEFAULT(0),entryWindowDays INT NOT NULL DEFAULT(30),productivityMin DECIMAL(5,2),productivityMax DECIMAL(5,2),validFrom DATE NOT NULL,validTo DATE,ruleStatus NVARCHAR(20) NOT NULL DEFAULT N'draft',createdBy INT NOT NULL,createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),CONSTRAINT FK_BonusRules_Company FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),CONSTRAINT FK_BonusRules_Area FOREIGN KEY(areaId) REFERENCES dbo.Areas(id),CONSTRAINT FK_BonusRules_Type FOREIGN KEY(bonusTypeId) REFERENCES dbo.BonusTypes(id),CONSTRAINT FK_BonusRules_User FOREIGN KEY(createdBy) REFERENCES dbo.Users(id),CONSTRAINT CK_BonusRules_Mode CHECK(calculationMode IN(N'fixed',N'percentage')),CONSTRAINT CK_BonusRules_Base CHECK(baseSource IN(N'salary',N'monthly_bonus_base')),CONSTRAINT CK_BonusRules_Status CHECK(ruleStatus IN(N'draft',N'active',N'inactive')),CONSTRAINT CK_BonusRules_Productivity CHECK((productivityMin IS NULL OR productivityMin BETWEEN 0 AND 100) AND (productivityMax IS NULL OR productivityMax BETWEEN 0 AND 100)));
GO
IF OBJECT_ID(N'dbo.BonusCampaigns',N'U') IS NULL CREATE TABLE dbo.BonusCampaigns(id INT IDENTITY PRIMARY KEY,companyId INT NOT NULL,name NVARCHAR(150) NOT NULL,periodStart DATE NOT NULL,periodEnd DATE NOT NULL,clientId INT NOT NULL,siteId INT NOT NULL,areaId INT NOT NULL,bonusTypeId INT NOT NULL,ruleId INT NOT NULL,status NVARCHAR(30) NOT NULL DEFAULT N'draft',notes NVARCHAR(500),createdBy INT NOT NULL,approvedBy INT,approvedAt DATETIME2,createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),CONSTRAINT FK_BonusCampaign_Company FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),CONSTRAINT FK_BonusCampaign_Client FOREIGN KEY(clientId) REFERENCES dbo.Clients(id),CONSTRAINT FK_BonusCampaign_Site FOREIGN KEY(siteId) REFERENCES dbo.Sites(id),CONSTRAINT FK_BonusCampaign_Area FOREIGN KEY(areaId) REFERENCES dbo.Areas(id),CONSTRAINT FK_BonusCampaign_Type FOREIGN KEY(bonusTypeId) REFERENCES dbo.BonusTypes(id),CONSTRAINT FK_BonusCampaign_Rule FOREIGN KEY(ruleId) REFERENCES dbo.BonusRules(id),CONSTRAINT FK_BonusCampaign_Created FOREIGN KEY(createdBy) REFERENCES dbo.Users(id),CONSTRAINT FK_BonusCampaign_Approved FOREIGN KEY(approvedBy) REFERENCES dbo.Users(id),CONSTRAINT CK_BonusCampaign_Status CHECK(status IN(N'draft',N'active',N'calculating',N'calculated',N'in_review',N'approved',N'observed',N'closed',N'cancelled')),CONSTRAINT CK_BonusCampaign_Dates CHECK(periodEnd>=periodStart));
GO
IF OBJECT_ID(N'dbo.BonusPeriods',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.BonusPeriods(
  id INT IDENTITY PRIMARY KEY,companyId INT NOT NULL,name NVARCHAR(100) NOT NULL,
  periodStart DATE NOT NULL,periodEnd DATE NOT NULL,status NVARCHAR(20) NOT NULL DEFAULT N'draft',
  createdBy INT NOT NULL,closedBy INT NULL,closedAt DATETIME2 NULL,
  createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_BonusPeriod_Company FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),
  CONSTRAINT FK_BonusPeriod_Created FOREIGN KEY(createdBy) REFERENCES dbo.Users(id),
  CONSTRAINT FK_BonusPeriod_Closed FOREIGN KEY(closedBy) REFERENCES dbo.Users(id),
  CONSTRAINT UQ_BonusPeriod_Dates UNIQUE(companyId,periodStart,periodEnd),
  CONSTRAINT CK_BonusPeriod_Dates CHECK(periodEnd>=periodStart),
  CONSTRAINT CK_BonusPeriod_Status CHECK(status IN(N'draft',N'open',N'closed',N'cancelled'))
 );
END;
GO
IF OBJECT_ID(N'dbo.BonusSettings',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.BonusSettings(
  companyId INT NOT NULL PRIMARY KEY,paymentFrequency NVARCHAR(20) NOT NULL DEFAULT N'monthly',
  cutoffDay INT NOT NULL DEFAULT 15,updatedBy INT NULL,updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_BonusSettings_Company FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),
  CONSTRAINT FK_BonusSettings_User FOREIGN KEY(updatedBy) REFERENCES dbo.Users(id),
  CONSTRAINT CK_BonusSettings_Frequency CHECK(paymentFrequency IN(N'monthly',N'biweekly')),
  CONSTRAINT CK_BonusSettings_Cutoff CHECK(cutoffDay BETWEEN 1 AND 27)
 );
END;
GO
INSERT dbo.BonusSettings(companyId) SELECT id FROM dbo.Companies c WHERE NOT EXISTS(SELECT 1 FROM dbo.BonusSettings s WHERE s.companyId=c.id);
GO
IF COL_LENGTH(N'dbo.BonusPeriods',N'frequency') IS NULL ALTER TABLE dbo.BonusPeriods ADD frequency NVARCHAR(20) NOT NULL CONSTRAINT DF_BonusPeriods_frequency DEFAULT N'monthly';
GO
IF COL_LENGTH(N'dbo.BonusCampaigns',N'periodId') IS NULL ALTER TABLE dbo.BonusCampaigns ADD periodId INT NULL;
GO
INSERT dbo.BonusPeriods(companyId,name,periodStart,periodEnd,status,createdBy)
SELECT d.companyId,CONCAT(N'Periodo ',CHOOSE(MONTH(d.periodStart),N'Enero',N'Febrero',N'Marzo',N'Abril',N'Mayo',N'Junio',N'Julio',N'Agosto',N'Septiembre',N'Octubre',N'Noviembre',N'Diciembre'),N' ',YEAR(d.periodStart)),d.periodStart,d.periodEnd,N'open',d.createdBy
FROM(SELECT companyId,DATEFROMPARTS(YEAR(periodStart),MONTH(periodStart),1) periodStart,EOMONTH(periodStart) periodEnd,MIN(createdBy) createdBy FROM dbo.BonusCampaigns WHERE periodId IS NULL GROUP BY companyId,YEAR(periodStart),MONTH(periodStart),EOMONTH(periodStart))d
WHERE NOT EXISTS(SELECT 1 FROM dbo.BonusPeriods bp WHERE bp.companyId=d.companyId AND bp.periodStart=d.periodStart AND bp.periodEnd=d.periodEnd);
GO
UPDATE dbo.BonusPeriods SET name=CONCAT(N'Periodo ',CHOOSE(MONTH(periodStart),N'Enero',N'Febrero',N'Marzo',N'Abril',N'Mayo',N'Junio',N'Julio',N'Agosto',N'Septiembre',N'Octubre',N'Noviembre',N'Diciembre'),N' ',YEAR(periodStart)),updatedAt=SYSUTCDATETIME() WHERE name LIKE N'Periodo %';
GO
UPDATE bc SET periodId=bp.id,periodStart=bp.periodStart,periodEnd=bp.periodEnd
FROM dbo.BonusCampaigns bc JOIN dbo.BonusPeriods bp ON bp.companyId=bc.companyId AND bc.periodStart BETWEEN bp.periodStart AND bp.periodEnd
WHERE bc.periodId IS NULL;
GO
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.BonusCampaigns') AND name=N'periodId' AND is_nullable=1) ALTER TABLE dbo.BonusCampaigns ALTER COLUMN periodId INT NOT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_BonusCampaign_Period') ALTER TABLE dbo.BonusCampaigns ADD CONSTRAINT FK_BonusCampaign_Period FOREIGN KEY(periodId) REFERENCES dbo.BonusPeriods(id);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.BonusCampaigns') AND name=N'UX_BonusCampaign_PeriodScope') CREATE UNIQUE INDEX UX_BonusCampaign_PeriodScope ON dbo.BonusCampaigns(periodId,clientId,siteId,areaId,bonusTypeId) WHERE status<>N'cancelled';
GO
IF OBJECT_ID(N'dbo.BonusResults',N'U') IS NULL CREATE TABLE dbo.BonusResults(id INT IDENTITY PRIMARY KEY,campaignId INT NOT NULL,collaboratorId INT NOT NULL,productivityFactor DECIMAL(5,2),attendanceDays INT NOT NULL DEFAULT(0),absences INT NOT NULL DEFAULT(0),lateArrivals INT NOT NULL DEFAULT(0),seniorityDays INT NOT NULL DEFAULT(0),baseAmount DECIMAL(12,2),calculatedAmount DECIMAL(12,2) NOT NULL DEFAULT(0),eligible BIT NOT NULL DEFAULT(0),calculationDetail NVARCHAR(1500),status NVARCHAR(20) NOT NULL DEFAULT N'calculated',reviewNotes NVARCHAR(500),createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),CONSTRAINT UQ_BonusResults UNIQUE(campaignId,collaboratorId),CONSTRAINT FK_BonusResults_Campaign FOREIGN KEY(campaignId) REFERENCES dbo.BonusCampaigns(id),CONSTRAINT FK_BonusResults_Collaborator FOREIGN KEY(collaboratorId) REFERENCES dbo.Collaborators(id),CONSTRAINT CK_BonusResults_Productivity CHECK(productivityFactor IS NULL OR productivityFactor BETWEEN 0 AND 100),CONSTRAINT CK_BonusResults_Status CHECK(status IN(N'pending',N'calculated',N'observed',N'approved',N'rejected',N'paid')));
GO
IF OBJECT_ID(N'dbo.BonusAudit',N'U') IS NULL CREATE TABLE dbo.BonusAudit(id BIGINT IDENTITY PRIMARY KEY,companyId INT NOT NULL,campaignId INT,ruleId INT,userId INT NOT NULL,action NVARCHAR(60) NOT NULL,oldValue NVARCHAR(MAX),newValue NVARCHAR(MAX),reason NVARCHAR(500),createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),CONSTRAINT FK_BonusAudit_Company FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),CONSTRAINT FK_BonusAudit_Campaign FOREIGN KEY(campaignId) REFERENCES dbo.BonusCampaigns(id),CONSTRAINT FK_BonusAudit_Rule FOREIGN KEY(ruleId) REFERENCES dbo.BonusRules(id),CONSTRAINT FK_BonusAudit_User FOREIGN KEY(userId) REFERENCES dbo.Users(id));
GO

IF OBJECT_ID(N'dbo.BonusProductivityBatches', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BonusProductivityBatches (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BonusProductivityBatches PRIMARY KEY,
        companyId INT NOT NULL,
        clientId INT NOT NULL,
        siteId INT NOT NULL,
        areaId INT NULL,
        shiftId INT NOT NULL,
        workTableId INT NOT NULL,
        workDate DATE NOT NULL,
        palletCode NVARCHAR(80) NULL,
        lotCode NVARCHAR(80) NULL,
        boxesReceived INT NOT NULL CONSTRAINT DF_BonusProductivityBatches_boxesReceived DEFAULT(0),
        boxesProcessed INT NOT NULL CONSTRAINT DF_BonusProductivityBatches_boxesProcessed DEFAULT(0),
        unitsTagged INT NOT NULL CONSTRAINT DF_BonusProductivityBatches_unitsTagged DEFAULT(0),
        unitsRejected INT NOT NULL CONSTRAINT DF_BonusProductivityBatches_unitsRejected DEFAULT(0),
        startedAt DATETIME2 NOT NULL,
        endedAt DATETIME2 NOT NULL,
        notes NVARCHAR(500) NULL,
        createdBy INT NOT NULL,
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_BonusProductivityBatches_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_BonusProductivityBatches_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_BonusProductivityBatches_Company FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),
        CONSTRAINT FK_BonusProductivityBatches_Client FOREIGN KEY(clientId) REFERENCES dbo.Clients(id),
        CONSTRAINT FK_BonusProductivityBatches_Site FOREIGN KEY(siteId) REFERENCES dbo.Sites(id),
        CONSTRAINT FK_BonusProductivityBatches_Area FOREIGN KEY(areaId) REFERENCES dbo.Areas(id),
        CONSTRAINT FK_BonusProductivityBatches_Shift FOREIGN KEY(shiftId) REFERENCES dbo.Shifts(id),
        CONSTRAINT FK_BonusProductivityBatches_WorkTable FOREIGN KEY(workTableId) REFERENCES dbo.WorkTables(id),
        CONSTRAINT FK_BonusProductivityBatches_User FOREIGN KEY(createdBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_BonusProductivityBatches_Counts CHECK(boxesReceived>=0 AND boxesProcessed>=0 AND unitsTagged>=0 AND unitsRejected>=0 AND boxesProcessed<=boxesReceived AND unitsRejected<=unitsTagged),
        CONSTRAINT CK_BonusProductivityBatches_Time CHECK(endedAt>startedAt)
    );
END;
GO

IF OBJECT_ID(N'dbo.BonusProductivityEvaluations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BonusProductivityEvaluations (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BonusProductivityEvaluations PRIMARY KEY,
        batchId INT NOT NULL,
        collaboratorId INT NOT NULL,
        productivityScore DECIMAL(5,2) NOT NULL,
        qualityScore DECIMAL(5,2) NOT NULL,
        teamworkScore DECIMAL(5,2) NOT NULL,
        disciplineScore DECIMAL(5,2) NOT NULL,
        observation NVARCHAR(500) NULL,
        evaluatedBy INT NOT NULL,
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_BonusProductivityEvaluations_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_BonusProductivityEvaluations_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_BonusProductivityEvaluations UNIQUE(batchId, collaboratorId),
        CONSTRAINT FK_BonusProductivityEvaluations_Batch FOREIGN KEY(batchId) REFERENCES dbo.BonusProductivityBatches(id),
        CONSTRAINT FK_BonusProductivityEvaluations_Collaborator FOREIGN KEY(collaboratorId) REFERENCES dbo.Collaborators(id),
        CONSTRAINT FK_BonusProductivityEvaluations_User FOREIGN KEY(evaluatedBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_BonusProductivityEvaluations_Scores CHECK(productivityScore BETWEEN 0 AND 100 AND qualityScore BETWEEN 0 AND 100 AND teamworkScore BETWEEN 0 AND 100 AND disciplineScore BETWEEN 0 AND 100)
    );
END;
GO

UPDATE br SET seniorityDays=CASE WHEN c.startDate IS NULL THEN 0 ELSE DATEDIFF(DAY,c.startDate,CONVERT(DATE,SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time')) END,updatedAt=SYSUTCDATETIME()
FROM dbo.BonusResults br INNER JOIN dbo.Collaborators c ON c.id=br.collaboratorId;
GO
