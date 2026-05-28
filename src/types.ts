export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  genre: string;
  synopsis?: string;
  cover_url: string; // URL structure (either full URL or base64)
  file_url: string;  // URL structure (either full URL or base64)
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'banned';
  must_change_password?: boolean;
  created_at?: string;
}

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  supabaseUrlExists: boolean;
  supabaseAnonKeyExists: boolean;
  supabaseServiceRoleKeyExists: boolean;
}
