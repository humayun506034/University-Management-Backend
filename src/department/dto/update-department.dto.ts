import { DepartmentStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Department of CSE' })
  name?: string;

  @ApiPropertyOptional({
    example: 'f9a4e2fd-cc6a-4b7a-9f90-8f6f7a4f511e',
    nullable: true,
  })
  departmentHeadId?: string | null;

  @ApiPropertyOptional({ enum: DepartmentStatus, example: DepartmentStatus.INACTIVE })
  status?: DepartmentStatus;
}
