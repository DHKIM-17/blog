
async function testResolve() {
  const shortUrl = 'https://maps.app.goo.gl/zvKRVuS9TVvQ9S5x7';
  try {
    const res = await fetch(shortUrl, { redirect: 'follow' });
    console.log('Final URL:', res.url);
  } catch (err) {
    console.error('Error:', err);
  }
}

testResolve();
