import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { ROLE } from 'src/user/entities/role.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentService } from './department.service';

@ApiTags('Department')
@Controller('departments')
@UseGuards(AuthGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @ApiSecurity('token-auth')
  @ApiOperation({ summary: 'Create department' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Computer Science and Engineering' },
        departmentHeadId: {
          type: 'string',
          example: '0c9a61d2-2b3d-4f9f-8a14-66f3d1c8a1ab',
        },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' },
      },
      required: ['name'],
    },
  })
  @Roles(ROLE.SUPER_ADMIN, ROLE.REGISTRAR)
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.create(createDepartmentDto);
  }

  @Get()
  @ApiSecurity('token-auth')
  @ApiOperation({ summary: 'Get all departments' })
  @Roles(
    ROLE.SUPER_ADMIN,
    ROLE.REGISTRAR,
    ROLE.DEPARTMENT_HEAD,
    ROLE.FACULTY,
    ROLE.STUDENT,
  )
  findAll() {
    return this.departmentService.findAll();
  }

  @Get(':id')
  @ApiSecurity('token-auth')
  @ApiOperation({ summary: 'Get department by id' })
  @ApiParam({ name: 'id', type: String, example: '3f3a1ad2-8dc8-4d90-8a4b-3a9fe96e9f1a' })
  @Roles(
    ROLE.SUPER_ADMIN,
    ROLE.REGISTRAR,
    ROLE.DEPARTMENT_HEAD,
    ROLE.FACULTY,
    ROLE.STUDENT,
  )
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Patch(':id')
  @ApiSecurity('token-auth')
  @ApiOperation({ summary: 'Update department' })
  @ApiParam({ name: 'id', type: String, example: '3f3a1ad2-8dc8-4d90-8a4b-3a9fe96e9f1a' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Department of CSE' },
        departmentHeadId: {
          type: 'string',
          nullable: true,
          example: 'f9a4e2fd-cc6a-4b7a-9f90-8f6f7a4f511e',
        },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'INACTIVE' },
      },
    },
  })
  @Roles(ROLE.SUPER_ADMIN, ROLE.REGISTRAR)
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @ApiSecurity('token-auth')
  @ApiOperation({ summary: 'Delete department (soft delete)' })
  @ApiParam({ name: 'id', type: String, example: '3f3a1ad2-8dc8-4d90-8a4b-3a9fe96e9f1a' })
  @Roles(ROLE.SUPER_ADMIN, ROLE.REGISTRAR)
  remove(@Param('id') id: string) {
    return this.departmentService.remove(id);
  }
}
