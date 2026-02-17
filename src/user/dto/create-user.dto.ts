import { UserRole } from '@prisma/client';

export class CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  role?: UserRole;
  image?: string;
  studentId?: string;
  employeeId?: string;
  designation?: string;
  departmentId?: string;
  phoneNumber?: string;
  password: string;
  registrationOtp?: string;
  registrationOtpExpireIn?: Date;
  loginOtp?: string;
  loginOtpExpireIn?: Date;
  isVerified?: boolean;
  isBlocked?: boolean;
  isDeleted?: boolean;
}

export class CreateUserByAdmin {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  studentId?: string;
  employeeId?: string;
  designation?: string;
  departmentId?: string;
  password: string;
}
