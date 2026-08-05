import { 
  UserDocument, 
  CreateUserDto 
} from '../firestore.schema';

/**
 * Data Access Object (DAO) for the 'users' Firestore collection.
 */
export class UsersDao {
  constructor(private readonly getCol: (name: string) => any) {}

  private col() {
    return this.getCol('users');
  }

  private snap<T>(doc: any): T | null {
    if (!doc || !doc.exists) return null;
    return { id: doc.id, ...doc.data() } as T;
  }

  /**
   * Create a new User document in Firestore.
   */
  async create(data: CreateUserDto, customId?: string): Promise<UserDocument> {
    const now = new Date();
    const id = customId || Math.random().toString(36).substring(2, 15);
    const userDoc: Omit<UserDocument, 'id'> = {
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash || null,
      role: data.role || 'MEMBER',
      status: data.status || 'ACTIVE',
      preferredLanguage: data.preferredLanguage || 'English',
      createdAt: now,
      updatedAt: now,
    };
    await this.col().doc(id).set(userDoc);
    return { id, ...userDoc };
  }

  /**
   * Find a User by document ID.
   */
  async findById(id: string): Promise<UserDocument | null> {
    const doc = await this.col().doc(id).get();
    return this.snap<UserDocument>(doc);
  }

  /**
   * Find a User by email address.
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    const snap = await this.col().where('email', '==', email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as UserDocument;
  }

  /**
   * Update a User document.
   */
  async update(id: string, updates: Partial<UserDocument>): Promise<UserDocument | null> {
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
   * Delete a User document.
   */
  async delete(id: string): Promise<boolean> {
    await this.col().doc(id).delete();
    return true;
  }

  /**
   * List all Users ordered by creation date.
   */
  async listAll(): Promise<UserDocument[]> {
    const snap = await this.col().orderBy('createdAt', 'desc').get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as UserDocument));
  }
}
