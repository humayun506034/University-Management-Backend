import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { IncomingMessage } from 'http';
import { PrismaService } from 'src/prisma/prisma.service';
import { WebSocket, Server } from 'ws';
type SocketPayload = {
  recipientEmail: string;
  content: string;
};
// Create a WebSocket gateway
@WebSocketGateway({ cors: { origin: '*' } })
export class MessagingGateway {
  // Inject the WebSocket server
  @WebSocketServer() server: Server;
  private readonly userEmailWebSocketMap = new Map<string, WebSocket>();
  private readonly webSocketUserEmailMap = new Map<WebSocket, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}
  // Handle WebSocket connections
  async handleConnection(client: WebSocket, request: IncomingMessage) {
    // console.log(this.userIdWebSocketMap);

    // Extract the token from the request
    const url = request.url ?? '';
    const parsedUrl = new URL(url, 'http://localhost');
    //  console.log("🚀 ~ MessagingGateway ~ handleConnection ~ parsedUrl:", parsedUrl)
    // console.log("🚀 ~ MessagingGateway ~ handleConnection ~ url:", url)
    const token = parsedUrl.searchParams.get('token');
    // console.log('🚀 ~ MessagingGateway ~ handleConnection ~ token:', token);

    //decode token
    const decodeToken = this.jwtService.decode(token as string);
    // console.log(
    //   '🚀 ~ MessagingGateway ~ handleConnection ~ decodeToken:',
    //   decodeToken,
    // );

    const isUserExist = await this.prisma.user.findUnique({
      where: {
        id: decodeToken?.id,
        isVerified: true,
        isBlocked: false,
        isDeleted: false,
      },
    });
    // console.log('🚀 ~ MessagingGateway ~ handleConnection ~ user:', isUserExist);

    // Check if the user exists
    if (!isUserExist) {
      // throw new Error('User not found');
      client.close(4001, 'User not found'); // 4001 = custom code
    }

    // Add the client to the map
    this.userEmailWebSocketMap.set(isUserExist?.email as string, client);
    this.webSocketUserEmailMap.set(client, isUserExist?.email as string);
    // console.log(this.userIdWebSocketMap);
  }
  handleDisconnect(client: WebSocket) {
    // Remove the client from the map
    const userEamil = this.webSocketUserEmailMap.get(client);
    console.log(
      '🚀 ~ MessagingGateway ~ handleDisconnect ~ userEamil:',
      userEamil,
    );
    this.userEmailWebSocketMap.delete(userEamil as string);
    this.webSocketUserEmailMap.delete(client);
  }

  @SubscribeMessage('message')
  async onMessage(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: SocketPayload,
  ) {
    // console.log('🚀 ~ MessagingGateway ~ onMessage ~ payload:', payload);
    // console.log('🚀 ~ MessagingGateway ~ onMessage ~ client:', client);

    const senderEmail = this.webSocketUserEmailMap.get(client);
    if (!senderEmail) {
      client.close(4001, 'User not found'); // 4001 = custom code
    }

    const receiverClient = this.userEmailWebSocketMap.get(
      payload.recipientEmail,
    );

    const messageData = {
      senderEmail,
      recipientEmail: payload.recipientEmail,
      content: payload.content,
    } as {
      senderEmail: string;
      recipientEmail: string;
      content: string;
    };
    // console.log(messageData)

    const message = await this.prisma.message.create({
      data: messageData,
    });

    // console.log('Created Message:', message);

    const messageResult = await this.prisma.message.findUnique({
      where: {
        id: message.id,
      },
      include: {
        Sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
            role: true,
            isVerified: true,
          },
        },
        Receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
            role: true,
            isVerified: true,
          },
        },
      },
    });

    // console.log('Message With Relations:', messageResult);

    if (receiverClient) {
      receiverClient.send(
        JSON.stringify({ event: 'message', data: messageResult }),
      );
    }

    // console.log("🚀 ~ MessagingGateway ~ onMessage ~ senderEmail:", senderEmail)
  }

  public sendToUser(email: string, data: any) {
    const client = this.userEmailWebSocketMap.get(email);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event: 'message', data }));
    }
  }
}
