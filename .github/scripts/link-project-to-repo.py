#!/usr/bin/env python3
"""将现有 Project 关联到 GamDen 仓库"""
import urllib.request, json

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
        result = json.loads(r.read())
    if result.get("errors"):
        print("GraphQL Error:")
        print(json.dumps(result["errors"], indent=2))
        raise Exception("GraphQL failed")
    return result["data"]

# Step 1: 获取 project id (viewer 的 project #1)
print("Getting project ID...")
q = '{ viewer { projectV2(number: 1) { id title } } }'
proj = gql(q)["viewer"]["projectV2"]
print("  Project: " + proj["title"])
print("  Project ID: " + proj["id"])

# Step 2: 获取 repo id
print("Getting repo ID...")
q2 = '{ repository(owner: "BiglionX", name: "GamDen") { id } }'
repo_id = gql(q2)["repository"]["id"]
print("  Repo ID: " + repo_id)

# Step 3: 关联 project 到 repo
print("Linking project to GamDen repo...")
mutation = """
mutation($projectId: ID!, $repoId: ID!) {
  linkProjectV2ToRepository(input: { projectId: $projectId, repositoryId: $repoId }) {
    repository { name }
  }
}
"""
gql(mutation, {"projectId": proj["id"], "repoId": repo_id})
print("Done! Project is now linked to GamDen repo.")
print("")
print("Open: https://github.com/BiglionX/GamDen/projects")
