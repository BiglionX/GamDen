#!/usr/bin/env python3
"""
GamDen V1.0 - 配置 Project 看板（简化版）
只做最关键的事：
1. 添加 Issues 到 Project（已完成）
2. 配置 Status 字段的选项（Todo/In Progress/Review/Done）
3. 其余在 UI 手动操作
"""
import os
import json
import urllib.request
import time

TOKEN = '<your_token>'
OWNER = 'BiglionX'
REPO = 'GamDen'
PROJECT_NUMBER = 1

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

def get_project_info():
    print('[1/3] Getting project info...')
    query = '''
    query {
      viewer {
        projectsV2(first: 10) {
          nodes {
            id
            number
            title
            fields(first: 20) {
              nodes {
                ... on ProjectV2FieldCommon {
                  id
                  name
                }
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
    '''
    data = graphql(query)
    projects = data['viewer']['projectsV2']['nodes']
    for p in projects:
        if p['number'] == PROJECT_NUMBER:
            print(f'  Found: {p["title"]}')
            return p
    raise Exception(f'Project #{PROJECT_NUMBER} not found')

def configure_status_field(project):
    print('\n[2/3] Configuring Status field options...')
    
    # 找到 Status 字段
    status_field = None
    for f in project['fields']['nodes']:
        if f and f.get('name') == 'Status':
            status_field = f
            break
    
    if not status_field:
        print('  Status field not found, creating...')
        # 创建 Status 字段
        query = '''
        mutation($projectId: ID!) {
          createProjectV2Field(input: {
            projectId: $projectId
            dataType: SINGLE_SELECT
            name: "Status"
            singleSelectOptions: [
              { name: "📋 Todo", color: GRAY, description: "Not started" },
              { name: "🔄 In Progress", color: BLUE, description: "Working on it" },
              { name: "👀 In Review", color: YELLOW, description: "Under review" },
              { name: "✅ Done", color: GREEN, description: "Completed" }
            ]
          }) {
            projectV2Field {
              ... on ProjectV2SingleSelectField { id name }
            }
          }
        }
        '''
        data = graphql(query, {'projectId': project['id']})
        print('  Status field created!')
        return data['createProjectV2Field']['projectV2Field']['id']
    
    print(f'  Status field found: {status_field["name"]}')
    print(f'  Current options: {[o["name"] for o in status_field.get("options", [])]}')
    
    # 更新 Status 字段的选项
    # 注意：需要保留已有的 option id，只添加新选项
    existing_options = status_field.get('options', [])
    
    # 检查是否已有我们需要的选项
    existing_names = {o['name'] for o in existing_options}
    needed_options = ['📋 Todo', '🔄 In Progress', '👀 In Review', '✅ Done', '🚫 Blocked']
    
    new_options = []
    for opt_name in needed_options:
        if opt_name not in existing_names:
            new_options.append(opt_name)
    
    if not new_options:
        print('  All status options already exist!')
        return status_field['id']
    
    print(f'  Adding new options: {new_options}')
    
    # 构造完整的 options 列表（包含已有 + 新增）
    all_options = []
    for o in existing_options:
        all_options.append({
            'name': o['name'],
            'description': o.get('description', ''),
        })
    
    # GitHub GraphQL 不支持直接"添加"选项，只能通过 updateProjectV2Field 全量更新
    # 但这样会删除已有选项（危险！）
    # 所以这里只提示用户手动操作
    print('\n  ⚠️  To add new status options, please do it manually in the Project UI:')
    print('    1. Go to https://github.com/users/BiglionX/projects/1')
    print('    2. Click "..." → "Settings" → "Fields"')
    print('    3. Click "Status" field → "Edit options"')
    print('    4. Add: 📋 Todo, 🔄 In Progress, 👀 In Review, ✅ Done, 🚫 Blocked')
    
    return status_field['id']

def add_remaining_issues(project_id):
    print('\n[3/3] Checking for issues not yet added to project...')
    
    # 获取 Project 中已有的 items
    query_items = '''
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              content {
                ... on Issue {
                  number
                }
              }
            }
          }
        }
      }
    }
    '''
    data = graphql(query_items, {'projectId': project_id})
    existing_numbers = set()
    for item in data['node']['items']['nodes']:
        if item['content']:
            existing_numbers.add(item['content']['number'])
    
    print(f'  Already in project: {len(existing_numbers)} issues')
    
    # 获取仓库中所有 open issues
    query_issues = '''
    query {
      repository(owner: "BiglionX", name: "GamDen") {
        issues(first: 100, states: OPEN) {
          nodes {
            id
            number
            title
          }
        }
      }
    }
    '''
    data = graphql(query_issues)
    issues = data['repository']['issues']['nodes']
    
    # 过滤掉已添加的
    to_add = [i for i in issues if i['number'] not in existing_numbers]
    
    if not to_add:
        print('  All issues already in project!')
        return
    
    print(f'  Adding {len(to_add)} remaining issues...')
    
    mutation = '''
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }
    '''
    
    added = 0
    for issue in to_add:
        try:
            graphql(mutation, {'projectId': project_id, 'contentId': issue['id']})
            added += 1
            if added % 10 == 0:
                print(f'    Added: {added}/{len(to_add)}')
            time.sleep(0.2)
        except Exception as e:
            print(f'    Failed to add #{issue["number"]}: {e}')
    
    print(f'  SUCCESS: {added} issues added!')

def main():
    try:
        project = get_project_info()
        project_id = project['id']
        
        configure_status_field(project)
        
        add_remaining_issues(project_id)
        
        print('\n' + '='*60)
        print('DONE!')
        print(f'Project URL: https://github.com/users/{OWNER}/projects/{PROJECT_NUMBER}')
        print('='*60)
        print('\nNext steps:')
        print('1. Go to the Project URL above')
        print('2. Click "Board" tab to see the Kanban view')
        print('3. If no columns: click "..." → "Settings" → "Fields" → enable "Status"')
        print('4. Drag issues into columns (Todo / In Progress / Review / Done)')
        print('5. Group by "Priority" field: click "Group" → select "Priority"')
        
    except Exception as e:
        print(f'\nFAILED: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
