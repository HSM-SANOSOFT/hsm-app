import { SettingsCategoryEnum } from '@hsm/common/enums';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({
  name: 'app_setting_audit',
  schema: DatabasePostgresSchemasEnum.SETTINGS,
})
export class AppSettingAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  key: string;

  // Reuses the same PostgreSQL enum type as AppSettingEntity.category.
  @Column({
    type: 'enum',
    enum: SettingsCategoryEnum,
    enumName: 'settings_category_enum',
    nullable: true,
  })
  category: SettingsCategoryEnum | null;

  @Column({ type: 'varchar', nullable: true })
  changedBy: string | null;

  // Masked snapshots only — a secret setting NEVER stores its plaintext here.
  @Column({ type: 'text', nullable: true })
  oldValue: string | null;

  @Column({ type: 'text', nullable: true })
  newValue: string | null;

  @CreateDateColumn()
  changedAt: Date;
}
