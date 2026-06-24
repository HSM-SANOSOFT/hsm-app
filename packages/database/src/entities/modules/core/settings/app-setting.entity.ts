import { SettingsCategoryEnum } from '@hsm/common/enums';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Unique(['key'])
@Entity({ name: 'app_setting', schema: DatabasePostgresSchemasEnum.SETTINGS })
export class AppSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  key: string;

  // enumName is set explicitly so the PostgreSQL type is created once and
  // stays schema-qualified. Adding values later must use ALTER TYPE ... ADD
  // VALUE (non-public-schema enum migration constraint).
  @Column({
    type: 'enum',
    enum: SettingsCategoryEnum,
    enumName: 'settings_category_enum',
  })
  category: SettingsCategoryEnum;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @Column({ type: 'boolean', default: false })
  isSecret: boolean;

  @Column({ type: 'varchar', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
