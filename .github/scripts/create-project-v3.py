#!/usr/bin/env python3
"""在 REPOSITORY 下创建 GitHub Project（而不是用户级别）"""
import urllib.request, json, sys

TOKEN = "<your_token>"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "User-Agent": "GamDen-Setup",
}

def gql(query, variables=None):
    body = {"query": query}
    if variables:
        body["variables"] = variables
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=json.dumps(body).encode(),
        headers=HEADERS,
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        result = json.loads(r.read())
    if result.get("errors"):
        print(f"❌ GraphQL Error: {json.dumps(result['errors'], indent=2)}")
        sys.exit(1)
    return result["data"]

print("[1/2] Getting repository node ID...")
q = '{ repository(owner: "BiglionX", name: "GamDen") { id } }'
repo_id = gql(q)["repository"]["id"]
print(f"[OK] Repo ID: {repo_id}")

print("[2/2] Creating Project under REPOSITORY (not user)...")
mutation = """
mutation($ownerId: ID!, $title: String!) {
  createProjectV2(input: { ownerId: $ownerId, title: $title }) {
    projectV2 { id number url title }
  }
}
"""
data = gql(mutation, {"ownerId": repo_id, "title": "GamDen V1.0 Dev Board"})
proj = data["createProjectV2"]["projectV2"]
print(f"[OK] Project created!")
print(f"  ID:  {proj['id']}")
print(f"  URL: {proj['url']}")
print(f"  Num: #{proj['number']}")
print(f"\nOpen: {proj['url']}")
