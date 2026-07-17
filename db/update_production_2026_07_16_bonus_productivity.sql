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
    RAISERROR(N'Primero ejecuta db/update_production_2026_07_15_worktables_attendance.sql porque Productividad depende de dbo.WorkTables.', 16, 1);
    RETURN;
END;
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
