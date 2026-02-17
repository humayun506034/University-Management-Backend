import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { getPagination } from 'src/common/utils/pagination';
import { PrismaService } from 'src/prisma/prisma.service';
import { generateOtpEmailTemplate } from 'src/utils/generateOtpEmailTemplate';
import { sendResponse } from 'src/utils/sendResponse';
import { sendVerificationEmail } from 'src/utils/sendVerificationEmail';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private buildDepartmentCode(departmentName: string): string {
    const words = departmentName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const initials = words.map((word) => word[0]?.toUpperCase()).join('');
    if (initials.length >= 2) {
      return initials.slice(0, 6);
    }

    const fallback = departmentName
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);

    return fallback || 'DEPT';
  }

  private async generateStudentIdByDepartment(departmentId: string) {
    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        isDeleted: false,
      },
      select: {
        name: true,
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const departmentCode = this.buildDepartmentCode(department.name);

    const existingStudents = await this.prisma.user.findMany({
      where: {
        role: UserRole.STUDENT,
        departmentId,
        studentId: {
          not: null,
        },
      },
      select: {
        studentId: true,
      },
    });

    let maxSequence = 0;
    for (const student of existingStudents) {
      if (!student.studentId) continue;
      if (!student.studentId.startsWith(`${departmentCode}-`)) continue;

      const parts = student.studentId.split('-');
      const sequencePart = parts[parts.length - 1];
      const sequence = Number.parseInt(sequencePart, 10);
      if (!Number.isNaN(sequence) && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }

    const nextSequence = String(maxSequence + 1).padStart(4, '0');
    return `${departmentCode}-${nextSequence}`;
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const isUserAlreadyExist = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });
      if (isUserAlreadyExist) {
        throw new ConflictException('User already exist');
      }

      const generateOtp = () =>
        Math.floor(100000 + Math.random() * 900000).toString();
      const otp = generateOtp();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      const hashPassword = await bcrypt.hash(createUserDto.password, 10);
      const role = createUserDto.role ?? UserRole.STUDENT;

      let studentId = createUserDto.studentId;
      if (role === UserRole.STUDENT) {
        if (!createUserDto.departmentId) {
          throw new BadRequestException(
            'departmentId is required for STUDENT role',
          );
        }
        studentId = await this.generateStudentIdByDepartment(
          createUserDto.departmentId,
        );
      } else {
        studentId = undefined;
      }

      const userRegistrationData = {
        ...createUserDto,
        role,
        studentId,
        password: hashPassword,
        registrationOtp: otp,
        registrationOtpExpireIn: otpExpiry,
        registrationTime: new Date(),
      };

      // Create user in DB
      await this.prisma.user.create({ data: userRegistrationData });
      const htmlText = generateOtpEmailTemplate(otp);
      await sendVerificationEmail(
        this.configService,
        createUserDto.email,
        'Verify your account',
        htmlText,
      );

      return sendResponse(
        'User Registration Successfully, Check your email to verify your account.',
      );
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
  async createUserWithoutOtp(createUserByAdmin: any) {
    // console.log("🚀 ~ UserService ~ createUserWithoutOtp ~ createUserByAdmin:", createUserByAdmin)

    const isUserAlreadyExist = await this.prisma.user.findUnique({
      where: { email: createUserByAdmin.email },
    });
    if (isUserAlreadyExist) {
      throw new ConflictException('User already exist');
    }

    const hashPassword = await bcrypt.hash(createUserByAdmin.password, 10);
    const role = createUserByAdmin.role as UserRole;
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    let studentId = createUserByAdmin.studentId;
    if (role === UserRole.STUDENT) {
      if (!createUserByAdmin.departmentId) {
        throw new BadRequestException(
          'departmentId is required for STUDENT role',
        );
      }
      studentId = await this.generateStudentIdByDepartment(
        createUserByAdmin.departmentId,
      );
    } else {
      studentId = undefined;
    }

    const userRegistrationData = {
      ...createUserByAdmin,
      role,
      studentId,
      isVerified: true,
      password: hashPassword,
    };

    const result = await this.prisma.user.create({
      data: userRegistrationData,
    });

    return sendResponse(
      'User Registration Successfully, User can login now.',
      result,
    );
  }

  async resendRegistrationVerifyOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new ConflictException('User already verified');
    }

    const generateOtp = () =>
      Math.floor(100000 + Math.random() * 900000).toString();
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: {
        registrationOtp: otp,
        registrationOtpExpireIn: otpExpiry,
      },
    });

    const htmlText = generateOtpEmailTemplate(otp);
    await sendVerificationEmail(
      this.configService,
      email,
      'Verify your account',
      htmlText,
    );

    return sendResponse('Verification OTP Resend Successfully.');
  }

  async verifyRegisterOtp(email: string, otp: string) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!isUserExist) {
      throw new NotFoundException('User not found');
    }

    if (isUserExist.isVerified) {
      throw new ConflictException('User already verified');
    }

    if (isUserExist.registrationOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if ((isUserExist.registrationOtpExpireIn as Date) < new Date()) {
      throw new BadRequestException('OTP Expired');
    }

    const result = await this.prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        registrationOtp: null,
        registrationOtpExpireIn: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    return sendResponse('User Verified Successfully', result);
  }
  async tempLogin(email: string) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!isUserExist) {
      throw new NotFoundException('User not found');
    }

    const result = await this.prisma.user.update({
      where: { email },
      data: {
        loginOtp: null,
        loginOtpExpireIn: null,
      },
    });

    const access_token = this.jwtService.sign({
      id: result.id,
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      role: result.role,
    });

    return sendResponse('User Login Successfully', { access_token });
  }
  async login(email: string, password: string) {
    try {
      const isUserExist = await this.prisma.user.findUnique({
        where: { email },
      });
      if (!isUserExist) {
        throw new NotFoundException('User not found');
      }
      if (!isUserExist.isVerified) {
        throw new ConflictException(
          'User not verified, Please verify your account first.',
        );
      }

      if (isUserExist.isBlocked) {
        throw new ConflictException('User is blocked');
      }
      if (isUserExist.isDeleted) {
        throw new ConflictException('User is deleted');
      }
      const isPasswordMatch = await bcrypt.compare(
        password,
        isUserExist.password,
      );
      if (!isPasswordMatch) {
        throw new UnauthorizedException('Invalid Password');
      }

      const generateOtp = () =>
        Math.floor(100000 + Math.random() * 900000).toString();
      const otp = generateOtp();
      // console.log('Generated OTP:', otp);

      // OTP validity 10 minutes
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      const result = await this.prisma.user.update({
        where: { email },
        data: {
          loginOtp: otp,
          loginOtpExpireIn: otpExpiry,
        },
      });
      console.log('🚀 ~ UserService ~ login ~ result:', result);

      // Generate email HTML
      const htmlText = generateOtpEmailTemplate(otp);

      await sendVerificationEmail(
        this.configService,
        email,
        'Verify your login',
        htmlText,
      );

      return sendResponse(
        'User Login Successfully, Check your email to verify your account, You have 10 minutes to verify your login. If you did not receive the email, please check your spam folder.',
      );
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async resendLoginOtp(email: string) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!isUserExist) {
      throw new NotFoundException('User not found');
    }
    if (!isUserExist.isVerified) {
      throw new ConflictException('User not verified');
    }

    const generateOtp = () =>
      Math.floor(100000 + Math.random() * 900000).toString();
    const otp = generateOtp();
    // console.log('Generated OTP:', otp);

    // OTP validity 10 minutes
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.user.update({
      where: { email },
      data: {
        loginOtp: otp,
        loginOtpExpireIn: otpExpiry,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    // Generate email HTML
    const htmlText = generateOtpEmailTemplate(otp);

    await sendVerificationEmail(
      this.configService,
      email,
      'Verify your login',
      htmlText,
    );

    return sendResponse(
      'OTP resend Successfully, Check your email to verify your account, You have 10 minutes to verify your login. If you did not receive the email, please check your spam folder.',
    );
  }

  async verifyLoginOtp(email: string, otp: string) {
    try {
      const isUserExist = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!isUserExist) {
        throw new NotFoundException('User not found');
      }

      if (!isUserExist.isVerified) {
        throw new ConflictException('User not verified');
      }

      if (isUserExist.loginOtp !== otp) {
        throw new BadRequestException('Invalid OTP');
      }

      if ((isUserExist.loginOtpExpireIn as Date) < new Date()) {
        throw new BadRequestException('OTP Expired');
      }

      // 🔐 TRANSACTION START
      const result = await this.prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
          where: { email },
          data: {
            loginOtp: null,
            loginOtpExpireIn: null,
          },
        });

        await tx.user.update({
          where: { email },
          data: {
            loginTime: new Date(),
          },
        });

        return updatedUser;
      });
      // 🔐 TRANSACTION END (auto commit)

      const access_token = this.jwtService.sign({
        id: result.id,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
        role: result.role,
      });

      return sendResponse('User Verified Successfully', { access_token });
    } catch (error) {
      // ❌ Transaction failed → auto rollback
      throw new BadRequestException(
        error?.message || 'OTP verification failed',
      );
    }
  }

  async getMyProfileInfo(id: string) {
    try {
      const result = await this.prisma.user.findUnique({
        where: { id },
        
      });

      return sendResponse('Profile Information Fetched Successfully', result);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
  async getStatics(id: string) {
    try {
      const result = await this.prisma.user.findUnique({
        where: { id },
        select: {
          lastPasswordChangeTime: true,
          loginTime: true,
          registrationTime: true,
        },
      });

      return sendResponse('Profile Information Fetched Successfully', result);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async changePassword(
    email: string,
    oldPassword: string,
    newPassword: string,
  ) {
    try {
      const isUserExist = await this.prisma.user.findUnique({
        where: { email },
      });
      if (!isUserExist) {
        throw new NotFoundException('User not found');
      }

      const isPasswordMatch = await bcrypt.compare(
        oldPassword,
        isUserExist.password,
      );
      if (!isPasswordMatch) {
        throw new BadRequestException('Invalid Password');
      }

      if (oldPassword === newPassword) {
        throw new BadRequestException(
          'New Password cannot be same as old password',
        );
      }

      const hashPassword = await bcrypt.hash(newPassword, 10);
      // console.log(hashPassword)
      await this.prisma.user.update({
        where: { email },
        data: {
          password: hashPassword,
          lastPasswordChangeTime: new Date(),
        },
      });
      return sendResponse('Password Changed Successfully');
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async forgottenPassword(email: string) {
    try {
      const isUserExist = await this.prisma.user.findUnique({
        where: { email },
      });
      if (!isUserExist) {
        throw new NotFoundException('User not found');
      }

      const generateOtp = () =>
        Math.floor(100000 + Math.random() * 900000).toString();
      const otp = generateOtp();
      // console.log('Generated OTP:', otp);

      // OTP validity 10 minutes
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await this.prisma.user.update({
        where: { email },
        data: {
          resetPasswordOtp: otp,
          resetPasswordOtpExpireIn: otpExpiry,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });
      // Generate email HTML
      const htmlText = generateOtpEmailTemplate(otp);

      await sendVerificationEmail(
        this.configService,
        email,
        'Reset your password',
        htmlText,
      );
      return sendResponse(
        'Check your email to reset your password, You have 10 minutes to verify. If you did not receive the email, please check your spam folder.',
      );
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async verifyForgottenPasswordOtp(
    email: string,
    otp: string,
    newPassword: string,
  ) {
    try {
      const isUserExist = await this.prisma.user.findUnique({
        where: { email },
      });
      if (!isUserExist) {
        throw new NotFoundException('User not found');
      }
      if (isUserExist.resetPasswordOtp !== otp) {
        throw new BadRequestException('Invalid OTP');
      }
      if ((isUserExist.resetPasswordOtpExpireIn as Date) < new Date()) {
        throw new BadRequestException('OTP Expired');
      }

      const hashPassword = await bcrypt.hash(newPassword, 10);
      // console.log(hashPassword)
      await this.prisma.user.update({
        where: { email },
        data: {
          password: hashPassword,
          resetPasswordOtp: null,
          resetPasswordOtpExpireIn: null,
        },
      });
      return sendResponse('Password Changed Successfully');
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async updateProfile(id: string, data: UpdateUserDto) {
    try {
      const result = await this.prisma.user.update({
        where: { id },
        data,
      });
      return sendResponse('Profile Updated Successfully', result);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async blockUser(id: string) {
    try {
      const isUserExist = await this.prisma.user.findUnique({
        where: { id },
      });
      if (!isUserExist) {
        throw new NotFoundException('User not found');
      }
      await this.prisma.user.update({
        where: { id },
        data: {
          isBlocked: true,
        },
      });
      return sendResponse('User Blocked Successfully');
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
  async unblockUser(id: string) {
    try {
      const isUserExist = await this.prisma.user.findUnique({
        where: { id },
      });
      if (!isUserExist) {
        throw new NotFoundException('User not found');
      }
      await this.prisma.user.update({
        where: { id },
        data: {
          isBlocked: false,
        },
      });
      return sendResponse('User Unblocked Successfully');
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async deleteUser(id: string) {
    try {
      const isUserExist = await this.prisma.user.findUnique({
        where: { id },
      });
      if (!isUserExist) {
        throw new NotFoundException('User not found');
      }
      await this.prisma.user.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });
      return sendResponse('User Deleted Successfully');
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async deleteMyselfAccount(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });
    return sendResponse('Your Account Deleted Successfully');
  }

  async changeRole(id: string, role: UserRole) {
    try {
      const isUserExist = await this.prisma.user.findUnique({
        where: { id },
      });
      if (!isUserExist) {
        throw new NotFoundException('User not found');
      }
      await this.prisma.user.update({
        where: { id },
        data: {
          role,
        },
      });
      return sendResponse('Role Changed Successfully');
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findAll(page?: number, limit?: number, isBlocked?: boolean) {
    try {
      const where: any = {
        isDeleted: false,
      };

      // 🔥 isBlocked filter (dynamic)
      if (isBlocked !== undefined) {
        where.isBlocked = isBlocked;
      }

      const totalItems = await this.prisma.user.count({
        where,
      });

      const { skip, take, meta } = getPagination(page, limit, totalItems);

      const data = await this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return sendResponse('Users fetched successfully', { data, meta });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, _updateUserDto: UpdateUserDto) {
    void _updateUserDto;
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
