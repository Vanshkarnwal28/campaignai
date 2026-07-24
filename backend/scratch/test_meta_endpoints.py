import urllib.request, json, time, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:3001/api'

ts = int(time.time())
req = urllib.request.Request(f'{BASE_URL}/auth/register', method='POST')
req.add_header('Content-Type', 'application/json')
data = json.dumps({'name': 'Meta Verification', 'email': f'meta_verif_{ts}@test.com', 'password': 'Test1234!'}).encode()
with urllib.request.urlopen(req, data=data) as r:
    res = json.loads(r.read())
TOKEN = res['token']
BIZ_ID = res['user']['businessId']

print(f"Registered user. BizID: {BIZ_ID}")

def make_req(path, method='GET', body=None):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Content-Type', 'application/json')
    data_bytes = json.dumps(body).encode() if body else None
    try:
        with urllib.request.urlopen(req, data=data_bytes) as resp:
            content = resp.read().decode()
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode()
        try:
            return e.code, json.loads(err_content)
        except:
            return e.code, {'error': err_content[:200]}

print("\n--- 1. Get Meta Status ---")
status, data = make_req(f"/meta/status?businessId={BIZ_ID}")
print(f"Status {status}: {data}")

print("\n--- 2. Get Pages (without token) ---")
status, data = make_req(f"/meta/pages?businessId={BIZ_ID}")
print(f"Status {status}: {data}")

print("\n--- 3. Get Ad Accounts (without token) ---")
status, data = make_req(f"/meta/ad-accounts?businessId={BIZ_ID}")
print(f"Status {status}: {data}")

print("\n--- 4. Get Business Managers (without token) ---")
status, data = make_req(f"/meta/business-managers?businessId={BIZ_ID}")
print(f"Status {status}: {data}")

print("\n--- 5. Select Accounts ---")
status, data = make_req("/meta/select-accounts", "POST", {
    "businessId": BIZ_ID,
    "adAccountId": "act_123456789",
    "adAccountName": "Main Ad Account",
    "pageId": "987654321",
    "pageName": "Official Brand Page",
    "instagramAccountId": "ig_11223344",
    "instagramAccountName": "@brand_official"
})
print(f"Status {status}: {data}")

print("\n--- 6. Get Meta Status after selection ---")
status, data = make_req(f"/meta/status?businessId={BIZ_ID}")
print(f"Status {status}: {data}")

print("\n--- 7. Disconnect Meta ---")
status, data = make_req("/meta/disconnect", "POST", {"businessId": BIZ_ID})
print(f"Status {status}: {data}")

print("\n--- 8. Status after disconnect ---")
status, data = make_req(f"/meta/status?businessId={BIZ_ID}")
print(f"Status {status}: {data}")
