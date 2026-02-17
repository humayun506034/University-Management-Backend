import { DepartmentStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Computer Science and Engineering' })
  name: string;

  @ApiPropertyOptional({ example: '0c9a61d2-2b3d-4f9f-8a14-66f3d1c8a1ab' })
  departmentHeadId?: string;

  @ApiPropertyOptional({ enum: DepartmentStatus, example: DepartmentStatus.ACTIVE })
  status?: DepartmentStatus;
}
