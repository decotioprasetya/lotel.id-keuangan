
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://prllqswuxxhnhwlqsxph.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybGxxc3d1eHhobmh3bHFzeHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODUwMzMsImV4cCI6MjA4NTg2MTAzM30.uM9_q8SE9dygW1OP4wLtt2aR6gKCjGuLE_V0FbiLzow';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
