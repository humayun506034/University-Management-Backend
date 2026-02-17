import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

/* -------------------- Types -------------------- */
export type UploadResult = {
  fileUrl: string;
  filePath: string;
  fileName: string;
  originalName: string;
};

export interface UploadOptions {
  folder?: string;
  returnMetadata?: boolean;
}

/* -------------------- Helper -------------------- */
const streamUpload = (
  fileBuffer: Buffer,
  options: {
    folder: string;
    publicId: string;
  },
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: 'auto', // image | video | pdf | raw
      },
      (error, result) => {
        if (error) {
          reject(
            error instanceof Error
              ? error
              : new Error(
                  typeof error === 'string'
                    ? error
                    : error?.message || 'Cloudinary upload failed',
                ),
          );
          return;
        }

        if (!result) {
          reject(new Error('Cloudinary returned empty result'));
          return;
        }

        resolve(result);
      },
    );

    Readable.from(fileBuffer).pipe(uploadStream);
  });
};

/* -------------------- Main Function -------------------- */
/**
 * Upload file to Cloudinary
 */
export const uploadFileToCloudinary = async (
  file: Express.Multer.File,
  configService: ConfigService,
  options: UploadOptions = {},
): Promise<string | UploadResult> => {
  if (!file?.buffer) {
    throw new Error('File not provided');
  }

  console.log(file)

  const folder = options.folder || 'files';
  const returnMetadata = options.returnMetadata ?? false;

  /* ---------- Cloudinary Config ---------- */
  const cloudName = configService.get<string>('CLOUDINARY_CLOUD_NAME');
  const apiKey = configService.get<string>('CLOUDINARY_API_KEY');
  const apiSecret = configService.get<string>('CLOUDINARY_API_SECRET');

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary environment variables missing');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  /* ---------- Prepare File ---------- */
  const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '');
  const publicId = `${Date.now()}-${safeFileName}`;

  /* ---------- Upload ---------- */
  const result = await streamUpload(file.buffer, {
    folder,
    publicId,
  });

  const fileUrl = result.secure_url;

  if (returnMetadata) {
    return {
      fileUrl,
      filePath: result.public_id,
      fileName: safeFileName,
      originalName: file.originalname,
    };
  }

  return fileUrl;
};
