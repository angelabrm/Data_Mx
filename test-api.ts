async function testDashboardData() {
  const rfc = '12345'; // Dummy RFC
  const compass = 'Michael Ardila';
  const genesys = 'Michael Ardila';
  const qa = 'Michael Ardila';
  const startDate = '2025-01-01';
  const endDate = '2026-12-31';

  const url = `http://localhost:3000/api/dashboard-data?rfc=${rfc}&compass=${encodeURIComponent(compass)}&genesys=${encodeURIComponent(genesys)}&qa=${encodeURIComponent(qa)}&startDate=${startDate}&endDate=${endDate}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

testDashboardData();
