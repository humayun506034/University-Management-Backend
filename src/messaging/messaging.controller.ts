import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import multer from 'multer';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { ROLE } from 'src/user/entities/role.entity';
// import { uploadFileToS3 } from 'src/utils/common/S3FileUpload';
import { MessagingService } from './messaging.service';
import { uploadFileToCloudinary } from 'src/utils/common/uploadFileToCloudinary';

@ApiTags('Messaging')
@Controller('messaging')
export class MessagingController {
  constructor(
    private configService: ConfigService,
    private readonly messagingService: MessagingService,
  ) {}
  @UseGuards(AuthGuard)
  @ApiSecurity('token-auth')
  @ApiOperation({ summary: 'Get my messages list' })
  @Roles(
    ROLE.SUPER_ADMIN,
    ROLE.REGISTRAR,
    ROLE.DEPARTMENT_HEAD,
    ROLE.FACULTY,
    ROLE.STUDENT,
  )
  @Get('/messages-list')
  async myselfAllMessagesList(@Req() req: Request & { user: any }) {
    return await this.messagingService.myselfAllMessagesList(req.user.email);
  }

  @UseGuards(AuthGuard)
  @ApiSecurity('token-auth')
  @ApiOperation({ summary: 'Send message (multipart form-data)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          example:
            '{\n  "recipientEmail":"receiver@example.com",\n  "text":"Hello from Swagger"\n}',
        },
        file: { type: 'string', format: 'binary' },
      },
      required: ['data'],
    },
  })
  @Roles(
    ROLE.SUPER_ADMIN,
    ROLE.REGISTRAR,
    ROLE.DEPARTMENT_HEAD,
    ROLE.FACULTY,
    ROLE.STUDENT,
  )
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async sendMessage(
    @Req() req: Request & { user: any },
    @Body() body: { data: any },
    @UploadedFile() document?: Express.Multer.File,
  ) {
    const parsed = JSON.parse(body.data) as unknown;
    let messageData: any = {};

    if (parsed && typeof parsed === 'object') {
      messageData = parsed as {
        document?: string;
      };
    }

    if (document) {
      // console.log(document);
      // const documentLink = await uploadFileToS3(document, this.configService, {
      //   folder: 'message-documents',
      // });

      const documentLink = await uploadFileToCloudinary(document, this.configService, {
        folder: 'message-documents',
      });
      // console.log('🚀 ~ UserController ~ create ~ documentLink:', documentLink);
      messageData.document = documentLink;
    }
    messageData.senderEmail = req.user.email;

    console.log(messageData);

    return await this.messagingService.sendMessage(messageData);
    // return this.userService.create(messageData as CreateUserDto);
  }
}
