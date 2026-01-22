import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify and decode JWT session token
async function verifySessionToken(token: string, secret: string): Promise<{ client_id: string; client_name: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Verify signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    // Convert base64url to regular base64
    const sigB64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - sigB64.length % 4) % 4);
    const signature = Uint8Array.from(atob(sigB64 + padding), c => c.charCodeAt(0));
    
    const valid = await crypto.subtle.verify("HMAC", key, signature, data);
    if (!valid) return null;

    // Decode payload
    const payloadB64Fixed = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadPadding = '='.repeat((4 - payloadB64Fixed.length % 4) % 4);
    const payload = JSON.parse(atob(payloadB64Fixed + payloadPadding));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    if (payload.type !== 'asset_share') return null;
    
    return { client_id: payload.client_id, client_name: payload.client_name };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify session token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionToken = authHeader.slice(7);
    const session = await verifySessionToken(sessionToken, supabaseServiceKey);
    
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { client_id } = session;
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'list-folders': {
        const parentId = url.searchParams.get('parent_id');
        
        let query = supabase
          .from('asset_folders')
          .select('*')
          .eq('client_id', client_id)
          .order('name');
        
        if (parentId) {
          query = query.eq('parent_id', parentId);
        } else {
          query = query.is('parent_id', null);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ folders: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-assets': {
        const folderId = url.searchParams.get('folder_id');
        
        let query = supabase
          .from('assets')
          .select('*')
          .eq('client_id', client_id)
          .order('created_at', { ascending: false });
        
        if (folderId) {
          query = query.eq('folder_id', folderId);
        } else {
          query = query.is('folder_id', null);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ assets: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-folder': {
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { name, parent_id, color } = await req.json();
        
        if (!name) {
          return new Response(
            JSON.stringify({ error: 'Folder name is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('asset_folders')
          .insert({
            client_id,
            name,
            parent_id: parent_id || null,
            color: color || '#6366f1'
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ folder: data }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-upload-url': {
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { filename, content_type, folder_id } = await req.json();
        
        if (!filename || !content_type) {
          return new Response(
            JSON.stringify({ error: 'Filename and content type are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate unique file path
        const timestamp = Date.now();
        const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${client_id}/${timestamp}-${cleanFilename}`;

        // Create signed upload URL
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('client-assets')
          .createSignedUploadUrl(filePath);

        if (uploadError) throw uploadError;

        return new Response(
          JSON.stringify({ 
            upload_url: uploadData.signedUrl,
            file_path: filePath,
            folder_id
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-asset': {
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { title, file_path, content_type, folder_id } = await req.json();
        
        if (!title || !file_path) {
          return new Response(
            JSON.stringify({ error: 'Title and file path are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('client-assets')
          .getPublicUrl(file_path);

        // Determine asset type from content type
        let assetType = 'file';
        if (content_type?.startsWith('image/')) assetType = 'image';
        else if (content_type?.startsWith('video/')) assetType = 'video';
        else if (content_type?.startsWith('audio/')) assetType = 'audio';
        else if (content_type?.includes('pdf')) assetType = 'document';

        const { data, error } = await supabase
          .from('assets')
          .insert({
            client_id,
            title,
            file_url: urlData.publicUrl,
            preview_url: assetType === 'image' ? urlData.publicUrl : null,
            type: assetType,
            folder_id: folder_id || null,
            tags: []
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ asset: data }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-breadcrumbs': {
        const folderId = url.searchParams.get('folder_id');
        
        if (!folderId) {
          return new Response(
            JSON.stringify({ breadcrumbs: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Build breadcrumb trail (max 10 levels deep)
        const breadcrumbs: { id: string; name: string }[] = [];
        let currentId: string | null = folderId;

        for (let i = 0; i < 10 && currentId; i++) {
          const queryResult: { data: { id: string; name: string; parent_id: string | null } | null; error: unknown } = await supabase
            .from('asset_folders')
            .select('id, name, parent_id')
            .eq('id', currentId)
            .eq('client_id', client_id)
            .single();

          if (queryResult.error || !queryResult.data) break;

          breadcrumbs.unshift({ id: queryResult.data.id, name: queryResult.data.name });
          currentId = queryResult.data.parent_id;
        }

        return new Response(
          JSON.stringify({ breadcrumbs }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in public-assets-api:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
