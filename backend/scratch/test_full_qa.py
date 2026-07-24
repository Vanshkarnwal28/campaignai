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
USER_EMAIL = f"qa_{ts}@campaignai.com"
USER_PASSWORD = "QATest123!"
USER_TOKEN = None
BIZ_ID = None
USER_ID = None

# ─── STEP 1: Registration ────────────────────────────────────────────────────
section("STEP 1: USER REGISTRATION & AUTH")
s, r = make_request(f"{BASE_URL}/auth/register", "POST", {
    "name": "QA Tester",
    "email": USER_EMAIL,
    "password": USER_PASSWORD
})
check("POST /auth/register returns 201", s in [200, 201])
check("Registration returns JWT token", 'token' in r)
check("Registration returns MEMBER role", r.get('user', {}).get('role') == 'MEMBER')
check("Registration returns businessId", bool(r.get('user', {}).get('businessId')))
if 'token' in r:
    USER_TOKEN = r['token']
    BIZ_ID = r.get('user', {}).get('businessId')
    USER_ID = r.get('user', {}).get('id')
    print(f"  -> User: {USER_ID[:10]}... Biz: {BIZ_ID[:10] if BIZ_ID else 'NONE'}...")

# ─── STEP 2: Login ───────────────────────────────────────────────────────────
section("STEP 2: LOGIN")
s, r = make_request(f"{BASE_URL}/auth/login", "POST", {"email": USER_EMAIL, "password": USER_PASSWORD})
check("POST /auth/login returns 200", s in [200, 201], f"Got {s}")
check("Login returns token", 'token' in r)
check("Login returns MEMBER role", r.get('user', {}).get('role') == 'MEMBER')
if r.get('token'):
    USER_TOKEN = r['token']

# ─── STEP 3: Profile ─────────────────────────────────────────────────────────
section("STEP 3: PROFILE API")
s, profile = make_request(f"{BASE_URL}/auth/profile", token=USER_TOKEN)
check("GET /auth/profile returns 200", s == 200, f"Got {s}")
check("Profile has name, email, role, businessId", all(k in profile for k in ['name','email','role','businessId']))

# ─── STEP 4: Onboarding Questions ────────────────────────────────────────────
section("STEP 4: ONBOARDING QUESTIONS & STRATEGY")
s, qres = make_request(f"{BASE_URL}/business/onboarding/questions", token=USER_TOKEN)
check("GET /business/onboarding/questions returns 200", s == 200, f"Got {s}, Body: {str(qres)[:100]}")
check("Questions is non-empty list", isinstance(qres, list) and len(qres) > 0, f"Got type: {type(qres)}, val: {str(qres)[:100]}")

# Submit onboarding answers
sample_answers = [
    {"q": "What is your target age range?", "a": "25-45"},
    {"q": "What is your industry?", "a": "E-commerce"},
    {"q": "What is your monthly budget?", "a": "5000"},
    {"q": "What are your goals?", "a": "Lead generation"},
    {"q": "What is your brand voice?", "a": "Professional"},
]
s, strat = make_request(f"{BASE_URL}/business/{BIZ_ID}/onboarding/submit", "POST", {
    "answers": sample_answers
}, token=USER_TOKEN)
check("POST /business/onboarding/submit returns 200", s in [200, 201], f"Got {s}: {str(strat)[:100]}")
check("Onboarding strategy response received", 'marketingStrategySummary' in strat or 'strategy' in strat or 'swot' in strat, f"Keys: {list(strat.keys())[:8]}")

# ─── STEP 5: Dashboard APIs ───────────────────────────────────────────────────
section("STEP 5: DASHBOARD METRICS APIs")
s, summ = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/analytics/summary", token=USER_TOKEN)
check("GET /campaigns/analytics/summary returns 200", s == 200, f"Got {s}")
check("Summary has spend + roas", 'totalSpend' in summ and 'roas' in summ, f"Keys: {list(summ.keys())[:6]}")

s, daily = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/analytics/daily", token=USER_TOKEN)
check("GET /campaigns/analytics/daily returns 200", s == 200, f"Got {s}")

s, clist = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}", token=USER_TOKEN)
check("GET /campaigns/:bizId returns 200", s == 200, f"Got {s}")
check("Campaigns is list", isinstance(clist, list))

s, opts = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/optimizations", token=USER_TOKEN)
check("GET /campaigns/optimizations returns 200", s == 200, f"Got {s}")

s, recs = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/recommendations", token=USER_TOKEN)
check("GET /campaigns/recommendations returns 200", s == 200, f"Got {s}")

# ─── STEP 6: Campaign Wizard Build ───────────────────────────────────────────
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
check("POST /campaigns/:bizId/build returns 200", s in [200, 201], f"Got {s}: {str(bld)[:100]}")
check("Campaign build returns campaign data", 'campaign' in bld or 'id' in bld, f"Keys: {list(bld.keys())[:5]}")
camp_id = None
if 'campaign' in bld:
    camp_id = bld['campaign'].get('id')
    check("Campaign has ACTIVE status", bld['campaign'].get('status') == 'ACTIVE')
    check("Campaign has metaCampaignId", bool(bld['campaign'].get('metaCampaignId')))

