import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessagingGateway } from './messaging.gateway';
import { sendResponse } from 'src/utils/sendResponse';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingGateway: MessagingGateway, // inject here
  ) {}
  async sendMessage(messageData: any) {
    const result = await this.prisma.message.create({ data: messageData });
    // console.log('Sending message...', messageData);
    this.messagingGateway.sendToUser(messageData.recipientEmail, messageData);
    return result;
  }

  async myselfAllMessagesList(email: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderEmail: email }, { recipientEmail: email }],
      },
      include: {
        Sender: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            image: true,
            role: true,
          },
        },
        Receiver: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });

    const uniqueUsersMap = new Map<
      string,
      {
        senderEmail: string;
        recipientEmail: string;
        Sender: any;
        Receiver: any;
      }
    >();

    messages.forEach((msg) => {
      // যদি sender নিজের না হয়
      if (msg.senderEmail !== email && !uniqueUsersMap.has(msg.senderEmail)) {
        uniqueUsersMap.set(msg.senderEmail, {
          senderEmail: msg.senderEmail,
          recipientEmail: msg.recipientEmail,
          Sender: msg.Sender,
          Receiver: msg.Receiver,
        });
      }

      // যদি recipient নিজের না হয়
      if (
        msg.recipientEmail !== email &&
        !uniqueUsersMap.has(msg.recipientEmail)
      ) {
        uniqueUsersMap.set(msg.recipientEmail, {
          senderEmail: msg.senderEmail,
          recipientEmail: msg.recipientEmail,
          Sender: msg.Sender,
          Receiver: msg.Receiver,
        });
      }
    });

    const uniqueUsersArray = Array.from(uniqueUsersMap.values());

    return sendResponse('Messages Fetched Successfully', uniqueUsersArray);
  }
}
