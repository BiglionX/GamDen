#!/usr/bin/env python3
"""
GamDen V1.0 - GitHub Project Creator (English output version)
Run: python create-project-v2.py
"""

import os
import json
import urllib.request
import urllib.error
import time

TOKEN = '<your_token>'
OWNER = 'BiglionX'
REPO = 'GamDen'

HEADERS = {
    'Authorization': f'Bearer {TOKEN}',
    'User-Agent': 'GamDen-Creator',
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

def rest_api(method, path, body=None):
    url = f'https://api.github.com{path}'
    data = json.dumps(body).encode('utf-8') if body else None
    headers = dict(HEADERS)
    if data:
        headers['Content-Length'] = str(len(data))
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return {'status': resp.status, 'body': json.loads(resp.read().decode('utf-8'))}
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8') if e.fp else ''
        print(f'REST HTTP {e.code}: {body[:500]}')
        return {'status': e.code, 'body': json.loads(body) if body else {}}

def get_owner_node_id():
    print('[1/4] Getting owner node ID...')
    query = '{ viewer { id login } }'
    data = graphql(query)
    login = data['viewer']['login']
    node_id = data['viewer']['id']
    print(f'  Owner: {login}, Node ID: {node_id}')
    return node_id

def create_project(owner_id):
    print('[2/4] Creating GitHub Project...')
    query = """
    mutation($ownerId: ID!, $title: String!) {
      createProjectV2(input: { ownerId: $ownerId, title: $title }) {
        projectV2 { id number url title }
      }
    }
    """
    variables = {
        'ownerId': owner_id,
        'title': 'GamDen V1.0 Dev Board',
    }
    data = graphql(query, variables)
    if not data or 'createProjectV2' not in data:
        print(f'  ERROR: {data}')
        raise Exception('Failed to create project')
    project = data['createProjectV2']['projectV2']
    print(f'  SUCCESS! Project created: {project["url"]}')
    return project

def create_issues():
    print('[3/4] Creating Issues...')
    
    issues = [
        # Phase 1
        ('[P0] Init Monorepo structure', ['P0', 'infra']),
        ('[P0] Database init - Create tables SQL', ['P0', 'backend', 'database']),
        ('[P0] Auth API - Register/Login/JWT', ['P0', 'backend', 'api']),
        ('[P0] Invite code generation & validation', ['P0', 'backend', 'invite']),
        ('[P0] Coordinate allocation algorithm', ['P0', 'backend', 'algorithm', 'territory']),
        ('[P1] Env vars & config files', ['P1', 'infra', 'config']),
        ('[P1] Docker Compose orchestration', ['P1', 'infra', 'docker']),
        ('[P1] Unified error code system', ['P1', 'backend']),
        # Phase 2
        ('[P0] Territory info API', ['P0', 'backend', 'api', 'territory']),
        ('[P0] Territory level-up logic & exp system', ['P0', 'backend', 'territory']),
        ('[P0] Map neighbors API', ['P0', 'backend', 'api', 'map']),
        ('[P0] Guardian spirit dialogue system', ['P0', 'backend', 'agent']),
        ('[P0] Agent notification push (OpenIM)', ['P0', 'backend', 'agent', 'openim']),
        ('[P1] Daily check-in feature', ['P1', 'backend', 'feature']),
        ('[P1] Beast tide cron job', ['P1', 'backend', 'feature', 'beast']),
        ('[P1] Beast tide config backend API', ['P1', 'backend', 'config', 'beast']),
        ('[P1] Territory element images upload', ['P1', 'assets', 'territory']),
        # Phase 3
        ('[P0] Invite record API & progress endpoint', ['P0', 'backend', 'api', 'invite']),
        ('[P0] OpenIM Docker deploy & basic integration', ['P0', 'infra', 'openim']),
        ('[P0] OpenIM Webhook middleware', ['P0', 'backend', 'openim', 'webhook']),
        ('[P0] 1-on-1 chat & group chat basic integration', ['P0', 'frontend', 'openim', 'chat']),
        ('[P1] Club (forum) API', ['P1', 'backend', 'api', 'club']),
        ('[P1] Club <-> OpenIM group mapping', ['P1', 'backend', 'club', 'openim']),
        ('[P1] Tencent Cloud content moderation API - AI review', ['P1', 'backend', 'security', 'ai']),
        ('[P1] Manual review pool backend API', ['P1', 'backend', 'moderation']),
        # Phase 4
        ('[P0] Gold coin system completion', ['P0', 'backend', 'gold', 'feature']),
        ('[P0] Shop exchange API', ['P0', 'backend', 'api', 'shop']),
        ('[P0] Admin - User management page', ['P0', 'admin', 'frontend']),
        ('[P0] Admin - Content moderation page', ['P0', 'admin', 'frontend', 'moderation']),
        ('[P1] Admin - Territory & map monitoring', ['P1', 'admin', 'frontend', 'map']),
        ('[P1] Admin - Club management', ['P1', 'admin', 'frontend', 'club']),
        ('[P1] Admin - Data dashboard', ['P1', 'admin', 'frontend', 'dashboard']),
        ('[P1] Admin - System config page', ['P1', 'admin', 'frontend', 'config']),
        ('[P1] Operation log API & view page', ['P1', 'backend', 'admin', 'log']),
        # Phase 5
        ('[P0] Marketing H5 landing page', ['P0', 'frontend', 'h5', 'marketing']),
        ('[P0] H5 application form page', ['P0', 'frontend', 'h5', 'marketing']),
        ('[P0] H5 review workflow (auto + manual)', ['P0', 'backend', 'h5', 'marketing']),
        ('[P0] H5 invite code input & App download page', ['P0', 'frontend', 'h5', 'marketing']),
        ('[P0] WeChat Mini Program - Territory display page', ['P0', 'frontend', 'miniprogram']),
        ('[P0] WeChat Mini Program - Share feature', ['P0', 'frontend', 'miniprogram', 'wechat']),
        ('[P0] WeChat Mini Program - Traffic diversion strategy', ['P0', 'frontend', 'miniprogram', 'marketing']),
        ('[P1] Mini Program auto-generation logic', ['P1', 'backend', 'miniprogram']),
        ('[P1] Data tracking & analytics', ['P1', 'backend', 'analytics']),
        # Phase 6
        ('[P0] iOS App - Login/Register/Territory home (SwiftUI)', ['P0', 'ios', 'frontend']),
        ('[P0] iOS App - Map/Club/IM/Shop/Profile (SwiftUI)', ['P0', 'ios', 'frontend']),
        ('[P0] Android App - Full features (React Native)', ['P0', 'android', 'frontend', 'rn']),
        ('[P1] App full-screen adaptation', ['P1', 'ios', 'android', 'ui']),
        # Phase 7
        ('[P0] API integration test & Postman automation', ['P0', 'test', 'api']),
        ('[P0] E2E functional testing', ['P0', 'test']),
        ('[P1] Performance testing', ['P1', 'test', 'performance']),
        ('[P1] Security testing', ['P1', 'test', 'security']),
        ('[P0] Lighthouse deployment - docker compose up', ['P0', 'devops', 'deploy']),
        ('[P1] Monitoring integration - Sentry + Prometheus', ['P1', 'devops', 'monitoring']),
    ]
    
    created = []
    for i, (title, labels) in enumerate(issues):
        print(f'  [{i+1}/{len(issues)}] Creating: {title}')
        payload = {
            'title': title,
            'body': f'## Phase\nSee project docs for details\n\n## Labels\n{", ".join(labels)}',
            'labels': labels,
        }
        result = rest_api('POST', f'/repos/{OWNER}/{REPO}/issues', payload)
        if result['status'] == 201:
            num = result['body']['number']
            created.append(num)
            print(f'    SUCCESS # {num}')
        else:
            print(f'    FAILED: {result["body"]}')
        time.sleep(0.3)
    
    print(f'\n  Total created: {len(created)} issues')
    return created

def main():
    try:
        owner_id = get_owner_node_id()
        project = create_project(owner_id)
        issue_numbers = create_issues()
        
        print('\n' + '='*50)
        print('DONE!')
        print(f'Project: {project["url"]}')
        print(f'Issues: {len(issue_numbers)} created')
        print('='*50)
        print('\nNext steps:')
        print('1. Go to the Project URL above')
        print('2. Click "Add items" to add issues to the board')
        print('3. Create board columns: Todo / In Progress / Review / Done')
    except Exception as e:
        print(f'\nFAILED: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
