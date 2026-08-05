import { Injectable, Logger } from '@nestjs/common';
import { CloudTasksClient } from '@google-cloud/tasks';

export interface ScheduledPostTask {
  postId: string;
  timestampMs: number;
  businessId?: string;
}

export interface EnqueueResult {
  success: boolean;
  postId: string;
  taskId?: string;
  scheduledTime: string;
  scheduleTimeSeconds: number;
  targetUrl: string;
  isMock: boolean;
  error?: string;
}

@Injectable()
export class CloudTasksService {
  private readonly logger = new Logger(CloudTasksService.name);
  private client: CloudTasksClient | null = null;
  private isMock = false;

  private project: string;
  private location: string;
  private queue: string;
  private backendUrl: string;

  constructor() {
    this.project = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'campaignai-1044d';
    this.location = process.env.GCP_LOCATION || 'us-central1';
    this.queue = process.env.GCP_TASKS_QUEUE || 'social-posts-queue';
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    try {
      if (process.env.GCP_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.client = new CloudTasksClient();
        this.logger.log(`[CloudTasksService] Initialized Google Cloud Tasks client for queue: projects/${this.project}/locations/${this.location}/queues/${this.queue}`);
      } else {
        this.isMock = true;
        this.logger.log(`[CloudTasksService] GCP credentials not set. Initializing Cloud Tasks in Mock Queue mode.`);
      }
    } catch (err: any) {
      this.isMock = true;
      this.logger.warn(`[CloudTasksService] Cloud Tasks client init error (${err.message}). Using Mock Queue mode.`);
    }
  }

  /**
   * Returns optimal default queue configurations for retry limits and dispatch rates.
   */
  getQueueSettings() {
    return {
      queueName: `projects/${this.project}/locations/${this.location}/queues/${this.queue}`,
      rateLimits: {
        maxDispatchesPerSecond: 50,
        maxConcurrentDispatches: 100,
      },
      retryConfig: {
        maxAttempts: 5,
        minBackoff: '10s',
        maxBackoff: '300s', // 5 minutes
        maxDoublings: 3,
      },
    };
  }

  /**
   * Enqueues an array of scheduled post tasks into Firebase Cloud Tasks.
   *
   * @param tasksData - Array of post document IDs and target Unix timestamps.
   * @returns Array of enqueue execution results with target URLs and scheduled times.
   */
  async enqueueScheduledPosts(tasksData: ScheduledPostTask[]): Promise<EnqueueResult[]> {
    const parent = this.getQueueSettings().queueName;
    const targetUrl = `${this.backendUrl}/scheduler/publish-task`;
    const results: EnqueueResult[] = [];

    this.logger.log(`[CloudTasksService] Enqueuing ${tasksData.length} scheduled post tasks to HTTP target: ${targetUrl}`);

    for (const taskData of tasksData) {
      const { postId, timestampMs, businessId } = taskData;
      const seconds = Math.floor(timestampMs / 1000);
      const scheduledTimeIso = new Date(timestampMs).toISOString();

      const payload = {
        postId,
        businessId: businessId || null,
        scheduledTime: scheduledTimeIso,
        enqueuedAt: new Date().toISOString(),
      };

      if (!this.isMock && this.client) {
        try {
          const task: any = {
            httpRequest: {
              httpMethod: 'POST',
              url: targetUrl,
              headers: {
                'Content-Type': 'application/json',
              },
              body: Buffer.from(JSON.stringify(payload)).toString('base64'),
            },
            scheduleTime: {
              seconds,
            },
          };

          const [createdTask] = await this.client.createTask({ parent, task });
          this.logger.log(`[CloudTasksService] Enqueued Cloud Task ${createdTask.name} for post ${postId} at ${scheduledTimeIso}`);

          results.push({
            success: true,
            postId,
            taskId: createdTask.name,
            scheduledTime: scheduledTimeIso,
            scheduleTimeSeconds: seconds,
            targetUrl,
            isMock: false,
          });
        } catch (err: any) {
          this.logger.error(`[CloudTasksService] Failed to enqueue Cloud Task for post ${postId}: ${err.message}`);
          results.push({
            success: false,
            postId,
            scheduledTime: scheduledTimeIso,
            scheduleTimeSeconds: seconds,
            targetUrl,
            isMock: false,
            error: err.message,
          });
        }
      } else {
        // Mock Queue Fallback Handling
        const mockTaskId = `projects/${this.project}/locations/${this.location}/queues/${this.queue}/tasks/mock_task_${postId}_${Date.now()}`;
        this.logger.log(`[CloudTasksService] [MOCK QUEUE] Enqueued task ${mockTaskId} for post ${postId} scheduled for ${scheduledTimeIso} (${seconds}s)`);

        results.push({
          success: true,
          postId,
          taskId: mockTaskId,
          scheduledTime: scheduledTimeIso,
          scheduleTimeSeconds: seconds,
          targetUrl,
          isMock: true,
        });
      }
    }

    return results;
  }
}
