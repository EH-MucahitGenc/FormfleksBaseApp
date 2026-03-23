const { Client } = require('pg')

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'formfleks_base_app',
  user: 'postgres',
  password: '123456',
})

async function run() {
  try {
    await client.connect();
    
    // Find orphaned approvals where the parent form_request does not exist
    const orphanQuery = `
      SELECT a.id, a.request_id, a.status 
      FROM public.form_request_approvals a
      LEFT JOIN public.form_requests r ON a.request_id = r.id
      WHERE r.id IS NULL AND a.status = 1;
    `;
    const res = await client.query(orphanQuery);
    
    console.log(`Found ${res.rowCount} orphaned Pending approvals.`);
    if (res.rowCount > 0) {
      console.log(JSON.stringify(res.rows, null, 2));
      
      // Fix by setting them back to 'hidden/deleted' state, e.g. status 3 (or delete them)
      console.log('Cleaning up orphaned approvals...');
      await client.query(`
        DELETE FROM public.form_request_approvals 
        WHERE id IN (
          SELECT a.id FROM public.form_request_approvals a
          LEFT JOIN public.form_requests r ON a.request_id = r.id
          WHERE r.id IS NULL
        )
      `);
      console.log('Cleanup complete.');
    }
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

run();
