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
import { Roles } from 'src/common/decorator/rolesDecorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { ROLE } from 'src/user/entities/role.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentService } from './department.service';

@Controller('departments')
@UseGuards(AuthGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @Roles(ROLE.SUPER_ADMIN, ROLE.REGISTRAR)
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.create(createDepartmentDto);
  }

  @Get()
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
  @Roles(ROLE.SUPER_ADMIN, ROLE.REGISTRAR)
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @Roles(ROLE.SUPER_ADMIN, ROLE.REGISTRAR)
  remove(@Param('id') id: string) {
    return this.departmentService.remove(id);
  }
}
