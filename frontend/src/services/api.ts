import type {
  User,
  Book,
  RoyaltySummary,
  Ticket,
  TicketMessage,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export class ApiError extends Error {
  public statusCode: number;
  public errors?: Array<{ field: string; message: string }>;

  constructor(message: string, statusCode: number, errors?: Array<{ field: string; message: string }>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('bookleaf_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = data?.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status, data?.errors);
  }

  return data;
}

export const api = {
  auth: {
    async login(email: string, password: string): Promise<{ token: string; user: User }> {
      const res = await request<{ success: boolean; data: { token: string; user: User } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      return res.data;
    },

    async getCurrentUser(): Promise<User> {
      const res = await request<{ success: boolean; data: { user: User } }>('/auth/me');
      return res.data.user;
    },
  },

  author: {
    async getBooks(): Promise<{
      author: User['authorProfile'];
      books: Book[];
      summary: RoyaltySummary;
    }> {
      const res = await request<{
        success: boolean;
        data: {
          author: User['authorProfile'];
          books: Book[];
          summary: RoyaltySummary;
        };
      }>('/author/books');
      return res.data;
    },
  },

  tickets: {
    async getTickets(params?: {
      status?: TicketStatus;
      category?: TicketCategory;
      priority?: TicketPriority;
      bookId?: string;
      search?: string;
      sortBy?: 'urgent' | 'oldest' | 'newest';
    }): Promise<Ticket[]> {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.category) query.append('category', params.category);
      if (params?.priority) query.append('priority', params.priority);
      if (params?.bookId) query.append('bookId', params.bookId);
      if (params?.search) query.append('search', params.search);
      if (params?.sortBy) query.append('sortBy', params.sortBy);

      const qs = query.toString() ? `?${query.toString()}` : '';
      const res = await request<{ success: boolean; data: { tickets: Ticket[] } }>(`/tickets${qs}`);
      return res.data.tickets;
    },

    async getTicket(id: string): Promise<Ticket> {
      const res = await request<{ success: boolean; data: { ticket: Ticket } }>(`/tickets/${id}`);
      return res.data.ticket;
    },

    async createTicket(data: {
      subject: string;
      description: string;
      bookId?: string | null;
      category?: TicketCategory;
      priority?: TicketPriority;
    }): Promise<Ticket> {
      const res = await request<{ success: boolean; message: string; data: { ticket: Ticket } }>(
        '/tickets',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return res.data.ticket;
    },

    async addMessage(
      ticketId: string,
      data: { content: string; isInternal?: boolean }
    ): Promise<TicketMessage> {
      const res = await request<{ success: boolean; message: string; data: { message: TicketMessage } }>(
        `/tickets/${ticketId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return res.data.message;
    },

    async updateTicket(
      ticketId: string,
      updates: {
        status?: TicketStatus;
        priority?: TicketPriority;
        category?: TicketCategory;
        assignedAdminId?: string | null;
      }
    ): Promise<Ticket> {
      const res = await request<{ success: boolean; message: string; data: { ticket: Ticket } }>(
        `/tickets/${ticketId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }
      );
      return res.data.ticket;
    },

    async generateAiDraft(ticketId: string): Promise<{
      success: boolean;
      draft?: string;
      reasoning?: string;
      relevantPolicies?: string[];
      source: string;
      error?: string;
    }> {
      const res = await request<{
        success: boolean;
        message: string;
        data: {
          success: boolean;
          draft?: string;
          reasoning?: string;
          relevantPolicies?: string[];
          source: string;
          error?: string;
        };
      }>(`/tickets/${ticketId}/ai/draft`, {
        method: 'POST',
      });
      return res.data;
    },

    async classifyTicket(ticketId: string): Promise<{
      success: boolean;
      category?: TicketCategory;
      priority?: TicketPriority;
      confidence?: number;
      reasoning?: string;
      source: string;
      error?: string;
      ticket?: Partial<Ticket>;
    }> {
      const res = await request<{
        success: boolean;
        message: string;
        data: {
          success: boolean;
          category?: TicketCategory;
          priority?: TicketPriority;
          confidence?: number;
          reasoning?: string;
          source: string;
          error?: string;
          ticket?: Partial<Ticket>;
        };
      }>(`/tickets/${ticketId}/ai/classify`, {
        method: 'POST',
      });
      return res.data;
    },

    async applyAiSuggestions(
      ticketId: string,
      options?: { applyCategory?: boolean; applyPriority?: boolean }
    ): Promise<Ticket> {
      const res = await request<{ success: boolean; message: string; data: { ticket: Ticket } }>(
        `/tickets/${ticketId}/ai/apply`,
        {
          method: 'POST',
          body: JSON.stringify(options || {}),
        }
      );
      return res.data.ticket;
    },
  },
};
