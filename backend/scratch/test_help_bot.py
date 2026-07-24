import urllib.request
import json
import sys
import time

BASE_URL = "http://localhost:3001/api"
sys.stdout.reconfigure(encoding='utf-8')

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
            return e.code, {'error': err_body}
    except Exception as e:
        return 500, {'error': str(e)}

def run_tests():
    print("=" * 60)
    print("CAMPAIGNAI HELP BOT VERIFICATION SUITE")
    print("=" * 60)

    unique_email = f"helpbot_{int(time.time())}@campaignai.com"
    test_password = "Password123!"

    reg_payload = {
        "name": "Help Bot Tester",
        "email": unique_email,
        "password": test_password
    }
    status, res = make_request(f"{BASE_URL}/auth/register", "POST", reg_payload)
    
    if status not in [200, 201] or 'token' not in res:
        login_payload = {"email": unique_email, "password": test_password}
        status, res = make_request(f"{BASE_URL}/auth/login", "POST", login_payload)

    if status not in [200, 201] or 'token' not in res:
        print(f"FAILED to authenticate test user: Status {status}, {res}")
        sys.exit(1)
        
    token = res['token']
    user = res.get('user', {})
    business_id = user.get('businessId', 'default-business')
    print(f"[OK] Authenticated test user: {user.get('email')} (Business ID: {business_id})")

    # Define test cases
    in_scope_tests = [
        ("How do I connect Meta?", ["meta", "settings", "facebook", "connect"]),
        ("How do I create a campaign?", ["campaign", "budget", "publish", "wizard", "ad"]),
        ("How do I export leads?", ["lead", "csv", "export", "crm"]),
        ("How do I reset my password?", ["password", "login", "reset", "forgot"]),
        ("How does the Content Calendar work?", ["calendar", "schedule", "post", "weekly"]),
    ]

    out_of_scope_tests = [
        "Who is Virat Kohli?",
        "Tell me a joke.",
        "What is Python?",
        "Who is the Prime Minister?",
        "Solve DSA problems.",
        "What is the weather today?",
        "Explain Java."
    ]

    print("\n--- TEST PHASE 1: IN-SCOPE CAMPAIGNAI QUESTIONS ---")
    in_scope_passed = 0
    for query, expected_keywords in in_scope_tests:
        status, chat_res = make_request(f"{BASE_URL}/assistant/chat/{business_id}", "POST", {"message": query}, token=token)
        reply = chat_res.get('reply', '')
        print(f"\nUser: {query}")
        print(f"Bot: {reply}")
        
        has_refusal = "I can only assist with questions related to CampaignAI" in reply
        found_kws = [kw for kw in expected_keywords if kw in reply.lower()]
        
        if not has_refusal and len(found_kws) >= 1:
            print(" -> Result: PASS (Accurate in-scope response)")
            in_scope_passed += 1
        else:
            print(" -> Result: FAIL (Refused or missing relevant context)")

    print(f"\nIn-Scope Tests Passed: {in_scope_passed}/{len(in_scope_tests)}")

    print("\n--- TEST PHASE 2: OUT-OF-SCOPE QUESTIONS (POLITE REFUSAL) ---")
    out_of_scope_passed = 0
    expected_refusal = "I'm sorry, but I'm the CampaignAI Help Assistant"
    
    for query in out_of_scope_tests:
        status, chat_res = make_request(f"{BASE_URL}/assistant/chat/{business_id}", "POST", {"message": query}, token=token)
        reply = chat_res.get('reply', '')
        print(f"\nUser: {query}")
        print(f"Bot: {reply}")
        
        if expected_refusal in reply:
            print(" -> Result: PASS (Politely declined out-of-scope query)")
            out_of_scope_passed += 1
        else:
            print(" -> Result: FAIL (Did not refuse out-of-scope query)")

    print(f"\nOut-of-Scope Tests Passed: {out_of_scope_passed}/{len(out_of_scope_tests)}")

    print("\n" + "=" * 60)
    total_passed = in_scope_passed + out_of_scope_passed
    total_tests = len(in_scope_tests) + len(out_of_scope_tests)
    print(f"TOTAL RESULT: {total_passed}/{total_tests} Tests Passed")
    print("=" * 60)

    if total_passed < total_tests:
        sys.exit(1)

if __name__ == '__main__':
    run_tests()
