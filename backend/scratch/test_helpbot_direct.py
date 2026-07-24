import urllib.request, json, time, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = 'http://localhost:3001/api'

ts = int(time.time())
req = urllib.request.Request(f'{BASE_URL}/auth/register', method='POST')
req.add_header('Content-Type', 'application/json')
data = json.dumps({'name': 'Bot QA', 'email': f'botqa_{ts}@test.com', 'password': 'Test1234!'}).encode()
with urllib.request.urlopen(req, data=data) as r:
    res = json.loads(r.read())
TOKEN = res['token']
BIZ_ID = res['user']['businessId']
USER_ID = res['user']['id']
print(f'Registered OK. BizID: {BIZ_ID[:8]}...')

def chat(msg, convo_id=None):
    req = urllib.request.Request(f'{BASE_URL}/assistant/chat/{BIZ_ID}', method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', f'Bearer {TOKEN}')
    payload = {'message': msg}
    if convo_id:
        payload['conversationId'] = convo_id
    body = json.dumps(payload).encode()
    try:
        with urllib.request.urlopen(req, data=body) as r2:
            return json.loads(r2.read())
    except urllib.error.HTTPError as e:
        return {'error': e.read().decode('utf-8')[:300]}

# In-scope tests
for q in ['How do I connect Meta?', 'How do I create a campaign?', 'How do I export leads?', 'How do I reset my password?']:
    r = chat(q)
    reply = r.get('reply', '')
    convo = r.get('conversationId', '')
    print(f'\nQ: {q}')
    print(f'Reply ({len(reply)} chars): {reply[:200]}')
    if not reply:
        print(f'FULL RESPONSE: {r}')

# Out-of-scope test
print('\n--- OUT OF SCOPE ---')
r = chat('Who is Virat Kohli?')
print(f'Q: Who is Virat Kohli?')
print(f'Reply: {r.get("reply", "")[:200]}')
if not r.get('reply'):
    print(f'FULL RESPONSE: {r}')

r = chat('Tell me a joke.')
print(f'\nQ: Tell me a joke.')
print(f'Reply: {r.get("reply", "")[:200]}')
