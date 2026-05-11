export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      check_ins: {
        Row: {
          checked_in_at: string
          checker_id: string
          event_id: string
          id: string
          note: string | null
          rsvp_id: string
          ticket_code: string
          undone_at: string | null
          undone_by: string | null
        }
        Insert: {
          checked_in_at?: string
          checker_id: string
          event_id: string
          id?: string
          note?: string | null
          rsvp_id: string
          ticket_code: string
          undone_at?: string | null
          undone_by?: string | null
        }
        Update: {
          checked_in_at?: string
          checker_id?: string
          event_id?: string
          id?: string
          note?: string | null
          rsvp_id?: string
          ticket_code?: string
          undone_at?: string | null
          undone_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_rsvp_id_fkey"
            columns: ["rsvp_id"]
            isOneToOne: false
            referencedRelation: "event_tickets"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "check_ins_rsvp_id_fkey"
            columns: ["rsvp_id"]
            isOneToOne: false
            referencedRelation: "rsvps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_rsvp_id_fkey"
            columns: ["rsvp_id"]
            isOneToOne: false
            referencedRelation: "waitlist_entries"
            referencedColumns: ["entry_id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          cover_url: string | null
          created_at: string
          description: string | null
          ends_at: string
          hidden: boolean
          host_id: string
          id: string
          is_paid: boolean
          online_link: string | null
          starts_at: string
          state: Database["public"]["Enums"]["event_state"]
          timezone: string
          title: string
          updated_at: string
          venue: string | null
          visibility: Database["public"]["Enums"]["event_visibility"]
        }
        Insert: {
          capacity?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          hidden?: boolean
          host_id: string
          id?: string
          is_paid?: boolean
          online_link?: string | null
          starts_at: string
          state?: Database["public"]["Enums"]["event_state"]
          timezone?: string
          title: string
          updated_at?: string
          venue?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Update: {
          capacity?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          hidden?: boolean
          host_id?: string
          id?: string
          is_paid?: boolean
          online_link?: string | null
          starts_at?: string
          state?: Database["public"]["Enums"]["event_state"]
          timezone?: string
          title?: string
          updated_at?: string
          venue?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          event_id: string | null
          file_url: string | null
          host_id: string
          id: string
          requested_by: string
          row_count: number | null
          status: Database["public"]["Enums"]["export_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          event_id?: string | null
          file_url?: string | null
          host_id: string
          id?: string
          requested_by: string
          row_count?: number | null
          status?: Database["public"]["Enums"]["export_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          event_id?: string | null
          file_url?: string | null
          host_id?: string
          id?: string
          requested_by?: string
          row_count?: number | null
          status?: Database["public"]["Enums"]["export_status"]
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_approvals: {
        Row: {
          approver_id: string
          decided_at: string
          decision: string
          id: string
          note: string | null
          photo_id: string
        }
        Insert: {
          approver_id: string
          decided_at?: string
          decision: string
          id?: string
          note?: string | null
          photo_id: string
        }
        Update: {
          approver_id?: string
          decided_at?: string
          decision?: string
          id?: string
          note?: string | null
          photo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_approvals_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_approvals_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          created_at: string
          event_id: string
          id: string
          photo_url: string
          state: Database["public"]["Enums"]["gallery_state"]
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          photo_url: string
          state?: Database["public"]["Enums"]["gallery_state"]
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          photo_url?: string
          state?: Database["public"]["Enums"]["gallery_state"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      host_invites: {
        Row: {
          created_at: string
          expires_at: string
          host_id: string
          id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["member_role"]
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          host_id: string
          id?: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["member_role"]
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          host_id?: string
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_invites_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      host_members: {
        Row: {
          created_at: string
          host_id: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          host_id: string
          id?: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          host_id?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_members_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hosts: {
        Row: {
          bio: string | null
          contact_email: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          slug: string
        }
        Insert: {
          bio?: string | null
          contact_email: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          slug: string
        }
        Update: {
          bio?: string | null
          contact_email?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string | null
          state: Database["public"]["Enums"]["report_state"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string | null
          state?: Database["public"]["Enums"]["report_state"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string | null
          state?: Database["public"]["Enums"]["report_state"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: []
      }
      rsvps: {
        Row: {
          calendar_added_at: string | null
          checked_in_at: string | null
          created_at: string
          event_id: string
          id: string
          position: number | null
          status: Database["public"]["Enums"]["rsvp_status"]
          ticket_code: string
          user_id: string
        }
        Insert: {
          calendar_added_at?: string | null
          checked_in_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          position?: number | null
          status: Database["public"]["Enums"]["rsvp_status"]
          ticket_code?: string
          user_id: string
        }
        Update: {
          calendar_added_at?: string | null
          checked_in_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          position?: number | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          ticket_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      event_tickets: {
        Row: {
          attendee_id: string | null
          calendar_added_at: string | null
          checked_in_at: string | null
          code: string | null
          event_id: string | null
          issued_at: string | null
          ticket_id: string | null
        }
        Insert: {
          attendee_id?: string | null
          calendar_added_at?: string | null
          checked_in_at?: string | null
          code?: string | null
          event_id?: string | null
          issued_at?: string | null
          ticket_id?: string | null
        }
        Update: {
          attendee_id?: string | null
          calendar_added_at?: string | null
          checked_in_at?: string | null
          code?: string | null
          event_id?: string | null
          issued_at?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string | null
          photo_url: string | null
          state: Database["public"]["Enums"]["gallery_state"] | null
          uploader_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string | null
          photo_url?: string | null
          state?: Database["public"]["Enums"]["gallery_state"] | null
          uploader_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string | null
          photo_url?: string | null
          state?: Database["public"]["Enums"]["gallery_state"] | null
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          attendee_id: string | null
          created_at: string | null
          entry_id: string | null
          event_id: string | null
          queue_order: number | null
          state: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_host_role: {
        Args: {
          _host: string
          _role: Database["public"]["Enums"]["member_role"]
          _user: string
        }
        Returns: boolean
      }
      is_host_member: {
        Args: { _host: string; _user: string }
        Returns: boolean
      }
      promote_waitlist_for_event: {
        Args: { _event: string }
        Returns: undefined
      }
    }
    Enums: {
      event_state: "draft" | "published"
      event_visibility: "public" | "unlisted"
      export_status: "queued" | "running" | "done" | "failed"
      gallery_state: "pending" | "approved" | "hidden"
      member_role: "host" | "checker"
      report_state: "open" | "hidden" | "dismissed"
      report_target: "event" | "photo"
      rsvp_status: "going" | "waitlist" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_state: ["draft", "published"],
      event_visibility: ["public", "unlisted"],
      export_status: ["queued", "running", "done", "failed"],
      gallery_state: ["pending", "approved", "hidden"],
      member_role: ["host", "checker"],
      report_state: ["open", "hidden", "dismissed"],
      report_target: ["event", "photo"],
      rsvp_status: ["going", "waitlist", "cancelled"],
    },
  },
} as const
