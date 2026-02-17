import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DepartmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateDepartmentHeadAssignment(
    departmentHeadId: string,
    excludeDepartmentId?: string,
  ) {
    const headUser = await this.prisma.user.findFirst({
      where: {
        id: departmentHeadId,
        isDeleted: false,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!headUser) {
      throw new NotFoundException('Department head user not found');
    }

    if (headUser.role !== UserRole.DEPARTMENT_HEAD) {
      throw new BadRequestException(
        'Assigned user must have DEPARTMENT_HEAD role',
      );
    }

    const existingHeadAssignment = await this.prisma.department.findFirst({
      where: {
        isDeleted: false,
        departmentHeadId,
        ...(excludeDepartmentId ? { NOT: { id: excludeDepartmentId } } : {}),
      },
      select: { id: true },
    });

    if (existingHeadAssignment) {
      throw new ConflictException(
        'This department head is already assigned to another department',
      );
    }
  }

  async create(createDepartmentDto: CreateDepartmentDto) {
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        name: createDepartmentDto.name,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (existingDepartment) {
      throw new ConflictException('Department already exists');
    }

    if (createDepartmentDto.departmentHeadId) {
      await this.validateDepartmentHeadAssignment(
        createDepartmentDto.departmentHeadId,
      );
    }

    const result = await this.prisma.department.create({
      data: {
        name: createDepartmentDto.name,
        status: createDepartmentDto.status ?? DepartmentStatus.ACTIVE,
        departmentHeadId: createDepartmentDto.departmentHeadId,
      },
      include: {
        departmentHead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return sendResponse('Department created successfully', result);
  }

  async findAll() {
    const result = await this.prisma.department.findMany({
      where: { isDeleted: false },
      include: {
        departmentHead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse('Departments fetched successfully', result);
  }

  async findOne(id: string) {
    const result = await this.prisma.department.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        departmentHead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Department not found');
    }

    return sendResponse('Department fetched successfully', result);
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!existingDepartment) {
      throw new NotFoundException('Department not found');
    }

    if (updateDepartmentDto.name) {
      const duplicateDepartment = await this.prisma.department.findFirst({
        where: {
          name: updateDepartmentDto.name,
          isDeleted: false,
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicateDepartment) {
        throw new ConflictException('Department name already in use');
      }
    }

    if (updateDepartmentDto.departmentHeadId) {
      await this.validateDepartmentHeadAssignment(
        updateDepartmentDto.departmentHeadId,
        id,
      );
    }

    const result = await this.prisma.department.update({
      where: { id },
      data: {
        name: updateDepartmentDto.name,
        status: updateDepartmentDto.status,
        departmentHeadId: updateDepartmentDto.departmentHeadId,
      },
      include: {
        departmentHead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return sendResponse('Department updated successfully', result);
  }

  async remove(id: string) {
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!existingDepartment) {
      throw new NotFoundException('Department not found');
    }

    await this.prisma.department.update({
      where: { id },
      data: { isDeleted: true },
    });

    return sendResponse('Department deleted successfully');
  }
}
