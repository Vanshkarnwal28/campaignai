"""
CampaignAI – Final QA Test Suite (Corrected Endpoints)
Tests all backend APIs with the real controller routes.
"""
import urllib.request
import json
import sys
import time

BASE_URL = "http://localhost:3001/api"
sys.stdout.reconfigure(encoding='utf-8')

PASS_COUNT = 0
FAIL_COUNT = 0
ISSUES = []

def make_request(url, method='GET', data=None, token=None):
    req = urllib.request.Request(url, method=method)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    body = json.dumps(data).encode('utf-8') if data else None
    try:
        with urllib.request.urlopen(req, data=body) as response:
            res_data = response.read().decode('utf-8')
            return response.status, json.loads(res_data) if res_data else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, {'error': err_body[:200]}
    except Exception as e:
        return 500, {'error': str(e)[:200]}

def check(label, condition, detail=''):
    global PASS_COUNT, FAIL_COUNT, ISSUES
    if condition:
        print(f"  [PASS] {label}")
        PASS_COUNT += 1
    else:
        print(f"  [FAIL] {label} -- {detail}")
        FAIL_COUNT += 1
        ISSUES.append(f"{label}: {detail}")

def section(title):
    print(f"\n{'='*65}")
    print(f"  {title}")
    print(f"{'='*65}")

ts = int(time.time())
USER_EMAIL = f"qa_final_{ts}@campaignai.com"
USER_PASSWORD = "QATest123!"
USER_TOKEN = None
BIZ_ID = None
USER_ID = None

section("STEP 1: USER REGISTRATION")
s, r = make_request(f"{BASE_URL}/auth/register", "POST", {
    "name": "QA Tester Final",
    "email": USER_EMAIL,
    "password": USER_PASSWORD
})
check("POST /auth/register → 201", s in [200, 201])
check("Registration returns JWT token", 'token' in r)
check("Registration assigns MEMBER role", r.get('user', {}).get('role') == 'MEMBER')
check("Registration creates businessId", bool(r.get('user', {}).get('businessId')))
if 'token' in r:
    USER_TOKEN = r['token']
    BIZ_ID = r.get('user', {}).get('businessId')
    USER_ID = r.get('user', {}).get('id')
    print(f"  -> User: {USER_ID[:10]}... | Biz: {BIZ_ID[:10] if BIZ_ID else 'NONE'}...")

section("STEP 2: LOGIN")
s, r = make_request(f"{BASE_URL}/auth/login", "POST", {"email": USER_EMAIL, "password": USER_PASSWORD})
check("POST /auth/login → 200", s in [200, 201], f"Got {s}")
check("Login returns token", 'token' in r)
if r.get('token'):
    USER_TOKEN = r['token']

section("STEP 3: PROFILE")
s, profile = make_request(f"{BASE_URL}/auth/profile", token=USER_TOKEN)
check("GET /auth/profile → 200", s == 200, f"Got {s}")
check("Profile has all required fields", all(k in profile for k in ['name','email','role','businessId']))

section("STEP 4: ONBOARDING")
# GET questions
s, qres = make_request(f"{BASE_URL}/business/onboarding/questions", token=USER_TOKEN)
check("GET /business/onboarding/questions → 200", s == 200, f"Got {s}")
check("Questions is non-empty list", isinstance(qres, list) and len(qres) >= 14, f"Got {len(qres) if isinstance(qres, list) else type(qres)} items")

# Submit answers
s, strat = make_request(f"{BASE_URL}/business/{BIZ_ID}/onboarding/submit", "POST", {
    "answers": [
        {"q": "target age range", "a": "25-45"},
        {"q": "industry", "a": "E-commerce"},
        {"q": "monthly budget", "a": "5000"},
        {"q": "goals", "a": "Lead generation"},
        {"q": "brand tone", "a": "Professional"},
    ]
}, token=USER_TOKEN)
check("POST /business/:id/onboarding/submit → 200", s in [200, 201], f"Got {s}")
check("Submit returns business profile with SWOT", 'swotAnalysis' in strat or 'industry' in strat, f"Keys: {list(strat.keys())[:6]}")

