declare namespace Express {
  interface Request {
    user?: User;
  }

  interface User {
    id?: string;
    userId?: string;
    email?: string;
    role?: string;
    orgId?: string | null;
  }
}
