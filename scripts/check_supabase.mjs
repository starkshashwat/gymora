const supabaseUrl = 'https://lyutxishrebkuhcfmjzl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5dXR4aXNocmVia3VoY2ZtanpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNjE1MjksImV4cCI6MjEwNDczNzUyOX0.YxV5LiAj8B8jzc9UTSqg46WbsDOPhtUozdUI-EWJ8wc';

async function check() {
  console.log('--- 1. Testing Root Supabase Health ---');
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    console.log('REST endpoint status:', res.status, res.statusText);
  } catch (e) {
    console.log('Health check failed:', e.message);
  }

  const tables = ['gyms', 'profiles', 'membership_plans', 'members', 'memberships', 'payments', 'registration_requests'];
  
  console.log('\n--- 2. Checking Tables & Data ---');
  for (const table of tables) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'count=exact'
        }
      });
      const data = await res.json();
      const contentRange = res.headers.get('content-range');
      if (res.ok) {
        console.log(`✓ Table [${table}]: EXISTS. Rows: ${Array.isArray(data) ? data.length : 0} (Range: ${contentRange})`);
      } else {
        console.log(`✗ Table [${table}]: FAILED (${res.status} - ${data.message || data.error || JSON.stringify(data)})`);
      }
    } catch (e) {
      console.log(`✗ Table [${table}]: Network error -`, e.message);
    }
  }

  console.log('\n--- 3. Checking Public RPC: get_public_gym_by_slug ---');
  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_gym_by_slug`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_slug: 'iron-pulse' })
    });
    const rpcData = await rpcRes.json();
    if (rpcRes.ok) {
      console.log('✓ RPC get_public_gym_by_slug: EXISTS. Result:', JSON.stringify(rpcData));
    } else {
      console.log(`✗ RPC get_public_gym_by_slug: FAILED (${rpcRes.status} - ${rpcData.message || JSON.stringify(rpcData)})`);
    }
  } catch (e) {
    console.log('RPC check failed:', e.message);
  }
}

check();