# Campaign pause/resume
if camp_id:
    s, sr = make_request(f"{BASE_URL}/campaigns/{camp_id}/status", "PUT", {"status": "PAUSED"}, token=USER_TOKEN)
    check("PUT /campaigns/:id/status (PAUSE) returns 200", s == 200, f"Got {s}")
    s, sr = make_request(f"{BASE_URL}/campaigns/{camp_id}/status", "PUT", {"status": "ACTIVE"}, token=USER_TOKEN)
    check("PUT /campaigns/:id/status (RESUME) returns 200", s == 200, f"Got {s}")

# ─── STEP 7: AI Campaign Generator (Draft flow) ───────────────────────────────
section("STEP 7: AI CAMPAIGN GENERATOR DRAFT FLOW")
s, draft = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/draft", "POST", {
    "name": "QA AI Draft Campaign",
    "objective": "LEAD_GEN",
    "dailyBudget": 80,
    "businessName": "QA Digital Agency",
    "industry": "Technology",
    "product": "Marketing Software",
    "targetCountry": "United States",
    "goal": "Lead generation"
}, token=USER_TOKEN)
check("POST /campaigns/:bizId/draft returns 200", s in [200, 201], f"Got {s}: {str(draft)[:100]}")
draft_id = draft.get('id') or (draft.get('campaign', {}) or {}).get('id')
check("Draft returns draft id", bool(draft_id), f"Got: {str(draft)[:100]}")

if draft_id:
    # Generate strategy for the draft
    s, gen = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/draft/{draft_id}/generate", "POST", {}, token=USER_TOKEN)
    check("POST /draft/:id/generate returns 200", s in [200, 201], f"Got {s}: {str(gen)[:100]}")
    check("Draft generate returns strategy data", any(k in gen for k in ['headlines', 'marketingStrategySummary', 'strategy', 'draftId']), f"Keys: {list(gen.keys())[:5]}")

# ─── STEP 8: Content Calendar ─────────────────────────────────────────────────
section("STEP 8: CONTENT CALENDAR")
s, cal = make_request(f"{BASE_URL}/content-calendar/{BIZ_ID}", token=USER_TOKEN)
check("GET /content-calendar/:bizId returns 200", s == 200, f"Got {s}")

s, calgen = make_request(f"{BASE_URL}/content-calendar/{BIZ_ID}/generate", "POST", {}, token=USER_TOKEN)
check("POST /content-calendar/generate returns 200", s in [200, 201], f"Got {s}: {str(calgen)[:100]}")
check("Content calendar generate returns posts", 'posts' in calgen or 'entries' in calgen or isinstance(calgen, list) or 'message' in calgen, f"Keys: {list(calgen.keys())[:5] if isinstance(calgen, dict) else type(calgen)}")

# ─── STEP 9: Auto Scheduler ───────────────────────────────────────────────────
section("STEP 9: AUTO SCHEDULER")
s, sched = make_request(f"{BASE_URL}/scheduler/{BIZ_ID}", token=USER_TOKEN)
check("GET /scheduler/:bizId returns 200", s == 200, f"Got {s}: {str(sched)[:100]}")

# ─── STEP 10: Lead CRM ────────────────────────────────────────────────────────
section("STEP 10: LEAD CRM")
s, leads = make_request(f"{BASE_URL}/leads/{BIZ_ID}", token=USER_TOKEN)
check("GET /leads/:bizId returns 200", s == 200, f"Got {s}: {str(leads)[:100]}")
check("Leads is a list", isinstance(leads, list), f"Got: {type(leads)}")

# ─── STEP 11: Analytics ───────────────────────────────────────────────────────
section("STEP 11: ANALYTICS (DETAILED)")
s, an_summ = make_request(f"{BASE_URL}/campaigns/{BIZ_ID}/analytics/summary", token=USER_TOKEN)
check("GET /analytics/summary returns 200", s == 200, f"Got {s}")
check("Analytics has all KPI fields", all(k in an_summ for k in ['totalSpend','roas','cpc','ctr']), f"Keys: {list(an_summ.keys())[:8]}")

# ─── STEP 12: Support Tickets ─────────────────────────────────────────────────
section("STEP 12: SUPPORT TICKETS")
s, tkt = make_request(f"{BASE_URL}/support/tickets", "POST", {
    "businessId": BIZ_ID,
    "subject": "QA Test: Feature Testing",
    "description": "This is an automated QA test ticket.",
    "priority": "MEDIUM"
}, token=USER_TOKEN)
check("POST /support/tickets returns 200", s in [200, 201], f"Got {s}: {str(tkt)[:100]}")

s, tlist = make_request(f"{BASE_URL}/support/tickets", token=USER_TOKEN)
check("GET /support/tickets returns 200", s == 200, f"Got {s}")
check("Tickets is list", isinstance(tlist, list))

