#!/usr/bin/env python3
"""在 REPOSITORY 下创建 GitHub Project"""
import urllib.request, json, sys

TOKEN = "<your_token>"
HEADERS = {
    "Authorization": "Bearer " + TOKEN,
    "Content-Type": "application/json",
    "User-Agent": "GamDen-Setup",
}

def gql(query, variables=None):
    body = {"query": query}
    if variables:
        body["variables"] = variables
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=data,
        headers=HEADERS,
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        result = json.loads(r.read().decode())
    if result.get("errors"):
        print("GraphQL Error:")
        print(json.dumps(result["errors"], indent=2))
        sys.exit(1)
    return result["data"]

# Step 1: 获取 repo node id
print("[1/2] Getting repository node ID...")
q = '{ repository(owner: "BiglionX", name: "GamDen") { id } }'
repo_id = gql(q)["repository"]["id"]
print("  Repo ID:" + repo_id)

# Step 2: 在 repo 下创建 Project
print("[2/2] Creating Project under REPOSITORY...")
mutation = """
mutation($ownerId: ID!, $title: String!) {
  createProjectV2(input: { ownerId: $ownerId, title: $title }) {
    projectV2 { id number url title }
  }
}
"""
data = gql(mutation, {"ownerId": repo_id, "title": "GamDen V1.0 Dev Board"})
proj = data["createProjectV2"]["projectV2"]
print("Project created successfully!")
print("  ID : " + proj["id"])
print("  URL: " + proj["url"])
print("  Num: #" + str(proj["number"]))
print("")
print("Done! Open: " + proj["url"])