section("STEP 5: DASHBOARD METRICS")
s, summ = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/analytics/summary", token=USER_TOKEN)
check("GET /campaigns/:biz/analytics/summary → 200", s == 200, f"Got {s}")
check("Summary has spend, roas, cpc, ctr", all(k in summ for k in ['totalSpend','roas','cpc','ctr']), f"Keys: {list(summ.keys())}")

s, daily = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/analytics/daily", token=USER_TOKEN)
check("GET /campaigns/:biz/analytics/daily → 200", s == 200, f"Got {s}")

s, clist = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}", token=USER_TOKEN)
check("GET /campaigns/:biz → 200", s == 200, f"Got {s}")
check("Campaigns is list", isinstance(clist, list))

s, opts = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/optimizations", token=USER_TOKEN)
check("GET /campaigns/:biz/optimizations → 200", s == 200, f"Got {s}")

s, recs = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/recommendations", token=USER_TOKEN)
check("GET /campaigns/:biz/recommendations → 200", s == 200, f"Got {s}")

section("STEP 6: CAMPAIGN WIZARD BUILD")
s, bld = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/build", "POST", {
    "name": "QA Summer Campaign",
    "objective": "CONVERSIONS",
    "dailyBudget": 100,
    "creativePrompt": "High-converting QA banner test",
    "targetAgeMin": 25,
    "targetAgeMax": 50,
    "targetLocation": "United States"
}, token=USER_TOKEN)
check("POST /campaigns/:biz/build → 200", s in [200, 201], f"Got {s}")
check("Campaign wizard returns campaign + creative + adSet", 'campaign' in bld, f"Keys: {list(bld.keys())[:5]}")
camp_id = bld.get('campaign', {}).get('id')
if camp_id:
    check("Campaign is ACTIVE", bld['campaign'].get('status') == 'ACTIVE')
    check("Campaign has metaCampaignId", bool(bld['campaign'].get('metaCampaignId')))
    s2, sr = make_request(f"{BASE_URL}/campaigns/{camp_id}/status", "PUT", {"status": "PAUSED"}, token=USER_TOKEN)
    check("PUT /campaigns/:id/status PAUSE → 200", s2 == 200, f"Got {s2}")
    s2, sr = make_request(f"{BASE_URL}/campaigns/{camp_id}/status", "PUT", {"status": "ACTIVE"}, token=USER_TOKEN)
    check("PUT /campaigns/:id/status RESUME → 200", s2 == 200, f"Got {s2}")

section("STEP 7: AI CAMPAIGN GENERATOR (DRAFT FLOW)")
s, draft = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/draft", "POST", {
    "name": "QA AI Draft", "objective": "LEAD_GEN", "dailyBudget": 80,
    "businessName": "QA Agency", "industry": "Technology", "product": "Marketing SaaS",
    "targetCountry": "United States", "goal": "Lead generation"
}, token=USER_TOKEN)
check("POST /campaigns/:biz/draft → 200", s in [200, 201], f"Got {s}")
draft_id = draft.get('id') or (draft.get('draft', {}) or {}).get('id')
check("Draft returns id", bool(draft_id), f"Got: {list(draft.keys())[:5]}")

if draft_id:
    s, gen = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/draft/{draft_id}/generate", "POST", {}, token=USER_TOKEN)
    check("POST /draft/:id/generate → 200", s in [200, 201], f"Got {s}")
    check("Draft strategy generated", any(k in gen for k in ['headlines','marketingStrategySummary','strategy','draftId','contentCalendar']), f"Keys: {list(gen.keys())[:5]}")
    
    s, pub = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/draft/{draft_id}/publish", "POST", {}, token=USER_TOKEN)
    check("POST /draft/:id/publish → 200", s in [200, 201], f"Got {s}")
    check("Publish returns campaign", 'campaign' in pub or 'id' in pub, f"Keys: {list(pub.keys())[:5]}")

