import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

type PublishHandler = (postId: string) => Promise<unknown>;

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection?: amqp.ChannelModel;
  private channel?: amqp.ConfirmChannel;
  private handler?: PublishHandler;
  private connecting?: Promise<boolean>;
  private readonly waitingQueue = process.env.RABBITMQ_WAITING_QUEUE || 'campaignai.scheduled.waiting';
  private readonly readyQueue = process.env.RABBITMQ_READY_QUEUE || 'campaignai.scheduled.ready';
  private readonly waitingExchange = 'campaignai.scheduled.waiting.exchange';
  private readonly readyExchange = 'campaignai.scheduled.ready.exchange';

  async onModuleInit() {
    await this.connect();
    if (this.handler) await this.startConsumer();
  }

  async registerPublishHandler(handler: PublishHandler) {
    this.handler = handler;
    if (await this.connect()) await this.startConsumer();
  }

  async enqueueScheduledPost(postId: string, scheduledTime: Date | string) {
    if (!(await this.connect()) || !this.channel) return false;
    const delay = Math.max(0, new Date(scheduledTime).getTime() - Date.now());
    const message = Buffer.from(JSON.stringify({ postId, scheduledTime: new Date(scheduledTime).toISOString() }));
    this.channel.sendToQueue(this.waitingQueue, message, { persistent: true, expiration: String(delay) });
    await this.channel.waitForConfirms();
    return true;
  }

  private async connect(): Promise<boolean> {
    if (this.channel) return true;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      try {
        const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        this.connection = await amqp.connect(url);
        this.connection.on('error', error => this.logger.warn(`RabbitMQ connection error: ${error.message}`));
        this.connection.on('close', () => { this.channel = undefined; this.connection = undefined; });
        this.channel = await this.connection.createConfirmChannel();
        await this.channel.assertExchange(this.waitingExchange, 'direct', { durable: true });
        await this.channel.assertExchange(this.readyExchange, 'direct', { durable: true });
        await this.channel.assertQueue(this.waitingQueue, {
          durable: true,
          arguments: { 'x-dead-letter-exchange': this.readyExchange, 'x-dead-letter-routing-key': 'publish' },
        });
        await this.channel.assertQueue(this.readyQueue, { durable: true });
        await this.channel.bindQueue(this.waitingQueue, this.waitingExchange, 'wait');
        await this.channel.bindQueue(this.readyQueue, this.readyExchange, 'publish');
        this.logger.log(`RabbitMQ connected: ${this.waitingQueue} -> ${this.readyQueue}`);
        return true;
      } catch (error: any) {
        this.logger.warn(`RabbitMQ unavailable; Firebase/cron fallback remains active: ${error.message}`);
        this.channel = undefined;
        this.connection = undefined;
        return false;
      } finally {
        this.connecting = undefined;
      }
    })();
    return this.connecting;
  }

  private async startConsumer() {
    if (!this.channel || !this.handler) return;
    await this.channel.prefetch(Number(process.env.RABBITMQ_PREFETCH || 5));
    await this.channel.consume(this.readyQueue, async message => {
      if (!message) return;
      try {
        const payload = JSON.parse(message.content.toString());
        await this.handler!(payload.postId);
        this.channel!.ack(message);
      } catch (error: any) {
        this.logger.error(`RabbitMQ publish job failed: ${error.message}`);
        this.channel!.nack(message, false, false);
      }
    }, { noAck: false });
  }

  async onModuleDestroy() {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }
}
