IF DB_ID(N'BD_RRHH_IA') IS NULL
BEGIN
    RAISERROR(N'La base de datos BD_RRHH_IA no existe.', 16, 1);
    RETURN;
END;
GO

USE BD_RRHH_IA;
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
