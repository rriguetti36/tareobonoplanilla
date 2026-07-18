IF DB_ID(N'BD_RRHH_IA') IS NULL
BEGIN
    RAISERROR(N'La base de datos BD_RRHH_IA no existe.', 16, 1);
    RETURN;
END;
GO

USE BD_RRHH_IA;
GO

IF OBJECT_ID(N'dbo.WorkTableDailyAssignments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WorkTableDailyAssignments (
        id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WorkTableDailyAssignments PRIMARY KEY,
        companyId INT NOT NULL,
        workDate DATE NOT NULL,
        clientId INT NOT NULL,
        siteId INT NOT NULL,
        areaId INT NULL,
        shiftId INT NOT NULL,
        workTableId INT NULL,
        collaboratorId INT NOT NULL,
        assignmentId INT NOT NULL,
        assignedBy INT NOT NULL,
        assignedAt DATETIME2 NOT NULL CONSTRAINT DF_WorkTableDailyAssignments_assignedAt DEFAULT SYSUTCDATETIME(),
        reason NVARCHAR(500) NULL,
        estado BIT NOT NULL CONSTRAINT DF_WorkTableDailyAssignments_estado DEFAULT(1),
        createdAt DATETIME2 NOT NULL CONSTRAINT DF_WorkTableDailyAssignments_createdAt DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NOT NULL CONSTRAINT DF_WorkTableDailyAssignments_updatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_WorkTableDailyAssignments_Company FOREIGN KEY(companyId) REFERENCES dbo.Companies(id),
        CONSTRAINT FK_WorkTableDailyAssignments_Client FOREIGN KEY(clientId) REFERENCES dbo.Clients(id),
        CONSTRAINT FK_WorkTableDailyAssignments_Site FOREIGN KEY(siteId) REFERENCES dbo.Sites(id),
        CONSTRAINT FK_WorkTableDailyAssignments_Area FOREIGN KEY(areaId) REFERENCES dbo.Areas(id),
        CONSTRAINT FK_WorkTableDailyAssignments_Shift FOREIGN KEY(shiftId) REFERENCES dbo.Shifts(id),
        CONSTRAINT FK_WorkTableDailyAssignments_WorkTable FOREIGN KEY(workTableId) REFERENCES dbo.WorkTables(id),
        CONSTRAINT FK_WorkTableDailyAssignments_Collaborator FOREIGN KEY(collaboratorId) REFERENCES dbo.Collaborators(id),
        CONSTRAINT FK_WorkTableDailyAssignments_Assignment FOREIGN KEY(assignmentId) REFERENCES dbo.CollaboratorAssignments(id),
        CONSTRAINT FK_WorkTableDailyAssignments_User FOREIGN KEY(assignedBy) REFERENCES dbo.Users(id)
    );
END;
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.WorkTableDailyAssignments')
      AND name = N'workTableId'
      AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.WorkTableDailyAssignments ALTER COLUMN workTableId INT NULL;
END;
GO

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_WorkTableDailyAssignments_active_person' AND object_id=OBJECT_ID(N'dbo.WorkTableDailyAssignments'))
BEGIN
    CREATE UNIQUE INDEX UX_WorkTableDailyAssignments_active_person
        ON dbo.WorkTableDailyAssignments(companyId, workDate, shiftId, collaboratorId)
        WHERE estado=1;
END;
GO

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_WorkTableDailyAssignments_table' AND object_id=OBJECT_ID(N'dbo.WorkTableDailyAssignments'))
BEGIN
    CREATE INDEX IX_WorkTableDailyAssignments_table
        ON dbo.WorkTableDailyAssignments(companyId, workDate, shiftId, workTableId, estado);
END;
GO

IF COL_LENGTH(N'dbo.WorkTableMovements', N'workDate') IS NULL
BEGIN
    ALTER TABLE dbo.WorkTableMovements ADD workDate DATE NULL;
END;
GO

IF COL_LENGTH(N'dbo.WorkTableMovements', N'shiftId') IS NULL
BEGIN
    ALTER TABLE dbo.WorkTableMovements ADD shiftId INT NULL;
END;
GO

IF COL_LENGTH(N'dbo.WorkTableMovements', N'dailyAssignmentId') IS NULL
BEGIN
    ALTER TABLE dbo.WorkTableMovements ADD dailyAssignmentId BIGINT NULL;
END;
GO

IF OBJECT_ID(N'dbo.FK_WorkTableMovements_Shift', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.WorkTableMovements ADD CONSTRAINT FK_WorkTableMovements_Shift
        FOREIGN KEY(shiftId) REFERENCES dbo.Shifts(id);
END;
GO

IF OBJECT_ID(N'dbo.FK_WorkTableMovements_DailyAssignment', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.WorkTableMovements ADD CONSTRAINT FK_WorkTableMovements_DailyAssignment
        FOREIGN KEY(dailyAssignmentId) REFERENCES dbo.WorkTableDailyAssignments(id);
END;
GO
