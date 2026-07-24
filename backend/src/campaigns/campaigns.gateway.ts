import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'campaigns',
})
export class CampaignsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CampaignsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WebSocket client disconnected: ${client.id}`);
  }

  emitPublishProgress(businessId: string, data: { status: string; progress: number; error?: string }) {
    this.logger.log(`Emitting progress for business ${businessId}: ${data.status} (${data.progress}%)`);
    this.server.emit(`publish-progress-${businessId}`, data);
  }
}
