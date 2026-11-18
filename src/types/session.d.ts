import 'express-session';
import { UserRole } from '../areas/identity/models/user.entity';

declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
    user?: {
      id: number;
      name: string;
      email: string;
      role: UserRole;
      isVerified?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    } | null;
  }
}

