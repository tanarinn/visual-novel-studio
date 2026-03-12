const apiKey = process.env.GEMINI_API_KEY;

async function run() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: "A simple red circle on white background, minimal" }] }],
    generationConfig: { responseMimeType: "image/jpeg" }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  console.log("Status:", res.status);
  console.log("Response:", (await res.text().catch(()=>'')).substring(0, 500));
}

run();
