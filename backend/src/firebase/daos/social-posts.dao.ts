import { 
  SocialPostDocument, 
  CreateSocialPostDto, 
  PostStatus 
} from '../firestore.schema';

/**
 * Data Access Object (DAO) for the 'social_posts' Firestore collection.
 */
export class SocialPostsDao {
  constructor(private readonly getCol: (name: string) => any) {}

  private col() {
    return this.getCol('social_posts');
  }

  private snap<T>(doc: any): T | null {
    if (!doc || !doc.exists) return null;
    return { id: doc.id, ...doc.data() } as T;
  }

  /**
   * Create a new Social Post.
   */
  async create(data: CreateSocialPostDto, customId?: string): Promise<SocialPostDocument> {
    const now = new Date();
    const id = customId || Math.random().toString(36).substring(2, 15);
    const postDoc: Omit<SocialPostDocument, 'id'> = {
      workspaceId: data.workspaceId,
      authorId: data.authorId,
      caption: data.caption,
      imageUrl: data.imageUrl || null,
      scheduleTime: new Date(data.scheduleTime),
      status: data.status || 'DRAFT',
      publishedPostId: null,
      errorMessage: null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.col().doc(id).set(postDoc);
    return { id, ...postDoc };
  }

  /**
   * Find a Social Post by ID.
   */
  async findById(id: string): Promise<SocialPostDocument | null> {
    const doc = await this.col().doc(id).get();
    return this.snap<SocialPostDocument>(doc);
  }

  /**
   * Update a Social Post document.
   */
  async update(id: string, updates: Partial<SocialPostDocument>): Promise<SocialPostDocument | null> {
    const updateData = { ...updates, updatedAt: new Date() };
    delete (updateData as any).id;
    if (updateData.scheduleTime) {
      updateData.scheduleTime = new Date(updateData.scheduleTime);
    }
    await this.col().doc(id).update(updateData);
    return this.findById(id);
  }

  /**
   * Update the status of a Social Post (e.g. from SCHEDULED -> PUBLISHED or FAILED).
   */
  async updateStatus(
    id: string, 
    status: PostStatus, 
    metadata?: { publishedPostId?: string; errorMessage?: string }
  ): Promise<SocialPostDocument | null> {
    const updates: Partial<SocialPostDocument> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'PUBLISHED') {
      updates.publishedAt = new Date();
      if (metadata?.publishedPostId) {
        updates.publishedPostId = metadata.publishedPostId;
      }
    } else if (status === 'FAILED' && metadata?.errorMessage) {
      updates.errorMessage = metadata.errorMessage;
    }

    await this.col().doc(id).update(updates);
    return this.findById(id);
  }

  /**
   * Find all Social Posts for a workspace, optionally filtered by status.
   */
  async findByWorkspace(workspaceId: string, status?: PostStatus): Promise<SocialPostDocument[]> {
    let query = this.col().where('workspaceId', '==', workspaceId);
    if (status) {
      query = query.where('status', '==', status);
    }
    const snap = await query.get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SocialPostDocument));
  }

  /**
   * Query all SCHEDULED posts due to be published at or before `now`.
   * Essential query for background scheduler workers.
   */
  async findDueScheduledPosts(now: Date = new Date()): Promise<SocialPostDocument[]> {
    const snap = await this.col()
      .where('status', '==', 'SCHEDULED')
      .where('scheduleTime', '<=', now)
      .get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SocialPostDocument));
  }

  /**
   * Delete a Social Post.
   */
  async delete(id: string): Promise<boolean> {
    await this.col().doc(id).delete();
    return true;
  }
}
