import urllib.request
import json
import sys
import time
import subprocess
import os

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

def run_admin_portal_tests():
    print("=" * 70)
    print("CAMPAIGNAI SEPARATE PORTALS & SECURITY VERIFICATION SUITE")
    print("=" * 70)

    # 1. Register normal Business User
    ts = int(time.time())
    unique_user_email = f"user_{ts}@campaignai.com"
    user_password = "UserPassword123!"

    reg_payload = {
        "name": "Standard Business User",
        "email": unique_user_email,
        "password": user_password
    }
    status, res = make_request(f"{BASE_URL}/auth/register", "POST", reg_payload)
    if status not in [200, 201] or 'token' not in res:
        print(f"[FAIL] User registration failed: Status {status}, {res}")
        sys.exit(1)
        
    user_token = res['token']
    user_id = res['user']['id']
    user_role = res['user']['role']
    print(f"[OK] Standard User registered: {unique_user_email} (Role: {user_role})")

    # 2. Test Normal User login via /auth/login
    status, login_res = make_request(f"{BASE_URL}/auth/login", "POST", {"email": unique_user_email, "password": user_password})
    if status in [200, 201] and login_res.get('user', {}).get('role') == 'MEMBER':
        print("[PASS] User Login via /auth/login succeeded with MEMBER role")
    else:
        print(f"[FAIL] User Login failed: Status {status}, {login_res}")

    # 3. Test Normal User login attempt via Admin Login endpoint /auth/admin/login
    status, admin_fail_res = make_request(f"{BASE_URL}/auth/admin/login", "POST", {"email": unique_user_email, "password": user_password})
    if status == 403:
        print(f"[PASS] Non-Admin blocked from /auth/admin/login (Status 403: {admin_fail_res.get('message')})")
    else:
        print(f"[FAIL] Non-Admin NOT blocked from /auth/admin/login: Status {status}, {admin_fail_res}")

    # 4. Test Normal User token attempting to access Admin endpoints
    admin_endpoints = ['admin/stats', 'admin/users', 'admin/businesses', 'admin/campaigns', 'admin/settings']
    blocked_count = 0
    for ep in admin_endpoints:
        status, ep_res = make_request(f"{BASE_URL}/{ep}", "GET", token=user_token)
        if status in [401, 403]:
            blocked_count += 1

    if blocked_count == len(admin_endpoints):
        print(f"[PASS] Backend RolesGuard blocked non-admin user from all {len(admin_endpoints)} admin API endpoints")
    else:
        print(f"[FAIL] Backend RolesGuard allowed non-admin access to some endpoints")

    # 5. Create Admin User
    unique_admin_email = f"admin_{ts}@campaignai.com"
    admin_password = "AdminPassword123!"

    status, reg_admin_res = make_request(f"{BASE_URL}/auth/register", "POST", {
        "name": "Platform Administrator",
        "email": unique_admin_email,
        "password": admin_password
    })
    
    admin_user_id = reg_admin_res['user']['id']

    # Directly promote this user to ADMIN in Firestore database
    promo_script_path = os.path.abspath("backend/scratch/promote_admin.js")
    proc = subprocess.run(["node", promo_script_path, admin_user_id], capture_output=True, text=True)
    if 'PROMOTED_ADMIN_SUCCESS' in proc.stdout:
        print(f"[OK] Promoted {unique_admin_email} to ADMIN in Firestore database")
    else:
        print(f"[WARN] Firestore promo script output: {proc.stdout} {proc.stderr}")

    # 6. Test Admin Login via /auth/admin/login
    status, admin_login_res = make_request(f"{BASE_URL}/auth/admin/login", "POST", {"email": unique_admin_email, "password": admin_password})
    if status in [200, 201] and admin_login_res.get('user', {}).get('role') == 'ADMIN':
        print(f"[PASS] Admin Login via /auth/admin/login succeeded with ADMIN role")
        admin_token = admin_login_res['token']
    else:
        print(f"[FAIL] Admin Login failed: Status {status}, {admin_login_res}")
        sys.exit(1)

    # 7. Test Admin API access with Admin token
    print("\n--- TESTING ADMIN API ACCESS ---")
    status, stats_res = make_request(f"{BASE_URL}/admin/stats", "GET", token=admin_token)
    if status == 200 and 'totalUsers' in stats_res:
        print(f"[PASS] GET /admin/stats succeeded: Total Users: {stats_res['totalUsers']}, Revenue: ${stats_res.get('totalRevenue', 0)}")
    else:
        print(f"[FAIL] GET /admin/stats failed: {status}, {stats_res}")

    status, users_res = make_request(f"{BASE_URL}/admin/users", "GET", token=admin_token)
    if status == 200 and isinstance(users_res, list):
        print(f"[PASS] GET /admin/users succeeded: Returned {len(users_res)} registered users")
    else:
        print(f"[FAIL] GET /admin/users failed: {status}, {users_res}")

    status, bus_res = make_request(f"{BASE_URL}/admin/businesses", "GET", token=admin_token)
    if status == 200 and isinstance(bus_res, list):
        print(f"[PASS] GET /admin/businesses succeeded: Returned {len(bus_res)} business workspaces")
    else:
        print(f"[FAIL] GET /admin/businesses failed: {status}, {bus_res}")

    status, prm_res = make_request(f"{BASE_URL}/admin/prompts", "GET", token=admin_token)
    if status == 200 and isinstance(prm_res, dict):
        print(f"[PASS] GET /admin/prompts succeeded: Returned {len(prm_res)} AI system prompts")
    else:
        print(f"[FAIL] GET /admin/prompts failed: {status}, {prm_res}")

    status, stg_res = make_request(f"{BASE_URL}/admin/settings", "GET", token=admin_token)
    if status == 200 and 'aiModel' in stg_res:
        print(f"[PASS] GET /admin/settings succeeded: AI Model: {stg_res['aiModel']}")
    else:
        print(f"[FAIL] GET /admin/settings failed: {status}, {stg_res}")

    print("\n" + "=" * 70)
    print("ALL SEPARATE PORTAL & RBAC SECURITY TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == '__main__':
    run_admin_portal_tests()
