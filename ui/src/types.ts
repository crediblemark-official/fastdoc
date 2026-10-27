export interface VariableMeta {
  key: string;
  display_name: string;
  data_type: 'string' | 'number' | 'date' | 'text_multiline' | 'table' | 'boolean' | 'signature' | 'image';
  is_loop: boolean;
  is_ai_candidate: boolean;
  filters_used: string[];
  raw_tag: string;
  sub_fields?: string[];
}

export interface MasterSignature {
  id: string;
  name: string;
  role_title?: string;
  image_data: string;
  pen_color?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateSchema {
  template_name: string;
  total_variables: number;
  variables: VariableMeta[];
  loop_blocks: string[];
  has_tables: boolean;
  has_headers_footers: boolean;
}

export interface WorkspaceTemplate {
  id: string;
  workspace_id: string;
  filename: string;
  file_path: string;
  schema: TemplateSchema;
  is_active: number;
  created_at: string;
}

export interface WorkspaceRecord {
  id: string;
  workspace_id: string;
  entity_id?: string;
  display_name: string;
  data: Record<string, any>;
  is_completed: number;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  active_template_id?: string;
  active_template_name?: string;
  total_records: number;
  templates?: WorkspaceTemplate[];
  records?: WorkspaceRecord[];
  created_at: string;
  updated_at: string;
}

export interface MasterEntity {
  id: string;
  entity_type: string;
  primary_identifier?: string;
  display_name: string;
  attributes: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SystemHealth {
  status: string;
  app_name: string;
  version: string;
}

export interface ScanResponse {
  status: string;
  message: string;
  data: {
    template_id: string;
    filename: string;
    schema: TemplateSchema;
    extracted_data?: Record<string, any>;
    auto_converted?: boolean;
  };
}
