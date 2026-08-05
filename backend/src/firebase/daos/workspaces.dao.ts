import { 
  WorkspaceDocument, 
  CreateWorkspaceDto 
} from '../firestore.schema';

/**
 * Data Access Object (DAO) for the 'workspaces' (businesses) Firestore collection.
 */
export class WorkspacesDao {
  constructor(private readonly getCol: (name: string) => any) {}

  private col() {
    return this.getCol('workspaces');
  }

  private snap<T>(doc: any): T | null {
    if (!doc || !doc.exists) return null;
    return { id: doc.id, ...doc.data() } as T;
  }

  /**
   * Create a new Workspace document in Firestore.
   */
  async create(data: CreateWorkspaceDto, customId?: string): Promise<WorkspaceDocument> {
    const now = new Date();
    const id = customId || Math.random().toString(36).substring(2, 15);
    const workspaceDoc: Omit<WorkspaceDocument, 'id'> = {
      name: data.name,
      ownerId: data.ownerId,
      memberIds: [data.ownerId],
      niche: data.niche || 'General Business',
      vibe: data.vibe || 'Professional & Engaging',
      metaPageId: null,
      metaPageName: null,
      metaIgBusinessAccountId: null,
      metaAdAccountId: null,
      metaAccessToken: null,
      metaTokenExpiry: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.col().doc(id).set(workspaceDoc);
    return { id, ...workspaceDoc };
  }

  /**
   * Find a Workspace by ID.
   */
  async findById(id: string): Promise<WorkspaceDocument | null> {
    const doc = await this.col().doc(id).get();
    return this.snap<WorkspaceDocument>(doc);
  }

  /**
   * Update a Workspace's niche and vibe (brand voice/tone).
   */
  async updateNicheAndVibe(id: string, niche: string, vibe: string): Promise<WorkspaceDocument | null> {
    return this.update(id, { niche, vibe });
  }

  /**
   * Update any Workspace fields.
   */
  async update(id: string, updates: Partial<WorkspaceDocument>): Promise<WorkspaceDocument | null> {
    if (!id) return null;
    const updateData = { ...updates, updatedAt: new Date() };
    delete (updateData as any).id;
    const docRef = this.col().doc(id);
    if (docRef?.set) {
      await docRef.set(updateData, { merge: true });
    } else if (docRef?.update) {
      await docRef.update(updateData);
    }
    return this.findById(id);
  }

  /**
   * Find all workspaces where userId is an owner or member.
   */
  async findByUserId(userId: string): Promise<WorkspaceDocument[]> {
    const snap = await this.col().where('memberIds', 'array-contains', userId).get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as WorkspaceDocument));
  }

  /**
   * Delete a Workspace document.
   */
  async delete(id: string): Promise<boolean> {
    await this.col().doc(id).delete();
    return true;
  }

  /**
   * List all workspaces ordered by creation date.
   */
  async listAll(): Promise<WorkspaceDocument[]> {
    const snap = await this.col().orderBy('createdAt', 'desc').get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as WorkspaceDocument));
  }
}
