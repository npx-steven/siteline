import { Role } from "./db";
import type { GrantableRole } from "@/lib/roles";

export type AccountData = {
  profile: {
    fullName: string;
    role: Role;
    email: string;
    createdAt: string;
    phone: string | null;
  };
  company: {
    name: string;
    license_number: string | null;
  };
  // Enough of the team for the company card's avatar stack and count.
  members: {
    count: number;
    names: string[];
  };
  // Pending join requests. Always 0 for non-owners, who can't see them.
  requestCount: number;
};

export type Profile = AccountData["profile"];
export type Company = AccountData["company"];

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  joinedAt: string;
  isYou: boolean;
};

export type JoinRequest = {
  id: string;
  fullName: string;
  email: string;
  requestedRole: GrantableRole;
  requestedAt: string;
};
