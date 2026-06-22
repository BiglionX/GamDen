/**
 * 修复 PostgreSQL 语法脚本
 * 将 MySQL 语法 (execute + ?) 转换为 PostgreSQL 语法 (query + $1, $2, ...)
 */

const fs = require('fs');
const path = require('path');

// 需要处理的文件列表
const filesToProcess = [
  'src/services/authService.ts',
  'src/services/territoryService.ts',
  'src/services/inviteService.ts',
  'src/services/clubService.ts',
  'src/services/shopService.ts',
  'src/services/agentService.ts',
  'src/controllers/clubController.ts',
  'src/controllers/shopController.ts',
  'src/controllers/webhookController.ts'
];

// 转换 ? 占位符为 $1, $2, ...
function convertPlaceholders(sql) {
  let paramIndex = 0;
  return sql.replace(/\?/g, () => `$${++paramIndex}`);
}

// 处理单个文件
function processFile(filePath) {
  console.log(`处理文件: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 替换 dbPool.execute( 为 dbPool.query(
  if (content.includes('dbPool.execute(')) {
    content = content.replace(/dbPool\.execute\(/g, 'dbPool.query(');
    modified = true;
    console.log('  - 替换 dbPool.execute() -> dbPool.query()');
  }
  
  // 替换所有 SQL 字符串中的 ? 为 $1, $2, ...
  // 这是一个简化的实现，实际可能需要解析 SQL 语句
  // 这里我们只处理简单的单行 SQL
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ 已更新: ${filePath}`);
  } else {
    console.log(`  - 无需更新: ${filePath}`);
  }
}

// 主函数
console.log('开始修复 PostgreSQL 语法...\n');

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    processFile(filePath);
  } else {
    console.log(`跳过不存在的文件: ${filePath}`);
  }
});

console.log('\n完成！请手动检查每个文件中的 SQL 占位符是否已正确转换。');
console.log('注意: 此脚本只替换了 dbPool.execute() -> dbPool.query()');
console.log('你需要手动将 SQL 中的 ? 替换为 $1, $2, $3, ...');
