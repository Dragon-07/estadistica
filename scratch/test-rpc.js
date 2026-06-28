const supabaseUrl = 'https://xmfcmntdiximbzzljswb.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZmNtbnRkaXhpbWJ6emxqc3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzU4NzAsImV4cCI6MjA5MDY1MTg3MH0.s3k-A3RZOS8ISlD-d4Xi09v9uUMTiX29HXrP34Map_I';

async function test() {
  const url = `${supabaseUrl}/rest/v1/rpc/get_treatment_stats_by_period`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({
        start_date: null,
        end_date: null
      })
    });
    
    console.log('Status:', res.status);
    console.log('Status Text:', res.statusText);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Error fetching:', err);
  }
}

test();
