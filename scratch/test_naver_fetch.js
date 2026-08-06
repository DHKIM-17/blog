

async function testFetch(url) {
  try {
    const res = await fetch(url, { headers: { 'Referer': 'https://m.blog.naver.com/' } });
    console.log(url, res.status);
  } catch (e) {
    console.error(e.message);
  }
}

const base = "https://mblogthumb-phinf.pstatic.net/MjAyNDA4MTdfNTEg/MDAxNzIzOTA1MTcxMDEz.fXgm8XODZozZCiSOw18H_m5ErK2TvshsyIZuww9TF84g.t4W75KHAmx3zxQQlonIG_edRVAdOgVsJ2myZGedahbUg.JPEG/IMG_7677.JPG";

testFetch(base);
testFetch(base + "?type=w800");
testFetch(base + "?type=w1920");
testFetch(base + "?type=w3000");
