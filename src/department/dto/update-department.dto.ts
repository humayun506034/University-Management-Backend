import { DepartmentStatus } from '@prisma/client';

export class UpdateDepartmentDto {
  name?: string;
  departmentHeadId?: string | null;
  status?: DepartmentStatus;
}
