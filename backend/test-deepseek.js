/**
 * DeepSeek API 连接测试
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const OpenAI = require('openai');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

async function testDeepSeekAPI() {
  console.log('=== DeepSeek API 测试 ===\n');
  console.log('API Key:', DEEPSEEK_API_KEY ? `${DEEPSEEK_API_KEY.substring(0, 10)}...` : '未配置');
  console.log('Model:', DEEPSEEK_MODEL);
  console.log('');

  if (!DEEPSEEK_API_KEY) {
    console.error('❌ API Key 未配置');
    process.exit(1);
  }

  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: DEEPSEEK_API_KEY,
  });

  try {
    console.log('正在调用 DeepSeek API...\n');
    
    const completion = await client.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: '你是一位友好的守护灵助手' },
        { role: 'user', content: '你好，请用一句话介绍自己' }
      ],
      max_tokens: 100,
    });

    console.log('✅ API 调用成功！\n');
    console.log('回复内容:');
    console.log('---');
    console.log(completion.choices[0].message.content);
    console.log('---\n');
    console.log('Token 使用情况:');
    console.log('  prompt_tokens:', completion.usage?.prompt_tokens || 0);
    console.log('  completion_tokens:', completion.usage?.completion_tokens || 0);
    console.log('  total_tokens:', completion.usage?.total_tokens || 0);

  } catch (error) {
    console.error('❌ API 调用失败:');
    console.error(error.message);
    process.exit(1);
  }
}

testDeepSeekAPI();
