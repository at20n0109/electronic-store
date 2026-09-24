const B = 'http://127.0.0.1:3001/api/v1/auth';

async function post(p, body) {
  const r = await fetch(B + p, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { st: r.status, tx: (await r.text()).slice(0, 200) };
}

const reg = await post('/register', {
  email: 'u1@e2e.dev',
  password: 'secret123',
  name: 'U',
});
console.log('REGISTER', reg.st, reg.tx);
