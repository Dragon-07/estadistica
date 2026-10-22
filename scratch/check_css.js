async function check() {
  const htmlRes = await fetch('http://localhost:3000');
  const html = await htmlRes.text();
  const match = html.match(/href="([^"]+\.css)"/);
  console.log('CSS URL:', match ? match[1] : 'NOT FOUND');
  if (match) {
    const cssRes = await fetch('http://localhost:3000' + match[1]);
    const css = await cssRes.text();
    console.log('CSS Length:', css.length);
    console.log('First 400 chars:\n', css.slice(0, 400));
    console.log('Has flex:', css.includes('.flex'));
    console.log('Has grid:', css.includes('.grid'));
    console.log('Has text-3xl:', css.includes('.text-3xl'));
    console.log('Has bg-white:', css.includes('.bg-white'));
  }
}
check();
