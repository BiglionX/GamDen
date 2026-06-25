#!/usr/bin/env python3
"""
GamDen V1.0 - GitHub Project Board Setup
配置看板视图：添加列 + 将 Issues 添加到看板
"""
import os
import json
import urllib.request
import time

TOKEN = '<your_token>'
OWNER = 'BiglionX'
REPO = 'GamDen'
PROJECT_NUMBER = 1  # 刚创建的 Project number
PROJECT_ID = None  # 会通过 API 查询

HEADERS = {
    'Authorization': f'Bearer {TOKEN}',
    'User-Agent': 'GamDen-reator',
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github.antioch-preview+json',
}

GRAPHQL_URL = 'https://api.github.com/graphql'

def graphql(query, variables=None):
    payload = {'query': query}
    if variables:
        payload['variables'] = variables
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        GRAPHQL_URL,
        data=data,
        headers={**HEADERS, 'Content-Length': str(len(data))},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode('utf-8')
            result = json.loads(body)
            if 'errors' in result:
                print(f'GraphQL errors: {json.dumps(result["errors"], indent=2)}')
                raise Exception(f"GraphQL errors: {result['errors'][0].get('message', '')}")
            return result.get('data')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f'HTTP {e.code}: {body[:1000]}')
        raise

def get_project_id():
    print('[1/5] Getting project ID...')
    query = """
    query {
      viewer {
        projectsV2(first: 10) {
          nodes {
            id
            number
            title
          }
        }
      }
    }
    """
    data = graphql(query)
    projects = data['viewer']['projectsV2']['nodes']
    for p in projects:
        if p['number'] == PROJECT_NUMBER:
            print(f'  Found: {p["title"]} (ID: {p["id"]})')
            return p['id']
    raise Exception(f'Project #{PROJECT_NUMBER} not found')

def add_issues_to_project(project_id):
    print('\n[2/5] Adding issues to project...')
    
    # 先获取项目的 item ids (issues)
    query_issues = f"""
    query {{
      repository(owner: "{OWNER}", name: "{REPO}") {{
        issues(first: 100, states: OPEN) {{
          nodes {{
            id
            number
            title
          }}
        }}
      }}
    }}
    """
    # 注意：GitHub GraphQL 不支持直接在字符串里用 f-string 的大括号转义
    # 改用普通字符串拼接
    query_issues = '{ repository(owner: "' + OWNER + '", name: "' + REPO + '") { issues(first: 100, states: OPEN) { nodes { id number title } } } }'
    
    data = graphql(query_issues)
    issues = data['repository']['issues']['nodes']
    print(f'  Found {len(issues)} open issues')
    
    # 批量添加到 Project
    mutation = """
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }
    """
    
    added = 0
    for issue in issues:
        try:
            graphql(mutation, {'projectId': project_id, 'contentId': issue['id']})
            added += 1
            if added % 10 == 0:
                print(f'  Added: {added}/{len(issues)}')
            time.sleep(0.2)
        except Exception as e:
            print(f'  Failed to add #{issue["number"]}: {e}')
    
    print(f'  SUCCESS: {added} issues added to project')

def create_board_columns(project_id):
    print('\n[3/5] Creating board columns (status field options)...')
    
    # 获取当前的 status field id
    query = """
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
            }
          }
        }
      }
    }
    """
    data = graphql(query, {'projectId': project_id})
    fields = data['node']['fields']['nodes']
    
    # 找到 Status 字段（默认字段）
    status_field = None
    for f in fields:
        if f and 'name' in f and 'status' in f['name'].lower():
            status_field = f
            break
    
    if not status_field:
        print('  Status field not found, creating...')
        # 创建 Status 字段
        create_query = """
        mutation($projectId: ID!) {
          createProjectV2Field(input: {
            projectId: $projectId
            dataType: SINGLE_SELECT
            name: "Status"
            singleSelectOptions: [
              { name: "📋 Todo", color: GRAY },
              { name: "🔄 In Progress", color: BLUE },
              { name: "👀 In Review", color: YELLOW },
              { name: "✅ Done", color: GREEN }
            ]
          }) {
            projectV2Field { ... on ProjectV2SingleSelectField { id } }
          }
        }
        """
        data = graphql(create_query, {'projectId': project_id})
        print('  Status field created')
    else:
        print(f'  Status field already exists: {status_field["name"]}')
        # 更新选项（添加看板列）
        update_query = """
        mutation($fieldId: ID!) {
          updateProjectV2Field(input: {
            fieldId: $fieldId
            singleSelectOptions: [
              { name: "📋 Todo", color: GRAY },
              { name: "🔄 In Progress", color: BLUE },
              { name: "👀 In Review", color: YELLOW },
              { name: "✅ Done", color: GREEN },
              { name: "🚫 Blocked", color: RED }
            ]
          }) {
            projectV2Field { ... on ProjectV2SingleSelectField { id } }
          }
        }
        """
        try:
            graphql(update_query, {'fieldId': status_field['id']})
            print('  Status field options updated')
        except Exception as e:
            print(f'  Update failed (may already have options): {e}')

def create_views(project_id):
    print('\n[4/5] Creating board view...')
    
    # 创建 Kanban 视图
    query = """
    mutation($projectId: ID!) {
      createProjectV2View(input: {
        projectId: $projectId
        name: "Kanban Board"
        layout: BOARD_LAYOUT
      }) {
        view { id name }
      }
    }
    """
    try:
        data = graphql(query, {'projectId': project_id})
        print(f'  View created: {data["createProjectV2View"]["view"]["name"]}')
    except Exception as e:
        print(f'  View creation failed (may already exist): {e}')

def set_priority_for_issues(project_id):
    print('\n[5/5] Setting priority labels for issues...')
    print('  (Skipped - will be done manually in Project UI)')
    print('  Tip: In Project UI, you can group by "Priority" field')

def main():
    try:
        # 1. 获取 Project ID
        project_id = get_project_id()
        
        # 2. 添加 Issues 到 Project
        add_issues_to_project(project_id)
        
        # 3. 创建看板列
        create_board_columns(project_id)
        
        # 4. 创建看板视图
        create_views(project_id)
        
        # 5. 设置优先级（跳过，在 UI 手动操作）
        set_priority_for_issues(project_id)
        
        print('\n' + '='*60)
        print('DONE!')
        print(f'Project URL: https://github.com/users/{OWNER}/projects/{PROJECT_NUMBER}')
        print('='*60)
        print('\nNext steps:')
        print('1. Go to the Project URL above')
        print('2. Click "Board" tab to see the Kanban view')
        print('3. Drag issues into columns (Todo / In Progress / In Review / Done)')
        print('4. Group by "Priority" field to see P0/P1/P2/P3')
        
    except Exception as e:
        print(f'\nFAILED: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