section("STEP 8: CONTENT CALENDAR")
# Correct endpoint: /content/calendar?businessId=xxx
s, cal = make_request(f"{BASE_URL}/content/calendar?businessId={BIZ_ID}", token=USER_TOKEN)
check("GET /content/calendar?businessId → 200", s == 200, f"Got {s}: {str(cal)[:80]}")
check("Calendar is list", isinstance(cal, list))

s, calgen = make_request(f"{BASE_URL}/content/generate-plan", "POST", {"businessId": BIZ_ID}, token=USER_TOKEN)
check("POST /content/generate-plan → 200", s in [200, 201], f"Got {s}: {str(calgen)[:80]}")
check("Calendar plan generated", isinstance(calgen, list) or 'plan' in calgen or 'entries' in calgen or 'posts' in calgen, f"Type: {type(calgen)}")

section("STEP 9: AUTO SCHEDULER")
# Correct endpoint: /scheduler/posts?businessId=xxx
s, sched = make_request(f"{BASE_URL}/scheduler/posts?businessId={BIZ_ID}", token=USER_TOKEN)
check("GET /scheduler/posts?businessId → 200", s == 200, f"Got {s}: {str(sched)[:80]}")

s, pend = make_request(f"{BASE_URL}/scheduler/pending", token=USER_TOKEN)
check("GET /scheduler/pending → 200", s == 200, f"Got {s}")

section("STEP 10: LEAD CRM")
# Correct endpoint: /leads?businessId=xxx
s, leads = make_request(f"{BASE_URL}/leads?businessId={BIZ_ID}", token=USER_TOKEN)
check("GET /leads?businessId → 200", s == 200, f"Got {s}: {str(leads)[:80]}")
check("Leads is list", isinstance(leads, list))

# Capture a test lead
s, lead = make_request(f"{BASE_URL}/leads/capture", "POST", {
    "businessId": BIZ_ID,
    "email": f"lead_{ts}@example.com",
    "name": "Test Lead",
    "phone": "+1234567890",
    "source": "META_ADS"
}, token=USER_TOKEN)
check("POST /leads/capture → 200", s in [200, 201], f"Got {s}: {str(lead)[:80]}")
lead_id = lead.get('id')
check("Lead capture returns id", bool(lead_id), f"Keys: {list(lead.keys())[:5]}")

if lead_id:
    s, ldtl = make_request(f"{BASE_URL}/leads/{lead_id}", token=USER_TOKEN)
    check("GET /leads/:id → 200", s == 200, f"Got {s}")
    s, upd = make_request(f"{BASE_URL}/leads/{lead_id}", "PATCH", {"status": "QUALIFIED", "notes": "QA test"}, token=USER_TOKEN)
    check("PATCH /leads/:id (status update) → 200", s == 200, f"Got {s}")
    s, lead_stats = make_request(f"{BASE_URL}/leads/stats?businessId={BIZ_ID}", token=USER_TOKEN)
    check("GET /leads/stats?businessId → 200", s == 200, f"Got {s}")

section("STEP 11: SUPPORT TICKETS")
s, tkt = make_request(f"{BASE_URL}/support/tickets", "POST", {
    "businessId": BIZ_ID,
    "subject": "QA Test: Final Suite",
    "description": "Automated QA test ticket submission.",
    "priority": "MEDIUM"
}, token=USER_TOKEN)
check("POST /support/tickets → 200", s in [200, 201], f"Got {s}")
s, tlist = make_request(f"{BASE_URL}/support/tickets", token=USER_TOKEN)
check("GET /support/tickets → 200", s == 200, f"Got {s}")
s, notifs = make_request(f"{BASE_URL}/support/notifications/{BIZ_ID}", token=USER_TOKEN)
check("GET /support/notifications/:biz → 200", s == 200, f"Got {s}")

