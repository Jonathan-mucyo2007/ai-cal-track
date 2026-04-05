const CLIENT_ID = process.env.FATSECRET_CLIENT_ID;
const CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET;

async function test() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Set FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET before running this test.');
  }

  const credentials = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
  const response = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic'
  });
  console.log('Auth Status:', response.status);
  const body = await response.text();
  
  if (!response.ok) {
     console.error("Auth Body:", body);
     return;
  }
  
  const token = JSON.parse(body).access_token;
  console.log("Got Token:", token.slice(0, 10) + '...');
  
  const searchRes = await fetch("https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=egg&format=json&max_results=5", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  });
  console.log("Search Status:", searchRes.status);
  console.log("Search Body:", await searchRes.text());
}
test();
