export class UpdateUserDto {
  firstName?: string;
  lastName?: string;
  image?: string;
  studentId?: string;
  employeeId?: string;
  designation?: string;
  departmentId?: string;
  phoneNumber?: string;
  password?: string;
  registrationOtp?: string;
  registrationOtpExpireIn?: Date;
  loginOtp?: string;
  loginOtpExpireIn?: Date;
  isVerified?: boolean;
  isBlocked?: boolean;
  isDeleted?: boolean;
}