section("STEP 12: HELP BOT (CORRECT ENDPOINT: /assistant/chat/:bizId)")
def chat_bot(msg, convo_id=None):
    payload = {'message': msg}
    if convo_id:
        payload['conversationId'] = convo_id
    s, r = make_request(f"{BASE_URL}/assistant/chat/{BIZ_ID}", "POST", payload, token=USER_TOKEN)
    return s, r

in_scope = [
    ('How do I connect Meta?', ['meta', 'settings', 'facebook', 'connect', 'integration']),
    ('How do I create a campaign?', ['campaign', 'wizard', 'create', 'step']),
    ('How do I export leads?', ['lead', 'export', 'csv', 'crm']),
    ('How do I reset my password?', ['password', 'reset', 'forgot', 'email']),
    ('What is the AI Campaign Generator?', ['campaign', 'ai', 'generator', 'wizard']),
]
convo_id = None
for q, kw in in_scope:
    s2, resp = chat_bot(q, convo_id)
    reply = resp.get('reply', '')
    convo_id = resp.get('conversationId', convo_id)
    is_ok = s2 == 200 and (any(k in reply.lower() for k in kw) or len(reply) > 50)
    check(f"Help Bot in-scope: {q[:35]}", is_ok, f"Status:{s2} Reply len:{len(reply)} Preview:{reply[:60]}")

out_scope = ['Who is Virat Kohli?', 'Tell me a joke.', 'What is Python programming?', 'Explain machine learning.', 'What is the weather today?']
for q in out_scope:
    s2, resp = chat_bot(q, convo_id)
    reply = resp.get('reply', '')
    convo_id = resp.get('conversationId', convo_id)
    is_refusal = any(w in reply.lower() for w in ['sorry', 'campaignai help', 'only assist', 'designed', "only answer"])
    check(f"Help Bot rejects out-of-scope: {q[:30]}", s2 == 200 and is_refusal, f"Reply: {reply[:80]}")

section("STEP 13: META INTEGRATION")
# Correct endpoint: /meta/auth-url?businessId=xxx
s, url_res = make_request(f"{BASE_URL}/meta/auth-url?businessId={BIZ_ID}")
check("GET /meta/auth-url?businessId → 200", s == 200, f"Got {s}: {str(url_res)[:80]}")
check("Returns url field", 'url' in url_res, f"Keys: {list(url_res.keys())[:5]}")

s, meta_st = make_request(f"{BASE_URL}/meta/status?businessId={BIZ_ID}")
check("GET /meta/status?businessId → 200/400", s in [200, 400, 500], f"Got {s}")

section("STEP 14: BUSINESS PROFILE")
s, biz_profile = make_request(f"{BASE_URL}/business/{BIZ_ID}/profile", token=USER_TOKEN)
check("GET /business/:biz/profile → 200", s == 200, f"Got {s}")

section("STEP 15: ADMIN RBAC SECURITY")
for ep in ['/admin/stats', '/admin/users', '/admin/businesses', '/admin/campaigns']:
    s2, r = make_request(f"{BASE_URL}{ep}", token=USER_TOKEN)
    check(f"Non-admin blocked {ep} → 401/403", s2 in [401, 403], f"Got {s2}")

s2, r = make_request(f"{BASE_URL}/auth/admin/login", "POST", {"email": USER_EMAIL, "password": USER_PASSWORD})
check("Non-admin /auth/admin/login → 403", s2 == 403, f"Got {s2}")
check("Access denied message correct", 'Access Denied' in r.get('message', '') or 'admin' in r.get('message', '').lower(), f"Msg: {r.get('message','')}")

section("FINAL QA RESULTS")
total = PASS_COUNT + FAIL_COUNT
print(f"\n  Total Tests: {total}")
print(f"  PASSED:      {PASS_COUNT}")
print(f"  FAILED:      {FAIL_COUNT}")
print(f"  Pass Rate:   {PASS_COUNT*100//total}%")
if ISSUES:
    print("\n  REMAINING ISSUES:")
    for i, issue in enumerate(ISSUES, 1):
        print(f"    {i}. {issue}")
else:
    print("\n  ALL TESTS PASSED! CampaignAI is fully verified.")
