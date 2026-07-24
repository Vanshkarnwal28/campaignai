import urllib.request
import urllib.parse
import json
import sys

BASE_URL = 'http://localhost:3001/api'

def make_request(path, method='GET', data=None, token=None):
    url = f"{BASE_URL}/{path}"
    headers = {
        'Content-Type': 'application/json'
    }
    if token:
        headers['Authorization'] = f"Bearer {token}"
        
    req_data = None
    if data:
        req_data = json.dumps(data).encode('utf-8')
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode('utf-8')
            return response.status, json.loads(res_data) if res_data else {}
    except urllib.error.HTTPError as e:
        err_data = e.read().decode('utf-8')
        try:
            return e.code, json.loads(err_data)
        except Exception:
            return e.code, {"error": err_data}
    except Exception as e:
        return 500, {"error": str(e)}

def test_auth_flow():
    email = "audit_test_user_new1@example.com"
    password = "AuditPassword123!"
    
    print("--- Login ---")
    login_data = {
        "email": email,
        "password": password
    }
    status, login_res = make_request('auth/login', 'POST', login_data)
    print(f"Login Status: {status}")
    if status not in (200, 201):
        print("Login failed, trying to register...")
        status, reg_res = make_request('auth/register', 'POST', {
            "email": email,
            "password": password,
            "name": "Audit Test User"
        })
        print(f"Register Status: {status}")
        if status not in (200, 201):
            print(f"Register failed: {reg_res}")
            return
        token = reg_res.get('token')
        business_id = reg_res.get('user', {}).get('businessId')
    else:
        token = login_res.get('token')
        business_id = login_res.get('user', {}).get('businessId')
        
    if not token or not business_id:
        print(f"Could not retrieve token or business ID. Token: {token}, Business ID: {business_id}")
        return

    print(f"Token: {token[:20]}...")
    print(f"Business ID: {business_id}")

    # Submit Onboarding Answers
    print("\n--- Testing Onboarding Submit (Calls OpenRouter) ---")
    onboarding_answers = [
        {"q": "What is the legal name of your business?", "a": "Aura Cosmetics"},
        {"q": "What is your primary industry or niche (e.g. Fashion, SaaS, E-commerce)?", "a": "Fashion and Makeup Retail"},
        {"q": "What is the URL of your website or primary landing page?", "a": "https://auracosmetics.com"},
        {"q": "Who is your ideal customer profile (age, gender, locations, interests)?", "a": "Women aged 18-35 in urban areas interested in organic skin care and clean beauty products"},
        {"q": "What core problem does your product or service solve for your clients?", "a": "Provides chemical-free makeup that lasts all day without clogging skin pores"},
        {"q": "What is your brand's primary tone and voice (e.g. Professional, Casual, Sophisticated)?", "a": "Sophisticated, uplifting, trustworthy"},
        {"q": "What is your estimated monthly digital advertising budget (USD)?", "a": "5000"},
        {"q": "What is your target Cost Per Acquisition (CPA) or target Cost Per Lead?", "a": "25"},
        {"q": "What is your main campaign objective (e.g. Purchases, Lead Forms, Traffic, Brand Awareness)?", "a": "Purchases"},
        {"q": "What is your primary Unique Selling Proposition (USP) against competitors?", "a": "100% certified organic cosmetics made from active botanicals"},
        {"q": "Who are your top 2 or 3 competitors in this market?", "a": "Sephora Clean, Honest Beauty"},
        {"q": "What is the average price point or Average Order Value (AOV) of your offerings?", "a": "65"},
        {"q": "Do you run active promotions like discount codes or free shipping?", "a": "Free shipping on orders over 50"},
        {"q": "What format of ad creative fits your brand best (e.g. Clean flatlays, User Generated Content, Minimal text)?", "a": "UGC video testimonials and high-quality flatlays"},
        {"q": "Are your target audiences primarily mobile shoppers, desktop users, or both?", "a": "primarily mobile"},
        {"q": "Do you have an active Facebook pixel and Meta Conversion API configured?", "a": "yes"},
        {"q": "Are there specific colors or design guidelines we should avoid in creatives?", "a": "Avoid dark/dull tones, use bright pastel colors"},
        {"q": "Which locations are you targeting (e.g. US nationwide, localized metro zones, global)?", "a": "US nationwide"},
        {"q": "What is the primary shipping or delivery lead time for orders?", "a": "3-5 business days"},
        {"q": "Would you like autonomous AI daily optimization to automatically manage bids and budgets?", "a": "yes"}
    ]

    status, submit_res = make_request(f"business/{business_id}/onboarding/submit", 'POST', {"answers": onboarding_answers}, token=token)
    print(f"Onboarding Submit Status: {status}")
    if status in (200, 201):
        print("Onboarding submission successful!")
        print("SWOT Analysis keys:", list(submit_res.get('swotAnalysis', {}).keys()) if submit_res.get('swotAnalysis') else 'None')
        print("Competitor Analysis keys:", list(submit_res.get('competitorAnalysis', {}).keys()) if submit_res.get('competitorAnalysis') else 'None')
    else:
        print(f"Error on onboarding submit: {submit_res}")

    # Profile Verification
    print("\n--- Testing Business Profile ---")
    status, profile_res = make_request(f"business/{business_id}/profile", 'GET', token=token)
    print(f"Business Profile Status: {status}")
    if status == 200:
        print(f"Successfully fetched profile for industry: {profile_res.get('industry')}")
    else:
        print(f"Error getting profile: {profile_res}")

    # Campaign Draft Creation
    print("\n--- Testing Campaign Draft Creation ---")
    draft_payload = {
        "name": "Summer Glow Launch",
        "objective": "CONVERSIONS",
        "dailyBudget": "150",
        "businessName": "Aura Cosmetics",
        "website": "https://auracosmetics.com",
        "industry": "Fashion and Makeup Retail",
        "product": "Organic Summer Glow Highlighter",
        "targetCountry": "US",
        "goal": "Generate sales from organic makeup lovers",
        "step2Answers": onboarding_answers
    }
    status, draft_res = make_request(f"campaigns/{business_id}/draft", 'POST', draft_payload, token=token)
    print(f"Campaign Draft Status: {status}")
    draft_id = None
    if status in (200, 201):
        draft_id = draft_res.get('id')
        print(f"Draft Campaign created with ID: {draft_id}")
    else:
        print(f"Error creating campaign draft: {draft_res}")

    # Campaign Strategy Generation (Calls OpenRouter)
    if draft_id:
        print("\n--- Testing Campaign Strategy Generation (Calls OpenRouter) ---")
        status, strat_res = make_request(f"campaigns/{business_id}/draft/{draft_id}/generate", 'POST', {}, token=token)
        print(f"Campaign Strategy Status: {status}")
        if status in (200, 201):
            print("Campaign Strategy generated successfully!")
            print(f"Expected ROAS: {strat_res.get('expectedROAS')}")
            print(f"Headlines sample: {strat_res.get('headlines', [])[:2]}")
        else:
            print(f"Error generating campaign strategy: {strat_res}")

    # Assistant Chat (OpenRouter / AI Chat endpoint)
    print("\n--- Testing AI Assistant Chat ---")
    chat_payload = {
        "message": "What is the best audience to target for organic skincare cosmetics?"
    }
    status, chat_res = make_request(f"assistant/chat/{business_id}", 'POST', chat_payload, token=token)
    print(f"Assistant Chat Status: {status}")
    if status in (200, 201):
        print(f"Assistant reply: {chat_res.get('reply')}")
    else:
        print(f"Error sending chat message: {chat_res}")

if __name__ == '__main__':
    test_auth_flow()
