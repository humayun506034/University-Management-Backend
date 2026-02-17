import { DepartmentStatus } from '@prisma/client';

export class CreateDepartmentDto {
  name: string;
  departmentHeadId?: string;
  status?: DepartmentStatus;
}
