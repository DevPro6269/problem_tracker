export type Role = 'ADMIN' | 'RESIDENT';

export type SocietyInfo = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  createdAt: string;
  joinCode?: string;
};

export type Membership = {
  societyId: string;
  slug: string;
  role: Role;
};

export type SessionUser = {
  id: string;
  name: string;
  phone: string;
  memberships: Membership[];
};

export type TicketCategory =
  | 'ELEVATOR'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'SECURITY'
  | 'CLEANLINESS'
  | 'PARKING'
  | 'OTHER';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type Ticket = {
  id: string;
  societyId: string;
  createdById: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  location: string | null;
  assignedTo: string | null;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
};
