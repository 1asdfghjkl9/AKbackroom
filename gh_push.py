#!/usr/bin/env python3
"""GitHub API push tool - pushes files to 1asdfghjkl9/AKbackroom"""
import os, sys, json, base64, urllib.request, urllib.error

TOKEN = os.environ.get("GH_TOKEN", "")
OWNER = "1asdfghjkl9"
REPO = "AKbackroom"
API = f"https://api.github.com/repos/{OWNER}/{REPO}"

def api_call(url, method="GET", data=None):
    headers = {
        "Authorization": f"token {TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "AKbackroom-push"
    }
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read()) if resp.status != 204 else {}
    except urllib.error.HTTPError as e:
        return {"error": e.code, "message": e.read().decode()[:500]}

def push_file(filepath, content, message):
    """Push a single file to GitHub"""
    path = filepath
    # Check if file exists (get SHA)
    result = api_call(f"{API}/contents/{path}")
    sha = result.get("sha") if "sha" in result else None
    
    data = {
        "message": message,
        "content": base64.b64encode(content.encode()).decode(),
        "branch": "main"
    }
    if sha:
        data["sha"] = sha
    
    result = api_call(f"{API}/contents/{path}", method="PUT", data=data)
    return result

if __name__ == "__main__":
    if not TOKEN:
        print("ERROR: GH_TOKEN environment variable not set")
        sys.exit(1)
    
    if len(sys.argv) < 3:
        print("Usage: gh_push.py <filepath> <message>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    message = sys.argv[2]
    
    with open(filepath, "r") as f:
        content = f.read()
    
    result = push_file(filepath, content, message)
    if "error" in result:
        print(f"FAILED: {result}")
        sys.exit(1)
    else:
        print(f"SUCCESS: pushed {filepath}")