s, notifs = make_request(f"{BASE_URL}/support/notifications/{BIZ_ID}", token=USER_TOKEN)
check("GET /support/notifications returns 200", s == 200, f"Got {s}")

# ─── STEP 13: Help Bot (In-scope + Out-of-scope) ───────────────────────────────
section("STEP 13: HELP BOT QA")
in_scope_tests = [
    ("How do I connect Meta?", ["meta", "settings", "connect", "integration", "facebook"]),
    ("How do I create a campaign?", ["campaign", "wizard", "create", "publish", "step"]),
    ("How do I export leads?", ["lead", "export", "csv", "crm"]),
    ("How do I reset my password?", ["password", "reset", "forgot", "email"]),
]
convo_id = None
for q, keywords in in_scope_tests:
    payload = {"userId": USER_ID, "businessId": BIZ_ID, "message": q}
    if convo_id:
        payload["conversationId"] = convo_id
    s, resp = make_request(f"{BASE_URL}/assistant/message", "POST", payload, token=USER_TOKEN)
    reply = resp.get('reply', '')
    convo_id = resp.get('conversationId', convo_id)
    is_in_scope = any(kw in reply.lower() for kw in keywords) or len(reply) > 50
    check(f"Help Bot in-scope: '{q[:30]}...'", s == 200 and is_in_scope, f"Reply: {reply[:80]}")

out_of_scope_tests = [
    "Who is Virat Kohli?",
    "Tell me a joke.",
    "What is Python?",
    "Explain Java programming language.",
    "What is the weather today?",
]
for q in out_of_scope_tests:
    payload = {"userId": USER_ID, "businessId": BIZ_ID, "message": q, "conversationId": convo_id}
    s, resp = make_request(f"{BASE_URL}/assistant/message", "POST", payload, token=USER_TOKEN)
    reply = resp.get('reply', '')
    convo_id = resp.get('conversationId', convo_id)
    is_refusal = any(w in reply.lower() for w in ['sorry', 'campaignai', 'only assist', 'designed', 'only answer', "can't help"])
    check(f"Help Bot out-of-scope refuses: '{q[:25]}'", s == 200 and is_refusal, f"Reply: {reply[:100]}")

# ─── STEP 14: Meta Integration Mock API ───────────────────────────────────────
section("STEP 14: META INTEGRATION")
s, meta_url = make_request(f"{BASE_URL}/integrations/meta/auth-url?businessId={BIZ_ID}", token=USER_TOKEN)
check("GET /integrations/meta/auth-url returns 200", s == 200, f"Got {s}: {str(meta_url)[:100]}")
check("Meta auth URL field exists", 'authUrl' in meta_url or 'url' in meta_url, f"Keys: {list(meta_url.keys())[:5]}")

# ─── STEP 15: Business Profile ─────────────────────────────────────────────────
section("STEP 15: BUSINESS PROFILE")
s, biz_profile = make_request(f"{BASE_URL}/business/{BIZ_ID}/profile", token=USER_TOKEN)
check("GET /business/:bizId/profile returns 200", s == 200, f"Got {s}: {str(biz_profile)[:100]}")

# ─── STEP 16: Admin Access Control (RBAC) ──────────────────────────────────────
section("STEP 16: ADMIN RBAC SECURITY")
for ep in ['/admin/stats', '/admin/users', '/admin/businesses', '/admin/campaigns', '/admin/settings']:
    s, r = make_request(f"{BASE_URL}{ep}", token=USER_TOKEN)
    check(f"Non-admin blocked from {ep}", s in [401, 403], f"Got {s}")

s, r = make_request(f"{BASE_URL}/auth/admin/login", "POST", {"email": USER_EMAIL, "password": USER_PASSWORD})
check("Non-admin blocked from /auth/admin/login", s == 403, f"Got {s}")
check("Error message says Access Denied", 'Access Denied' in r.get('message', ''), f"Msg: {r.get('message','')}")

# ─── STEP 17: Forgot Password (sends email) ────────────────────────────────────
section("STEP 17: FORGOT PASSWORD API")
s, r = make_request(f"{BASE_URL}/auth/forgot-password", "POST", {"email": USER_EMAIL})
check("POST /auth/forgot-password returns 200", s == 200, f"Got {s}: {str(r)[:100]}")

# ─── FINAL SUMMARY ─────────────────────────────────────────────────────────────
section("FINAL QA SUMMARY")
total = PASS_COUNT + FAIL_COUNT
print(f"\n  Total Tests: {total}")
print(f"  PASSED: {PASS_COUNT}")
print(f"  FAILED: {FAIL_COUNT}")
print(f"\n  {'ALL TESTS PASSED!' if FAIL_COUNT == 0 else 'ISSUES FOUND:'}")
if ISSUES:
    for i, issue in enumerate(ISSUES, 1):
        print(f"    {i}. {issue}")
