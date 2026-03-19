export default {
    async fetch(request, env) {
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const postId = url.searchParams.get('post');

        if (!postId || !/^[a-z0-9-]+$/.test(postId)) {
            return Response.json(
                { error: 'Invalid or missing post id' },
                { status: 400, headers: corsHeaders }
            );
        }

        // GET — read current count
        if (request.method === 'GET') {
            const count = parseInt((await env.LIKES_STORE.get(postId)) || '0', 10);
            return Response.json({ count }, { headers: corsHeaders });
        }

        // POST — increment and return new count
        if (request.method === 'POST') {
            const current = parseInt((await env.LIKES_STORE.get(postId)) || '0', 10);
            const newCount = current + 1;
            await env.LIKES_STORE.put(postId, newCount.toString());
            return Response.json({ count: newCount }, { headers: corsHeaders });
        }

        return Response.json(
            { error: 'Method not allowed' },
            { status: 405, headers: corsHeaders }
        );
    },
};
