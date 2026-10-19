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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assessment_answers: {
        Row: {
          answered_at: string
          assessment_id: string
          id: string
          is_correct: boolean | null
          marked_for_review: boolean
          question_id: string
          selected_answer: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          assessment_id: string
          id?: string
          is_correct?: boolean | null
          marked_for_review?: boolean
          question_id: string
          selected_answer?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string
          assessment_id?: string
          id?: string
          is_correct?: boolean | null
          marked_for_review?: boolean
          question_id?: string
          selected_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          assessment_id: string
          correct_answer: string | null
          created_at: string
          explanation: string | null
          id: string
          options: Json
          position: number
          question: string
          subtopic: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          assessment_id: string
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          position?: number
          question: string
          subtopic?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          assessment_id?: string
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          position?: number
          question?: string
          subtopic?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          assessment_id: string | null
          correct: number
          created_at: string
          id: string
          score: number
          topic: string
          total: number
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          correct?: number
          created_at?: string
          id?: string
          score: number
          topic: string
          total?: number
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          correct?: number
          created_at?: string
          id?: string
          score?: number
          topic?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      assessments: {
        Row: {
          accuracy: number | null
          completed_at: string | null
          correct: number | null
          created_at: string
          difficulty: string
          id: string
          incorrect: number | null
          question_count: number | null
          score: number | null
          started_at: string
          status: string
          time_efficiency: number | null
          time_limit_seconds: number | null
          time_taken_seconds: number | null
          title: string
          topic: string
          topic_breakdown: Json
          topics: Json
          unanswered: number | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          completed_at?: string | null
          correct?: number | null
          created_at?: string
          difficulty?: string
          id?: string
          incorrect?: number | null
          question_count?: number | null
          score?: number | null
          started_at?: string
          status?: string
          time_efficiency?: number | null
          time_limit_seconds?: number | null
          time_taken_seconds?: number | null
          title: string
          topic: string
          topic_breakdown?: Json
          topics?: Json
          unanswered?: number | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          completed_at?: string | null
          correct?: number | null
          created_at?: string
          difficulty?: string
          id?: string
          incorrect?: number | null
          question_count?: number | null
          score?: number | null
          started_at?: string
          status?: string
          time_efficiency?: number | null
          time_limit_seconds?: number | null
          time_taken_seconds?: number | null
          title?: string
          topic?: string
          topic_breakdown?: Json
          topics?: Json
          unanswered?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          meta: Json
          role: string
          session_id: string
          sources: Json
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          meta?: Json
          role: string
          session_id: string
          sources?: Json
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          meta?: Json
          role?: string
          session_id?: string
          sources?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          category: string | null
          chunk_index: number
          content: string
          created_at: string
          difficulty: string | null
          document_id: string
          embedding: string | null
          embedding_3072: string | null
          id: string
          metadata: Json
          source: string | null
          subtopic: string | null
          topic: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          chunk_index?: number
          content: string
          created_at?: string
          difficulty?: string | null
          document_id: string
          embedding?: string | null
          embedding_3072?: string | null
          id?: string
          metadata?: Json
          source?: string | null
          subtopic?: string | null
          topic?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          chunk_index?: number
          content?: string
          created_at?: string
          difficulty?: string | null
          document_id?: string
          embedding?: string | null
          embedding_3072?: string | null
          id?: string
          metadata?: Json
          source?: string | null
          subtopic?: string | null
          topic?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          difficulty: string | null
          id: string
          metadata: Json
          source: string | null
          title: string
          topic: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          metadata?: Json
          source?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          metadata?: Json
          source?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mock_interview_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          created_at: string
          evaluation: Json
          feedback: string | null
          focus: string | null
          id: string
          mock_interview_id: string
          position: number
          question: string
          question_key: string | null
          score: number | null
          time_taken_seconds: number | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          evaluation?: Json
          feedback?: string | null
          focus?: string | null
          id?: string
          mock_interview_id: string
          position?: number
          question: string
          question_key?: string | null
          score?: number | null
          time_taken_seconds?: number | null
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          evaluation?: Json
          feedback?: string | null
          focus?: string | null
          id?: string
          mock_interview_id?: string
          position?: number
          question?: string
          question_key?: string | null
          score?: number | null
          time_taken_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_interview_questions_mock_interview_id_fkey"
            columns: ["mock_interview_id"]
            isOneToOne: false
            referencedRelation: "mock_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_interview_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mock_interviews: {
        Row: {
          company: string | null
          completed_at: string | null
          created_at: string
          current_position: number
          feedback: string | null
          id: string
          interview_type: string
          overall_score: number | null
          question_count: number | null
          report: Json
          role: string
          seconds_per_question: number | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          company?: string | null
          completed_at?: string | null
          created_at?: string
          current_position?: number
          feedback?: string | null
          id?: string
          interview_type?: string
          overall_score?: number | null
          question_count?: number | null
          report?: Json
          role: string
          seconds_per_question?: number | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          company?: string | null
          completed_at?: string | null
          created_at?: string
          current_position?: number
          feedback?: string | null
          id?: string
          interview_type?: string
          overall_score?: number | null
          question_count?: number | null
          report?: Json
          role?: string
          seconds_per_question?: number | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_interviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          score: number | null
          session_type: string
          started_at: string
          topic: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          score?: number | null
          session_type?: string
          started_at?: string
          topic: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          score?: number | null
          session_type?: string
          started_at?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      preparation_plans: {
        Row: {
          category: string
          completed: boolean
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparation_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          branch: string | null
          college: string | null
          created_at: string
          degree: string | null
          email: string | null
          full_name: string
          graduation_year: number | null
          target_company: string
          target_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          college?: string | null
          created_at?: string
          degree?: string | null
          email?: string | null
          full_name?: string
          graduation_year?: number | null
          target_company?: string
          target_role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          college?: string | null
          created_at?: string
          degree?: string | null
          email?: string | null
          full_name?: string
          graduation_year?: number | null
          target_company?: string
          target_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          link: string | null
          priority: number
          status: string
          title: string
          user_id: string
          weak_area_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          priority?: number
          status?: string
          title: string
          user_id: string
          weak_area_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          priority?: number
          status?: string
          title?: string
          user_id?: string
          weak_area_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recommendations_weak_area_id_fkey"
            columns: ["weak_area_id"]
            isOneToOne: false
            referencedRelation: "weak_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_progress: {
        Row: {
          completed_at: string
          id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          resource_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_progress_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      resources: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty: string
          estimated_minutes: number
          id: string
          resource_type: string
          source_name: string | null
          title: string
          url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          estimated_minutes?: number
          id?: string
          resource_type?: string
          source_name?: string | null
          title: string
          url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          estimated_minutes?: number
          id?: string
          resource_type?: string
          source_name?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      resume_analysis: {
        Row: {
          ats_breakdown: Json
          created_at: string
          id: string
          improvements: Json
          keywords: Json
          missing_keywords: Json
          overall_score: number | null
          resume_profile_id: string
          strengths: Json
          suggestions: Json
          summary: string | null
          target_role: string | null
          user_id: string
        }
        Insert: {
          ats_breakdown?: Json
          created_at?: string
          id?: string
          improvements?: Json
          keywords?: Json
          missing_keywords?: Json
          overall_score?: number | null
          resume_profile_id: string
          strengths?: Json
          suggestions?: Json
          summary?: string | null
          target_role?: string | null
          user_id: string
        }
        Update: {
          ats_breakdown?: Json
          created_at?: string
          id?: string
          improvements?: Json
          keywords?: Json
          missing_keywords?: Json
          overall_score?: number | null
          resume_profile_id?: string
          strengths?: Json
          suggestions?: Json
          summary?: string | null
          target_role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_analysis_resume_profile_id_fkey"
            columns: ["resume_profile_id"]
            isOneToOne: false
            referencedRelation: "resume_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_analysis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      resume_profiles: {
        Row: {
          created_at: string
          file_path: string | null
          id: string
          is_primary: boolean
          parsed_data: Json
          raw_text: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          id?: string
          is_primary?: boolean
          parsed_data?: Json
          raw_text?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          id?: string
          is_primary?: boolean
          parsed_data?: Json
          raw_text?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      roadmap_tasks: {
        Row: {
          category: string
          completed: boolean
          completed_at: string | null
          created_at: string
          day: number
          description: string
          estimated_minutes: number
          id: string
          position: number
          priority: string
          reason: string | null
          roadmap_id: string
          topic: string
          user_id: string
          week: number
        }
        Insert: {
          category?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day?: number
          description?: string
          estimated_minutes?: number
          id?: string
          position?: number
          priority?: string
          reason?: string | null
          roadmap_id: string
          topic: string
          user_id: string
          week?: number
        }
        Update: {
          category?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day?: number
          description?: string
          estimated_minutes?: number
          id?: string
          position?: number
          priority?: string
          reason?: string | null
          roadmap_id?: string
          topic?: string
          user_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_tasks_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      roadmaps: {
        Row: {
          created_at: string
          horizon_days: number
          id: string
          inputs: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          horizon_days: number
          id?: string
          inputs?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          horizon_days?: number
          id?: string
          inputs?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmaps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scheduled_sessions: {
        Row: {
          company: string
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          role: string
          round_type: string
          scheduled_at: string
          session_type: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          role?: string
          round_type?: string
          scheduled_at: string
          session_type?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          role?: string
          round_type?: string
          scheduled_at?: string
          session_type?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          proficiency: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          proficiency?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          proficiency?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      weak_areas: {
        Row: {
          attempts: number
          attention: string | null
          created_at: string
          evaluated_at: string | null
          id: string
          notes: string | null
          reason: string | null
          recommended_action: string | null
          resolved: boolean
          score: number | null
          severity: string
          signals: Json
          source: string
          topic: string
          trend: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          attention?: string | null
          created_at?: string
          evaluated_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          recommended_action?: string | null
          resolved?: boolean
          score?: number | null
          severity?: string
          signals?: Json
          source?: string
          topic: string
          trend?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          attention?: string | null
          created_at?: string
          evaluated_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          recommended_action?: string | null
          resolved?: boolean
          score?: number | null
          severity?: string
          signals?: Json
          source?: string
          topic?: string
          trend?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weak_areas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_knowledge_chunks: {
        Args: {
          filter_category?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          difficulty: string
          document_id: string
          id: string
          similarity: number
          source: string
          subtopic: string
          title: string
          topic: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
