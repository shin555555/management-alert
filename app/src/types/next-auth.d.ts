import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      facilityId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    facilityId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    facilityId?: string;
  }
}
