import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditEntityType } from './audit-log.entity';

export interface CreateAuditLogDto {
  workspace_id: string;
  actor_id: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    const entry = this.auditLogRepo.create(dto);
    await this.auditLogRepo.save(entry);
  }

  async findForWorkspace(
    workspaceId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const [entries, total] = await this.auditLogRepo.findAndCount({
      where: { workspace_id: workspaceId },
      relations: ['actor'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: entries,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findForEntity(entityId: string, entityType: AuditEntityType) {
    return this.auditLogRepo.find({
      where: { entity_id: entityId, entity_type: entityType },
      relations: ['actor'],
      order: { created_at: 'DESC' },
    });
  }
}
